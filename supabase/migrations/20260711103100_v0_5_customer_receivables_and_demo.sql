drop function if exists public.customer_get_services(uuid);

create function public.customer_get_services(p_workshop_id uuid)
returns table(
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
  testing_started_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  delivered_at timestamptz,
  pending_approval_count integer,
  service_items jsonb,
  receivable_status text,
  debt_promised_date date,
  debt_written_at timestamptz,
  debt_closed_at timestamptz,
  debt_customer_note text,
  last_payment_at timestamptz
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
    wo.testing_started_at,
    wo.ready_at,
    wo.completed_at,
    wo.delivered_at,
    (select count(*)::integer from public.work_order_extra_requests x where x.work_order_id = wo.id and x.status = 'pending'),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'title', s.title,
        'description', s.description,
        'price', s.price,
        'completed', s.completed,
        'started_at', s.started_at,
        'completed_at', s.completed_at,
        'extra_request_id', s.extra_request_id
      ) order by s.created_at)
      from public.work_order_services s
      where s.work_order_id = wo.id
    ), '[]'::jsonb),
    wo.receivable_status::text,
    wo.debt_promised_date,
    wo.debt_written_at,
    wo.debt_closed_at,
    wo.debt_customer_note,
    wo.last_payment_at
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

create or replace function public.customer_get_service_detail(p_work_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare result jsonb;
begin
  if not exists (
    select 1
    from public.work_orders wo
    join public.customer_links cl on cl.customer_id = wo.customer_id
      and cl.workshop_id = wo.workshop_id
      and cl.user_id = auth.uid()
      and cl.status = 'approved'
    where wo.id = p_work_order_id
  ) then raise exception 'Servis kaydı bulunamadı'; end if;

  select jsonb_build_object(
    'id', wo.id,
    'workshop_id', wo.workshop_id,
    'workshop_name', w.name,
    'motorcycle_id', wo.motorcycle_id,
    'brand', m.brand,
    'model', m.model,
    'plate', m.plate,
    'status', wo.status::text,
    'service_type', wo.service_type::text,
    'complaint', wo.complaint,
    'diagnosis', wo.diagnosis,
    'price_type', wo.price_type::text,
    'estimated_price_min', wo.estimated_price_min,
    'estimated_price_max', wo.estimated_price_max,
    'quoted_price', wo.quoted_price,
    'labor_amount', wo.labor_amount,
    'parts_amount', wo.parts_amount,
    'total_amount', wo.total_amount,
    'amount_received', wo.amount_received,
    'remaining_amount', greatest(0, wo.total_amount-wo.amount_received),
    'payment_status', wo.payment_status::text,
    'receivable_status', wo.receivable_status::text,
    'debt_promised_date', wo.debt_promised_date,
    'debt_written_at', wo.debt_written_at,
    'debt_closed_at', wo.debt_closed_at,
    'debt_customer_note', wo.debt_customer_note,
    'last_payment_at', wo.last_payment_at,
    'arrived_at', wo.arrived_at,
    'started_at', wo.started_at,
    'testing_started_at', wo.testing_started_at,
    'ready_at', wo.ready_at,
    'completed_at', wo.completed_at,
    'delivered_at', wo.delivered_at,
    'services', coalesce((select jsonb_agg(jsonb_build_object(
      'id',s.id,'title',s.title,'description',s.description,'price',s.price,'completed',s.completed,
      'started_at',s.started_at,'completed_at',s.completed_at,'extra_request_id',s.extra_request_id,
      'included_in_total',s.extra_request_id is null
    ) order by s.created_at) from public.work_order_services s where s.work_order_id=wo.id),'[]'::jsonb),
    'parts', coalesce((select jsonb_agg(jsonb_build_object(
      'id',p.id,'part_name',p.part_name,'quantity',p.quantity,'unit_price',p.unit_price,'total_price',p.total_price,
      'used_at',p.used_at,'extra_request_id',p.extra_request_id,'included_in_total',p.extra_request_id is null
    ) order by p.created_at) from public.work_order_parts p where p.work_order_id=wo.id),'[]'::jsonb),
    'extra_requests', coalesce((select jsonb_agg(jsonb_build_object(
      'id',x.id,'title',x.title,'description',x.description,'labor_amount',x.labor_amount,'parts_amount',x.parts_amount,
      'total_amount',x.total_amount,'status',x.status::text,'approval_method',x.approval_method::text,
      'response_note',x.response_note,'responded_at',x.responded_at,'created_at',x.created_at,'can_respond',x.status='pending'
    ) order by x.created_at desc) from public.work_order_extra_requests x where x.work_order_id=wo.id),'[]'::jsonb),
    'notes', coalesce((select jsonb_agg(jsonb_build_object(
      'id',n.id,'category',n.category,'note',n.note,'author_name',pr.full_name,'created_at',n.created_at
    ) order by n.created_at desc) from public.work_order_notes n left join public.profiles pr on pr.id=n.author_id where n.work_order_id=wo.id and n.visibility='customer'),'[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object(
      'id',e.id,'event_type',e.event_type,'old_status',e.old_status::text,'new_status',e.new_status::text,'note',e.note,'created_at',e.created_at
    ) order by e.created_at) from public.work_order_events e where e.work_order_id=wo.id and e.event_type in ('status_changed','extra_created','extra_approved','extra_rejected')),'[]'::jsonb),
    'payments', coalesce((select jsonb_agg(jsonb_build_object(
      'id',p.id,'amount',p.amount,'payment_method',p.payment_method::text,'note',p.note,'paid_at',p.paid_at
    ) order by p.paid_at desc) from public.payments p where p.work_order_id=wo.id),'[]'::jsonb),
    'receivable_notes', coalesce((select jsonb_agg(jsonb_build_object(
      'id',n.id,'note',n.note,'created_at',n.created_at
    ) order by n.created_at desc) from public.receivable_notes n where n.work_order_id=wo.id and n.visibility='customer'),'[]'::jsonb)
  ) into result
  from public.work_orders wo
  join public.workshops w on w.id=wo.workshop_id
  join public.motorcycles m on m.id=wo.motorcycle_id
  where wo.id=p_work_order_id;

  return result;
end;
$$;

create or replace function public.create_v05_demo_data(p_workshop_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  root_workshop uuid := public.resolve_demo_root_workshop(p_workshop_id);
  batch_id uuid;
  burak_id uuid; ayse_id uuid; selin_id uuid; mert_id uuid;
  burak_order uuid; ayse_order uuid; selin_order uuid; mert_order uuid;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if not public.is_admin() and not public.is_workshop_owner(root_workshop) then raise exception 'Demo yetkisi yok'; end if;

  select id into batch_id from public.demo_batches where workshop_id=root_workshop order by created_at desc limit 1;
  if batch_id is null then raise exception 'Önce temel demo verilerini yükleyin'; end if;

  select id into burak_id from public.customers where workshop_id=root_workshop and demo_batch_id=batch_id and full_name='Burak Aydın' limit 1;
  select id into ayse_id from public.customers where workshop_id=root_workshop and demo_batch_id=batch_id and full_name='Ayşe Arslan' limit 1;
  select id into selin_id from public.customers where workshop_id=root_workshop and demo_batch_id=batch_id and full_name='Selin Demir' limit 1;
  select id into mert_id from public.customers where workshop_id=root_workshop and demo_batch_id=batch_id and full_name='Mert Çelik' limit 1;

  select id into burak_order from public.work_orders where workshop_id=root_workshop and demo_batch_id=batch_id and customer_id=burak_id limit 1;
  select id into ayse_order from public.work_orders where workshop_id=root_workshop and demo_batch_id=batch_id and customer_id=ayse_id limit 1;
  select id into selin_order from public.work_orders where workshop_id=root_workshop and demo_batch_id=batch_id and customer_id=selin_id limit 1;
  select id into mert_order from public.work_orders where workshop_id=root_workshop and demo_batch_id=batch_id and customer_id=mert_id limit 1;

  if burak_order is not null then
    update public.work_orders set receivable_status='open', debt_promised_date=current_date-3, debt_written_at=coalesce(debt_written_at,now()-interval '8 days'), debt_closed_at=null,
      debt_note='Demo • Müşteri cuma günü kalan tutarı ödeyeceğini söyledi.', debt_customer_note='Kalan ödemeniz için söz verilen tarih geçti.' where id=burak_order;
    insert into public.receivable_notes(work_order_id,workshop_id,author_id,visibility,note)
    select burak_order,root_workshop,auth.uid(),'staff','Demo v0.5 • Telefon görüşmesi yapıldı.'
    where not exists(select 1 from public.receivable_notes where work_order_id=burak_order and note like 'Demo v0.5%');
    insert into public.receivable_notes(work_order_id,workshop_id,author_id,visibility,note)
    select burak_order,root_workshop,auth.uid(),'customer','Ödeme tarihiniz geçti. İşletmeyle iletişime geçebilirsiniz.'
    where not exists(select 1 from public.receivable_notes where work_order_id=burak_order and visibility='customer' and note='Ödeme tarihiniz geçti. İşletmeyle iletişime geçebilirsiniz.');
    insert into public.customer_links(user_id,customer_id,workshop_id,status,method,approved_by,approved_at)
    values(auth.uid(),burak_id,root_workshop,'approved','staff_manual',auth.uid(),now())
    on conflict(user_id,customer_id) do update set status='approved',approved_by=auth.uid(),approved_at=now(),updated_at=now();
  end if;

  if ayse_order is not null then
    update public.work_orders set receivable_status='open', debt_promised_date=current_date, debt_written_at=coalesce(debt_written_at,now()-interval '2 days'), debt_closed_at=null,
      debt_note='Demo • Bugün ödeme günü.', debt_customer_note='Bugün ödeme gününüz.' where id=ayse_order;
  end if;

  if selin_order is not null then
    update public.work_orders set receivable_status='open', debt_promised_date=current_date+7, debt_written_at=coalesce(debt_written_at,now()-interval '1 day'), debt_closed_at=null,
      debt_note='Demo • Gelecek hafta ödeme sözü.', debt_customer_note='Ödeme tarihiniz gelecek hafta.' where id=selin_order;
  end if;

  if mert_order is not null then
    update public.work_orders set receivable_status='closed', debt_promised_date=current_date-5, debt_written_at=coalesce(debt_written_at,now()-interval '10 days'), debt_closed_at=coalesce(debt_closed_at,now()-interval '4 days'),
      debt_note='Demo • Borç tamamen ödendi.', debt_customer_note='Ödemeniz tamamlandı. Teşekkür ederiz.' where id=mert_order;
  end if;

  insert into public.receivable_events(work_order_id,workshop_id,actor_id,event_type,new_status,note)
  select x.order_id,root_workshop,auth.uid(),'demo_receivable_ready',x.status::public.receivable_status,'Demo v0.5 alacak kaydı'
  from (values (burak_order,'open'),(ayse_order,'open'),(selin_order,'open'),(mert_order,'closed')) as x(order_id,status)
  where x.order_id is not null
    and not exists(select 1 from public.receivable_events e where e.work_order_id=x.order_id and e.event_type='demo_receivable_ready');

  return jsonb_build_object('v05_ready',true,'batch_id',batch_id,'open_examples',3,'paid_examples',1,'customer_linked',burak_id is not null);
end;
$$;

revoke execute on function public.customer_get_services(uuid) from public, anon;
revoke execute on function public.customer_get_service_detail(uuid) from public, anon;
revoke execute on function public.create_v05_demo_data(uuid) from public, anon;
grant execute on function public.customer_get_services(uuid) to authenticated;
grant execute on function public.customer_get_service_detail(uuid) to authenticated;
grant execute on function public.create_v05_demo_data(uuid) to authenticated;
