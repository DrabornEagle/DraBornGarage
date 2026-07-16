-- Roll back the v1.1.2 owner role expansion only.
-- Application source rollback is handled by backup/v1.1.1-before-v1.1.2-20260716.
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
      and wm.role = 'owner'::public.member_role
  loop
    v_key := case when p_dedupe_suffix is null then null else r.user_id::text || ':' || p_dedupe_suffix end;
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

commit;
