create or replace function public.notification_refresh_reminders()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); a record; wo record; st record; v_a integer:=0; v_r integer:=0; v_p integer:=0;
begin
  if v_user is null then raise exception 'Oturum gerekli'; end if;
  insert into public.notification_preferences(user_id) values(v_user) on conflict(user_id) do nothing;
  for a in
    select distinct ap.id from public.appointments ap
    where ap.status in ('pending','confirmed') and ap.scheduled_start>now()
      and (ap.mechanic_id=v_user
        or exists(select 1 from public.customer_links cl where cl.user_id=v_user and cl.customer_id=ap.customer_id and cl.workshop_id=ap.workshop_id and cl.status='approved')
        or exists(select 1 from public.workshop_members wm where wm.user_id=v_user and wm.workshop_id=ap.workshop_id and wm.is_active and wm.role in ('owner','owner_mechanic'))
        or public.is_admin()) limit 250
  loop v_a:=v_a+public.notification_schedule_appointment(a.id); end loop;
  for wo in
    select distinct w.id from public.work_orders w
    where w.receivable_status='open' and w.debt_promised_date is not null
      and (w.assigned_mechanic_id=v_user
        or exists(select 1 from public.customer_links cl where cl.user_id=v_user and cl.customer_id=w.customer_id and cl.workshop_id=w.workshop_id and cl.status='approved')
        or exists(select 1 from public.workshop_members wm where wm.user_id=v_user and wm.workshop_id=w.workshop_id and wm.is_active and wm.role in ('owner','owner_mechanic'))
        or public.is_admin()) limit 250
  loop v_r:=v_r+public.notification_schedule_receivable(wo.id); end loop;
  for st in
    select distinct s.id from public.platform_fee_statements s
    where public.is_admin() or exists(select 1 from public.workshop_members wm where wm.user_id=v_user and wm.workshop_id=s.workshop_id and wm.is_active and wm.role in ('owner','owner_mechanic')) limit 250
  loop v_p:=v_p+public.notification_schedule_platform_statement(st.id); end loop;
  return jsonb_build_object('appointment_notifications',v_a,'receivable_notifications',v_r,'platform_notifications',v_p,'refreshed_at',now());
end; $$;

create or replace function public.notification_get_center(p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_preferences jsonb; v_feed jsonb; v_upcoming jsonb; v_counts jsonb; v_unread integer; v_upcoming_count integer;
begin
  if v_user is null then raise exception 'Oturum gerekli'; end if;
  if p_limit is null or p_limit<1 or p_limit>250 then p_limit:=100; end if;
  insert into public.notification_preferences(user_id) values(v_user) on conflict(user_id) do nothing;
  perform public.notification_refresh_reminders();
  select to_jsonb(p)-'user_id'-'created_at' into v_preferences from public.notification_preferences p where user_id=v_user;
  select count(*)::integer into v_unread from public.user_notifications where user_id=v_user and archived_at is null and read_at is null and deliver_at<=now();
  select count(*)::integer into v_upcoming_count from public.user_notifications where user_id=v_user and archived_at is null and deliver_at>now();
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',n.id,'workshop_id',n.workshop_id,'workshop_name',w.name,'category',n.category,'notification_type',n.notification_type,
    'priority',n.priority,'entity_type',n.entity_type,'entity_id',n.entity_id,'title',n.title,'body',n.body,'data',n.data,
    'deliver_at',n.deliver_at,'read_at',n.read_at,'created_at',n.created_at
  ) order by case n.priority when 'urgent' then 1 when 'high' then 2 when 'normal' then 3 else 4 end,n.deliver_at desc),'[]'::jsonb)
  into v_feed from (select * from public.user_notifications where user_id=v_user and archived_at is null and deliver_at<=now() order by deliver_at desc limit p_limit) n left join public.workshops w on w.id=n.workshop_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',n.id,'workshop_id',n.workshop_id,'workshop_name',w.name,'category',n.category,'notification_type',n.notification_type,
    'priority',n.priority,'entity_type',n.entity_type,'entity_id',n.entity_id,'title',n.title,'body',n.body,'data',n.data,
    'deliver_at',n.deliver_at,'read_at',n.read_at,'created_at',n.created_at
  ) order by n.deliver_at),'[]'::jsonb)
  into v_upcoming from (select * from public.user_notifications where user_id=v_user and archived_at is null and deliver_at>now() order by deliver_at limit 80) n left join public.workshops w on w.id=n.workshop_id;
  select coalesce(jsonb_object_agg(category,total),'{}'::jsonb) into v_counts
  from (select category,count(*)::integer total from public.user_notifications where user_id=v_user and archived_at is null and read_at is null and deliver_at<=now() group by category) q;
  return jsonb_build_object('notifications',coalesce(v_feed,'[]'::jsonb),'upcoming',coalesce(v_upcoming,'[]'::jsonb),'preferences',coalesce(v_preferences,'{}'::jsonb),'unread_count',coalesce(v_unread,0),'upcoming_count',coalesce(v_upcoming_count,0),'category_counts',coalesce(v_counts,'{}'::jsonb),'server_time',now());
end; $$;

create or replace function public.notification_mark_read(p_notification_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  update public.user_notifications set read_at=coalesce(read_at,now()),updated_at=now() where id=p_notification_id and user_id=auth.uid() and archived_at is null;
  get diagnostics v_count=row_count; return v_count>0;
end; $$;

create or replace function public.notification_mark_all_read()
returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  update public.user_notifications set read_at=coalesce(read_at,now()),updated_at=now() where user_id=auth.uid() and archived_at is null and read_at is null and deliver_at<=now();
  get diagnostics v_count=row_count; return v_count;
end; $$;

create or replace function public.notification_archive(p_notification_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  update public.user_notifications set archived_at=now(),read_at=coalesce(read_at,now()),updated_at=now() where id=p_notification_id and user_id=auth.uid() and archived_at is null;
  get diagnostics v_count=row_count; return v_count>0;
end; $$;

create or replace function public.notification_update_preferences(
  p_local_notifications_enabled boolean,p_service_updates boolean,p_appointment_reminders boolean,
  p_appointment_reminder_24h boolean,p_appointment_reminder_2h boolean,p_payment_updates boolean,
  p_receivable_reminders boolean,p_platform_reminders boolean,p_customer_link_updates boolean
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'Oturum gerekli'; end if;
  insert into public.notification_preferences(user_id,local_notifications_enabled,service_updates,appointment_reminders,appointment_reminder_24h,appointment_reminder_2h,payment_updates,receivable_reminders,platform_reminders,customer_link_updates)
  values(v_user,coalesce(p_local_notifications_enabled,true),coalesce(p_service_updates,true),coalesce(p_appointment_reminders,true),coalesce(p_appointment_reminder_24h,true),coalesce(p_appointment_reminder_2h,true),coalesce(p_payment_updates,true),coalesce(p_receivable_reminders,true),coalesce(p_platform_reminders,true),coalesce(p_customer_link_updates,true))
  on conflict(user_id) do update set
    local_notifications_enabled=excluded.local_notifications_enabled,service_updates=excluded.service_updates,
    appointment_reminders=excluded.appointment_reminders,appointment_reminder_24h=excluded.appointment_reminder_24h,
    appointment_reminder_2h=excluded.appointment_reminder_2h,payment_updates=excluded.payment_updates,
    receivable_reminders=excluded.receivable_reminders,platform_reminders=excluded.platform_reminders,
    customer_link_updates=excluded.customer_link_updates,updated_at=now();
  if not coalesce(p_appointment_reminders,true) then update public.user_notifications set archived_at=now(),updated_at=now() where user_id=v_user and category='appointments' and deliver_at>now() and archived_at is null; end if;
  if not coalesce(p_receivable_reminders,true) then update public.user_notifications set archived_at=now(),updated_at=now() where user_id=v_user and category='receivables' and deliver_at>now() and archived_at is null; end if;
  if not coalesce(p_platform_reminders,true) then update public.user_notifications set archived_at=now(),updated_at=now() where user_id=v_user and category='platform' and deliver_at>now() and archived_at is null; end if;
  perform public.notification_refresh_reminders();
  return (select to_jsonb(p)-'user_id'-'created_at' from public.notification_preferences p where user_id=v_user);
end; $$;

revoke execute on function public.notification_refresh_reminders() from public,anon;
revoke execute on function public.notification_get_center(integer) from public,anon;
revoke execute on function public.notification_mark_read(uuid) from public,anon;
revoke execute on function public.notification_mark_all_read() from public,anon;
revoke execute on function public.notification_archive(uuid) from public,anon;
revoke execute on function public.notification_update_preferences(boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean) from public,anon;
grant execute on function public.notification_refresh_reminders() to authenticated;
grant execute on function public.notification_get_center(integer) to authenticated;
grant execute on function public.notification_mark_read(uuid) to authenticated;
grant execute on function public.notification_mark_all_read() to authenticated;
grant execute on function public.notification_archive(uuid) to authenticated;
grant execute on function public.notification_update_preferences(boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean) to authenticated;
