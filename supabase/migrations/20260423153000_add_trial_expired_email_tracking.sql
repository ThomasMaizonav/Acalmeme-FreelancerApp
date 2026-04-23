alter table public.profiles
  add column if not exists trial_expired_email_sent boolean not null default false,
  add column if not exists trial_expired_email_sent_at timestamptz;
