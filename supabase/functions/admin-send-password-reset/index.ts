import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const PASSWORD_RESET_REDIRECT_URL =
  Deno.env.get("PASSWORD_RESET_REDIRECT_URL") ??
  Deno.env.get("SUPABASE_PASSWORD_RESET_REDIRECT_URL") ??
  "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getAuthUser = async (req: Request) => {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader) {
    return { user: null, error: "Missing authorization header" };
  }

  const key = SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) {
    return { user: null, error: "Missing Supabase configuration" };
  }

  const authClient = createClient(SUPABASE_URL, key, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await authClient.auth.getUser();
  if (error || !data?.user) {
    return { user: null, error: "Invalid user token" };
  }

  return { user: data.user, error: null };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { error: "Missing required secrets" });
  }

  const { user, error: authError } = await getAuthUser(req);
  if (authError || !user) {
    return json(401, { error: authError || "Unauthorized" });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: roleData, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !roleData) {
    return json(403, { error: "Forbidden" });
  }

  const body = await req.json().catch(() => ({}));
  const userEmail = typeof body.userEmail === "string" ? body.userEmail : "";
  const redirectTo =
    typeof body.redirectTo === "string" && body.redirectTo
      ? body.redirectTo
      : PASSWORD_RESET_REDIRECT_URL;

  if (!userEmail) {
    return json(400, { error: "Missing userEmail" });
  }

  const options = redirectTo ? { redirectTo } : undefined;

  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(
    userEmail,
    options,
  );

  if (error) {
    return json(500, { error: error.message });
  }

  return json(200, { ok: true });
});
