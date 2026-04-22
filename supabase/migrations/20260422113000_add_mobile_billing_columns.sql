alter table public.subscriptions
  add column if not exists billing_provider text not null default 'stripe',
  add column if not exists billing_store text,
  add column if not exists billing_product_id text,
  add column if not exists billing_management_url text,
  add column if not exists revenuecat_app_user_id text,
  add column if not exists revenuecat_original_app_user_id text;

update public.subscriptions
set billing_provider = coalesce(nullif(billing_provider, ''), 'stripe')
where billing_provider is null or billing_provider = '';

create index if not exists subscriptions_revenuecat_app_user_id_idx
  on public.subscriptions (revenuecat_app_user_id);

create index if not exists subscriptions_revenuecat_original_app_user_id_idx
  on public.subscriptions (revenuecat_original_app_user_id);
