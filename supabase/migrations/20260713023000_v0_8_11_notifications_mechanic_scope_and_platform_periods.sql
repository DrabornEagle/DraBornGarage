-- DraBornGarage v0.8.11
-- Eşleştirme bildirimleri, Usta iş kapsamı ve işletme yerel saatine göre platform dönemleri.

create or replace function public.platform_workshop_today(p_workshop_id uuid)
returns date
language sql
stable
security definer
set search_path = public
as $$
  select (now() at time zone coalesce((select timezone from public.workshops where id = p_workshop_id), 'Europe/Istanbul'))::date;
$$;

create or replace function public.platform_ensure_statements(p_workshop_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.workshop_platform_settings%rowtype;
  v_cursor date;
  v_current_start date;
  v_values record;
  v_guard int := 0;
  v_local_today date;
begin
  select * into s from public.workshop_platform_settings where workshop_id = p_workshop_id;
  if not found then return; end if;

  v_local_today := public.platform_workshop_today(p_workshop_id);
  select * into v_values from public.platform_period_values(s.billing_cycle, s.starts_on, s.weekly_due_day, s.monthly_due_day);
  v_cursor := v_values.cycle_start;
  select cycle_start into v_current_start from public.platform_period_values(s.billing_cycle, v_local_today, s.weekly_due_day, s.monthly_due_day);

  while v_cursor <= v_current_start loop
    select * into v_values from public.platform_period_values(s.billing_cycle, v_cursor, s.weekly_due_day, s.monthly_due_day);
    insert into public.platform_fee_statements(workshop_id, cycle_start, cycle_end, due_date)
    values(p_workshop_id, v_values.cycle_start, v_values.cycle_end, v_values.due_date)
    on conflict(workshop_id, cycle_start, cycle_end)
    do update set due_date = excluded.due_date, updated_at = now();
    v_cursor := v_values.cycle_end + 1;
    v_guard := v_guard + 1;
    if v_guard > 600 then raise exception 'Platform dönem sınırı aşıldı'; end if;
  end loop;
end;
$$;

do $$
declare
  v_oid oid;
  v_def text;
begin
  select p.oid into v_oid
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'platform_get_dashboard' and p.prokind = 'f'
  order by p.oid desc limit 1;
  if v_oid is not null then
    v_def := pg_get_functiondef(v_oid);
    v_def := replace(v_def, 'current_date', 'public.platform_workshop_today(p_workshop_id)');
    execute v_def;
  end if;
end;
$$;

create or replace function public.can_access_work_order(check_work_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1
    from public.work_orders wo
    join public.workshop_members wm
      on wm.workshop_id = wo.workshop_id
     and wm.user_id = auth.uid()
     and wm.is_active
     and wm.role in ('mechanic'::public.member_role, 'owner_mechanic'::public.member_role)
    where wo.id = check_work_order_id
      and wo.assigned_mechanic_id = auth.uid()
  );
$$;

do $$
declare
  v_oid oid;
  v_def text;
begin
  select p.oid into v_oid
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'staff_get_appointments' and p.prokind = 'f'
  order by p.oid desc limit 1;
  if v_oid is not null then
    v_def := pg_get_functiondef(v_oid);
    v_def := replace(
      v_def,
      'can_view_all := public.is_admin() or public.is_workshop_owner(p_workshop_id);',
      'can_view_all := public.is_admin() or exists (select 1 from public.workshop_members wm where wm.workshop_id=p_workshop_id and wm.user_id=auth.uid() and wm.is_active and wm.role=''owner''::public.member_role);'
    );
    execute v_def;
  end if;
end;
$$;

create or replace function public.notify_customer_claim_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  staff_rec record;
  v_body text;
begin
  begin
    select
      p.full_name as claimant,
      coalesce(c.full_name, p.full_name, 'Müşteri') as customer_name,
      coalesce(m.brand, new.submitted_brand, p.customer_motorcycle_brand, 'Motosiklet') as brand,
      coalesce(m.model, new.submitted_model, p.customer_motorcycle_model, '') as model,
      coalesce(m.plate, new.submitted_plate, p.customer_plate, 'Plaka yok') as plate
    into r
    from public.profiles p
    left join public.customers c on c.id = new.customer_id
    left join public.motorcycles m on m.id = new.motorcycle_id
    where p.id = new.user_id;

    v_body := concat_ws(' • ',
      coalesce(r.claimant, 'Müşteri'),
      trim(concat_ws(' ', coalesce(r.brand, 'Motosiklet'), coalesce(r.model, ''))),
      coalesce(r.plate, 'Plaka yok')
    );

    if tg_op = 'INSERT' and new.status = 'pending' then
      for staff_rec in
        select distinct wm.user_id
        from public.workshop_members wm
        where wm.workshop_id = new.workshop_id
          and wm.is_active
          and wm.role in ('owner'::public.member_role, 'owner_mechanic'::public.member_role, 'mechanic'::public.member_role)
      loop
        perform public.enqueue_user_notification(
          staff_rec.user_id, new.workshop_id, 'customer_links', 'customer_claim_pending',
          'Yeni müşteri eşleştirme talebi', v_body, 'high', 'customer_claim', new.id,
          jsonb_build_object('target_tab','customers','target_section','claims','claim_id',new.id,'motorcycle_id',new.motorcycle_id),
          staff_rec.user_id::text||':customer-claim:'||new.id::text||':pending', now(), null, 'customer_links'
        );
      end loop;
    elsif tg_op = 'UPDATE' and old.status is distinct from new.status and new.status in ('rejected','expired','cancelled') then
      perform public.enqueue_user_notification(
        new.user_id, new.workshop_id, 'customer_links', 'customer_claim_'||new.status,
        case new.status when 'rejected' then 'Eşleştirme talebi reddedildi' when 'expired' then 'Eşleştirme talebinin süresi doldu' else 'Eşleştirme talebi iptal edildi' end,
        v_body||case when new.review_note is null then '' else ' • '||new.review_note end,
        'high', 'customer_claim', new.id,
        jsonb_build_object('target_tab','account','target_section','claim_history','claim_id',new.id,'motorcycle_id',new.motorcycle_id,'status',new.status),
        new.user_id::text||':customer-claim:'||new.id::text||':'||new.status, now(), null, 'customer_links'
      );
    end if;
  exception when others then
    raise warning 'DraBornGarage notification claim trigger skipped: %', sqlerrm;
  end;
  return new;
end;
$$;

do $$
declare
  claim_rec record;
  staff_rec record;
  v_body text;
begin
  for claim_rec in
    select cc.*, p.full_name,
      coalesce(m.brand, cc.submitted_brand, p.customer_motorcycle_brand, 'Motosiklet') as brand,
      coalesce(m.model, cc.submitted_model, p.customer_motorcycle_model, '') as model,
      coalesce(m.plate, cc.submitted_plate, p.customer_plate, 'Plaka yok') as plate
    from public.customer_claims cc
    join public.profiles p on p.id = cc.user_id
    left join public.motorcycles m on m.id = cc.motorcycle_id
    where cc.status = 'pending' and cc.expires_at >= now()
  loop
    v_body := concat_ws(' • ', claim_rec.full_name, trim(concat_ws(' ', claim_rec.brand, claim_rec.model)), claim_rec.plate);
    for staff_rec in
      select distinct wm.user_id
      from public.workshop_members wm
      where wm.workshop_id = claim_rec.workshop_id
        and wm.is_active
        and wm.role in ('owner'::public.member_role, 'owner_mechanic'::public.member_role, 'mechanic'::public.member_role)
    loop
      perform public.enqueue_user_notification(
        staff_rec.user_id, claim_rec.workshop_id, 'customer_links', 'customer_claim_pending',
        'Yeni müşteri eşleştirme talebi', v_body, 'high', 'customer_claim', claim_rec.id,
        jsonb_build_object('target_tab','customers','target_section','claims','claim_id',claim_rec.id,'motorcycle_id',claim_rec.motorcycle_id),
        staff_rec.user_id::text||':customer-claim:'||claim_rec.id::text||':pending', now(), null, 'customer_links'
      );
    end loop;
  end loop;
end;
$$;

create or replace function public.platform_get_charge_detail(p_charge_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.platform_fee_charges%rowtype;
  result jsonb;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  select * into c from public.platform_fee_charges where id = p_charge_id;
  if c.id is null then raise exception 'Ücret kaydı bulunamadı'; end if;
  if not public.is_workshop_owner(c.workshop_id) then raise exception 'Bu ücret kaydını görme yetkiniz yok'; end if;

  select jsonb_build_object(
    'charge', jsonb_build_object('id',c.id,'amount',c.amount,'fee_per_order',c.fee_per_order,'charge_date',c.charge_date,'source_status',c.source_status::text,'charged_at',c.charged_at,'voided_at',c.voided_at),
    'work_order', jsonb_build_object('id',wo.id,'status',wo.status::text,'service_type',wo.service_type::text,'complaint',wo.complaint,'total_amount',wo.total_amount,'amount_received',wo.amount_received,'remaining_amount',greatest(wo.total_amount-wo.amount_received,0),'payment_status',wo.payment_status::text,'receivable_status',wo.receivable_status::text,'arrived_at',wo.arrived_at,'started_at',wo.started_at,'ready_at',wo.ready_at,'delivered_at',wo.delivered_at),
    'customer', jsonb_build_object('id',cu.id,'full_name',cu.full_name,'phone',cu.phone),
    'motorcycle', jsonb_build_object('id',m.id,'brand',m.brand,'model',m.model,'plate',m.plate,'odometer',m.odometer),
    'mechanic', jsonb_build_object('id',p.id,'full_name',p.full_name),
    'services', coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'title',s.title,'description',s.description,'price',s.price,'completed',s.completed) order by s.created_at) from public.work_order_services s where s.work_order_id=wo.id),'[]'::jsonb),
    'parts', coalesce((select jsonb_agg(jsonb_build_object('id',pr.id,'part_name',pr.part_name,'quantity',pr.quantity,'unit_price',pr.unit_price,'total_price',pr.total_price) order by pr.created_at) from public.work_order_parts pr where pr.work_order_id=wo.id),'[]'::jsonb)
  ) into result
  from public.work_orders wo
  join public.customers cu on cu.id=wo.customer_id
  join public.motorcycles m on m.id=wo.motorcycle_id
  left join public.profiles p on p.id=wo.assigned_mechanic_id
  where wo.id=c.work_order_id;

  return coalesce(result,'{}'::jsonb);
end;
$$;

grant execute on function public.platform_workshop_today(uuid) to authenticated;
grant execute on function public.platform_get_charge_detail(uuid) to authenticated;

do $$
declare r record;
begin
  for r in select workshop_id from public.workshop_platform_settings loop
    perform public.platform_ensure_statements(r.workshop_id);
  end loop;
end;
$$;
