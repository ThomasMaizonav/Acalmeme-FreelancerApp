// supabase/functions/dispatch-reminders/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
const TZ = "America/Sao_Paulo";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function getNowInTZ() {
  const now = new Date();
  const start = new Date(now);
  start.setSeconds(0, 0);
  const end = new Date(now);
  end.setSeconds(59, 999);

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

  return {
    hhmm,
    dow,
    scheduled_for: start.toISOString(),
    minute_start: start.toISOString(),
    minute_end: end.toISOString(),
  };
}

const normalizeScheduledTime = (value: unknown) => {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      trimmed.length >= 16 &&
      (trimmed.includes("T") || trimmed.includes("-") || trimmed.includes("/"))
    ) {
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return new Intl.DateTimeFormat("en-GB", {
          timeZone: TZ,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(parsed);
      }
    }
    return trimmed.slice(0, 5);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(value);
  }

  return "";
};

const normalizeScheduledTime = (value: unknown) => {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      trimmed.length >= 16 &&
      (trimmed.includes("T") || trimmed.includes("-") || trimmed.includes("/"))
    ) {
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return new Intl.DateTimeFormat("en-GB", {
          timeZone: TZ,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(parsed);
      }
    }
    return trimmed.slice(0, 5);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(value);
  }

  return "";
};

async function supabaseFetch(
  supabaseUrl: string,
  serviceRoleKey: string,
  path: string,
  init?: RequestInit,
) {
  const url = `${supabaseUrl}/rest/v1/${path}`;
  return await fetch(url, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

serve(async (req) => {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

    const cronSecret = (Deno.env.get("CRON_SECRET") || "").trim();

    console.log("[dispatch] CRON_SECRET len:", cronSecret.length);

    if (!cronSecret) {
      return json({ error: "missing CRON_SECRET env" }, 500);
    }

    if (token !== cronSecret) {
      return json(
        { error: "unauthorized", received: token.length, expected: cronSecret.length },
        401,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }

    const sendEmailUrl = `${supabaseUrl}/functions/v1/send-email`;

    const { hhmm, dow, scheduled_for, minute_start, minute_end } = getNowInTZ();

    const remindersRes = await supabaseFetch(
      supabaseUrl,
      serviceRoleKey,
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
      const allowed = Array.isArray(r.days_of_week) ? r.days_of_week : [];
      const allowedNums = allowed.map((value: unknown) => Number(value)).filter(Number.isFinite);
      if (!allowedNums.includes(dow)) {
        skipped++;
        continue;
      }

      const times = (r.reminder_times ?? []).filter((t: any) => t.is_active ?? true);
      for (const t of times) {
        const st = normalizeScheduledTime(t.scheduled_time);
        if (!st) continue;
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

        const logRes = await supabaseFetch(supabaseUrl, serviceRoleKey, `reminder_logs`, {
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

        const sendRes = await fetch(sendEmailUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cronSecret}`,
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
            supabaseUrl,
            serviceRoleKey,
            `reminder_logs?reminder_time_id=eq.${t.id}&scheduled_for=gte.${encodeURIComponent(minute_start)}&scheduled_for=lte.${encodeURIComponent(minute_end)}`,
            {
              method: "PATCH",
              body: JSON.stringify({ status: "failed", error_message: err }),
            },
          );
          continue;
        }

        await supabaseFetch(
          supabaseUrl,
          serviceRoleKey,
          `reminder_logs?reminder_time_id=eq.${t.id}&scheduled_for=gte.${encodeURIComponent(minute_start)}&scheduled_for=lte.${encodeURIComponent(minute_end)}`,
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
