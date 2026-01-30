alter table public.reminder_logs
  add column if not exists reminder_time_id uuid,
  add column if not exists user_id uuid,
  add column if not exists scheduled_for timestamptz,
  add column if not exists channel text;

create index if not exists reminder_logs_reminder_time_id_idx
  on public.reminder_logs (reminder_time_id);

create index if not exists reminder_logs_scheduled_for_idx
  on public.reminder_logs (scheduled_for);
