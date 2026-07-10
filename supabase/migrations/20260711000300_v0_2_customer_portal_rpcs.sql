create or replace function public.customer_get_workshops()
returns table (
  link_id uuid,
  workshop_id uuid,
  workshop_name text,
  workshop_phone text,
  workshop_address text,
  customer_id uuid,
  customer_name text,
  linked_at timestamptz,
  link_method text
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (cl.workshop_id)
    cl.id,
    cl.workshop_id,
    w.name,
    w.phone,
    w.address,
    cl.customer_id,
    c.full_name,
    cl.approved_at,
    cl.method
  from public.customer_links cl
  join public.workshops w on w.id = cl.workshop_id and w.is_active
  join public.customers c on c.id = cl.customer_id
  where cl.user_id = auth.uid() and cl.status = 'approved'
  order by cl.workshop_id, cl.approved_at desc nulls last;
$$;

create or replace function public.customer_get_motorcycles(p_workshop_id uuid)
returns table (
  id uuid,
  customer_id uuid,
  brand text,
  model text,
  year integer,
  plate text,
  color text,
  odometer integer,
  service_count bigint,
  active_service_count bigint,
  last_service_at timestamptz,
  latest_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    m.customer_id,
    m.brand,
    m.model,
    m.year,
    m.plate,
    m.color,
    m.odometer,
    count(wo.id) as service_count,
    count(wo.id) filter (where wo.status not in ('delivered'::public.work_order_status, 'cancelled'::public.work_order_status)) as active_service_count,
    max(wo.arrived_at) as last_service_at,
    (array_agg(wo.status::text order by wo.arrived_at desc) filter (where wo.id is not null))[1] as latest_status
  from public.motorcycles m
  join public.customer_links cl on cl.customer_id = m.customer_id
    and cl.workshop_id = m.workshop_id
    and cl.user_id = auth.uid()
    and cl.status = 'approved'
  left join public.work_orders wo on wo.motorcycle_id = m.id
  where m.workshop_id = p_workshop_id
  group by m.id, m.customer_id, m.brand, m.model, m.year, m.plate, m.color, m.odometer
  order by max(wo.arrived_at) desc nulls last, m.created_at desc;
$$;

create or replace function public.customer_get_services(p_workshop_id uuid)
returns table (
  id uuid,
  workshop_id uuid,
  workshop_name text,
  motorcycle_id uuid,
  brand text,
  model text,
  plate text,
  status text,
  service_type text,
  complaint text,
  price_type text,
  estimated_price_min numeric,
  estimated_price_max numeric,
  quoted_price numeric,
  total_amount numeric,
  amount_received numeric,
  remaining_amount numeric,
  payment_status text,
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  delivered_at timestamptz,
  service_items jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    wo.id,
    wo.workshop_id,
    w.name,
    wo.motorcycle_id,
    m.brand,
    m.model,
    m.plate,
    wo.status::text,
    wo.service_type::text,
    wo.complaint,
    wo.price_type::text,
    wo.estimated_price_min,
    wo.estimated_price_max,
    wo.quoted_price,
    wo.total_amount,
    wo.amount_received,
    greatest(0, wo.total_amount - wo.amount_received),
    wo.payment_status::text,
    wo.arrived_at,
    wo.started_at,
    wo.completed_at,
    wo.delivered_at,
    coalesce((
      select jsonb_agg(jsonb_build_object('title', s.title, 'price', s.price, 'completed', s.completed) order by s.created_at)
      from public.work_order_services s
      where s.work_order_id = wo.id
    ), '[]'::jsonb)
  from public.work_orders wo
  join public.workshops w on w.id = wo.workshop_id
  join public.motorcycles m on m.id = wo.motorcycle_id
  join public.customer_links cl on cl.customer_id = wo.customer_id
    and cl.workshop_id = wo.workshop_id
    and cl.user_id = auth.uid()
    and cl.status = 'approved'
  where wo.workshop_id = p_workshop_id
  order by wo.arrived_at desc;
$$;

create or replace function public.customer_get_claims()
returns table (
  id uuid,
  workshop_id uuid,
  workshop_name text,
  motorcycle_id uuid,
  brand text,
  model text,
  plate text,
  method text,
  status text,
  created_at timestamptz,
  reviewed_at timestamptz,
  review_note text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cc.id,
    cc.workshop_id,
    w.name,
    cc.motorcycle_id,
    m.brand,
    m.model,
    m.plate,
    cc.method,
    case when cc.status = 'pending' and cc.expires_at < now() then 'expired' else cc.status end,
    cc.created_at,
    cc.reviewed_at,
    cc.review_note
  from public.customer_claims cc
  join public.workshops w on w.id = cc.workshop_id
  join public.motorcycles m on m.id = cc.motorcycle_id
  where cc.user_id = auth.uid()
  order by cc.created_at desc;
$$;

create or replace function public.staff_get_customer_claims(p_workshop_id uuid)
returns table (
  id uuid,
  user_id uuid,
  claimant_name text,
  claimant_phone text,
  customer_id uuid,
  customer_name text,
  motorcycle_id uuid,
  brand text,
  model text,
  plate text,
  method text,
  status text,
  submitted_phone text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_workshop_owner(p_workshop_id) and not public.is_workshop_worker(p_workshop_id) then
    raise exception 'Eşleşme taleplerini görme yetkiniz yok';
  end if;
  return query
  select
    cc.id,
    cc.user_id,
    p.full_name,
    p.phone,
    cc.customer_id,
    c.full_name,
    cc.motorcycle_id,
    m.brand,
    m.model,
    m.plate,
    cc.method,
    case when cc.status = 'pending' and cc.expires_at < now() then 'expired' else cc.status end,
    cc.submitted_phone,
    cc.created_at
  from public.customer_claims cc
  join public.profiles p on p.id = cc.user_id
  join public.customers c on c.id = cc.customer_id
  join public.motorcycles m on m.id = cc.motorcycle_id
  where cc.workshop_id = p_workshop_id
  order by (cc.status = 'pending') desc, cc.created_at desc;
end;
$$;

create or replace function public.staff_review_customer_claim(p_claim_id uuid, p_approve boolean, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare rec record;
begin
  select * into rec from public.customer_claims where id = p_claim_id;
  if rec.id is null then raise exception 'Eşleşme talebi bulunamadı'; end if;
  if not public.is_workshop_owner(rec.workshop_id) and not public.is_workshop_worker(rec.workshop_id) then
    raise exception 'Bu talebi onaylama yetkiniz yok';
  end if;
  if rec.status <> 'pending' then raise exception 'Bu talep daha önce sonuçlandırılmış'; end if;

  update public.customer_claims
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = nullif(trim(p_note), ''),
      updated_at = now()
  where id = p_claim_id;

  if p_approve then
    perform public.approve_customer_link(rec.user_id, rec.customer_id, rec.workshop_id, 'mechanic_approval', auth.uid());
  end if;

  return jsonb_build_object('status', case when p_approve then 'approved' else 'rejected' end);
end;
$$;

create or replace function public.staff_get_customer_access(p_motorcycle_id uuid)
returns table (
  work_order_id uuid,
  tracking_code text,
  claim_token uuid,
  qr_payload text,
  status text,
  arrived_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare target_workshop uuid;
begin
  select workshop_id into target_workshop from public.motorcycles where id = p_motorcycle_id;
  if target_workshop is null then raise exception 'Motosiklet bulunamadı'; end if;
  if not public.is_workshop_owner(target_workshop) and not public.is_workshop_worker(target_workshop) then
    raise exception 'Servis erişim kodunu görme yetkiniz yok';
  end if;
  return query
  select wo.id, wo.tracking_code, wo.claim_token,
    'draborngarage://claim?token=' || wo.claim_token::text,
    wo.status::text,
    wo.arrived_at
  from public.work_orders wo
  where wo.motorcycle_id = p_motorcycle_id
  order by wo.arrived_at desc
  limit 1;
end;
$$;

alter table public.customer_links enable row level security;
alter table public.customer_claims enable row level security;

drop policy if exists customer_links_select on public.customer_links;
create policy customer_links_select on public.customer_links for select to authenticated
using (
  user_id = (select auth.uid())
  or public.is_workshop_owner(workshop_id)
  or public.is_workshop_worker(workshop_id)
);

drop policy if exists customer_claims_select on public.customer_claims;
create policy customer_claims_select on public.customer_claims for select to authenticated
using (
  user_id = (select auth.uid())
  or public.is_workshop_owner(workshop_id)
  or public.is_workshop_worker(workshop_id)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, account_mode)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case when new.raw_user_meta_data ->> 'account_mode' = 'customer' then 'customer' else 'staff' end
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      phone = coalesce(excluded.phone, public.profiles.phone),
      account_mode = excluded.account_mode,
      updated_at = now();
  return new;
end;
$$;

revoke execute on function public.customer_get_workshops() from public, anon;
revoke execute on function public.customer_get_motorcycles(uuid) from public, anon;
revoke execute on function public.customer_get_services(uuid) from public, anon;
revoke execute on function public.customer_get_claims() from public, anon;
revoke execute on function public.staff_get_customer_claims(uuid) from public, anon;
revoke execute on function public.staff_review_customer_claim(uuid, boolean, text) from public, anon;
revoke execute on function public.staff_get_customer_access(uuid) from public, anon;
grant execute on function public.customer_get_workshops() to authenticated;
grant execute on function public.customer_get_motorcycles(uuid) to authenticated;
grant execute on function public.customer_get_services(uuid) to authenticated;
grant execute on function public.customer_get_claims() to authenticated;
grant execute on function public.staff_get_customer_claims(uuid) to authenticated;
grant execute on function public.staff_review_customer_claim(uuid, boolean, text) to authenticated;
grant execute on function public.staff_get_customer_access(uuid) to authenticated;
