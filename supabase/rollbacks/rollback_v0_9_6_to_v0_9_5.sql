-- DraBornGarage v0.9.6 -> v0.9.5 rollback
-- Restores price-before-repair validation and priority-first notification ordering.

revoke all on function public.notification_delete(uuid) from public;
revoke all on function public.notification_delete(uuid) from anon;
revoke all on function public.notification_delete(uuid) from authenticated;
drop function if exists public.notification_delete(uuid);

create or replace function public.notification_get_center(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid := auth.uid();
  v_preferences jsonb;
  v_feed jsonb;
  v_upcoming jsonb;
  v_counts jsonb;
  v_unread integer;
  v_upcoming_count integer;
begin
  if v_user is null then raise exception 'Oturum gerekli'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 250 then p_limit := 100; end if;

  insert into public.notification_preferences(user_id)
  values(v_user)
  on conflict(user_id) do nothing;

  perform public.notification_refresh_reminders();

  select jsonb_build_object(
    'local_notifications_enabled',local_notifications_enabled,
    'service_updates',service_updates,
    'appointment_reminders',appointment_reminders,
    'appointment_reminder_24h',appointment_reminder_24h,
    'appointment_reminder_2h',appointment_reminder_2h,
    'payment_updates',payment_updates,
    'receivable_reminders',receivable_reminders,
    'platform_reminders',platform_reminders,
    'customer_link_updates',customer_link_updates,
    'notification_sound',notification_sound,
    'push_notifications_enabled',push_notifications_enabled,
    'updated_at',updated_at
  ) into v_preferences
  from public.notification_preferences
  where user_id=v_user;

  select count(*)::integer into v_unread
  from public.user_notifications
  where user_id=v_user and archived_at is null and read_at is null and deliver_at<=now();

  select count(*)::integer into v_upcoming_count
  from public.user_notifications
  where user_id=v_user and archived_at is null and deliver_at>now();

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',n.id,
    'workshop_id',n.workshop_id,
    'workshop_name',w.name,
    'category',n.category,
    'notification_type',n.notification_type,
    'priority',n.priority,
    'entity_type',n.entity_type,
    'entity_id',n.entity_id,
    'title',n.title,
    'body',n.body,
    'data',n.data,
    'deliver_at',n.deliver_at,
    'read_at',n.read_at,
    'created_at',n.created_at
  ) order by case n.priority when 'urgent' then 1 when 'high' then 2 when 'normal' then 3 else 4 end,n.deliver_at desc),'[]'::jsonb)
  into v_feed
  from (
    select *
    from public.user_notifications
    where user_id=v_user and archived_at is null and deliver_at<=now()
    order by case priority when 'urgent' then 1 when 'high' then 2 when 'normal' then 3 else 4 end,deliver_at desc
    limit p_limit
  ) n
  left join public.workshops w on w.id=n.workshop_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',n.id,
    'workshop_id',n.workshop_id,
    'workshop_name',w.name,
    'category',n.category,
    'notification_type',n.notification_type,
    'priority',n.priority,
    'entity_type',n.entity_type,
    'entity_id',n.entity_id,
    'title',n.title,
    'body',n.body,
    'data',n.data,
    'deliver_at',n.deliver_at,
    'read_at',n.read_at,
    'created_at',n.created_at
  ) order by n.deliver_at),'[]'::jsonb)
  into v_upcoming
  from (
    select *
    from public.user_notifications
    where user_id=v_user and archived_at is null and deliver_at>now()
    order by deliver_at
    limit 80
  ) n
  left join public.workshops w on w.id=n.workshop_id;

  select coalesce(jsonb_object_agg(category,total),'{}'::jsonb)
  into v_counts
  from (
    select category,count(*)::integer total
    from public.user_notifications
    where user_id=v_user and archived_at is null and read_at is null and deliver_at<=now()
    group by category
  ) q;

  return jsonb_build_object(
    'notifications',coalesce(v_feed,'[]'::jsonb),
    'upcoming',coalesce(v_upcoming,'[]'::jsonb),
    'preferences',coalesce(v_preferences,'{}'::jsonb),
    'unread_count',coalesce(v_unread,0),
    'upcoming_count',coalesce(v_upcoming_count,0),
    'category_counts',coalesce(v_counts,'{}'::jsonb),
    'server_time',now()
  );
end;
$$;

create or replace function public.validate_work_order_price()
returns trigger
language plpgsql
set search_path to 'public'
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

create or replace function public.update_work_order_status(p_work_order_id uuid, p_status public.work_order_status)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  target_workshop uuid;
begin
  select workshop_id into target_workshop
  from public.work_orders
  where id=p_work_order_id;

  if target_workshop is null then raise exception 'İş emri bulunamadı'; end if;

  if not public.is_admin()
     and not public.is_workshop_owner(target_workshop)
     and not (public.is_workshop_worker(target_workshop) and public.can_access_work_order(p_work_order_id))
     and not (public.is_workshop_apprentice(target_workshop) and p_status in ('precheck','parts_waiting','testing')) then
    raise exception 'Servis durumunu değiştirme yetkiniz yok';
  end if;

  if p_status in ('repair_started','testing','ready','completed','delivered')
     and exists (
       select 1 from public.work_order_extra_requests
       where work_order_id=p_work_order_id and status='pending'
     ) then
    raise exception 'Bekleyen ek işlem onayı sonuçlanmadan bu aşamaya geçilemez';
  end if;

  if p_status='extra_approval_waiting'
     and not exists (
       select 1 from public.work_order_extra_requests
       where work_order_id=p_work_order_id and status='pending'
     ) then
    raise exception 'Onay bekleyen ek işlem bulunamadı';
  end if;

  update public.work_orders set status=p_status where id=p_work_order_id;
end;
$$;

grant execute on function public.notification_get_center(integer) to authenticated;
grant execute on function public.update_work_order_status(uuid,public.work_order_status) to authenticated;
