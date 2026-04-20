alter table if exists public.reminders
  add column if not exists send_push boolean;

update public.reminders
set send_push = true
where send_push is null;

alter table if exists public.reminders
  alter column send_push set default true;

alter table if exists public.reminders
  alter column send_push set not null;
