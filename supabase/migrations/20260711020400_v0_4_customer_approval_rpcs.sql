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
    'remaining_amount', greatest(0, wo.total_amount - wo.amount_received),
    'payment_status', wo.payment_status::text,
    'arrived_at', wo.arrived_at,
    'started_at', wo.started_at,
    'testing_started_at', wo.testing_started_at,
    'ready_at', wo.ready_at,
    'completed_at', wo.completed_at,
    'delivered_at', wo.delivered_at,
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'title', s.title,
        'description', s.description,
        'price', s.price,
        'completed', s.completed,
        'started_at', s.started_at,
        'completed_at', s.completed_at,
        'extra_request_id', s.extra_request_id,
        'included_in_total', s.extra_request_id is null
      ) order by s.created_at)
      from public.work_order_services s where s.work_order_id = wo.id
    ), '[]'::jsonb),
    'parts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'part_name', p.part_name,
        'quantity', p.quantity,
        'unit_price', p.unit_price,
        'total_price', p.total_price,
        'used_at', p.used_at,
        'extra_request_id', p.extra_request_id,
        'included_in_total', p.extra_request_id is null
      ) order by p.created_at)
      from public.work_order_parts p where p.work_order_id = wo.id
    ), '[]'::jsonb),
    'extra_requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', x.id,
        'title', x.title,
        'description', x.description,
        'labor_amount', x.labor_amount,
        'parts_amount', x.parts_amount,
        'total_amount', x.total_amount,
        'status', x.status::text,
        'approval_method', x.approval_method::text,
        'response_note', x.response_note,
        'responded_at', x.responded_at,
        'created_at', x.created_at,
        'can_respond', x.status = 'pending'
      ) order by x.created_at desc)
      from public.work_order_extra_requests x where x.work_order_id = wo.id
    ), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id,
        'category', n.category,
        'note', n.note,
        'author_name', pr.full_name,
        'created_at', n.created_at
      ) order by n.created_at desc)
      from public.work_order_notes n
      left join public.profiles pr on pr.id = n.author_id
      where n.work_order_id = wo.id and n.visibility = 'customer'
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'event_type', e.event_type,
        'old_status', e.old_status::text,
        'new_status', e.new_status::text,
        'note', e.note,
        'created_at', e.created_at
      ) order by e.created_at)
      from public.work_order_events e
      where e.work_order_id = wo.id
        and e.event_type in ('status_changed','extra_created','extra_approved','extra_rejected')
    ), '[]'::jsonb)
  ) into result
  from public.work_orders wo
  join public.workshops w on w.id = wo.workshop_id
  join public.motorcycles m on m.id = wo.motorcycle_id
  where wo.id = p_work_order_id;

  return result;
end;
$$;

create or replace function public.customer_respond_extra_request(p_extra_request_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  next_status public.extra_work_status;
begin
  select x.* into rec
  from public.work_order_extra_requests x
  join public.work_orders wo on wo.id = x.work_order_id
  join public.customer_links cl on cl.customer_id = wo.customer_id
    and cl.workshop_id = wo.workshop_id
    and cl.user_id = auth.uid()
    and cl.status = 'approved'
  where x.id = p_extra_request_id;

  if rec.id is null then raise exception 'Ek işlem talebi bulunamadı'; end if;
  if rec.status <> 'pending' then raise exception 'Bu talep daha önce sonuçlandırılmış'; end if;
  if rec.approval_method <> 'app' then raise exception 'Bu talep uygulamadan yanıtlanamaz'; end if;

  if p_approve then next_status := 'approved'; else next_status := 'rejected'; end if;

  update public.work_order_extra_requests
  set status = next_status,
      approval_method = 'app',
      response_note = nullif(btrim(p_note), ''),
      responded_by = auth.uid(),
      responded_at = now()
  where id = rec.id;

  insert into public.work_order_extra_request_events(extra_request_id, work_order_id, workshop_id, actor_id, event_type, method, old_status, new_status, note)
  values (rec.id, rec.work_order_id, rec.workshop_id, auth.uid(), case when p_approve then 'approved' else 'rejected' end, 'app', rec.status, next_status, nullif(btrim(p_note), ''));

  insert into public.work_order_events(work_order_id, workshop_id, actor_id, event_type, note)
  values (rec.work_order_id, rec.workshop_id, auth.uid(), case when p_approve then 'extra_approved' else 'extra_rejected' end, rec.title);

  update public.work_orders
  set status = rec.resume_status
  where id = rec.work_order_id
    and status = 'extra_approval_waiting'
    and not exists (select 1 from public.work_order_extra_requests x where x.work_order_id = rec.work_order_id and x.status = 'pending');
end;
$$;

revoke execute on function public.customer_get_services(uuid) from public, anon;
revoke execute on function public.customer_get_service_detail(uuid) from public, anon;
revoke execute on function public.customer_respond_extra_request(uuid,boolean,text) from public, anon;
grant execute on function public.customer_get_services(uuid) to authenticated;
grant execute on function public.customer_get_service_detail(uuid) to authenticated;
grant execute on function public.customer_respond_extra_request(uuid,boolean,text) to authenticated;
