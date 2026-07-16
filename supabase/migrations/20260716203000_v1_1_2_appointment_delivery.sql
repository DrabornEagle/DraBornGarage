-- DraBornGarage v1.1.2
-- Include owner_mechanic members in owner notifications and deduplicate appointment events.
begin;

create or replace function public.notify_workshop_owners(
  p_workshop_id uuid,
  p_category text,
  p_notification_type text,
  p_title text,
  p_body text,
  p_priority text default 'normal',
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_data jsonb default '{}'::jsonb,
  p_dedupe_suffix text default null,
  p_deliver_at timestamptz default now(),
  p_demo_batch_id uuid default null,
  p_preference_subtype text default null
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record;
  v_count integer := 0;
  v_key text;
begin
  for r in
    select distinct wm.user_id
    from public.workshop_members wm
    where wm.workshop_id = p_workshop_id
      and wm.is_active
      and wm.role in (
        'owner'::public.member_role,
        'owner_mechanic'::public.member_role
      )
  loop
    v_key := case
      when p_dedupe_suffix is null then null
      else r.user_id::text || ':' || p_dedupe_suffix
    end;
    if public.enqueue_user_notification(
      r.user_id, p_workshop_id, p_category, p_notification_type, p_title, p_body,
      p_priority, p_entity_type, p_entity_id, p_data, v_key, p_deliver_at,
      p_demo_batch_id, p_preference_subtype
    ) is not null then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$function$;

create or replace function public.notify_appointment_event()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record;
  v_body text;
  v_title text;
  v_type text;
  v_priority text := 'normal';
begin
  begin
    select
      w.name as workshop_name,
      coalesce(w.timezone, 'Europe/Istanbul') as timezone,
      c.full_name as customer_name,
      m.brand || ' ' || m.model || case when m.plate is null then '' else ' • ' || m.plate end as vehicle,
      p.full_name as mechanic_name
    into r
    from public.workshops w
    join public.customers c on c.id = new.customer_id
    join public.motorcycles m on m.id = new.motorcycle_id
    join public.profiles p on p.id = new.mechanic_id
    where w.id = new.workshop_id;

    v_body := r.vehicle || ' • ' || new.service_title || ' • '
      || to_char(new.scheduled_start at time zone r.timezone, 'DD.MM.YYYY HH24:MI');

    if tg_op = 'INSERT' then
      perform public.notify_customer_users(
        new.customer_id, new.workshop_id, 'appointments', 'appointment_created',
        case when new.status = 'confirmed' then 'Randevun onaylandı' else 'Randevu talebin alındı' end,
        v_body, case when new.status = 'confirmed' then 'high' else 'normal' end,
        'appointment', new.id,
        jsonb_build_object('target_tab','appointments','appointment_id',new.id,'status',new.status,'scheduled_start',new.scheduled_start),
        'appointment:' || new.id || ':customer:created', now(), null, null
      );

      perform public.enqueue_user_notification(
        new.mechanic_id, new.workshop_id, 'appointments', 'new_appointment', 'Yeni randevu',
        r.customer_name || ' • ' || v_body, 'high', 'appointment', new.id,
        jsonb_build_object('target_tab','appointments','appointment_id',new.id,'status',new.status,'scheduled_start',new.scheduled_start),
        new.mechanic_id || ':appointment:' || new.id || ':created', now(), null, null
      );

      if new.source = 'customer' then
        perform public.notify_workshop_owners(
          new.workshop_id, 'appointments', 'new_customer_appointment', 'Yeni müşteri randevusu',
          r.customer_name || ' • ' || v_body, 'high', 'appointment', new.id,
          jsonb_build_object('target_tab','appointments','appointment_id',new.id,'status',new.status,'scheduled_start',new.scheduled_start),
          'appointment:' || new.id || ':created', now(), null, null
        );
      end if;
    else
      if old.scheduled_start is distinct from new.scheduled_start then
        perform public.notify_customer_users(
          new.customer_id, new.workshop_id, 'appointments', 'appointment_rescheduled',
          'Randevu saatin değişti', v_body, 'high', 'appointment', new.id,
          jsonb_build_object('target_tab','appointments','appointment_id',new.id,'status',new.status,'scheduled_start',new.scheduled_start),
          'appointment:' || new.id || ':customer:rescheduled:' || extract(epoch from new.scheduled_start)::bigint,
          now(), null, null
        );
        perform public.enqueue_user_notification(
          new.mechanic_id, new.workshop_id, 'appointments', 'appointment_rescheduled',
          'Randevu saati değişti', r.customer_name || ' • ' || v_body, 'high', 'appointment', new.id,
          jsonb_build_object('target_tab','appointments','appointment_id',new.id,'status',new.status,'scheduled_start',new.scheduled_start),
          new.mechanic_id || ':appointment:' || new.id || ':rescheduled:' || extract(epoch from new.scheduled_start)::bigint,
          now(), null, null
        );
        if new.source = 'customer' then
          perform public.notify_workshop_owners(
            new.workshop_id, 'appointments', 'appointment_rescheduled', 'Müşteri randevusu değişti',
            r.customer_name || ' • ' || v_body, 'high', 'appointment', new.id,
            jsonb_build_object('target_tab','appointments','appointment_id',new.id,'status',new.status,'scheduled_start',new.scheduled_start),
            'appointment:' || new.id || ':rescheduled:' || extract(epoch from new.scheduled_start)::bigint,
            now(), null, null
          );
        end if;
      end if;

      if old.status is distinct from new.status then
        v_type := null;
        v_title := null;
        v_priority := 'normal';
        case new.status
          when 'confirmed' then v_type := 'appointment_confirmed'; v_title := 'Randevun onaylandı'; v_priority := 'high';
          when 'cancelled' then v_type := 'appointment_cancelled'; v_title := 'Randevu iptal edildi'; v_priority := 'high';
          when 'arrived' then v_type := 'appointment_arrived'; v_title := 'Randevuya giriş yapıldı';
          when 'converted' then v_type := 'appointment_converted'; v_title := 'Randevu servis kaydına dönüştü';
          when 'no_show' then v_type := 'appointment_no_show'; v_title := 'Randevu gerçekleşmedi'; v_priority := 'high';
          else null;
        end case;

        if v_type is not null then
          perform public.notify_customer_users(
            new.customer_id, new.workshop_id, 'appointments', v_type, v_title, v_body,
            v_priority, 'appointment', new.id,
            jsonb_build_object('target_tab','appointments','appointment_id',new.id,'status',new.status,'scheduled_start',new.scheduled_start),
            'appointment:' || new.id || ':customer:status:' || new.status, now(), null, null
          );
          perform public.enqueue_user_notification(
            new.mechanic_id, new.workshop_id, 'appointments', v_type, v_title,
            r.customer_name || ' • ' || v_body, v_priority, 'appointment', new.id,
            jsonb_build_object('target_tab','appointments','appointment_id',new.id,'status',new.status,'scheduled_start',new.scheduled_start),
            new.mechanic_id || ':appointment:' || new.id || ':status:' || new.status,
            now(), null, null
          );
          if new.source = 'customer' then
            perform public.notify_workshop_owners(
              new.workshop_id, 'appointments', v_type, v_title,
              r.customer_name || ' • ' || v_body, v_priority, 'appointment', new.id,
              jsonb_build_object('target_tab','appointments','appointment_id',new.id,'status',new.status,'scheduled_start',new.scheduled_start),
              'appointment:' || new.id || ':status:' || new.status, now(), null, null
            );
          end if;
        end if;
      end if;
    end if;

    perform public.notification_schedule_appointment(new.id);
  exception when others then
    raise warning 'DraBornGarage notification appointment trigger skipped: %', sqlerrm;
  end;
  return new;
end;
$function$;

-- Recreate the missed owner notification for recent active customer appointments.
do $backfill$
declare
  a record;
begin
  for a in
    select
      ap.id,
      ap.workshop_id,
      ap.status,
      ap.scheduled_start,
      c.full_name as customer_name,
      m.brand || ' ' || m.model || case when m.plate is null then '' else ' • ' || m.plate end as vehicle,
      ap.service_title,
      coalesce(w.timezone, 'Europe/Istanbul') as timezone
    from public.appointments ap
    join public.workshops w on w.id = ap.workshop_id
    join public.customers c on c.id = ap.customer_id
    join public.motorcycles m on m.id = ap.motorcycle_id
    where ap.source = 'customer'
      and ap.status in ('pending','confirmed')
      and ap.created_at >= now() - interval '14 days'
  loop
    perform public.notify_workshop_owners(
      a.workshop_id, 'appointments', 'new_customer_appointment', 'Yeni müşteri randevusu',
      a.customer_name || ' • ' || a.vehicle || ' • ' || a.service_title || ' • '
        || to_char(a.scheduled_start at time zone a.timezone, 'DD.MM.YYYY HH24:MI'),
      'high', 'appointment', a.id,
      jsonb_build_object('target_tab','appointments','appointment_id',a.id,'status',a.status,'scheduled_start',a.scheduled_start),
      'appointment:' || a.id || ':created', now(), null, null
    );
  end loop;
end;
$backfill$;

commit;
