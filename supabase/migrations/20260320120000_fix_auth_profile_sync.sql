alter table public.profiles
  add column if not exists user_id uuid;

update public.profiles
set user_id = id
where user_id is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_user_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
exception
  when duplicate_object then
    null;
end
$$;

create unique index if not exists profiles_user_id_key
  on public.profiles (user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (
    id,
    user_id,
    email,
    full_name,
    phone,
    free_trial_started_at,
    free_trial_used,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.id,
    new.email,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), ''),
    now(),
    false,
    now(),
    now()
  )
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    updated_at = now();

  return new;
end;
$$;

create or replace function public.handle_updated_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update public.profiles
  set
    user_id = new.id,
    email = new.email,
    full_name = coalesce(
      nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
      public.profiles.full_name
    ),
    phone = coalesce(
      nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), ''),
      public.profiles.phone
    ),
    updated_at = now()
  where id = new.id or user_id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, raw_user_meta_data on auth.users
  for each row
  when (
    old.email is distinct from new.email
    or old.raw_user_meta_data is distinct from new.raw_user_meta_data
  )
  execute function public.handle_updated_user();
