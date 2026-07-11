create type public.receivable_status as enum ('not_set','open','closed','cancelled');
create type public.receivable_visibility as enum ('staff','customer');

alter table public.work_orders
  add column receivable_status public.receivable_status not null default 'not_set',
  add column debt_promised_date date,
  add column debt_written_at timestamptz,
  add column debt_closed_at timestamptz,
  add column debt_note text,
  add column debt_customer_note text,
  add column last_payment_at timestamptz;

alter table public.payments
  add column collection_source text not null default 'service'
    check (collection_source in ('service','receivable'));

create table public.receivable_notes (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id),
  visibility public.receivable_visibility not null default 'staff',
  note text not null check (char_length(trim(note)) between 2 and 1000),
  created_at timestamptz not null default now()
);

create table public.receivable_events (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  event_type text not null,
  amount numeric(12,2),
  payment_method public.payment_method,
  old_status public.receivable_status,
  new_status public.receivable_status,
  note text,
  created_at timestamptz not null default now()
);

create index idx_work_orders_receivables on public.work_orders(workshop_id, receivable_status, debt_promised_date, updated_at desc)
  where receivable_status <> 'not_set';
create index idx_work_orders_receivable_customer on public.work_orders(workshop_id, customer_id, receivable_status);
create index idx_receivable_notes_order on public.receivable_notes(work_order_id, created_at desc);
create index idx_receivable_notes_workshop on public.receivable_notes(workshop_id, created_at desc);
create index idx_receivable_events_order on public.receivable_events(work_order_id, created_at desc);
create index idx_receivable_events_workshop on public.receivable_events(workshop_id, created_at desc);
create index idx_payments_receivable_source on public.payments(workshop_id, collection_source, paid_at desc);

alter table public.receivable_notes enable row level security;
alter table public.receivable_events enable row level security;

create policy receivable_notes_staff_select on public.receivable_notes
for select to authenticated
using (
  public.is_admin()
  or public.is_workshop_owner(workshop_id)
  or (public.is_workshop_worker(workshop_id) and public.can_access_work_order(work_order_id))
);

create policy receivable_events_staff_select on public.receivable_events
for select to authenticated
using (
  public.is_admin()
  or public.is_workshop_owner(workshop_id)
  or (public.is_workshop_worker(workshop_id) and public.can_access_work_order(work_order_id))
);

create or replace function public.can_manage_receivable(p_work_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.work_orders wo
    where wo.id = p_work_order_id
      and (
        public.is_admin()
        or public.is_workshop_owner(wo.workshop_id)
        or (public.is_workshop_worker(wo.workshop_id) and public.can_access_work_order(wo.id))
      )
  );
$$;

create or replace function public.sync_work_order_financial_state(p_work_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_received numeric(12,2);
  v_total numeric(12,2);
  v_status public.receivable_status;
  v_last_payment timestamptz;
begin
  select coalesce(sum(amount),0), max(paid_at)
  into v_received, v_last_payment
  from public.payments
  where work_order_id = p_work_order_id;

  select total_amount, receivable_status
  into v_total, v_status
  from public.work_orders
  where id = p_work_order_id
  for update;

  if not found then return; end if;

  update public.work_orders
  set amount_received = v_received,
      last_payment_at = v_last_payment,
      payment_status = case
        when v_received <= 0 then 'unpaid'::public.payment_status
        when v_total > 0 and v_received >= v_total then 'paid'::public.payment_status
        else 'partial'::public.payment_status
      end,
      receivable_status = case
        when v_status = 'cancelled' then 'cancelled'::public.receivable_status
        when v_status in ('open','closed') and v_total > 0 and v_received >= v_total then 'closed'::public.receivable_status
        when v_status = 'closed' and v_received < v_total then 'open'::public.receivable_status
        else v_status
      end,
      debt_closed_at = case
        when v_status <> 'cancelled' and v_status in ('open','closed') and v_total > 0 and v_received >= v_total then coalesce(debt_closed_at, now())
        when v_status = 'closed' and v_received < v_total then null
        else debt_closed_at
      end
  where id = p_work_order_id;
end;
$$;

create or replace function public.recalculate_work_order_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid := coalesce(new.work_order_id, old.work_order_id);
begin
  perform public.sync_work_order_financial_state(target_id);
  return coalesce(new, old);
end;
$$;

create or replace function public.recalculate_work_order_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid := coalesce(new.work_order_id, old.work_order_id);
  labor_total numeric(12,2);
  part_total numeric(12,2);
begin
  select coalesce(sum(price), 0)
  into labor_total
  from public.work_order_services
  where work_order_id = target_id
    and extra_request_id is null;

  select labor_total + coalesce(sum(labor_amount), 0)
  into labor_total
  from public.work_order_extra_requests
  where work_order_id = target_id
    and status = 'approved';

  select coalesce(sum(total_price), 0)
  into part_total
  from public.work_order_parts
  where work_order_id = target_id
    and extra_request_id is null;

  select part_total + coalesce(sum(parts_amount), 0)
  into part_total
  from public.work_order_extra_requests
  where work_order_id = target_id
    and status = 'approved';

  update public.work_orders
  set labor_amount = labor_total,
      parts_amount = part_total,
      total_amount = labor_total + part_total
  where id = target_id;

  perform public.sync_work_order_financial_state(target_id);
  return coalesce(new, old);
end;
$$;

create or replace function public.log_receivable_payment_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := coalesce(new.work_order_id, old.work_order_id);
  v_workshop_id uuid;
  v_receivable_status public.receivable_status;
begin
  select workshop_id, receivable_status
  into v_workshop_id, v_receivable_status
  from public.work_orders where id = v_order_id;

  if v_receivable_status <> 'not_set' then
    insert into public.receivable_events(
      work_order_id, workshop_id, actor_id, event_type, amount, payment_method, note
    ) values (
      v_order_id,
      v_workshop_id,
      coalesce(new.received_by, old.received_by),
      case when tg_op = 'DELETE' then 'payment_removed' else 'payment_added' end,
      coalesce(new.amount, old.amount),
      coalesce(new.payment_method, old.payment_method),
      coalesce(new.note, old.note)
    );
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists receivable_payment_event_after_change on public.payments;
create trigger receivable_payment_event_after_change
after insert or delete on public.payments
for each row execute function public.log_receivable_payment_event();

create or replace function public.staff_open_receivable(
  p_work_order_id uuid,
  p_due_date date,
  p_staff_note text default null,
  p_customer_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.work_orders%rowtype;
  v_old public.receivable_status;
begin
  if not public.can_manage_receivable(p_work_order_id) then
    raise exception 'Alacak kaydını yönetme yetkiniz yok';
  end if;

  select * into v_order from public.work_orders where id = p_work_order_id for update;
  if not found then raise exception 'Servis kaydı bulunamadı'; end if;
  if v_order.total_amount <= v_order.amount_received then
    raise exception 'Bu serviste kalan borç bulunmuyor';
  end if;

  v_old := v_order.receivable_status;

  update public.work_orders
  set receivable_status = 'open',
      debt_promised_date = p_due_date,
      debt_written_at = coalesce(debt_written_at, now()),
      debt_closed_at = null,
      debt_note = nullif(trim(p_staff_note), ''),
      debt_customer_note = nullif(trim(p_customer_note), '')
  where id = p_work_order_id;

  if nullif(trim(p_staff_note), '') is not null then
    insert into public.receivable_notes(work_order_id, workshop_id, author_id, visibility, note)
    values (p_work_order_id, v_order.workshop_id, auth.uid(), 'staff', trim(p_staff_note));
  end if;

  if nullif(trim(p_customer_note), '') is not null then
    insert into public.receivable_notes(work_order_id, workshop_id, author_id, visibility, note)
    values (p_work_order_id, v_order.workshop_id, auth.uid(), 'customer', trim(p_customer_note));
  end if;

  insert into public.receivable_events(work_order_id, workshop_id, actor_id, event_type, old_status, new_status, note)
  values (
    p_work_order_id,
    v_order.workshop_id,
    auth.uid(),
    case when v_old = 'not_set' then 'receivable_opened' else 'receivable_updated' end,
    v_old,
    'open',
    concat_ws(' • ', case when p_due_date is not null then 'Söz tarihi: ' || p_due_date::text end, nullif(trim(p_staff_note), ''))
  );
end;
$$;

create or replace function public.staff_record_payment(
  p_work_order_id uuid,
  p_amount numeric,
  p_method text,
  p_note text default null,
  p_paid_at timestamptz default now(),
  p_collection_source text default 'service'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.work_orders%rowtype;
  v_id uuid;
  v_remaining numeric(12,2);
begin
  if not public.can_manage_receivable(p_work_order_id) then
    raise exception 'Tahsilat kaydetme yetkiniz yok';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Geçerli tahsilat tutarı girin'; end if;
  if p_method not in ('cash','transfer') then raise exception 'Yalnız Nakit veya IBAN kullanılabilir'; end if;
  if p_collection_source not in ('service','receivable') then raise exception 'Geçersiz tahsilat kaynağı'; end if;

  select * into v_order from public.work_orders where id = p_work_order_id for update;
  if not found then raise exception 'Servis kaydı bulunamadı'; end if;

  v_remaining := greatest(0, v_order.total_amount - v_order.amount_received);
  if p_amount > v_remaining then
    raise exception 'Tahsilat kalan borçtan fazla olamaz. Kalan: %', v_remaining;
  end if;

  insert into public.payments(work_order_id, workshop_id, amount, payment_method, received_by, note, paid_at, collection_source)
  values (p_work_order_id, v_order.workshop_id, p_amount, p_method::public.payment_method, auth.uid(), nullif(trim(p_note), ''), coalesce(p_paid_at, now()), p_collection_source)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.staff_cancel_receivable(p_work_order_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.work_orders%rowtype;
begin
  if not public.can_manage_receivable(p_work_order_id) then raise exception 'Alacağı kapatma yetkiniz yok'; end if;
  select * into v_order from public.work_orders where id = p_work_order_id for update;
  if not found then raise exception 'Servis kaydı bulunamadı'; end if;
  if v_order.receivable_status <> 'open' then raise exception 'Yalnız açık alacak kapatılabilir'; end if;

  update public.work_orders
  set receivable_status = 'cancelled', debt_closed_at = now(), debt_note = coalesce(nullif(trim(p_note), ''), debt_note)
  where id = p_work_order_id;

  insert into public.receivable_events(work_order_id, workshop_id, actor_id, event_type, old_status, new_status, note)
  values (p_work_order_id, v_order.workshop_id, auth.uid(), 'receivable_cancelled', v_order.receivable_status, 'cancelled', nullif(trim(p_note), ''));
end;
$$;

create or replace function public.staff_reopen_receivable(p_work_order_id uuid, p_due_date date default null, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.work_orders%rowtype;
begin
  if not public.can_manage_receivable(p_work_order_id) then raise exception 'Alacağı yeniden açma yetkiniz yok'; end if;
  select * into v_order from public.work_orders where id = p_work_order_id for update;
  if not found then raise exception 'Servis kaydı bulunamadı'; end if;
  if v_order.total_amount <= v_order.amount_received then raise exception 'Kalan borç bulunmuyor'; end if;

  update public.work_orders
  set receivable_status='open', debt_promised_date=coalesce(p_due_date,debt_promised_date), debt_closed_at=null, debt_written_at=coalesce(debt_written_at,now())
  where id=p_work_order_id;

  insert into public.receivable_events(work_order_id, workshop_id, actor_id, event_type, old_status, new_status, note)
  values (p_work_order_id, v_order.workshop_id, auth.uid(), 'receivable_reopened', v_order.receivable_status, 'open', nullif(trim(p_note), ''));
end;
$$;

create or replace function public.staff_add_receivable_note(
  p_work_order_id uuid,
  p_note text,
  p_visibility text default 'staff'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.work_orders%rowtype;
  v_id uuid;
begin
  if not public.can_manage_receivable(p_work_order_id) then raise exception 'Not ekleme yetkiniz yok'; end if;
  if p_visibility not in ('staff','customer') then raise exception 'Geçersiz görünürlük'; end if;
  if char_length(trim(coalesce(p_note,''))) < 2 then raise exception 'Not çok kısa'; end if;

  select * into v_order from public.work_orders where id=p_work_order_id;
  if not found then raise exception 'Servis kaydı bulunamadı'; end if;

  insert into public.receivable_notes(work_order_id, workshop_id, author_id, visibility, note)
  values (p_work_order_id, v_order.workshop_id, auth.uid(), p_visibility::public.receivable_visibility, trim(p_note))
  returning id into v_id;

  insert into public.receivable_events(work_order_id, workshop_id, actor_id, event_type, note)
  values (p_work_order_id, v_order.workshop_id, auth.uid(), case when p_visibility='customer' then 'customer_note_added' else 'staff_note_added' end, trim(p_note));

  return v_id;
end;
$$;

create or replace function public.staff_delete_receivable_note(p_note_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.receivable_notes%rowtype;
begin
  select * into v_note from public.receivable_notes where id=p_note_id;
  if not found then return; end if;
  if not public.can_manage_receivable(v_note.work_order_id) then raise exception 'Not silme yetkiniz yok'; end if;
  delete from public.receivable_notes where id=p_note_id;
end;
$$;

create or replace function public.staff_create_receivable_reminder(p_work_order_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.work_orders%rowtype;
  v_message text;
begin
  if not public.can_manage_receivable(p_work_order_id) then raise exception 'Hatırlatma oluşturma yetkiniz yok'; end if;
  select * into v_order from public.work_orders where id=p_work_order_id;
  if not found then raise exception 'Servis kaydı bulunamadı'; end if;
  v_message := coalesce(nullif(trim(p_note),''), 'Ödeme hatırlatması: Kalan borcunuz ' || greatest(0,v_order.total_amount-v_order.amount_received)::text || ' TL.');

  insert into public.receivable_notes(work_order_id, workshop_id, author_id, visibility, note)
  values (p_work_order_id, v_order.workshop_id, auth.uid(), 'customer', v_message);
  insert into public.receivable_events(work_order_id, workshop_id, actor_id, event_type, note)
  values (p_work_order_id, v_order.workshop_id, auth.uid(), 'reminder_created', v_message);
end;
$$;

create or replace function public.staff_get_receivables(
  p_workshop_id uuid,
  p_filter text default 'open',
  p_search text default null
)
returns table(
  work_order_id uuid,
  customer_id uuid,
  customer_name text,
  customer_phone text,
  motorcycle_id uuid,
  brand text,
  model text,
  plate text,
  complaint text,
  arrived_at timestamptz,
  total_amount numeric,
  amount_received numeric,
  remaining_amount numeric,
  payment_status text,
  receivable_status text,
  debt_promised_date date,
  debt_written_at timestamptz,
  debt_closed_at timestamptz,
  last_payment_at timestamptz,
  cash_total numeric,
  transfer_total numeric,
  days_overdue integer,
  debt_note text,
  debt_customer_note text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (
    public.is_admin()
    or public.is_workshop_owner(p_workshop_id)
    or public.is_workshop_worker(p_workshop_id)
  ) then raise exception 'Alacak listesini görme yetkiniz yok'; end if;

  return query
  select
    wo.id,
    c.id,
    c.full_name,
    c.phone,
    m.id,
    m.brand,
    m.model,
    m.plate,
    wo.complaint,
    wo.arrived_at,
    wo.total_amount,
    wo.amount_received,
    greatest(0, wo.total_amount-wo.amount_received),
    wo.payment_status::text,
    wo.receivable_status::text,
    wo.debt_promised_date,
    wo.debt_written_at,
    wo.debt_closed_at,
    wo.last_payment_at,
    coalesce((select sum(p.amount) from public.payments p where p.work_order_id=wo.id and p.payment_method='cash'),0),
    coalesce((select sum(p.amount) from public.payments p where p.work_order_id=wo.id and p.payment_method='transfer'),0),
    case when wo.receivable_status='open' and wo.debt_promised_date is not null and wo.debt_promised_date < current_date then current_date-wo.debt_promised_date else 0 end,
    wo.debt_note,
    wo.debt_customer_note
  from public.work_orders wo
  join public.customers c on c.id=wo.customer_id
  join public.motorcycles m on m.id=wo.motorcycle_id
  where wo.workshop_id=p_workshop_id
    and wo.receivable_status <> 'not_set'
    and (
      public.is_admin()
      or public.is_workshop_owner(p_workshop_id)
      or public.can_access_work_order(wo.id)
    )
    and (
      p_search is null or trim(p_search)='' or
      c.full_name ilike '%'||trim(p_search)||'%' or
      coalesce(c.phone,'') ilike '%'||trim(p_search)||'%' or
      coalesce(m.plate,'') ilike '%'||trim(p_search)||'%'
    )
    and (
      p_filter='all'
      or (p_filter='open' and wo.receivable_status='open')
      or (p_filter='today' and wo.receivable_status='open' and wo.debt_promised_date=current_date)
      or (p_filter='overdue' and wo.receivable_status='open' and wo.debt_promised_date<current_date)
      or (p_filter='partial' and wo.receivable_status='open' and wo.payment_status='partial')
      or (p_filter='paid' and wo.receivable_status='closed' and wo.payment_status='paid')
      or (p_filter='cancelled' and wo.receivable_status='cancelled')
    )
  order by
    case when wo.receivable_status='open' and wo.debt_promised_date<current_date then 0
         when wo.receivable_status='open' and wo.debt_promised_date=current_date then 1
         when wo.receivable_status='open' then 2
         when wo.receivable_status='closed' then 3 else 4 end,
    wo.debt_promised_date nulls last,
    wo.updated_at desc;
end;
$$;

create or replace function public.staff_get_receivable_summary(p_workshop_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare result jsonb;
begin
  if not (public.is_admin() or public.is_workshop_owner(p_workshop_id) or public.is_workshop_worker(p_workshop_id)) then
    raise exception 'Alacak özetini görme yetkiniz yok';
  end if;

  select jsonb_build_object(
    'open_count', count(*) filter (where wo.receivable_status='open'),
    'overdue_count', count(*) filter (where wo.receivable_status='open' and wo.debt_promised_date<current_date),
    'today_count', count(*) filter (where wo.receivable_status='open' and wo.debt_promised_date=current_date),
    'open_amount', coalesce(sum(greatest(0,wo.total_amount-wo.amount_received)) filter (where wo.receivable_status='open'),0),
    'overdue_amount', coalesce(sum(greatest(0,wo.total_amount-wo.amount_received)) filter (where wo.receivable_status='open' and wo.debt_promised_date<current_date),0),
    'collected_amount', coalesce(sum(wo.amount_received) filter (where wo.receivable_status in ('open','closed')),0)
  ) into result
  from public.work_orders wo
  where wo.workshop_id=p_workshop_id
    and wo.receivable_status<>'not_set'
    and (public.is_admin() or public.is_workshop_owner(p_workshop_id) or public.can_access_work_order(wo.id));
  return result;
end;
$$;

create or replace function public.staff_get_receivable_detail(p_work_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare result jsonb;
begin
  if not public.can_manage_receivable(p_work_order_id) then raise exception 'Alacak detayını görme yetkiniz yok'; end if;

  select jsonb_build_object(
    'work_order_id',wo.id,
    'workshop_id',wo.workshop_id,
    'customer_id',c.id,
    'customer_name',c.full_name,
    'customer_phone',c.phone,
    'motorcycle_id',m.id,
    'brand',m.brand,
    'model',m.model,
    'plate',m.plate,
    'complaint',wo.complaint,
    'arrived_at',wo.arrived_at,
    'total_amount',wo.total_amount,
    'amount_received',wo.amount_received,
    'remaining_amount',greatest(0,wo.total_amount-wo.amount_received),
    'payment_status',wo.payment_status::text,
    'receivable_status',wo.receivable_status::text,
    'debt_promised_date',wo.debt_promised_date,
    'debt_written_at',wo.debt_written_at,
    'debt_closed_at',wo.debt_closed_at,
    'last_payment_at',wo.last_payment_at,
    'debt_note',wo.debt_note,
    'debt_customer_note',wo.debt_customer_note,
    'payments',coalesce((select jsonb_agg(jsonb_build_object(
      'id',p.id,'amount',p.amount,'payment_method',p.payment_method::text,'note',p.note,'paid_at',p.paid_at,'received_by',p.received_by,'collection_source',p.collection_source
    ) order by p.paid_at desc) from public.payments p where p.work_order_id=wo.id),'[]'::jsonb),
    'notes',coalesce((select jsonb_agg(jsonb_build_object(
      'id',n.id,'visibility',n.visibility::text,'note',n.note,'author_id',n.author_id,'author_name',pr.full_name,'created_at',n.created_at
    ) order by n.created_at desc) from public.receivable_notes n left join public.profiles pr on pr.id=n.author_id where n.work_order_id=wo.id),'[]'::jsonb),
    'events',coalesce((select jsonb_agg(jsonb_build_object(
      'id',e.id,'event_type',e.event_type,'amount',e.amount,'payment_method',e.payment_method::text,'old_status',e.old_status::text,'new_status',e.new_status::text,'note',e.note,'actor_name',pr.full_name,'created_at',e.created_at
    ) order by e.created_at desc) from public.receivable_events e left join public.profiles pr on pr.id=e.actor_id where e.work_order_id=wo.id),'[]'::jsonb)
  ) into result
  from public.work_orders wo
  join public.customers c on c.id=wo.customer_id
  join public.motorcycles m on m.id=wo.motorcycle_id
  where wo.id=p_work_order_id;

  return result;
end;
$$;

create or replace function public.customer_get_receivables(p_workshop_id uuid)
returns table(
  work_order_id uuid,
  workshop_name text,
  brand text,
  model text,
  plate text,
  complaint text,
  total_amount numeric,
  amount_received numeric,
  remaining_amount numeric,
  payment_status text,
  receivable_status text,
  debt_promised_date date,
  debt_written_at timestamptz,
  debt_closed_at timestamptz,
  last_payment_at timestamptz,
  customer_note text,
  payments jsonb,
  notes jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    wo.id,
    w.name,
    m.brand,
    m.model,
    m.plate,
    wo.complaint,
    wo.total_amount,
    wo.amount_received,
    greatest(0,wo.total_amount-wo.amount_received),
    wo.payment_status::text,
    wo.receivable_status::text,
    wo.debt_promised_date,
    wo.debt_written_at,
    wo.debt_closed_at,
    wo.last_payment_at,
    wo.debt_customer_note,
    coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'amount',p.amount,'payment_method',p.payment_method::text,'note',p.note,'paid_at',p.paid_at) order by p.paid_at desc) from public.payments p where p.work_order_id=wo.id),'[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'note',n.note,'created_at',n.created_at) order by n.created_at desc) from public.receivable_notes n where n.work_order_id=wo.id and n.visibility='customer'),'[]'::jsonb)
  from public.work_orders wo
  join public.workshops w on w.id=wo.workshop_id
  join public.motorcycles m on m.id=wo.motorcycle_id
  join public.customer_links cl on cl.customer_id=wo.customer_id and cl.workshop_id=wo.workshop_id and cl.user_id=auth.uid() and cl.status='approved'
  where wo.workshop_id=p_workshop_id and wo.receivable_status<>'not_set'
  order by wo.debt_written_at desc nulls last;
$$;

revoke execute on function public.can_manage_receivable(uuid) from public, anon;
revoke execute on function public.sync_work_order_financial_state(uuid) from public, anon, authenticated;
revoke execute on function public.staff_open_receivable(uuid,date,text,text) from public, anon;
revoke execute on function public.staff_record_payment(uuid,numeric,text,text,timestamptz,text) from public, anon;
revoke execute on function public.staff_cancel_receivable(uuid,text) from public, anon;
revoke execute on function public.staff_reopen_receivable(uuid,date,text) from public, anon;
revoke execute on function public.staff_add_receivable_note(uuid,text,text) from public, anon;
revoke execute on function public.staff_delete_receivable_note(uuid) from public, anon;
revoke execute on function public.staff_create_receivable_reminder(uuid,text) from public, anon;
revoke execute on function public.staff_get_receivables(uuid,text,text) from public, anon;
revoke execute on function public.staff_get_receivable_summary(uuid) from public, anon;
revoke execute on function public.staff_get_receivable_detail(uuid) from public, anon;
revoke execute on function public.customer_get_receivables(uuid) from public, anon;
revoke execute on function public.log_receivable_payment_event() from public, anon, authenticated;

grant execute on function public.can_manage_receivable(uuid) to authenticated;
grant execute on function public.staff_open_receivable(uuid,date,text,text) to authenticated;
grant execute on function public.staff_record_payment(uuid,numeric,text,text,timestamptz,text) to authenticated;
grant execute on function public.staff_cancel_receivable(uuid,text) to authenticated;
grant execute on function public.staff_reopen_receivable(uuid,date,text) to authenticated;
grant execute on function public.staff_add_receivable_note(uuid,text,text) to authenticated;
grant execute on function public.staff_delete_receivable_note(uuid) to authenticated;
grant execute on function public.staff_create_receivable_reminder(uuid,text) to authenticated;
grant execute on function public.staff_get_receivables(uuid,text,text) to authenticated;
grant execute on function public.staff_get_receivable_summary(uuid) to authenticated;
grant execute on function public.staff_get_receivable_detail(uuid) to authenticated;
grant execute on function public.customer_get_receivables(uuid) to authenticated;
grant execute on function public.sync_work_order_financial_state(uuid) to postgres, service_role;
grant execute on function public.log_receivable_payment_event() to postgres, service_role;
