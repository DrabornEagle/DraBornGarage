do $$ begin
  create type public.platform_billing_cycle as enum ('weekly','monthly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.platform_payment_report_status as enum ('pending','approved','rejected','cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.platform_global_settings (
  id smallint primary key default 1 check (id=1),
  default_fee_per_order numeric(12,2) not null default 20 check (default_fee_per_order>=0),
  bank_name text,
  account_holder text,
  iban text,
  payment_note text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.platform_global_settings(id,default_fee_per_order)
values(1,20) on conflict(id) do nothing;

create table if not exists public.workshop_platform_settings (
  workshop_id uuid primary key references public.workshops(id) on delete cascade,
  fee_per_order numeric(12,2) not null default 20 check (fee_per_order>=0),
  billing_cycle public.platform_billing_cycle not null default 'monthly',
  weekly_due_day smallint not null default 1 check (weekly_due_day between 1 and 7),
  monthly_due_day smallint not null default 1 check (monthly_due_day=0 or monthly_due_day between 1 and 28),
  starts_on date not null default current_date,
  is_enabled boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.workshop_platform_settings(workshop_id,fee_per_order)
select w.id,g.default_fee_per_order
from public.workshops w cross join public.platform_global_settings g
where g.id=1
on conflict(workshop_id) do nothing;

create table if not exists public.platform_fee_charges (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  work_order_id uuid not null unique references public.work_orders(id) on delete cascade,
  fee_per_order numeric(12,2) not null check (fee_per_order>=0),
  amount numeric(12,2) not null check (amount>=0),
  charge_date date not null,
  source_status public.work_order_status not null,
  charged_at timestamptz not null default now(),
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_fee_statements (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  cycle_start date not null,
  cycle_end date not null,
  due_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workshop_id,cycle_start,cycle_end),
  check(cycle_end>=cycle_start)
);

create table if not exists public.platform_payment_reports (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  reported_by uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  amount numeric(12,2) not null check (amount>0),
  payment_date date not null default current_date,
  note text,
  receipt_path text,
  status public.platform_payment_report_status not null default 'pending',
  admin_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  demo_batch_id uuid references public.demo_batches(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_payment_allocations (
  payment_report_id uuid not null references public.platform_payment_reports(id) on delete cascade,
  statement_id uuid not null references public.platform_fee_statements(id) on delete cascade,
  amount numeric(12,2) not null check (amount>0),
  created_at timestamptz not null default now(),
  primary key(payment_report_id,statement_id)
);

create index if not exists idx_platform_charges_workshop_date on public.platform_fee_charges(workshop_id,charge_date desc) where voided_at is null;
create index if not exists idx_platform_charges_order on public.platform_fee_charges(work_order_id);
create index if not exists idx_platform_statements_workshop_period on public.platform_fee_statements(workshop_id,cycle_start desc,due_date);
create index if not exists idx_platform_reports_workshop_status on public.platform_payment_reports(workshop_id,status,created_at desc);
create index if not exists idx_platform_reports_reported_by on public.platform_payment_reports(reported_by,created_at desc);
create index if not exists idx_platform_reports_reviewed_by on public.platform_payment_reports(reviewed_by) where reviewed_by is not null;
create index if not exists idx_platform_reports_demo on public.platform_payment_reports(demo_batch_id) where demo_batch_id is not null;
create index if not exists idx_platform_allocations_statement on public.platform_payment_allocations(statement_id);

create or replace function public.create_default_platform_settings_for_workshop()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_default numeric(12,2);
begin
  select default_fee_per_order into v_default from public.platform_global_settings where id=1;
  insert into public.workshop_platform_settings(workshop_id,fee_per_order)
  values(new.id,coalesce(v_default,20)) on conflict(workshop_id) do nothing;
  return new;
end; $$;

drop trigger if exists workshop_platform_settings_after_insert on public.workshops;
create trigger workshop_platform_settings_after_insert
after insert on public.workshops for each row execute function public.create_default_platform_settings_for_workshop();

create or replace function public.platform_period_values(
  p_cycle public.platform_billing_cycle,
  p_reference date,
  p_weekly_due_day smallint,
  p_monthly_due_day smallint
)
returns table(cycle_start date,cycle_end date,due_date date)
language plpgsql immutable set search_path=public as $$
declare
  v_next_month date;
  v_offset int;
begin
  if p_cycle='weekly' then
    cycle_start := p_reference-(extract(isodow from p_reference)::int-1);
    cycle_end := cycle_start+6;
    v_offset := (p_weekly_due_day-extract(isodow from cycle_end)::int+7)%7;
    if v_offset=0 then v_offset:=7; end if;
    due_date := cycle_end+v_offset;
  else
    cycle_start := date_trunc('month',p_reference)::date;
    cycle_end := (cycle_start+interval '1 month-1 day')::date;
    v_next_month := cycle_end+1;
    if p_monthly_due_day=0 then
      due_date := (v_next_month+interval '1 month-1 day')::date;
    else
      due_date := v_next_month+(p_monthly_due_day-1);
    end if;
  end if;
  return next;
end; $$;

create or replace function public.platform_ensure_statements(p_workshop_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  s public.workshop_platform_settings%rowtype;
  v_cursor date;
  v_current_start date;
  v_values record;
  v_guard int:=0;
begin
  select * into s from public.workshop_platform_settings where workshop_id=p_workshop_id;
  if not found then return; end if;

  select * into v_values from public.platform_period_values(s.billing_cycle,s.starts_on,s.weekly_due_day,s.monthly_due_day);
  v_cursor:=v_values.cycle_start;
  select cycle_start into v_current_start from public.platform_period_values(s.billing_cycle,current_date,s.weekly_due_day,s.monthly_due_day);

  while v_cursor<=v_current_start loop
    select * into v_values from public.platform_period_values(s.billing_cycle,v_cursor,s.weekly_due_day,s.monthly_due_day);
    insert into public.platform_fee_statements(workshop_id,cycle_start,cycle_end,due_date)
    values(p_workshop_id,v_values.cycle_start,v_values.cycle_end,v_values.due_date)
    on conflict(workshop_id,cycle_start,cycle_end) do update set due_date=excluded.due_date,updated_at=now();
    v_cursor:=v_values.cycle_end+1;
    v_guard:=v_guard+1;
    if v_guard>600 then raise exception 'Platform dönem sınırı aşıldı'; end if;
  end loop;
end; $$;

create or replace function public.platform_sync_eligible_orders(p_workshop_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare v_count int:=0;
begin
  insert into public.platform_fee_charges(workshop_id,work_order_id,fee_per_order,amount,charge_date,source_status,charged_at)
  select wo.workshop_id,wo.id,s.fee_per_order,s.fee_per_order,
    (coalesce(wo.delivered_at,wo.ready_at,wo.completed_at,wo.updated_at,now()) at time zone coalesce(w.timezone,'Europe/Istanbul'))::date,
    wo.status,coalesce(wo.delivered_at,wo.ready_at,wo.completed_at,wo.updated_at,now())
  from public.work_orders wo
  join public.workshops w on w.id=wo.workshop_id
  join public.workshop_platform_settings s on s.workshop_id=wo.workshop_id
  where wo.workshop_id=p_workshop_id and s.is_enabled
    and wo.status in ('ready','completed','delivered')
    and (coalesce(wo.delivered_at,wo.ready_at,wo.completed_at,wo.updated_at,now()) at time zone coalesce(w.timezone,'Europe/Istanbul'))::date>=s.starts_on
  on conflict(work_order_id) do update set
    source_status=excluded.source_status,
    voided_at=null,
    void_reason=null,
    updated_at=now();
  get diagnostics v_count=row_count;
  return v_count;
end; $$;

create or replace function public.sync_platform_charge_from_work_order()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  s public.workshop_platform_settings%rowtype;
  v_timezone text;
  v_charge_time timestamptz;
  v_charge_date date;
begin
  if new.status='cancelled' then
    update public.platform_fee_charges set voided_at=coalesce(voided_at,now()),void_reason='Servis iptal edildi',updated_at=now()
    where work_order_id=new.id and voided_at is null;
    return new;
  end if;

  if new.status not in ('ready','completed','delivered') then return new; end if;
  select * into s from public.workshop_platform_settings where workshop_id=new.workshop_id;
  if not found or not s.is_enabled then return new; end if;
  select coalesce(timezone,'Europe/Istanbul') into v_timezone from public.workshops where id=new.workshop_id;
  v_charge_time:=coalesce(new.delivered_at,new.ready_at,new.completed_at,new.updated_at,now());
  v_charge_date:=(v_charge_time at time zone v_timezone)::date;
  if v_charge_date<s.starts_on then return new; end if;

  insert into public.platform_fee_charges(workshop_id,work_order_id,fee_per_order,amount,charge_date,source_status,charged_at)
  values(new.workshop_id,new.id,s.fee_per_order,s.fee_per_order,v_charge_date,new.status,v_charge_time)
  on conflict(work_order_id) do update set source_status=excluded.source_status,voided_at=null,void_reason=null,updated_at=now();
  return new;
end; $$;

drop trigger if exists work_order_platform_charge_after_change on public.work_orders;
create trigger work_order_platform_charge_after_change
after insert or update of status,completed_at,ready_at,delivered_at on public.work_orders
for each row execute function public.sync_platform_charge_from_work_order();

create trigger platform_global_settings_updated_at before update on public.platform_global_settings for each row execute function public.set_updated_at();
create trigger workshop_platform_settings_updated_at before update on public.workshop_platform_settings for each row execute function public.set_updated_at();
create trigger platform_fee_charges_updated_at before update on public.platform_fee_charges for each row execute function public.set_updated_at();
create trigger platform_fee_statements_updated_at before update on public.platform_fee_statements for each row execute function public.set_updated_at();
create trigger platform_payment_reports_updated_at before update on public.platform_payment_reports for each row execute function public.set_updated_at();

alter table public.platform_global_settings enable row level security;
alter table public.workshop_platform_settings enable row level security;
alter table public.platform_fee_charges enable row level security;
alter table public.platform_fee_statements enable row level security;
alter table public.platform_payment_reports enable row level security;
alter table public.platform_payment_allocations enable row level security;

drop policy if exists platform_global_settings_select on public.platform_global_settings;
create policy platform_global_settings_select on public.platform_global_settings for select to authenticated using (
  public.is_admin() or exists(select 1 from public.workshop_members wm where wm.user_id=auth.uid() and wm.is_active and wm.role in ('owner','owner_mechanic'))
);

drop policy if exists workshop_platform_settings_select on public.workshop_platform_settings;
create policy workshop_platform_settings_select on public.workshop_platform_settings for select to authenticated using(public.is_workshop_owner(workshop_id));

drop policy if exists platform_fee_charges_select on public.platform_fee_charges;
create policy platform_fee_charges_select on public.platform_fee_charges for select to authenticated using(public.is_workshop_owner(workshop_id));

drop policy if exists platform_fee_statements_select on public.platform_fee_statements;
create policy platform_fee_statements_select on public.platform_fee_statements for select to authenticated using(public.is_workshop_owner(workshop_id));

drop policy if exists platform_payment_reports_select on public.platform_payment_reports;
create policy platform_payment_reports_select on public.platform_payment_reports for select to authenticated using(public.is_workshop_owner(workshop_id));

drop policy if exists platform_payment_allocations_select on public.platform_payment_allocations;
create policy platform_payment_allocations_select on public.platform_payment_allocations for select to authenticated using(
  exists(select 1 from public.platform_fee_statements s where s.id=statement_id and public.is_workshop_owner(s.workshop_id))
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('platform-receipts','platform-receipts',false,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists platform_receipts_select on storage.objects;
create policy platform_receipts_select on storage.objects for select to authenticated using(
  bucket_id='platform-receipts'
  and (storage.foldername(name))[1]~*'^[0-9a-f-]{36}$'
  and public.is_workshop_owner(((storage.foldername(name))[1])::uuid)
);

drop policy if exists platform_receipts_insert on storage.objects;
create policy platform_receipts_insert on storage.objects for insert to authenticated with check(
  bucket_id='platform-receipts'
  and (storage.foldername(name))[1]~*'^[0-9a-f-]{36}$'
  and public.is_workshop_owner(((storage.foldername(name))[1])::uuid)
);

drop policy if exists platform_receipts_update on storage.objects;
create policy platform_receipts_update on storage.objects for update to authenticated using(
  bucket_id='platform-receipts'
  and (storage.foldername(name))[1]~*'^[0-9a-f-]{36}$'
  and public.is_workshop_owner(((storage.foldername(name))[1])::uuid)
) with check(
  bucket_id='platform-receipts'
  and (storage.foldername(name))[1]~*'^[0-9a-f-]{36}$'
  and public.is_workshop_owner(((storage.foldername(name))[1])::uuid)
);

drop policy if exists platform_receipts_delete on storage.objects;
create policy platform_receipts_delete on storage.objects for delete to authenticated using(
  bucket_id='platform-receipts'
  and (storage.foldername(name))[1]~*'^[0-9a-f-]{36}$'
  and public.is_workshop_owner(((storage.foldername(name))[1])::uuid)
);

revoke all on function public.platform_period_values(public.platform_billing_cycle,date,smallint,smallint) from public,anon,authenticated;
revoke all on function public.platform_ensure_statements(uuid) from public,anon,authenticated;
revoke all on function public.platform_sync_eligible_orders(uuid) from public,anon,authenticated;
revoke all on function public.create_default_platform_settings_for_workshop() from public,anon,authenticated;
revoke all on function public.sync_platform_charge_from_work_order() from public,anon,authenticated;
