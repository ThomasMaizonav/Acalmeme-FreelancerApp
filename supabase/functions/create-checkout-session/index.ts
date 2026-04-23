// supabase/functions/create-checkout-session/index.ts
import Stripe from "npm:stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

Deno.serve(async (req) => {
  // Preflight (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // (opcional) proteja com CRON_SECRET se quiser impedir chamadas públicas:
    // const auth = req.headers.get("authorization") || "";
    // const token = auth.replace("Bearer ", "");
    // const expected = Deno.env.get("CRON_SECRET") || "";
    // if (!expected || token !== expected) return json({ error: "unauthorized" }, 401);

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const DEFAULT_PRICE_ID = Deno.env.get("STRIPE_PRICE_ID") || "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const ACCOUNT_TRIAL_DAYS = 30;
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    if (!STRIPE_SECRET_KEY) {
      return json({ error: "Missing STRIPE_SECRET_KEY secret" }, 500);
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(
        { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY secret" },
        500,
      );
    }

    const authHeader =
      req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "").trim()
      : "";
    const jwtPayload = decodeJwtPayload(token);

    const authenticatedUserId =
      typeof jwtPayload?.sub === "string" ? jwtPayload.sub : "";
    const authenticatedEmail =
      typeof jwtPayload?.email === "string" ? jwtPayload.email : "";

    if (!authenticatedUserId) {
      return json({ error: "Authentication required" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const bodyUserId = typeof body.userId === "string" ? body.userId : "";
    if (bodyUserId && bodyUserId !== authenticatedUserId) {
      return json({ error: "Invalid userId for authenticated session" }, 403);
    }

    const requestedPriceId =
      typeof body.priceId === "string" ? body.priceId : "";
    const priceId: string = DEFAULT_PRICE_ID || requestedPriceId;
    const userId = authenticatedUserId;
    const email: string = body.email || authenticatedEmail;
    const now = Date.now();

    const origin: string =
      body.origin || req.headers.get("origin") || "https://acalmeme.vercel.app";
    const successUrl: string = body.successUrl || `${origin}/payment-success`;
    const cancelUrl: string = body.cancelUrl || `${origin}/plans`;

    if (DEFAULT_PRICE_ID && requestedPriceId && requestedPriceId !== DEFAULT_PRICE_ID) {
      console.warn(
        `Ignoring client priceId ${requestedPriceId}. Using server STRIPE_PRICE_ID ${DEFAULT_PRICE_ID}.`,
      );
    }

    if (!priceId) {
      return json({ error: "Missing STRIPE_PRICE_ID secret in function config" }, 400);
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("free_trial_started_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (profileError) {
      return json({ error: "Failed to read user profile", message: profileError.message }, 500);
    }

    let trialStartIso =
      typeof profileData?.free_trial_started_at === "string"
        ? profileData.free_trial_started_at
        : null;

    if (!trialStartIso) {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
        userId,
      );
      if (userError) {
        return json({ error: "Failed to read auth user", message: userError.message }, 500);
      }
      trialStartIso = userData.user?.created_at || null;
    }

    const trialStartMs = trialStartIso ? Date.parse(trialStartIso) : Number.NaN;
    const trialEndMs = Number.isFinite(trialStartMs)
      ? trialStartMs + ACCOUNT_TRIAL_DAYS * MS_PER_DAY
      : now;
    const remainingTrialMs = trialEndMs - now;
    const trialDays =
      remainingTrialMs > 0
        ? Math.min(ACCOUNT_TRIAL_DAYS, Math.ceil(remainingTrialMs / MS_PER_DAY))
        : 0;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    };

    if (email) {
      sessionParams.customer_email = email;
    }

    sessionParams.client_reference_id = userId;
    sessionParams.metadata = { user_id: userId };
    sessionParams.subscription_data = {
      metadata: { user_id: userId },
      ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return json({ url: session.url, id: session.id });
  } catch (err) {
    return json(
      {
        error: "Internal error",
        message: err instanceof Error ? err.message : String(err),
      },
      500,
    );
  }
});
