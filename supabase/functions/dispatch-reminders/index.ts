// supabase/functions/dispatch-reminders/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
const TZ = "America/Sao_Paulo";
const ACCOUNT_TRIAL_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type ProfileRow = {
  id: string;
  user_id: string | null;
  free_trial_started_at: string | null;
  created_at: string | null;
  trial_expired_email_sent: boolean | null;
  trial_expired_email_sent_at: string | null;
};

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
    const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      return `${match[1].padStart(2, "0")}:${match[2]}`;
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

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
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

const hasValidFreeTrial = (profile: ProfileRow | undefined, nowMs: number) => {
  const trialStartIso = profile?.free_trial_started_at || profile?.created_at || null;
  if (!trialStartIso) return false;
  const trialStartMs = Date.parse(trialStartIso);
  if (!Number.isFinite(trialStartMs)) return false;
  return trialStartMs + ACCOUNT_TRIAL_DAYS * MS_PER_DAY > nowMs;
};

serve(async (req) => {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

    const cronSecret = (Deno.env.get("CRON_SECRET") || "").trim();
    const debug = new URL(req.url).searchParams.get("debug") === "1";

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
    const nowMinutes = toMinutes(hhmm);

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
    const uniqueUserIds = [
      ...new Set(
        (Array.isArray(reminders) ? reminders : [])
          .map((r: any) => (typeof r?.user_id === "string" ? r.user_id : ""))
          .filter(Boolean),
      ),
    ];

    const usersIn = uniqueUserIds.join(",");
    const nowMs = Date.now();

    const profileByUserId = new Map<string, ProfileRow>();
    const hasActiveSubscription = new Set<string>();
    const adminUsers = new Set<string>();
    const accessByUserId = new Map<
      string,
      {
        hasAccess: boolean;
        trialExpiredEmailSent: boolean;
      }
    >();

    if (uniqueUserIds.length > 0) {
      const profilesRes = await supabaseFetch(
        supabaseUrl,
        serviceRoleKey,
        `profiles?select=id,user_id,free_trial_started_at,created_at,trial_expired_email_sent,trial_expired_email_sent_at&id=in.(${usersIn})`,
      );
      if (!profilesRes.ok) {
        const t = await profilesRes.text();
        return json({ error: "failed_to_fetch_profiles", details: t }, 500);
      }

      const profiles = (await profilesRes.json()) as ProfileRow[];
      for (const p of profiles) {
        const key = p.user_id || p.id;
        if (key) profileByUserId.set(key, p);
      }

      const subscriptionsRes = await supabaseFetch(
        supabaseUrl,
        serviceRoleKey,
        `subscriptions?select=user_id,status&user_id=in.(${usersIn})&status=in.(active,trialing)`,
      );
      if (!subscriptionsRes.ok) {
        const t = await subscriptionsRes.text();
        return json({ error: "failed_to_fetch_subscriptions", details: t }, 500);
      }

      const subscriptions = (await subscriptionsRes.json()) as Array<{
        user_id: string | null;
        status: string;
      }>;
      for (const s of subscriptions) {
        if (s.user_id) hasActiveSubscription.add(s.user_id);
      }

      const adminsRes = await supabaseFetch(
        supabaseUrl,
        serviceRoleKey,
        `user_roles?select=user_id,role&user_id=in.(${usersIn})&role=eq.admin`,
      );
      if (!adminsRes.ok) {
        const t = await adminsRes.text();
        return json({ error: "failed_to_fetch_admin_roles", details: t }, 500);
      }

      const admins = (await adminsRes.json()) as Array<{ user_id: string | null; role: string }>;
      for (const a of admins) {
        if (a.user_id) adminUsers.add(a.user_id);
      }

      for (const userId of uniqueUserIds) {
        const profile = profileByUserId.get(userId);
        const hasAccess =
          adminUsers.has(userId) ||
          hasActiveSubscription.has(userId) ||
          hasValidFreeTrial(profile, nowMs);

        accessByUserId.set(userId, {
          hasAccess,
          trialExpiredEmailSent: Boolean(profile?.trial_expired_email_sent),
        });
      }
    }

    let checked = 0;
    let queued = 0;
    let skipped = 0;
    let skippedNoEmail = 0;
    let skippedDay = 0;
    let skippedTime = 0;
    let skippedNoAccess = 0;
    let trialExpiredNoticesSent = 0;
    const trialNoticeAttempted = new Set<string>();
    const matches: Array<{ reminder_id: string; reminder_time_id: string; scheduled_time: string }> = [];

    for (const r of reminders) {
      checked++;

      if (!r.email) {
        skipped++;
        skippedNoEmail++;
        continue;
      }
      const userId = typeof r.user_id === "string" ? r.user_id : "";
      const userAccess = userId ? accessByUserId.get(userId) : undefined;
      if (userAccess && !userAccess.hasAccess) {
        if (!userAccess.trialExpiredEmailSent && !trialNoticeAttempted.has(userId) && r.email) {
          trialNoticeAttempted.add(userId);

          const trialEndedSendRes = await fetch(sendEmailUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${cronSecret}`,
            },
            body: JSON.stringify({
              to: r.email,
              subject: "Seu período de teste terminou",
              text:
                "Seu teste grátis de 30 dias terminou e os lembretes por e-mail foram pausados. Assine o Premium para voltar a receber os lembretes por e-mail.",
            }),
          });

          if (trialEndedSendRes.ok) {
            const markSentRes = await supabaseFetch(
              supabaseUrl,
              serviceRoleKey,
              `profiles?id=eq.${userId}`,
              {
                method: "PATCH",
                body: JSON.stringify({
                  trial_expired_email_sent: true,
                  trial_expired_email_sent_at: new Date().toISOString(),
                }),
              },
            );

            if (markSentRes.ok) {
              userAccess.trialExpiredEmailSent = true;
              trialExpiredNoticesSent++;
            }
          }
        }

        skipped++;
        skippedNoAccess++;
        continue;
      }
      const allowed = Array.isArray(r.days_of_week) ? r.days_of_week : [];
      const allowedNums = allowed.map((value: unknown) => Number(value)).filter(Number.isFinite);
      if (!allowedNums.includes(dow)) {
        skipped++;
        skippedDay++;
        continue;
      }

      const times = (r.reminder_times ?? []).filter((t: any) => t.is_active ?? true);
      for (const t of times) {
        const st = normalizeScheduledTime(t.scheduled_time);
        if (!st) {
          skipped++;
          skippedTime++;
          continue;
        }
        const stMinutes = toMinutes(st);
        if (stMinutes === null || nowMinutes === null || stMinutes !== nowMinutes) {
          skipped++;
          skippedTime++;
          continue;
        }

        if (debug) {
          matches.push({
            reminder_id: r.id,
            reminder_time_id: t.id,
            scheduled_time: st,
          });
        }

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
            body: JSON.stringify({ status: "sent", sent_at: new Date().toISOString() }),
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
      skipped_no_access: skippedNoAccess,
      trial_expired_notices_sent: trialExpiredNoticesSent,
      ...(debug
        ? {
            skipped_no_email: skippedNoEmail,
            skipped_day: skippedDay,
            skipped_time: skippedTime,
            matches,
          }
        : {}),
    });
  } catch (e) {
    return json({ error: "unexpected", message: String(e) }, 500);
  }
});
