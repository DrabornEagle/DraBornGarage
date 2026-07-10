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
  where work_order_id = target_id and extra_request_id is null;

  select labor_total + coalesce(sum(labor_amount), 0)
  into labor_total
  from public.work_order_extra_requests
  where work_order_id = target_id and status = 'approved';

  select coalesce(sum(total_price), 0)
  into part_total
  from public.work_order_parts
  where work_order_id = target_id and extra_request_id is null;

  select part_total + coalesce(sum(parts_amount), 0)
  into part_total
  from public.work_order_extra_requests
  where work_order_id = target_id and status = 'approved';

  update public.work_orders
  set labor_amount = labor_total,
      parts_amount = part_total,
      total_amount = labor_total + part_total,
      payment_status = case
        when amount_received <= 0 then 'unpaid'::public.payment_status
        when labor_total + part_total > 0 and amount_received >= labor_total + part_total then 'paid'::public.payment_status
        else 'partial'::public.payment_status
      end
  where id = target_id;

  return coalesce(new, old);
end;
$$;

create trigger extra_request_totals_after_change
after insert or delete or update of status, labor_amount, parts_amount
on public.work_order_extra_requests
for each row execute function public.recalculate_work_order_totals();

create or replace function public.set_work_order_timestamps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status in ('repair_started'::public.work_order_status, 'in_progress'::public.work_order_status)
    and old.status is distinct from new.status and new.started_at is null then
    new.started_at = now();
  end if;

  if new.status = 'testing'::public.work_order_status
    and old.status is distinct from new.status and new.testing_started_at is null then
    new.testing_started_at = now();
  end if;

  if new.status in ('ready'::public.work_order_status, 'completed'::public.work_order_status)
    and old.status is distinct from new.status then
    new.ready_at = coalesce(new.ready_at, now());
    new.completed_at = coalesce(new.completed_at, now());
  end if;

  if new.status = 'delivered'::public.work_order_status
    and old.status is distinct from new.status and new.delivered_at is null then
    new.delivered_at = now();
  end if;

  if old.status is distinct from new.status then new.queue_updated_at = now(); end if;
  return new;
end;
$$;

create or replace function public.log_work_order_status_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into public.work_order_events(work_order_id, workshop_id, actor_id, event_type, old_status, new_status, note)
    values (
      new.id, new.workshop_id, auth.uid(), 'status_changed', old.status, new.status,
      case
        when new.status = 'testing' then 'Motor test aşamasına alındı'
        when new.status = 'ready' then 'Motor teslimata hazırlandı'
        when new.status = 'repair_started' then 'Tamire başlandı'
        when new.status = 'extra_approval_waiting' then 'Ek işlem için müşteri onayı bekleniyor'
        else null
      end
    );
  end if;
  return new;
end;
$$;

create trigger work_order_status_event_after_update
after update of status on public.work_orders
for each row execute function public.log_work_order_status_event();

create or replace function public.update_work_order_status(p_work_order_id uuid, p_status public.work_order_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare target_workshop uuid;
begin
  select workshop_id into target_workshop from public.work_orders where id = p_work_order_id;
  if target_workshop is null then raise exception 'İş emri bulunamadı'; end if;

  if not public.is_admin()
     and not public.is_workshop_owner(target_workshop)
     and not (public.is_workshop_worker(target_workshop) and public.can_access_work_order(p_work_order_id))
     and not (public.is_workshop_apprentice(target_workshop) and p_status in ('precheck', 'parts_waiting', 'testing')) then
    raise exception 'Servis durumunu değiştirme yetkiniz yok';
  end if;

  if p_status in ('repair_started','testing','ready','completed','delivered')
     and exists (select 1 from public.work_order_extra_requests where work_order_id = p_work_order_id and status = 'pending') then
    raise exception 'Bekleyen ek işlem onayı sonuçlanmadan bu aşamaya geçilemez';
  end if;

  if p_status = 'extra_approval_waiting'
     and not exists (select 1 from public.work_order_extra_requests where work_order_id = p_work_order_id and status = 'pending') then
    raise exception 'Onay bekleyen ek işlem bulunamadı';
  end if;

  update public.work_orders set status = p_status where id = p_work_order_id;
end;
$$;

create or replace function public.can_manage_work_order_v04(p_work_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.work_orders wo
    where wo.id = p_work_order_id
      and (
        public.is_admin()
        or public.is_workshop_owner(wo.workshop_id)
        or (public.is_workshop_worker(wo.workshop_id) and public.can_access_work_order(wo.id))
      )
  );
$$;

create or replace function public.staff_create_extra_request(
  p_work_order_id uuid,
  p_title text,
  p_description text,
  p_labor_amount numeric,
  p_parts_amount numeric,
  p_action text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  wo record;
  new_id uuid;
  next_status public.extra_work_status;
  method_value public.extra_approval_method;
  response_time timestamptz;
  event_name text;
begin
  select * into wo from public.work_orders where id = p_work_order_id;
  if wo.id is null then raise exception 'İş emri bulunamadı'; end if;
  if not public.can_manage_work_order_v04(p_work_order_id) then raise exception 'Ek işlem oluşturma yetkiniz yok'; end if;
  if wo.status in ('ready','completed','delivered','cancelled') then raise exception 'Sonuçlanmış servis kaydına ek işlem açılamaz'; end if;
  if exists (select 1 from public.work_order_extra_requests where work_order_id = p_work_order_id and status = 'pending') then raise exception 'Bu servis için zaten onay bekleyen bir ek işlem var'; end if;
  if length(trim(coalesce(p_title,''))) < 3 then raise exception 'Ek işlem adı en az 3 karakter olmalı'; end if;
  if coalesce(p_labor_amount,0) < 0 or coalesce(p_parts_amount,0) < 0 or coalesce(p_labor_amount,0) + coalesce(p_parts_amount,0) <= 0 then raise exception 'Ek işçilik veya parça tutarı girilmelidir'; end if;

  if p_action = 'pending_app' then
    next_status := 'pending'; method_value := 'app'; response_time := null; event_name := 'created';
  elsif p_action = 'approved_in_person' then
    next_status := 'approved'; method_value := 'in_person'; response_time := now(); event_name := 'approved';
  elsif p_action = 'approved_phone' then
    next_status := 'approved'; method_value := 'phone'; response_time := now(); event_name := 'approved';
  elsif p_action = 'approved_whatsapp' then
    next_status := 'approved'; method_value := 'whatsapp'; response_time := now(); event_name := 'approved';
  elsif p_action = 'rejected' then
    next_status := 'rejected'; method_value := 'staff_rejected'; response_time := now(); event_name := 'rejected';
  else
    raise exception 'Geçersiz onay yöntemi';
  end if;

  insert into public.work_order_extra_requests(
    work_order_id, workshop_id, requested_by, mechanic_id, title, description,
    labor_amount, parts_amount, status, approval_method, resume_status, responded_by, responded_at
  ) values (
    wo.id, wo.workshop_id, auth.uid(), coalesce(wo.assigned_mechanic_id, auth.uid()),
    trim(p_title), nullif(trim(p_description), ''), coalesce(p_labor_amount,0), coalesce(p_parts_amount,0),
    next_status, method_value, wo.status,
    case when response_time is not null then auth.uid() else null end,
    response_time
  ) returning id into new_id;

  insert into public.work_order_extra_request_events(extra_request_id, work_order_id, workshop_id, actor_id, event_type, method, old_status, new_status, note)
  values (new_id, wo.id, wo.workshop_id, auth.uid(), event_name, method_value, null, next_status,
    case when next_status = 'pending' then 'Müşteri uygulamasından onay bekleniyor' else null end);

  insert into public.work_order_events(work_order_id, workshop_id, actor_id, event_type, note)
  values (
    wo.id, wo.workshop_id, auth.uid(),
    case when next_status = 'approved' then 'extra_approved' when next_status = 'rejected' then 'extra_rejected' else 'extra_created' end,
    trim(p_title)
  );

  if next_status = 'pending' then update public.work_orders set status = 'extra_approval_waiting' where id = wo.id; end if;
  return new_id;
end;
$$;

create or replace function public.staff_decide_extra_request(
  p_extra_request_id uuid,
  p_approve boolean,
  p_method text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  method_value public.extra_approval_method;
  next_status public.extra_work_status;
begin
  select * into rec from public.work_order_extra_requests where id = p_extra_request_id;
  if rec.id is null then raise exception 'Ek işlem talebi bulunamadı'; end if;
  if not public.can_manage_work_order_v04(rec.work_order_id) then raise exception 'Ek işlem karar yetkiniz yok'; end if;
  if rec.status <> 'pending' then raise exception 'Bu talep daha önce sonuçlandırılmış'; end if;

  if p_approve then
    next_status := 'approved';
    if p_method = 'in_person' then method_value := 'in_person';
    elsif p_method = 'phone' then method_value := 'phone';
    elsif p_method = 'whatsapp' then method_value := 'whatsapp';
    else raise exception 'Onay yöntemi seçilmelidir';
    end if;
  else
    next_status := 'rejected';
    method_value := 'staff_rejected';
  end if;

  update public.work_order_extra_requests
  set status = next_status,
      approval_method = method_value,
      response_note = nullif(trim(p_note), ''),
      responded_by = auth.uid(),
      responded_at = now()
  where id = rec.id;

  insert into public.work_order_extra_request_events(extra_request_id, work_order_id, workshop_id, actor_id, event_type, method, old_status, new_status, note)
  values (rec.id, rec.work_order_id, rec.workshop_id, auth.uid(), case when p_approve then 'approved' else 'rejected' end, method_value, rec.status, next_status, nullif(trim(p_note), ''));

  insert into public.work_order_events(work_order_id, workshop_id, actor_id, event_type, note)
  values (rec.work_order_id, rec.workshop_id, auth.uid(), case when p_approve then 'extra_approved' else 'extra_rejected' end, rec.title);

  update public.work_orders
  set status = rec.resume_status
  where id = rec.work_order_id
    and status = 'extra_approval_waiting'
    and not exists (select 1 from public.work_order_extra_requests x where x.work_order_id = rec.work_order_id and x.status = 'pending');
end;
$$;

revoke execute on function public.can_manage_work_order_v04(uuid) from public, anon, authenticated;
revoke execute on function public.staff_create_extra_request(uuid,text,text,numeric,numeric,text) from public, anon;
revoke execute on function public.staff_decide_extra_request(uuid,boolean,text,text) from public, anon;
grant execute on function public.staff_create_extra_request(uuid,text,text,numeric,numeric,text) to authenticated;
grant execute on function public.staff_decide_extra_request(uuid,boolean,text,text) to authenticated;
