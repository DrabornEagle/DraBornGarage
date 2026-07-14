-- DraBornGarage v0.9.4 hotfix
-- payments.collection_source supports only service or receivable.

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
  if v_user is null then raise exception 'Oturum gerekli'; end if;

  select * into v_report
  from public.customer_payment_reports
  where id = p_report_id
  for update;

  if not found then raise exception 'Ödeme bildirimi bulunamadı'; end if;
  if v_report.status <> 'pending' then raise exception 'Bu ödeme bildirimi daha önce sonuçlandırılmış'; end if;
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

  if not found then raise exception 'Servis kaydı bulunamadı'; end if;

  v_remaining := greatest(coalesce(v_order.total_amount, 0) - coalesce(v_order.amount_received, 0), 0);

  if coalesce(p_approve, false) then
    if v_remaining <= 0 then raise exception 'Bu servis için kalan borç bulunmuyor'; end if;
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
      case when v_order.receivable_status::text = 'open' then 'receivable' else 'service' end
    ) returning id into v_payment_id;

    update public.customer_payment_reports
    set status = 'approved', review_note = v_review_note, reviewed_by = v_user,
        reviewed_at = now(), payment_id = v_payment_id
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
    into v_vehicle from public.motorcycles m where m.id = v_order.motorcycle_id;

    perform public.notify_customer_users(
      v_order.customer_id, v_report.workshop_id, 'payments',
      'customer_payment_report_approved', 'Ödeme bildirimin onaylandı',
      coalesce(v_vehicle, 'Servis') || ' • ' || to_char(v_report.amount, 'FM999999990.00') ||
      ' TL kaydedildi. Kalan ' || to_char(v_remaining, 'FM999999990.00') || ' TL.',
      'high', 'work_order', v_report.work_order_id,
      jsonb_build_object('target_tab','services','work_order_id',v_report.work_order_id,
        'payment_report_id',v_report.id,'remaining_amount',v_remaining),
      'customer-payment-report-approved:' || v_report.id,
      now(), v_order.demo_batch_id, 'payment_updates'
    );

    return jsonb_build_object('id',v_report.id,'status','approved',
      'payment_id',v_payment_id,'remaining_amount',v_remaining);
  end if;

  update public.customer_payment_reports
  set status = 'rejected', review_note = v_review_note,
      reviewed_by = v_user, reviewed_at = now()
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
  into v_vehicle from public.motorcycles m where m.id = v_order.motorcycle_id;

  perform public.notify_customer_users(
    v_order.customer_id, v_report.workshop_id, 'payments',
    'customer_payment_report_rejected', 'Ödeme bildirimin onaylanmadı',
    coalesce(v_vehicle, 'Servis') || ' için gönderdiğin ödeme bildirimi Usta tarafından onaylanmadı.' ||
      case when v_review_note is null then '' else ' Not: ' || v_review_note end,
    'high', 'work_order', v_report.work_order_id,
    jsonb_build_object('target_tab','services','work_order_id',v_report.work_order_id,
      'payment_report_id',v_report.id),
    'customer-payment-report-rejected:' || v_report.id,
    now(), v_order.demo_batch_id, 'payment_updates'
  );

  return jsonb_build_object('id',v_report.id,'status','rejected','remaining_amount',v_remaining);
end;
$$;

revoke all on function public.staff_review_customer_payment_report(uuid, boolean, text) from public, anon;
grant execute on function public.staff_review_customer_payment_report(uuid, boolean, text) to authenticated;
