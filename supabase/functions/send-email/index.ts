// supabase/functions/send-email/index.ts
// Edge Function (Deno) para enviar e-mails via Resend, protegida por CRON_SECRET.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

type Payload = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string; // opcional (se não mandar, usa onboarding@resend.dev)
  reply_to?: string;
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const auth = req.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim() ?? "";
  const cronSecret = (Deno.env.get("CRON_SECRET") ?? "").trim();

  if (!cronSecret) {
    return new Response(JSON.stringify({ error: "missing CRON_SECRET" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!token || token !== cronSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Healthcheck simples
  if (req.method === "GET") {
    return json(200, { ok: true });
  }

  // Só aceita POST
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  if (!RESEND_API_KEY) {
    return json(500, { error: "Missing RESEND_API_KEY secret" });
  }

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const to = payload.to;
  const subject = (payload.subject ?? "").trim();
  const html = payload.html;
  const text = payload.text;

  if (!to || !subject) {
    return json(400, { error: "Missing required fields: to, subject" });
  }
  if (!html && !text) {
    return json(400, { error: "Provide at least one: html or text" });
  }

  // Importante:
  // - Sem domínio verificado, use onboarding@resend.dev (funciona pra testes/transacional inicial)
  // - Quando comprar domínio, troque por algo tipo: no-reply@acalmeme.com
  const from = (payload.from ?? "onboarding@resend.dev").trim();

  const resendBody: Record<string, unknown> = {
    from,
    to,
    subject,
    ...(html ? { html } : {}),
    ...(text ? { text } : {}),
    ...(payload.reply_to ? { reply_to: payload.reply_to } : {}),
  };

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(resendBody),
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      return json(502, {
        error: "Resend error",
        status: r.status,
        details: data,
      });
    }

    return json(200, { ok: true, data });
  } catch (e) {
    return json(500, { error: "Unexpected error", details: String(e) });
  }
});
