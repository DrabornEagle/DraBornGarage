create or replace function public.create_v04_demo_data(p_workshop_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  root_workshop uuid := public.resolve_demo_root_workshop(p_workshop_id);
  batch_id uuid;
  c1 uuid; c3 uuid; c4 uuid; c5 uuid;
  o1 uuid; o3 uuid; o4 uuid; o5 uuid;
  pending_id uuid;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if not public.is_admin() and not public.is_workshop_owner(root_workshop) then raise exception 'Demo yetkisi yok'; end if;

  select id into batch_id from public.demo_batches where workshop_id = root_workshop order by created_at desc limit 1;
  if batch_id is null then raise exception 'Önce temel demo verilerini yükleyin'; end if;

  select id into c1 from public.customers where workshop_id=root_workshop and demo_batch_id=batch_id and full_name='Emre Kaya' limit 1;
  select id into c3 from public.customers where workshop_id=root_workshop and demo_batch_id=batch_id and full_name='Burak Aydın' limit 1;
  select id into c4 from public.customers where workshop_id=root_workshop and demo_batch_id=batch_id and full_name='Mert Çelik' limit 1;
  select id into c5 from public.customers where workshop_id=root_workshop and demo_batch_id=batch_id and full_name='Ayşe Arslan' limit 1;

  select id into o1 from public.work_orders where workshop_id=root_workshop and demo_batch_id=batch_id and customer_id=c1 limit 1;
  select id into o3 from public.work_orders where workshop_id=root_workshop and demo_batch_id=batch_id and customer_id=c3 limit 1;
  select id into o4 from public.work_orders where workshop_id=root_workshop and demo_batch_id=batch_id and customer_id=c4 limit 1;
  select id into o5 from public.work_orders where workshop_id=root_workshop and demo_batch_id=batch_id and customer_id=c5 limit 1;

  if c1 is not null then
    insert into public.customer_links(user_id, customer_id, workshop_id, status, method, approved_by, approved_at)
    values (auth.uid(), c1, root_workshop, 'approved', 'staff_manual', auth.uid(), now())
    on conflict (user_id, customer_id) do update
      set status='approved', method='staff_manual', workshop_id=excluded.workshop_id, approved_by=auth.uid(), approved_at=now(), updated_at=now();
  end if;

  if o1 is not null and not exists (select 1 from public.work_order_extra_requests where work_order_id=o1) then
    insert into public.work_order_extra_requests(
      work_order_id, workshop_id, requested_by, mechanic_id, title, description,
      labor_amount, parts_amount, status, approval_method, resume_status
    ) values (
      o1, root_workshop, auth.uid(), auth.uid(), 'Ön fren balatası değişimi',
      'Ön kontrolde balatanın güvenli kullanım sınırının altına indiği görüldü.',
      450, 900, 'pending', 'app', 'repair_started'
    ) returning id into pending_id;

    insert into public.work_order_extra_request_events(extra_request_id, work_order_id, workshop_id, actor_id, event_type, method, new_status, note)
    values (pending_id, o1, root_workshop, auth.uid(), 'created', 'app', 'pending', 'Demo • müşteri uygulamasından onay bekleniyor');
    update public.work_orders set status='extra_approval_waiting' where id=o1;
  end if;

  if o3 is not null and not exists (select 1 from public.work_order_extra_requests where work_order_id=o3) then
    insert into public.work_order_extra_requests(
      work_order_id, workshop_id, requested_by, mechanic_id, title, description,
      labor_amount, parts_amount, status, approval_method, resume_status, response_note, responded_by, responded_at
    ) values (
      o3, root_workshop, auth.uid(), auth.uid(), 'Arka fren diski kontrolü ve taşlama',
      'Telefon görüşmesinde ek işçilik onaylandı.', 350, 0, 'approved', 'phone', 'parts_waiting',
      'Demo • telefonla onay alındı', auth.uid(), now() - interval '45 minutes'
    );
  end if;

  if o4 is not null and not exists (select 1 from public.work_order_extra_requests where work_order_id=o4) then
    insert into public.work_order_extra_requests(
      work_order_id, workshop_id, requested_by, mechanic_id, title, description,
      labor_amount, parts_amount, status, approval_method, resume_status, response_note, responded_by, responded_at
    ) values (
      o4, root_workshop, auth.uid(), auth.uid(), 'Hava filtresi değişimi',
      'WhatsApp üzerinden fotoğraf gönderilerek onay alındı.', 200, 600, 'approved', 'whatsapp', 'testing',
      'Demo • WhatsApp ile onaylandı', auth.uid(), now() - interval '2 hours'
    );
    update public.work_orders set testing_started_at=coalesce(testing_started_at, now()-interval '35 minutes') where id=o4;
  end if;

  if o5 is not null and not exists (select 1 from public.work_order_extra_requests where work_order_id=o5) then
    insert into public.work_order_extra_requests(
      work_order_id, workshop_id, requested_by, mechanic_id, title, description,
      labor_amount, parts_amount, status, approval_method, resume_status, response_note, responded_by, responded_at
    ) values (
      o5, root_workshop, auth.uid(), auth.uid(), 'Akü değişimi',
      'Müşteri mevcut aküyü kullanmaya devam etmek istedi.', 100, 1400, 'rejected', 'staff_rejected', 'ready',
      'Demo • müşteri ek işlemi reddetti', auth.uid(), now()-interval '15 minutes'
    );
    update public.work_orders set ready_at=coalesce(ready_at, completed_at, now()-interval '18 minutes') where id=o5;
  end if;

  if o1 is not null and not exists (select 1 from public.work_order_notes where work_order_id=o1) then
    insert into public.work_order_notes(work_order_id, workshop_id, author_id, visibility, category, note) values
      (o1, root_workshop, auth.uid(), 'customer', 'customer_update', 'Ön fren balatası için ek işlem onayınız bekleniyor.'),
      (o1, root_workshop, auth.uid(), 'staff', 'internal', 'Müşteri dönüş yapana kadar motor üzerinde ek işleme başlanmayacak.');
  end if;

  update public.work_order_services
  set started_at=coalesce(started_at, created_at + interval '5 minutes'),
      completed_at=case when completed then coalesce(completed_at, created_at + interval '35 minutes') else completed_at end
  where work_order_id in (o1,o3,o4,o5);

  update public.work_order_parts set used_at=coalesce(used_at, created_at) where work_order_id in (o1,o3,o4,o5);

  return jsonb_build_object(
    'batch_id', batch_id,
    'customer_linked', c1 is not null,
    'pending_extra_request', pending_id,
    'v04_ready', true
  );
end;
$$;

revoke execute on function public.create_v04_demo_data(uuid) from public, anon;
grant execute on function public.create_v04_demo_data(uuid) to authenticated;
