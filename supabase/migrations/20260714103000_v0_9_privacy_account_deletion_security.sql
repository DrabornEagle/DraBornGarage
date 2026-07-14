-- DraBornGarage v0.9.0
-- Google Play privacy, account deletion request and release security hardening.

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'cancelled', 'rejected')),
  reason text,
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  processed_at timestamptz,
  admin_note text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists account_deletion_requests_status_requested_idx
  on public.account_deletion_requests(status, requested_at desc);

alter table public.account_deletion_requests enable row level security;
revoke all on table public.account_deletion_requests from public, anon, authenticated;

create or replace function public.account_privacy_status()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_request public.account_deletion_requests%rowtype;
  v_email text;
  v_is_admin boolean := false;
begin
  if v_user is null then
    raise exception 'Oturum gerekli';
  end if;

  select u.email into v_email from auth.users u where u.id = v_user;
  select coalesce(p.is_admin, false) into v_is_admin from public.profiles p where p.id = v_user;
  select * into v_request
  from public.account_deletion_requests
  where user_id = v_user;

  return jsonb_build_object(
    'user_id', v_user,
    'email', v_email,
    'is_admin', v_is_admin,
    'deletion_request', case when v_request.id is null then null else to_jsonb(v_request) end,
    'privacy_policy_version', '2026-07-14',
    'account_deletion_sla_days', 30
  );
end;
$$;

create or replace function public.account_request_deletion(p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_request public.account_deletion_requests%rowtype;
  v_is_admin boolean := false;
begin
  if v_user is null then
    raise exception 'Oturum gerekli';
  end if;

  select coalesce(p.is_admin, false) into v_is_admin from public.profiles p where p.id = v_user;

  insert into public.account_deletion_requests(
    user_id,
    status,
    reason,
    requested_at,
    updated_at,
    cancelled_at,
    processed_at,
    admin_note,
    metadata
  ) values (
    v_user,
    'pending',
    nullif(left(trim(coalesce(p_reason, '')), 500), ''),
    now(),
    now(),
    null,
    null,
    null,
    jsonb_build_object('source', 'mobile_app', 'app_version', '0.9.0', 'requires_admin_handover', v_is_admin)
  )
  on conflict (user_id) do update set
    status = 'pending',
    reason = excluded.reason,
    requested_at = now(),
    updated_at = now(),
    cancelled_at = null,
    processed_at = null,
    admin_note = null,
    metadata = excluded.metadata
  returning * into v_request;

  return jsonb_build_object(
    'accepted', true,
    'deletion_request', to_jsonb(v_request)
  );
end;
$$;

create or replace function public.account_cancel_deletion()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_count integer;
begin
  if v_user is null then
    raise exception 'Oturum gerekli';
  end if;

  update public.account_deletion_requests
  set status = 'cancelled',
      cancelled_at = now(),
      updated_at = now()
  where user_id = v_user
    and status = 'pending';

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

create or replace function public.account_role_access_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_is_admin boolean := false;
  v_memberships jsonb := '[]'::jsonb;
begin
  if v_user is null then
    raise exception 'Oturum gerekli';
  end if;

  select coalesce(p.is_admin, false) into v_is_admin from public.profiles p where p.id = v_user;
  select coalesce(jsonb_agg(jsonb_build_object(
    'workshop_id', wm.workshop_id,
    'role', wm.role,
    'is_active', wm.is_active,
    'availability_status', wm.availability_status
  ) order by wm.joined_at), '[]'::jsonb)
  into v_memberships
  from public.workshop_members wm
  where wm.user_id = v_user;

  return jsonb_build_object(
    'user_id', v_user,
    'is_admin', v_is_admin,
    'memberships', v_memberships,
    'capabilities', jsonb_build_object(
      'admin_all_workshops', v_is_admin,
      'customer_portal', true,
      'financial_access_requires_owner_or_mechanic', true,
      'apprentice_financial_access', false,
      'cross_workshop_access', v_is_admin
    ),
    'checked_at', now()
  );
end;
$$;

create or replace function public.admin_get_account_deletion_requests()
returns table (
  id uuid,
  user_id uuid,
  email text,
  full_name text,
  status text,
  reason text,
  requested_at timestamptz,
  updated_at timestamptz,
  processed_at timestamptz,
  admin_note text,
  metadata jsonb
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin yetkisi gerekli';
  end if;

  return query
  select r.id,
         r.user_id,
         u.email::text,
         p.full_name,
         r.status,
         r.reason,
         r.requested_at,
         r.updated_at,
         r.processed_at,
         r.admin_note,
         r.metadata
  from public.account_deletion_requests r
  join auth.users u on u.id = r.user_id
  left join public.profiles p on p.id = r.user_id
  order by case r.status when 'pending' then 1 when 'processing' then 2 else 3 end,
           r.requested_at;
end;
$$;

create or replace function public.admin_update_account_deletion_request(
  p_request_id uuid,
  p_status text,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.account_deletion_requests%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin yetkisi gerekli';
  end if;

  if p_status not in ('pending', 'processing', 'completed', 'cancelled', 'rejected') then
    raise exception 'Geçersiz durum';
  end if;

  update public.account_deletion_requests
  set status = p_status,
      admin_note = nullif(left(trim(coalesce(p_admin_note, '')), 1000), ''),
      processed_at = case when p_status in ('completed', 'rejected') then now() else processed_at end,
      cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end,
      updated_at = now()
  where id = p_request_id
  returning * into v_request;

  if v_request.id is null then
    raise exception 'Silme talebi bulunamadı';
  end if;

  return to_jsonb(v_request);
end;
$$;

-- New privacy RPCs are available only to signed-in users.
revoke all on function public.account_privacy_status() from public, anon;
revoke all on function public.account_request_deletion(text) from public, anon;
revoke all on function public.account_cancel_deletion() from public, anon;
revoke all on function public.account_role_access_snapshot() from public, anon;
revoke all on function public.admin_get_account_deletion_requests() from public, anon;
revoke all on function public.admin_update_account_deletion_request(uuid, text, text) from public, anon;

grant execute on function public.account_privacy_status() to authenticated;
grant execute on function public.account_request_deletion(text) to authenticated;
grant execute on function public.account_cancel_deletion() to authenticated;
grant execute on function public.account_role_access_snapshot() to authenticated;
grant execute on function public.admin_get_account_deletion_requests() to authenticated;
grant execute on function public.admin_update_account_deletion_request(uuid, text, text) to authenticated;

-- Release hardening: internal helpers must not be callable by anonymous clients.
revoke all on function public.compute_work_order_totals(uuid) from public, anon, authenticated;
revoke all on function public.refresh_work_order_totals(uuid) from public, anon, authenticated;
revoke all on function public.refresh_work_order_totals_after_quote() from public, anon, authenticated;
revoke all on function public.ensure_primary_admin_profile() from public, anon, authenticated;

-- These are authenticated application RPCs, never anonymous RPCs.
revoke all on function public.platform_get_charge_detail(uuid) from public, anon;
revoke all on function public.platform_workshop_today(uuid) from public, anon;
grant execute on function public.platform_get_charge_detail(uuid) to authenticated;
grant execute on function public.platform_workshop_today(uuid) to authenticated;
