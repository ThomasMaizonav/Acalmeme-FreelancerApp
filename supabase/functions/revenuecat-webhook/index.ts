import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RevenueCatEvent = {
  aliases?: string[] | null;
  app_user_id?: string | null;
  entitlement_id?: string | null;
  entitlement_ids?: string[] | null;
  event_timestamp_ms?: number | null;
  expiration_at_ms?: number | null;
  id?: string | null;
  original_app_user_id?: string | null;
  period_type?: string | null;
  product_id?: string | null;
  purchased_at_ms?: number | null;
  store?: string | null;
  type?: string | null;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const REVENUECAT_WEBHOOK_AUTH = Deno.env.get("REVENUECAT_WEBHOOK_AUTH") ?? "";
const REVENUECAT_ENTITLEMENT_ID = Deno.env.get("REVENUECAT_ENTITLEMENT_ID") ?? "premium";

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const toIso = (value?: number | null) =>
  typeof value === "number" ? new Date(value).toISOString() : null;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getBillingProvider = (store?: string | null) => {
  switch (store) {
    case "APP_STORE":
      return "app_store";
    case "PLAY_STORE":
      return "play_store";
    case "STRIPE":
      return "stripe";
    case "RC_BILLING":
      return "revenuecat";
    case "PROMOTIONAL":
      return "manual";
    default:
      return store?.toLowerCase() || "revenuecat";
  }
};

const shouldProcessEvent = (event: RevenueCatEvent) => {
  const entitlementIds = (event.entitlement_ids ?? []).filter(Boolean);
  if (entitlementIds.length > 0) {
    return entitlementIds.includes(REVENUECAT_ENTITLEMENT_ID);
  }

  if (event.entitlement_id) {
    return event.entitlement_id === REVENUECAT_ENTITLEMENT_ID;
  }

  return true;
};

const resolveStatus = (event: RevenueCatEvent) => {
  const isTrial = event.period_type === "TRIAL";
  const hasFutureExpiration =
    typeof event.expiration_at_ms === "number" ? event.expiration_at_ms > Date.now() : false;

  switch (event.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "PRODUCT_CHANGE":
    case "UNCANCELLATION":
    case "SUBSCRIPTION_EXTENDED":
    case "TEMPORARY_ENTITLEMENT_GRANT":
    case "NON_RENEWING_PURCHASE":
      return isTrial ? "trialing" : "active";
    case "CANCELLATION":
      return hasFutureExpiration ? (isTrial ? "trialing" : "active") : "canceled";
    case "BILLING_ISSUE":
    case "SUBSCRIPTION_PAUSED":
      return hasFutureExpiration ? (isTrial ? "trialing" : "active") : "past_due";
    case "EXPIRATION":
    case "REFUND":
      return "canceled";
    default:
      return hasFutureExpiration ? (isTrial ? "trialing" : "active") : "canceled";
  }
};

const getCandidateIds = (event: RevenueCatEvent) => {
  return [
    event.app_user_id,
    event.original_app_user_id,
    ...(event.aliases ?? []),
  ].filter((value): value is string => Boolean(value));
};

const unique = (values: string[]) => [...new Set(values)];

const resolveUserId = async (
  supabase: ReturnType<typeof createClient>,
  candidates: string[],
) => {
  if (candidates.length === 0) return null;

  const { data: userIdMatches } = await supabase
    .from("profiles")
    .select("user_id")
    .in("user_id", candidates)
    .limit(1);

  const matchedUserId = userIdMatches?.[0]?.user_id;
  if (matchedUserId) return matchedUserId;

  const { data: idMatches } = await supabase
    .from("profiles")
    .select("id")
    .in("id", candidates)
    .limit(1);

  const matchedId = idMatches?.[0]?.id;
  if (matchedId) return matchedId;

  const { data: appUserMatches } = await supabase
    .from("subscriptions")
    .select("user_id")
    .in("revenuecat_app_user_id", candidates)
    .limit(1);

  const matchedAppUserSubscription = appUserMatches?.[0]?.user_id;
  if (matchedAppUserSubscription) return matchedAppUserSubscription;

  const { data: originalAppUserMatches } = await supabase
    .from("subscriptions")
    .select("user_id")
    .in("revenuecat_original_app_user_id", candidates)
    .limit(1);

  const matchedSubscriptionUserId = originalAppUserMatches?.[0]?.user_id;
  if (matchedSubscriptionUserId) return matchedSubscriptionUserId;

  return candidates.find((candidate) => uuidPattern.test(candidate)) ?? null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: "Missing Supabase secrets" });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const expectedBearer = `Bearer ${REVENUECAT_WEBHOOK_AUTH}`;
  if (REVENUECAT_WEBHOOK_AUTH && authHeader !== REVENUECAT_WEBHOOK_AUTH && authHeader !== expectedBearer) {
    return json(401, { error: "Unauthorized webhook request" });
  }

  const body = await req.json().catch(() => null);
  const event = body?.event as RevenueCatEvent | undefined;

  if (!event?.id || !event.type) {
    return json(400, { error: "Invalid RevenueCat payload" });
  }

  if (!shouldProcessEvent(event)) {
    return json(200, { received: true, ignored: true });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const candidateIds = unique(getCandidateIds(event));
  const userId = await resolveUserId(supabase, candidateIds);

  if (!userId) {
    console.warn("RevenueCat webhook without matching user:", event.id, event.type);
    return json(200, { received: true, ignored: true, reason: "user_not_found" });
  }

  const status = resolveStatus(event);
  const nowIso = new Date().toISOString();
  const cancelAtPeriodEnd =
    event.type === "CANCELLATION" || status === "canceled" || status === "past_due";

  const payload = {
    user_id: userId,
    status,
    cancel_at_period_end: cancelAtPeriodEnd,
    current_period_start: toIso(event.purchased_at_ms),
    current_period_end: toIso(event.expiration_at_ms),
    trial_end: event.period_type === "TRIAL" ? toIso(event.expiration_at_ms) : null,
    billing_provider: getBillingProvider(event.store),
    billing_store: event.store ?? null,
    billing_product_id: event.product_id ?? null,
    revenuecat_app_user_id: event.app_user_id ?? null,
    revenuecat_original_app_user_id: event.original_app_user_id ?? null,
    updated_at: nowIso,
  };

  const { error } = await supabase
    .from("subscriptions")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    console.error("RevenueCat webhook upsert failed:", error);
    return json(500, {
      error: "Failed to sync subscription",
      message: error.message,
    });
  }

  return json(200, {
    received: true,
    userId,
    eventId: event.id,
    eventType: event.type,
  });
});
