import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

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
  const userId = String(body.userId || "");
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword.trim() : "";

  if (!userId) {
    return json(400, { error: "Missing userId" });
  }

  if (!fullName && !newPassword) {
    return json(400, { error: "No updates provided" });
  }

  const authUpdates: {
    password?: string;
    user_metadata?: { full_name?: string };
  } = {};

  if (newPassword) {
    authUpdates.password = newPassword;
  }

  if (fullName) {
    authUpdates.user_metadata = { full_name: fullName };
  }

  try {
    if (Object.keys(authUpdates).length > 0) {
      const { error: updateError } = await supabaseAdmin.auth.admin
        .updateUserById(userId, authUpdates);
      if (updateError) {
        return json(500, { error: updateError.message });
      }
    }

    if (fullName) {
      const { data: updatedByUserId, error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ full_name: fullName })
        .eq("user_id", userId)
        .select("id");

      if (profileError) {
        return json(500, { error: profileError.message });
      }

      if (!updatedByUserId || updatedByUserId.length === 0) {
        const { error: fallbackError } = await supabaseAdmin
          .from("profiles")
          .update({ full_name: fullName })
          .eq("id", userId);

        if (fallbackError) {
          return json(500, { error: fallbackError.message });
        }
      }
    }

    return json(200, { ok: true });
  } catch (err) {
    return json(500, {
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
