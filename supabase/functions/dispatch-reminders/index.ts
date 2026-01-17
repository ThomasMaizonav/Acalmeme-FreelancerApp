// supabase/functions/dispatch-reminders/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;

const SEND_EMAIL_URL = `${SUPABASE_URL}/functions/v1/send-email`;
const TZ = "America/Sao_Paulo";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function getNowInTZ() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);

  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));

  const hhmm = `${p.hour}:${p.minute}`;

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dow = map[p.weekday];

  const scheduled_for = new Date();
  scheduled_for.setSeconds(0, 0);

  return { hhmm, dow, scheduled_for: scheduled_for.toISOString() };
}

async function supabaseFetch(path: string, init?: RequestInit) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  return await fetch(url, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

serve(async (req) => {
  try {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return json({ error: "unauthorized" }, 401);
    }

    const { hhmm, dow, scheduled_for } = getNowInTZ();

    const remindersRes = await supabaseFetch(
      `reminders?select=id,user_id,title,description,email,send_email,is_active,days_of_week,timezone,reminder_times(id,scheduled_time,is_active)` +
        `&is_active=eq.true&send_email=eq.true`,
    );

    if (!remindersRes.ok) {
      const t = await remindersRes.text();
      return json({ error: "failed_to_fetch_reminders", details: t }, 500);
    }

    const reminders = await remindersRes.json();

    let checked = 0;
    let queued = 0;
    let skipped = 0;

    for (const r of reminders) {
      checked++;

      if (!r.email) {
        skipped++;
        continue;
      }
      if (!Array.isArray(r.days_of_week) || !r.days_of_week.includes(dow)) {
        skipped++;
        continue;
      }

      const times = (r.reminder_times ?? []).filter((t: any) => t.is_active);
      for (const t of times) {
        const st = String(t.scheduled_time).slice(0, 5);
        if (st !== hhmm) continue;

        const logPayload = [
          {
            reminder_id: r.id,
            reminder_time_id: t.id,
            user_id: r.user_id,
            scheduled_for,
            scheduled_time: st,
            channel: "email",
            status: "queued",
          },
        ];

        const logRes = await supabaseFetch(`reminder_logs`, {
          method: "POST",
          body: JSON.stringify(logPayload),
          headers: { Prefer: "return=representation" },
        });

        if (!logRes.ok) {
          const body = await logRes.text();
          if (body.includes("duplicate key value") || body.includes("reminder_logs_unique")) {
            skipped++;
            continue;
          }
          return json({ error: "failed_to_write_log", details: body }, 500);
        }

        const sendRes = await fetch(SEND_EMAIL_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${CRON_SECRET}`,
          },
          body: JSON.stringify({
            to: r.email,
            subject: r.title,
            text: r.description || "Hora do seu lembrete!",
            meta: {
              reminder_id: r.id,
              reminder_time_id: t.id,
              scheduled_for,
              tz: TZ,
              hhmm,
              dow,
            },
          }),
        });

        if (!sendRes.ok) {
          const err = await sendRes.text();
          await supabaseFetch(
            `reminder_logs?reminder_time_id=eq.${t.id}&scheduled_for=eq.${encodeURIComponent(scheduled_for)}`,
            {
              method: "PATCH",
              body: JSON.stringify({ status: "failed", error_message: err }),
            },
          );
          continue;
        }

        await supabaseFetch(
          `reminder_logs?reminder_time_id=eq.${t.id}&scheduled_for=eq.${encodeURIComponent(scheduled_for)}`,
          {
            method: "PATCH",
            body: JSON.stringify({ status: "sent" }),
          },
        );

        queued++;
      }
    }

    return json({
      ok: true,
      tz: TZ,
      hhmm,
      dow,
      scheduled_for,
      checked,
      queued,
      skipped,
    });
  } catch (e) {
    return json({ error: "unexpected", message: String(e) }, 500);
  }
});
