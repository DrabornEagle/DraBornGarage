-- DraBornGarage v1.1.8
-- 1) A staff-created customer/motorcycle can be claimed while the customer signs up.
-- 2) The work order's selected mechanic is the authoritative owner of the recorded job amount.

create table if not exists public.customer_registration_links (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  motorcycle_id uuid not null references public.motorcycles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  registration_token uuid not null default gen_random_uuid() unique,
  registration_code text not null unique,
  expires_at timestamptz not null default (now() + interval '30 days'),
  used_by uuid references public.profiles(id) on delete set null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_registration_links_code_check check (registration_code ~ '^[A-F0-9]{10}$')
);

alter table public.customer_registration_links enable row level security;
revoke all on table public.customer_registration_links from public, anon, authenticated;

create index if not exists customer_registration_links_lookup_code_idx
  on public.customer_registration_links(registration_code);
create index if not exists customer_registration_links_lookup_token_idx
  on public.customer_registration_links(registration_token);
create unique index if not exists customer_registration_links_one_open_per_motorcycle_idx
  on public.customer_registration_links(motorcycle_id)
  where used_at is null and revoked_at is null;

create or replace function public.customer_registration_link_id(p_credential text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_raw text := trim(coalesce(p_credential, ''));
  v_token_text text;
  v_token uuid;
  v_code text;
  v_id uuid;
begin
  if v_raw = '' then return null; end if;

  v_token_text := substring(v_raw from '(?i)token=([0-9a-f-]{36})');
  if v_token_text is null and v_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    v_token_text := v_raw;
  end if;

  if v_token_text is not null then
    v_token := v_token_text::uuid;
  else
    v_code := upper(regexp_replace(v_raw, '[^A-Za-z0-9]', '', 'g'));
  end if;

  select l.id into v_id
  from public.customer_registration_links l
  where l.used_at is null
    and l.revoked_at is null
    and l.expires_at > now()
    and ((v_token is not null and l.registration_token = v_token)
      or (v_token is null and l.registration_code = v_code))
  order by l.created_at desc
  limit 1;

  return v_id;
end;
$$;

create or replace function public.staff_create_customer_registration_link(p_motorcycle_id uuid)
returns table(
  registration_code text,
  registration_token uuid,
  qr_payload text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_motorcycle public.motorcycles%rowtype;
  v_link public.customer_registration_links%rowtype;
  v_code text;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;

  select * into v_motorcycle
  from public.motorcycles
  where id = p_motorcycle_id;

  if v_motorcycle.id is null then raise exception 'Motosiklet bulunamadı'; end if;
  if not public.is_workshop_owner(v_motorcycle.workshop_id)
     and not public.is_workshop_worker(v_motorcycle.workshop_id) then
    raise exception 'Bu müşteri için kayıt kodu oluşturma yetkiniz yok';
  end if;

  update public.customer_registration_links
  set revoked_at = now(), updated_at = now()
  where motorcycle_id = p_motorcycle_id
    and used_at is null
    and revoked_at is null
    and expires_at <= now();

  select * into v_link
  from public.customer_registration_links
  where motorcycle_id = p_motorcycle_id
    and used_at is null
    and revoked_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if v_link.id is null then
    loop
      v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
      exit when not exists (
        select 1 from public.customer_registration_links where registration_code = v_code
      );
    end loop;

    insert into public.customer_registration_links(
      workshop_id, customer_id, motorcycle_id, created_by, registration_code
    ) values (
      v_motorcycle.workshop_id, v_motorcycle.customer_id, v_motorcycle.id, auth.uid(), v_code
    ) returning * into v_link;
  end if;

  return query select
    v_link.registration_code,
    v_link.registration_token,
    'draborngarage://register?token=' || v_link.registration_token::text,
    v_link.expires_at;
end;
$$;

create or replace function public.public_validate_customer_registration_link(p_credential text)
returns table(
  valid boolean,
  workshop_name text,
  motorcycle_label text,
  expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_link_id uuid;
begin
  v_link_id := public.customer_registration_link_id(p_credential);
  if v_link_id is null then
    return query select false, null::text, null::text, null::timestamptz;
    return;
  end if;

  return query
  select true,
         w.name,
         trim(concat_ws(' ', m.brand, m.model, nullif(m.plate, ''))),
         l.expires_at
  from public.customer_registration_links l
  join public.workshops w on w.id = l.workshop_id and w.is_active
  join public.motorcycles m on m.id = l.motorcycle_id
  join public.customers c on c.id = l.customer_id
  where l.id = v_link_id
    and m.workshop_id = l.workshop_id
    and m.customer_id = l.customer_id
    and c.workshop_id = l.workshop_id;
end;
$$;

create or replace function public.apply_customer_registration_link_after_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_metadata jsonb;
  v_credential text;
  v_link_id uuid;
  v_link public.customer_registration_links%rowtype;
  v_motorcycle public.motorcycles%rowtype;
begin
  select u.raw_user_meta_data into v_metadata
  from auth.users u
  where u.id = new.id;

  v_credential := nullif(trim(coalesce(v_metadata ->> 'customer_registration_code', '')), '');
  if v_credential is null then return new; end if;

  v_link_id := public.customer_registration_link_id(v_credential);
  if v_link_id is null then
    raise exception 'Kayıt QR / kodu geçersiz, kullanılmış veya süresi dolmuş';
  end if;

  select * into v_link
  from public.customer_registration_links
  where id = v_link_id
  for update;

  if v_link.id is null or v_link.used_at is not null or v_link.revoked_at is not null or v_link.expires_at <= now() then
    raise exception 'Kayıt QR / kodu artık kullanılamıyor';
  end if;

  select * into v_motorcycle
  from public.motorcycles
  where id = v_link.motorcycle_id
    and workshop_id = v_link.workshop_id
    and customer_id = v_link.customer_id;

  if v_motorcycle.id is null then
    raise exception 'Kayıt kodundaki müşteri ve motosiklet kaydı tutarsız';
  end if;

  perform public.approve_customer_link(
    new.id,
    v_link.customer_id,
    v_link.workshop_id,
    'qr',
    v_link.created_by
  );

  update public.profiles
  set account_mode = 'customer',
      customer_plate = coalesce(v_motorcycle.plate, customer_plate),
      customer_motorcycle_brand = coalesce(v_motorcycle.brand, customer_motorcycle_brand),
      customer_motorcycle_model = coalesce(v_motorcycle.model, customer_motorcycle_model),
      customer_motorcycle_odometer = coalesce(v_motorcycle.odometer, customer_motorcycle_odometer),
      updated_at = now()
  where id = new.id;

  update public.customers
  set phone = coalesce(nullif(phone, ''), new.phone),
      updated_at = now()
  where id = v_link.customer_id;

  update public.customer_registration_links
  set used_by = new.id,
      used_at = now(),
      updated_at = now()
  where id = v_link.id;

  return new;
end;
$$;

-- The existing auth-user trigger creates profiles first. This AFTER INSERT trigger then
-- consumes the optional one-time credential and opens the already existing customer link.
drop trigger if exists zz_apply_customer_registration_link on public.profiles;
create trigger zz_apply_customer_registration_link
after insert on public.profiles
for each row execute function public.apply_customer_registration_link_after_profile();

-- Selected mechanic ownership is authoritative. Business totals still aggregate all orders,
-- while mechanic totals receive the full recorded order amount exactly once.
create or replace function public.mechanic_order_recorded_amount(
  p_work_order_id uuid,
  p_mechanic_id uuid
)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(case
    when wo.assigned_mechanic_id is distinct from p_mechanic_id then 0
    when wo.status in ('ready','completed','delivered') then greatest(coalesce(wo.total_amount, 0), 0)
    else coalesce((
      select sum(coalesce(s.price, 0))
      from public.work_order_services s
      where s.work_order_id = wo.id and s.completed
    ), 0)
  end, 0)::numeric
  from public.work_orders wo
  where wo.id = p_work_order_id;
$$;

comment on table public.customer_registration_links is
  'One-time staff-issued credentials used only while a new customer account is created.';
comment on function public.mechanic_order_recorded_amount(uuid,uuid) is
  'Returns the selected mechanic-owned amount for one work order; final jobs use the full work order total exactly once.';

revoke all on function public.customer_registration_link_id(text) from public, anon, authenticated;
revoke all on function public.staff_create_customer_registration_link(uuid) from public, anon, authenticated;
revoke all on function public.public_validate_customer_registration_link(text) from public, anon, authenticated;
revoke all on function public.apply_customer_registration_link_after_profile() from public, anon, authenticated;
revoke all on function public.mechanic_order_recorded_amount(uuid,uuid) from public, anon, authenticated;

grant execute on function public.staff_create_customer_registration_link(uuid) to authenticated;
grant execute on function public.public_validate_customer_registration_link(text) to anon, authenticated;
