// supabase/functions/create-checkout-session/index.ts
import Stripe from "npm:stripe@14.21.0";

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

    if (!STRIPE_SECRET_KEY) {
      return json({ error: "Missing STRIPE_SECRET_KEY secret" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const priceId: string = body.priceId || DEFAULT_PRICE_ID;
    const userId: string = body.userId || "";
    const email: string = body.email || "";

    const successUrl: string =
      body.successUrl || "https://acalmeme.vercel.app/success";
    const cancelUrl: string =
      body.cancelUrl || "https://acalmeme.vercel.app/cancel";

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
    };

    if (email) {
      sessionParams.customer_email = email;
    }

    if (userId) {
      sessionParams.client_reference_id = userId;
      sessionParams.metadata = { user_id: userId };
      sessionParams.subscription_data = { metadata: { user_id: userId } };
    }

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
