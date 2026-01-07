import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "");
  const expected = Deno.env.get("CRON_SECRET") || "";

  if (!expected || token !== expected) {
    return new Response(
      JSON.stringify({ error: "unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // 👉 aqui vai sua lógica real depois
  console.log("Cron autorizado, executando tarefa");

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { "Content-Type": "application/json" } }
  );
});
