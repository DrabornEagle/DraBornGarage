create or replace function public.is_workshop_member(check_workshop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workshop_members wm
    where wm.workshop_id = check_workshop_id
      and wm.user_id = auth.uid()
      and wm.is_active
  );
$$;

create or replace function public.is_workshop_owner(check_workshop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workshop_members wm
    where wm.workshop_id = check_workshop_id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
      and wm.is_active
  );
$$;

create or replace function public.shares_workshop(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workshop_members mine
    join public.workshop_members theirs on theirs.workshop_id = mine.workshop_id and theirs.is_active
    where mine.user_id = auth.uid()
      and mine.is_active
      and theirs.user_id = check_user_id
  );
$$;

create or replace function public.can_access_work_order(check_work_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.work_orders wo
    where wo.id = check_work_order_id
      and (
        public.is_workshop_owner(wo.workshop_id)
        or wo.assigned_mechanic_id = auth.uid()
        or wo.created_by = auth.uid()
      )
  );
$$;

create or replace function public.create_workshop(p_name text, p_phone text default null, p_address text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if char_length(trim(p_name)) < 2 then raise exception 'İşletme adı çok kısa'; end if;

  insert into public.workshops(name, phone, address, created_by)
  values (trim(p_name), nullif(trim(p_phone), ''), nullif(trim(p_address), ''), auth.uid())
  returning id into new_id;

  insert into public.workshop_members(workshop_id, user_id, role)
  values (new_id, auth.uid(), 'owner');

  return new_id;
end;
$$;

create or replace function public.create_workshop_invite(
  p_workshop_id uuid,
  p_role public.member_role,
  p_expires_in_days integer default 30
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_code text;
begin
  if not public.is_workshop_owner(p_workshop_id) then raise exception 'Yalnızca işletme sahibi davet oluşturabilir'; end if;
  generated_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.workshop_invites(workshop_id, code, role, created_by, expires_at)
  values (p_workshop_id, generated_code, p_role, auth.uid(), now() + make_interval(days => greatest(1, p_expires_in_days)));
  return generated_code;
end;
$$;

create or replace function public.join_workshop_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.workshop_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  select * into invite
  from public.workshop_invites
  where code = upper(trim(p_code))
    and is_active
    and used_at is null
    and (expires_at is null or expires_at > now())
  for update;

  if invite.id is null then raise exception 'Davet kodu geçersiz, kullanılmış veya süresi dolmuş'; end if;

  insert into public.workshop_members(workshop_id, user_id, role, is_active)
  values (invite.workshop_id, auth.uid(), invite.role, true)
  on conflict (workshop_id, user_id)
  do update set role = excluded.role, is_active = true;

  update public.workshop_invites
  set used_by = auth.uid(), used_at = now(), is_active = false
  where id = invite.id;

  return invite.workshop_id;
end;
$$;

create or replace function public.fill_workshop_from_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select workshop_id into new.workshop_id from public.work_orders where id = new.work_order_id;
  if new.workshop_id is null then raise exception 'İş emri bulunamadı'; end if;
  return new;
end;
$$;

create trigger services_fill_workshop before insert or update of work_order_id on public.work_order_services for each row execute function public.fill_workshop_from_order();
create trigger work_order_parts_fill_workshop before insert or update of work_order_id on public.work_order_parts for each row execute function public.fill_workshop_from_order();
create trigger payments_fill_workshop before insert or update of work_order_id on public.payments for each row execute function public.fill_workshop_from_order();

create or replace function public.set_work_order_timestamps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'in_progress' and old.status is distinct from new.status and new.started_at is null then new.started_at = now(); end if;
  if new.status = 'completed' and old.status is distinct from new.status and new.completed_at is null then new.completed_at = now(); end if;
  if new.status = 'delivered' and old.status is distinct from new.status and new.delivered_at is null then new.delivered_at = now(); end if;
  return new;
end;
$$;
create trigger work_order_status_timestamps before update of status on public.work_orders for each row execute function public.set_work_order_timestamps();

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
  select coalesce(sum(price), 0) into labor_total from public.work_order_services where work_order_id = target_id;
  select coalesce(sum(total_price), 0) into part_total from public.work_order_parts where work_order_id = target_id;
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

create trigger service_totals_after_change after insert or update or delete on public.work_order_services for each row execute function public.recalculate_work_order_totals();
create trigger part_totals_after_change after insert or update or delete on public.work_order_parts for each row execute function public.recalculate_work_order_totals();

create or replace function public.recalculate_work_order_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid := coalesce(new.work_order_id, old.work_order_id);
  received numeric(12,2);
  total_due numeric(12,2);
begin
  select coalesce(sum(amount), 0) into received from public.payments where work_order_id = target_id;
  select total_amount into total_due from public.work_orders where id = target_id;
  update public.work_orders
  set amount_received = received,
      payment_status = case
        when received <= 0 then 'unpaid'::public.payment_status
        when total_due > 0 and received >= total_due then 'paid'::public.payment_status
        else 'partial'::public.payment_status
      end
  where id = target_id;
  return coalesce(new, old);
end;
$$;
create trigger payment_totals_after_change after insert or update or delete on public.payments for each row execute function public.recalculate_work_order_payment();
