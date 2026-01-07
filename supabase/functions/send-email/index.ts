// supabase/functions/send-email/index.ts
// Deno Edge Function (Supabase)

type SendEmailPayload = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // 1) Proteção do cron por segredo (NÃO é JWT)
  const expected = Deno.env.get("CRON_SECRET") ?? "";
  const got = req.headers.get("x-cron-secret") ?? "";

  if (!expected || got !== expected) {
    return json({ error: "unauthorized" }, 401);
  }

  // 2) Lê payload
  let payload: SendEmailPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const to = payload.to;
  const subject = payload.subject?.trim();
  const html = payload.html;
  const text = payload.text;

  if (!to || !subject) {
    return json({ error: "Missing 'to' or 'subject'" }, 400);
  }

  // 3) Envio via Resend
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const EMAIL_FROM = Deno.env.get("EMAIL_FROM");

  if (!RESEND_API_KEY || !EMAIL_FROM) {
    return json(
      { error: "Missing RESEND_API_KEY or EMAIL_FROM in Edge Function secrets" },
      500
    );
  }

  const resendResp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to,
      subject,
      html: html ?? undefined,
      text: text ?? undefined,
    }),
  });

  const resendJson = await resendResp.json().catch(() => ({}));

  if (!resendResp.ok) {
    return json(
      {
        error: "Resend request failed",
        status: resendResp.status,
        details: resendJson,
      },
      500
    );
  }

  return json({ ok: true, resend: resendJson }, 200);
});
