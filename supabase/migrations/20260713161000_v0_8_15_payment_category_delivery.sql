-- DraBornGarage v0.8.15
-- Saving a cash/IBAN payment or opening a debt record completes delivery automatically.

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

  if v_order.status <> 'delivered'::public.work_order_status then
    perform public.update_work_order_status(p_work_order_id, 'delivered'::public.work_order_status);
  end if;
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

  if v_order.status <> 'delivered'::public.work_order_status then
    perform public.update_work_order_status(p_work_order_id, 'delivered'::public.work_order_status);
  end if;

  return v_id;
end;
$$;
