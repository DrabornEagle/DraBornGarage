-- DraBornGarage v0.9.4
-- Customer-reported IBAN payments require assigned mechanic approval before becoming a payment.

alter table public.workshop_members
  alter column ready_payment_enabled set default true;

update public.workshop_members
set ready_payment_enabled = true
where role::text in ('mechanic', 'owner_mechanic')
  and ready_payment_enabled is false;

create table if not exists public.customer_payment_reports (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  customer_user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_mechanic_id uuid not null references public.profiles(id),
  amount numeric(12,2) not null check (amount > 0),
  customer_note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  payment_id uuid references public.payments(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customer_payment_reports_one_pending_per_order
  on public.customer_payment_reports(work_order_id)
  where status = 'pending';

create index if not exists customer_payment_reports_mechanic_pending_idx
  on public.customer_payment_reports(assigned_mechanic_id, workshop_id, created_at desc)
  where status = 'pending';

create index if not exists customer_payment_reports_customer_idx
  on public.customer_payment_reports(customer_user_id, work_order_id, created_at desc);

alter table public.customer_payment_reports enable row level security;

revoke all on table public.customer_payment_reports from public, anon, authenticated;

drop trigger if exists customer_payment_reports_updated_at on public.customer_payment_reports;
create trigger customer_payment_reports_updated_at
before update on public.customer_payment_reports
for each row execute function public.set_updated_at();

create or replace function public.customer_get_ready_payment_details(p_work_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  if v_user is null then
    raise exception 'Oturum gerekli';
  end if;

  if not exists (
    select 1
    from public.work_orders wo
    join public.customer_links cl
      on cl.customer_id = wo.customer_id
     and cl.workshop_id = wo.workshop_id
     and cl.user_id = v_user
     and cl.status::text = 'approved'
    where wo.id = p_work_order_id
  ) then
    raise exception 'Servis kaydı bulunamadı';
  end if;

  select jsonb_build_object(
    'mechanic_name', p.full_name,
    'bank_name', wm.ready_payment_bank_name,
    'account_holder', wm.ready_payment_account_holder,
    'iban', wm.ready_payment_iban,
    'transfer_description', concat_ws(' • ', nullif(m.plate, ''), 'Servis ödemesi'),
    'display_context', case when wo.status::text = 'ready' then 'ready' else 'receivable' end,
    'remaining_amount', greatest(coalesce(wo.total_amount, 0) - coalesce(wo.amount_received, 0), 0),
    'can_report_payment', not exists (
      select 1 from public.customer_payment_reports r
      where r.work_order_id = wo.id and r.status = 'pending'
    ),
    'pending_report', (
      select jsonb_build_object(
        'id', r.id,
        'amount', r.amount,
        'status', r.status,
        'created_at', r.created_at
      )
      from public.customer_payment_reports r
      where r.work_order_id = wo.id
        and r.customer_user_id = v_user
        and r.status = 'pending'
      order by r.created_at desc
      limit 1
    )
  )
  into v_result
  from public.work_orders wo
  join public.motorcycles m on m.id = wo.motorcycle_id
  join public.workshop_members wm
    on wm.workshop_id = wo.workshop_id
   and wm.user_id = wo.assigned_mechanic_id
   and wm.is_active
   and wm.role::text in ('mechanic', 'owner_mechanic')
   and wm.ready_payment_enabled
  join public.profiles p on p.id = wm.user_id
  where wo.id = p_work_order_id
    and greatest(coalesce(wo.total_amount, 0) - coalesce(wo.amount_received, 0), 0) > 0
    and (
      wo.status::text = 'ready'
      or wo.receivable_status::text = 'open'
    )
    and wm.ready_payment_iban ~ '^TR[0-9]{24}$'
  limit 1;

  return v_result;
end;
$$;

create or replace function public.customer_create_payment_report(
  p_work_order_id uuid,
  p_amount numeric,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_order public.work_orders%rowtype;
  v_report public.customer_payment_reports%rowtype;
  v_remaining numeric(12,2);
  v_customer_name text;
  v_vehicle text;
begin
  if v_user is null then
    raise exception 'Oturum gerekli';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Geçerli ödeme tutarı girin';
  end if;

  select wo.* into v_order
  from public.work_orders wo
  join public.customer_links cl
    on cl.customer_id = wo.customer_id
   and cl.workshop_id = wo.workshop_id
   and cl.user_id = v_user
   and cl.status::text = 'approved'
  where wo.id = p_work_order_id
  for update of wo;

  if not found then
    raise exception 'Servis kaydı bulunamadı';
  end if;

  v_remaining := greatest(coalesce(v_order.total_amount, 0) - coalesce(v_order.amount_received, 0), 0);
  if v_remaining <= 0 then
    raise exception 'Bu servis için kalan ödeme bulunmuyor';
  end if;
  if p_amount > v_remaining then
    raise exception 'Bildirilen tutar kalan borçtan fazla olamaz. Kalan: %', v_remaining;
  end if;
  if not (v_order.status::text = 'ready' or v_order.receivable_status::text = 'open') then
    raise exception 'Ödeme bildirimi yalnız Motor Hazır veya açık veresiye kaydında gönderilebilir';
  end if;

  if v_order.assigned_mechanic_id is null or not exists (
    select 1 from public.workshop_members wm
    where wm.workshop_id = v_order.workshop_id
      and wm.user_id = v_order.assigned_mechanic_id
      and wm.is_active
      and wm.role::text in ('mechanic', 'owner_mechanic')
      and wm.ready_payment_enabled
      and wm.ready_payment_iban ~ '^TR[0-9]{24}$'
  ) then
    raise exception 'Bu servis için aktif Usta IBAN bilgisi bulunamadı';
  end if;

  if exists (
    select 1 from public.customer_payment_reports r
    where r.work_order_id = p_work_order_id and r.status = 'pending'
  ) then
    raise exception 'Bu servis için Usta onayı bekleyen ödeme bildirimi var';
  end if;

  insert into public.customer_payment_reports(
    work_order_id, workshop_id, customer_user_id, assigned_mechanic_id, amount, customer_note
  ) values (
    p_work_order_id,
    v_order.workshop_id,
    v_user,
    v_order.assigned_mechanic_id,
    round(p_amount, 2),
    nullif(left(trim(coalesce(p_note, '')), 300), '')
  ) returning * into v_report;

  select c.full_name,
         m.brand || ' ' || m.model || case when m.plate is null then '' else ' • ' || m.plate end
  into v_customer_name, v_vehicle
  from public.customers c
  join public.motorcycles m on m.id = v_order.motorcycle_id
  where c.id = v_order.customer_id;

  perform public.enqueue_user_notification(
    v_order.assigned_mechanic_id,
    v_order.workshop_id,
    'payments',
    'customer_payment_reported',
    'Müşteri IBAN ödemesi bildirdi',
    coalesce(v_customer_name, 'Müşteri') || ' • ' || coalesce(v_vehicle, 'Servis') || ' • ' || to_char(v_report.amount, 'FM999999990.00') || ' TL onay bekliyor.',
    'urgent',
    'customer_payment_report',
    v_report.id,
    jsonb_build_object(
      'target_tab', 'receivables',
      'target_section', 'payment_reports',
      'payment_report_id', v_report.id,
      'work_order_id', p_work_order_id,
      'amount', v_report.amount
    ),
    v_order.assigned_mechanic_id || ':customer-payment-report:' || v_report.id,
    now(),
    v_order.demo_batch_id,
    'payment_updates'
  );

  if v_order.receivable_status::text <> 'not_set' then
    insert into public.receivable_events(
      work_order_id, workshop_id, actor_id, event_type, amount, payment_method, note
    ) values (
      p_work_order_id, v_order.workshop_id, v_user, 'customer_payment_reported',
      v_report.amount, 'transfer'::public.payment_method,
      coalesce(v_report.customer_note, 'Müşteri IBAN ödemesi yaptığını bildirdi')
    );
  end if;

  return jsonb_build_object(
    'id', v_report.id,
    'status', v_report.status,
    'amount', v_report.amount,
    'created_at', v_report.created_at
  );
exception
  when unique_violation then
    raise exception 'Bu servis için Usta onayı bekleyen ödeme bildirimi var';
end;
$$;

create or replace function public.staff_get_pending_customer_payment_reports(p_workshop_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  if v_user is null then
    raise exception 'Oturum gerekli';
  end if;
  if not exists (
    select 1 from public.workshop_members wm
    where wm.workshop_id = p_workshop_id
      and wm.user_id = v_user
      and wm.is_active
      and wm.role::text in ('mechanic', 'owner_mechanic')
  ) then
    raise exception 'Bu işletmede Usta yetkisi gerekli';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'work_order_id', r.work_order_id,
    'customer_name', c.full_name,
    'brand', m.brand,
    'model', m.model,
    'plate', m.plate,
    'amount', r.amount,
    'customer_note', r.customer_note,
    'created_at', r.created_at,
    'remaining_amount', greatest(coalesce(wo.total_amount, 0) - coalesce(wo.amount_received, 0), 0)
  ) order by r.created_at desc), '[]'::jsonb)
  into v_result
  from public.customer_payment_reports r
  join public.work_orders wo on wo.id = r.work_order_id
  join public.customers c on c.id = wo.customer_id
  join public.motorcycles m on m.id = wo.motorcycle_id
  where r.workshop_id = p_workshop_id
    and r.assigned_mechanic_id = v_user
    and r.status = 'pending';

  return v_result;
end;
$$;

create or replace function public.staff_review_customer_payment_report(
  p_report_id uuid,
  p_approve boolean,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_report public.customer_payment_reports%rowtype;
  v_order public.work_orders%rowtype;
  v_payment_id uuid;
  v_remaining numeric(12,2);
  v_vehicle text;
  v_review_note text := nullif(left(trim(coalesce(p_note, '')), 300), '');
begin
  if v_user is null then
    raise exception 'Oturum gerekli';
  end if;

  select * into v_report
  from public.customer_payment_reports
  where id = p_report_id
  for update;

  if not found then
    raise exception 'Ödeme bildirimi bulunamadı';
  end if;
  if v_report.status <> 'pending' then
    raise exception 'Bu ödeme bildirimi daha önce sonuçlandırılmış';
  end if;
  if v_report.assigned_mechanic_id <> v_user or not exists (
    select 1 from public.workshop_members wm
    where wm.workshop_id = v_report.workshop_id
      and wm.user_id = v_user
      and wm.is_active
      and wm.role::text in ('mechanic', 'owner_mechanic')
  ) then
    raise exception 'Bu ödeme bildirimini onaylama yetkiniz yok';
  end if;

  select * into v_order
  from public.work_orders
  where id = v_report.work_order_id
  for update;

  if not found then
    raise exception 'Servis kaydı bulunamadı';
  end if;

  v_remaining := greatest(coalesce(v_order.total_amount, 0) - coalesce(v_order.amount_received, 0), 0);

  if coalesce(p_approve, false) then
    if v_remaining <= 0 then
      raise exception 'Bu servis için kalan borç bulunmuyor';
    end if;
    if v_report.amount > v_remaining then
      raise exception 'Bildirilen tutar güncel kalan borçtan fazla. Güncel kalan: %', v_remaining;
    end if;

    insert into public.payments(
      work_order_id, workshop_id, amount, payment_method, received_by, note, paid_at, collection_source
    ) values (
      v_report.work_order_id,
      v_report.workshop_id,
      v_report.amount,
      'transfer'::public.payment_method,
      v_user,
      coalesce(v_review_note, 'Müşterinin IBAN ödeme bildirimi Usta tarafından onaylandı'),
      now(),
      'customer_report'
    ) returning id into v_payment_id;

    update public.customer_payment_reports
    set status = 'approved',
        review_note = v_review_note,
        reviewed_by = v_user,
        reviewed_at = now(),
        payment_id = v_payment_id
    where id = v_report.id;

    select greatest(coalesce(total_amount, 0) - coalesce(amount_received, 0), 0)
    into v_remaining
    from public.work_orders
    where id = v_report.work_order_id;

    if v_order.receivable_status::text <> 'not_set' then
      insert into public.receivable_events(
        work_order_id, workshop_id, actor_id, event_type, amount, payment_method, note
      ) values (
        v_report.work_order_id, v_report.workshop_id, v_user,
        'customer_payment_report_approved', v_report.amount,
        'transfer'::public.payment_method,
        coalesce(v_review_note, 'Müşteri ödeme bildirimi onaylandı')
      );
    end if;

    select m.brand || ' ' || m.model || case when m.plate is null then '' else ' • ' || m.plate end
    into v_vehicle
    from public.motorcycles m where m.id = v_order.motorcycle_id;

    perform public.notify_customer_users(
      v_order.customer_id,
      v_report.workshop_id,
      'payments',
      'customer_payment_report_approved',
      'Ödeme bildirimin onaylandı',
      coalesce(v_vehicle, 'Servis') || ' • ' || to_char(v_report.amount, 'FM999999990.00') || ' TL kaydedildi. Kalan ' || to_char(v_remaining, 'FM999999990.00') || ' TL.',
      'high',
      'work_order',
      v_report.work_order_id,
      jsonb_build_object(
        'target_tab', 'services',
        'work_order_id', v_report.work_order_id,
        'payment_report_id', v_report.id,
        'remaining_amount', v_remaining
      ),
      'customer-payment-report-approved:' || v_report.id,
      now(),
      v_order.demo_batch_id,
      'payment_updates'
    );

    return jsonb_build_object(
      'id', v_report.id,
      'status', 'approved',
      'payment_id', v_payment_id,
      'remaining_amount', v_remaining
    );
  end if;

  update public.customer_payment_reports
  set status = 'rejected',
      review_note = v_review_note,
      reviewed_by = v_user,
      reviewed_at = now()
  where id = v_report.id;

  if v_order.receivable_status::text <> 'not_set' then
    insert into public.receivable_events(
      work_order_id, workshop_id, actor_id, event_type, amount, payment_method, note
    ) values (
      v_report.work_order_id, v_report.workshop_id, v_user,
      'customer_payment_report_rejected', v_report.amount,
      'transfer'::public.payment_method,
      coalesce(v_review_note, 'Müşteri ödeme bildirimi reddedildi')
    );
  end if;

  select m.brand || ' ' || m.model || case when m.plate is null then '' else ' • ' || m.plate end
  into v_vehicle
  from public.motorcycles m where m.id = v_order.motorcycle_id;

  perform public.notify_customer_users(
    v_order.customer_id,
    v_report.workshop_id,
    'payments',
    'customer_payment_report_rejected',
    'Ödeme bildirimin onaylanmadı',
    coalesce(v_vehicle, 'Servis') || ' için gönderdiğin ödeme bildirimi Usta tarafından onaylanmadı.' || case when v_review_note is null then '' else ' Not: ' || v_review_note end,
    'high',
    'work_order',
    v_report.work_order_id,
    jsonb_build_object(
      'target_tab', 'services',
      'work_order_id', v_report.work_order_id,
      'payment_report_id', v_report.id
    ),
    'customer-payment-report-rejected:' || v_report.id,
    now(),
    v_order.demo_batch_id,
    'payment_updates'
  );

  return jsonb_build_object(
    'id', v_report.id,
    'status', 'rejected',
    'remaining_amount', v_remaining
  );
end;
$$;

revoke all on function public.customer_get_ready_payment_details(uuid) from public, anon;
revoke all on function public.customer_create_payment_report(uuid, numeric, text) from public, anon;
revoke all on function public.staff_get_pending_customer_payment_reports(uuid) from public, anon;
revoke all on function public.staff_review_customer_payment_report(uuid, boolean, text) from public, anon;

grant execute on function public.customer_get_ready_payment_details(uuid) to authenticated;
grant execute on function public.customer_create_payment_report(uuid, numeric, text) to authenticated;
grant execute on function public.staff_get_pending_customer_payment_reports(uuid) to authenticated;
grant execute on function public.staff_review_customer_payment_report(uuid, boolean, text) to authenticated;
