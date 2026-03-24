alter table public.profiles
  add column if not exists user_id uuid,
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists timezone text,
  add column if not exists free_trial_started_at timestamptz,
  add column if not exists free_trial_used boolean default false,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.profiles
set
  free_trial_used = coalesce(free_trial_used, false),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where
  free_trial_used is null
  or created_at is null
  or updated_at is null;

do $$
begin
  update public.profiles p
  set user_id = p.id
  where p.user_id is null
    and exists (
      select 1
      from auth.users u
      where u.id = p.id
    );

  update public.profiles p
  set user_id = null
  where p.user_id is not null
    and not exists (
      select 1
      from auth.users u
      where u.id = p.user_id
    );

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
  when others then
    null;
end
$$;

do $$
begin
  create unique index if not exists profiles_user_id_key
    on public.profiles (user_id);
exception
  when others then
    null;
end
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
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
      free_trial_started_at = coalesce(public.profiles.free_trial_started_at, excluded.free_trial_started_at),
      free_trial_used = coalesce(public.profiles.free_trial_used, excluded.free_trial_used, false),
      updated_at = now();
  exception
    when others then
      raise warning 'handle_new_user failed for user %: %', new.id, sqlerrm;
  end;

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
  exception
    when others then
      raise warning 'handle_updated_user failed for user %: %', new.id, sqlerrm;
  end;

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
