create or replace function public.staff_update_work_order_details(p_work_order_id uuid, p_diagnosis text, p_internal_notes text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.can_manage_work_order_v04(p_work_order_id) is not true then raise exception 'Yetki yok'; end if;
  update public.work_orders
  set diagnosis = nullif(btrim(p_diagnosis), ''), notes = nullif(btrim(p_internal_notes), '')
  where id = p_work_order_id;
end;
$$;

create or replace function public.staff_add_work_order_note(p_work_order_id uuid, p_note text, p_visibility text default 'staff', p_category text default 'general')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  wo_id uuid;
  wo_workshop uuid;
  note_id uuid;
  visibility_value public.work_note_visibility;
begin
  select id, workshop_id into wo_id, wo_workshop from public.work_orders where id = p_work_order_id;
  if wo_id is null then raise exception 'İş emri bulunamadı'; end if;
  if public.can_manage_work_order_v04(p_work_order_id) is not true then raise exception 'Yetki yok'; end if;
  if length(btrim(coalesce(p_note,''))) < 2 then raise exception 'Not çok kısa'; end if;
  if p_visibility = 'customer' then visibility_value := 'customer'; else visibility_value := 'staff'; end if;
  if p_category not in ('general','diagnosis','test','customer_update','internal') then raise exception 'Geçersiz kategori'; end if;

  insert into public.work_order_notes(work_order_id, workshop_id, author_id, visibility, category, note)
  values (wo_id, wo_workshop, auth.uid(), visibility_value, p_category, btrim(p_note))
  returning id into note_id;

  insert into public.work_order_events(work_order_id, workshop_id, actor_id, event_type, note)
  values (wo_id, wo_workshop, auth.uid(), 'note_added', btrim(p_note));

  return note_id;
end;
$$;

create or replace function public.staff_delete_work_order_note(p_note_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare rec record;
begin
  select * into rec from public.work_order_notes where id = p_note_id;
  if rec.id is null then raise exception 'Not bulunamadı'; end if;
  if public.can_manage_work_order_v04(rec.work_order_id) is not true then raise exception 'Yetki yok'; end if;
  if rec.author_id <> auth.uid() and not public.is_admin() and not public.is_workshop_owner(rec.workshop_id) then raise exception 'Not silme yetkisi yok'; end if;
  delete from public.work_order_notes where id = p_note_id;
  insert into public.work_order_events(work_order_id, workshop_id, actor_id, event_type, note)
  values (rec.work_order_id, rec.workshop_id, auth.uid(), 'note_deleted', rec.note);
end;
$$;

create or replace function public.staff_add_work_order_service(
  p_work_order_id uuid,
  p_title text,
  p_description text,
  p_price numeric,
  p_extra_request_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  wo record;
  service_id uuid;
begin
  select * into wo from public.work_orders where id = p_work_order_id;
  if wo.id is null then raise exception 'İş emri bulunamadı'; end if;
  if public.can_manage_work_order_v04(p_work_order_id) is not true then raise exception 'Yetki yok'; end if;
  if length(btrim(coalesce(p_title,''))) < 2 then raise exception 'İşlem adı çok kısa'; end if;
  if coalesce(p_price,0) < 0 then raise exception 'Tutar negatif olamaz'; end if;
  if p_extra_request_id is null and coalesce(p_price,0) <= 0 then raise exception 'Normal işlem için tutar girilmelidir'; end if;
  if p_extra_request_id is not null and not exists (
    select 1 from public.work_order_extra_requests x
    where x.id = p_extra_request_id and x.work_order_id = p_work_order_id and x.status = 'approved'
  ) then raise exception 'Onaylı ek işlem bulunamadı'; end if;

  insert into public.work_order_services(work_order_id, mechanic_id, title, description, price, completed, extra_request_id)
  values (wo.id, coalesce(wo.assigned_mechanic_id, auth.uid()), btrim(p_title), nullif(btrim(p_description), ''), coalesce(p_price,0), false, p_extra_request_id)
  returning id into service_id;

  insert into public.work_order_events(work_order_id, workshop_id, actor_id, event_type, note)
  values (wo.id, wo.workshop_id, auth.uid(), 'service_added', btrim(p_title));

  return service_id;
end;
$$;

create or replace function public.staff_set_work_order_service_state(p_service_id uuid, p_state text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare rec record;
begin
  select s.*, wo.status as current_order_status, wo.workshop_id
  into rec
  from public.work_order_services s
  join public.work_orders wo on wo.id = s.work_order_id
  where s.id = p_service_id;

  if rec.id is null then raise exception 'İşlem bulunamadı'; end if;
  if public.can_manage_work_order_v04(rec.work_order_id) is not true then raise exception 'Yetki yok'; end if;

  if p_state = 'planned' then
    update public.work_order_services set completed = false, started_at = null, completed_at = null where id = p_service_id;
  elsif p_state = 'started' then
    update public.work_order_services set completed = false, started_at = coalesce(started_at, now()), completed_at = null where id = p_service_id;
    insert into public.work_order_events(work_order_id, workshop_id, actor_id, event_type, note)
    values (rec.work_order_id, rec.workshop_id, auth.uid(), 'service_started', rec.title);
    if rec.current_order_status in ('received','queued','precheck','price_entered','approval_waiting') then
      perform public.update_work_order_status(rec.work_order_id, 'repair_started');
    end if;
  elsif p_state = 'completed' then
    update public.work_order_services set completed = true, started_at = coalesce(started_at, now()), completed_at = now() where id = p_service_id;
    insert into public.work_order_events(work_order_id, workshop_id, actor_id, event_type, note)
    values (rec.work_order_id, rec.workshop_id, auth.uid(), 'service_completed', rec.title);
  else
    raise exception 'Geçersiz işlem durumu';
  end if;
end;
$$;

create or replace function public.staff_delete_work_order_service(p_service_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare rec record;
begin
  select s.*, wo.workshop_id into rec
  from public.work_order_services s
  join public.work_orders wo on wo.id = s.work_order_id
  where s.id = p_service_id;
  if rec.id is null then raise exception 'İşlem bulunamadı'; end if;
  if public.can_manage_work_order_v04(rec.work_order_id) is not true then raise exception 'Yetki yok'; end if;
  delete from public.work_order_services where id = p_service_id;
  insert into public.work_order_events(work_order_id, workshop_id, actor_id, event_type, note)
  values (rec.work_order_id, rec.workshop_id, auth.uid(), 'service_deleted', rec.title);
end;
$$;

create or replace function public.staff_add_work_order_part(
  p_work_order_id uuid,
  p_part_name text,
  p_quantity numeric,
  p_unit_price numeric,
  p_extra_request_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  wo record;
  part_row_id uuid;
begin
  select * into wo from public.work_orders where id = p_work_order_id;
  if wo.id is null then raise exception 'İş emri bulunamadı'; end if;
  if public.can_manage_work_order_v04(p_work_order_id) is not true then raise exception 'Yetki yok'; end if;
  if length(btrim(coalesce(p_part_name,''))) < 2 then raise exception 'Parça adı çok kısa'; end if;
  if coalesce(p_quantity,0) <= 0 then raise exception 'Adet sıfırdan büyük olmalı'; end if;
  if coalesce(p_unit_price,0) < 0 then raise exception 'Birim fiyat negatif olamaz'; end if;
  if p_extra_request_id is not null and not exists (
    select 1 from public.work_order_extra_requests x
    where x.id = p_extra_request_id and x.work_order_id = p_work_order_id and x.status = 'approved'
  ) then raise exception 'Onaylı ek işlem bulunamadı'; end if;

  insert into public.work_order_parts(work_order_id, mechanic_id, part_name, quantity, unit_price, extra_request_id, used_at)
  values (wo.id, coalesce(wo.assigned_mechanic_id, auth.uid()), btrim(p_part_name), p_quantity, p_unit_price, p_extra_request_id, now())
  returning id into part_row_id;

  insert into public.work_order_events(work_order_id, workshop_id, actor_id, event_type, note)
  values (wo.id, wo.workshop_id, auth.uid(), 'part_added', btrim(p_part_name));

  return part_row_id;
end;
$$;

create or replace function public.staff_delete_work_order_part(p_part_row_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare rec record;
begin
  select p.*, wo.workshop_id into rec
  from public.work_order_parts p
  join public.work_orders wo on wo.id = p.work_order_id
  where p.id = p_part_row_id;
  if rec.id is null then raise exception 'Parça kaydı bulunamadı'; end if;
  if public.can_manage_work_order_v04(rec.work_order_id) is not true then raise exception 'Yetki yok'; end if;
  delete from public.work_order_parts where id = p_part_row_id;
  insert into public.work_order_events(work_order_id, workshop_id, actor_id, event_type, note)
  values (rec.work_order_id, rec.workshop_id, auth.uid(), 'part_deleted', rec.part_name);
end;
$$;

revoke execute on function public.staff_update_work_order_details(uuid,text,text) from public, anon;
revoke execute on function public.staff_add_work_order_note(uuid,text,text,text) from public, anon;
revoke execute on function public.staff_delete_work_order_note(uuid) from public, anon;
revoke execute on function public.staff_add_work_order_service(uuid,text,text,numeric,uuid) from public, anon;
revoke execute on function public.staff_set_work_order_service_state(uuid,text) from public, anon;
revoke execute on function public.staff_delete_work_order_service(uuid) from public, anon;
revoke execute on function public.staff_add_work_order_part(uuid,text,numeric,numeric,uuid) from public, anon;
revoke execute on function public.staff_delete_work_order_part(uuid) from public, anon;

grant execute on function public.staff_update_work_order_details(uuid,text,text) to authenticated;
grant execute on function public.staff_add_work_order_note(uuid,text,text,text) to authenticated;
grant execute on function public.staff_delete_work_order_note(uuid) to authenticated;
grant execute on function public.staff_add_work_order_service(uuid,text,text,numeric,uuid) to authenticated;
grant execute on function public.staff_set_work_order_service_state(uuid,text) to authenticated;
grant execute on function public.staff_delete_work_order_service(uuid) to authenticated;
grant execute on function public.staff_add_work_order_part(uuid,text,numeric,numeric,uuid) to authenticated;
grant execute on function public.staff_delete_work_order_part(uuid) to authenticated;
