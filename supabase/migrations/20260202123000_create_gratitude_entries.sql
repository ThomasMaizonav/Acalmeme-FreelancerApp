create table if not exists public.gratitude_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  items text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists gratitude_entries_user_date_idx
  on public.gratitude_entries (user_id, entry_date);

alter table public.gratitude_entries enable row level security;

create policy "Users can view own gratitude entries"
  on public.gratitude_entries
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own gratitude entries"
  on public.gratitude_entries
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own gratitude entries"
  on public.gratitude_entries
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
