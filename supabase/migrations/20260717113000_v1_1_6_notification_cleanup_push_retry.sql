-- DraBornGarage v1.1.6
-- Clear all current notifications and move Turkish voice channels to v9.
begin;

create or replace function public.notification_clear_all()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_count integer:=0;
begin
  if v_user is null then raise exception 'Oturum gerekli'; end if;
  delete from public.notification_push_requests r
  using public.user_notifications n
  where r.notification_id=n.id and n.user_id=v_user;
  update public.user_notifications
  set archived_at=coalesce(archived_at,now()), read_at=coalesce(read_at,now()), push_error='Kullanıcı tarafından temizlendi', updated_at=now()
  where user_id=v_user and archived_at is null;
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;

revoke all on function public.notification_clear_all() from public,anon;
grant execute on function public.notification_clear_all() to authenticated;

create or replace function public.notification_channel_id(p_sound text,p_category text)
returns text
language sql
immutable
set search_path=public
as $$
select case
when p_sound='turkish_voice' and p_category='appointments' then 'draborngarage-voice-appointment-v9'
when p_sound='turkish_voice' and p_category='customer_links' then 'draborngarage-voice-customer-link-v9'
when p_sound='turkish_voice' and p_category='service' then 'draborngarage-voice-service-v9'
when p_sound='turkish_voice' and p_category in ('payments','receivables','platform') then 'draborngarage-voice-payment-v9'
when p_sound='turkish_voice' then 'draborngarage-voice-generic-v9'
when p_sound='garage_chime' then 'draborngarage-appointment-chime-v7'
when p_sound='garage_pulse' then 'draborngarage-workshop-pulse-v7'
when p_sound='garage_alert' then 'draborngarage-urgent-alert-v7'
when p_sound='garage_bell' then 'draborngarage-classic-bell-v7'
when p_sound='garage_siren' then 'draborngarage-siren-v7'
when p_sound='garage_turbo' then 'draborngarage-turbo-v7'
when p_sound='garage_metal' then 'draborngarage-metal-v7'
when p_sound='garage_digital' then 'draborngarage-digital-v7'
when p_sound='garage_retro' then 'draborngarage-retro-v7'
when p_sound='silent' then 'draborngarage-silent-v7'
else 'draborngarage-system-default-v7' end;
$$;

revoke all on function public.notification_channel_id(text,text) from public,anon,authenticated;
commit;
