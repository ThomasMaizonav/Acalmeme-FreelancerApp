import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.25.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, stripe-signature",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const toIso = (seconds: number | null) =>
  typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null;

const getCustomerId = (
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
) => {
  if (!customer) return null;
  if (typeof customer === "string") return customer;
  return "id" in customer ? customer.id : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  if (
    !STRIPE_SECRET_KEY ||
    !STRIPE_WEBHOOK_SECRET ||
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY
  ) {
    return json(500, { error: "Missing required secrets" });
  }

  const signature = req.headers.get("stripe-signature") ?? "";
  const payload = await req.text();

  if (!signature) {
    return json(400, { error: "Missing stripe-signature header" });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    return json(400, {
      error: "Invalid signature",
      message: error instanceof Error ? error.message : String(error),
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const upsertSubscription = async (
    userId: string,
    subscription: Stripe.Subscription,
  ) => {
    const { error } = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_start: toIso(subscription.current_period_start),
          current_period_end: toIso(subscription.current_period_end),
          trial_end: toIso(subscription.trial_end),
          stripe_subscription_id: subscription.id,
          stripe_customer_id: getCustomerId(subscription.customer),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (error) {
      throw error;
    }
  };

  const resolveUserId = async (subscription: Stripe.Subscription) => {
    const metadataUserId = subscription.metadata?.user_id;
    if (metadataUserId) return metadataUserId;

    const { data, error } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle();

    if (error) {
      console.error("Error resolving subscription owner:", error);
      return null;
    }

    return data?.user_id ?? null;
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = session.subscription;
        const userId =
          session.client_reference_id || session.metadata?.user_id || null;

        if (!userId || typeof subscriptionId !== "string") {
          return json(200, { received: true });
        }

        const subscription = await stripe.subscriptions.retrieve(
          subscriptionId,
        );
        await upsertSubscription(userId, subscription);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(subscription);

        if (!userId) {
          return json(200, { received: true });
        }

        await upsertSubscription(userId, subscription);
        break;
      }
      default:
        break;
    }

    return json(200, { received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return json(500, {
      error: "Webhook handler failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
