create or replace function public.next_queue_position(p_workshop_id uuid)
returns integer
language sql
volatile
security definer
set search_path = public
as $$
  select coalesce(max(queue_position), 0) + 1
  from public.work_orders
  where workshop_id = p_workshop_id
    and status not in ('delivered'::public.work_order_status, 'cancelled'::public.work_order_status);
$$;

create or replace function public.prepare_work_order_defaults()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.queue_position is null then
    new.queue_position := public.next_queue_position(new.workshop_id);
  end if;
  if new.status in ('waiting'::public.work_order_status, 'opened'::public.work_order_status) then
    new.status := 'queued'::public.work_order_status;
  end if;
  new.queue_updated_at := now();
  return new;
end;
$$;

drop trigger if exists work_order_defaults on public.work_orders;
create trigger work_order_defaults
before insert on public.work_orders
for each row execute function public.prepare_work_order_defaults();

create or replace function public.validate_work_order_price()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.price_type = 'fixed'::public.price_type and new.quoted_price is not null then
    new.price_entered_at := coalesce(new.price_entered_at, now());
  elsif new.price_type = 'estimated'::public.price_type
    and new.estimated_price_min is not null and new.estimated_price_max is not null then
    if new.estimated_price_max < new.estimated_price_min then
      raise exception 'Tahmini üst fiyat alt fiyattan küçük olamaz';
    end if;
    new.price_entered_at := coalesce(new.price_entered_at, now());
  end if;

  if new.status in (
      'repair_started'::public.work_order_status,
      'in_progress'::public.work_order_status,
      'extra_approval_waiting'::public.work_order_status,
      'parts_waiting'::public.work_order_status,
      'testing'::public.work_order_status,
      'ready'::public.work_order_status,
      'completed'::public.work_order_status,
      'delivered'::public.work_order_status
    ) and not (
      (new.price_type = 'fixed'::public.price_type and new.quoted_price is not null)
      or
      (new.price_type = 'estimated'::public.price_type and new.estimated_price_min is not null and new.estimated_price_max is not null)
    ) then
    raise exception 'Tamire başlamadan önce ücret veya tahmini ücret girmeniz gerekiyor.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_work_order_price_trigger on public.work_orders;
create trigger validate_work_order_price_trigger
before insert or update of status, price_type, quoted_price, estimated_price_min, estimated_price_max
on public.work_orders
for each row execute function public.validate_work_order_price();

create or replace function public.set_work_order_timestamps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status in ('repair_started'::public.work_order_status, 'in_progress'::public.work_order_status)
    and old.status is distinct from new.status and new.started_at is null then new.started_at = now(); end if;
  if new.status in ('ready'::public.work_order_status, 'completed'::public.work_order_status)
    and old.status is distinct from new.status and new.completed_at is null then new.completed_at = now(); end if;
  if new.status = 'delivered'::public.work_order_status
    and old.status is distinct from new.status and new.delivered_at is null then new.delivered_at = now(); end if;
  if old.status is distinct from new.status then new.queue_updated_at = now(); end if;
  return new;
end;
$$;

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
  if not public.is_workshop_owner(target_workshop)
     and not public.is_workshop_worker(target_workshop)
     and not (public.is_workshop_apprentice(target_workshop) and p_status in ('precheck', 'parts_waiting', 'testing')) then
    raise exception 'Servis durumunu değiştirme yetkiniz yok';
  end if;
  update public.work_orders set status = p_status where id = p_work_order_id;
end;
$$;

revoke execute on function public.next_queue_position(uuid) from public, anon;
revoke execute on function public.update_work_order_status(uuid, public.work_order_status) from public, anon;
grant execute on function public.next_queue_position(uuid) to authenticated;
grant execute on function public.update_work_order_status(uuid, public.work_order_status) to authenticated;
