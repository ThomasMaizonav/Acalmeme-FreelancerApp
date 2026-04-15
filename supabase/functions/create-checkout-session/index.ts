// supabase/functions/create-checkout-session/index.ts
import Stripe from "npm:stripe@14.25.0";

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
    const DEFAULT_TRIAL_DAYS = Number.parseInt(
      Deno.env.get("STRIPE_TRIAL_DAYS") || "30",
      10,
    );

    if (!STRIPE_SECRET_KEY) {
      return json({ error: "Missing STRIPE_SECRET_KEY secret" }, 500);
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

    const priceId: string = body.priceId || DEFAULT_PRICE_ID;
    const userId = authenticatedUserId;
    const email: string = body.email || authenticatedEmail;
    const trialDaysInput = Number.parseInt(
      String(body.trialDays ?? DEFAULT_TRIAL_DAYS),
      10,
    );
    const trialDays = Number.isFinite(trialDaysInput)
      ? Math.min(Math.max(trialDaysInput, 0), 730)
      : 30;

    const origin: string =
      body.origin || req.headers.get("origin") || "https://acalmeme.vercel.app";
    const successUrl: string = body.successUrl || `${origin}/payment-success`;
    const cancelUrl: string = body.cancelUrl || `${origin}/plans`;

    if (!priceId) {
      return json({ error: "Missing priceId" }, 400);
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });

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
