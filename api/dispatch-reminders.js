export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    res.status(500).json({ error: "Missing CRON_SECRET" });
    return;
  }

  const url =
    process.env.SUPABASE_DISPATCH_URL ||
    "https://zdegrjywuybymohxtfxy.supabase.co/functions/v1/dispatch-reminders";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      "Content-Type": "application/json",
    },
  });

  const text = await response.text();
  res.status(response.status).send(text);
}
