-- DraBornGarage v1.1.0
-- Distinct notification channels and percentage/fixed platform service fee.
begin;

alter table public.platform_global_settings
  add column if not exists default_fee_mode text not null default 'percentage',
  add column if not exists default_fee_percentage numeric(7,4) not null default 10;
alter table public.platform_global_settings drop constraint if exists platform_global_settings_fee_mode_check;
alter table public.platform_global_settings add constraint platform_global_settings_fee_mode_check check (default_fee_mode in ('percentage','fixed'));
alter table public.platform_global_settings drop constraint if exists platform_global_settings_percentage_check;
alter table public.platform_global_settings add constraint platform_global_settings_percentage_check check (default_fee_percentage between 0 and 100);

alter table public.workshop_platform_settings
  add column if not exists fee_mode text not null default 'percentage',
  add column if not exists fee_percentage numeric(7,4) not null default 10;
alter table public.workshop_platform_settings drop constraint if exists workshop_platform_settings_fee_mode_check;
alter table public.workshop_platform_settings add constraint workshop_platform_settings_fee_mode_check check (fee_mode in ('percentage','fixed'));
alter table public.workshop_platform_settings drop constraint if exists workshop_platform_settings_percentage_check;
alter table public.workshop_platform_settings add constraint workshop_platform_settings_percentage_check check (fee_percentage between 0 and 100);

alter table public.platform_fee_charges
  add column if not exists fee_mode text not null default 'fixed',
  add column if not exists fee_percentage numeric(7,4),
  add column if not exists order_total_amount numeric(12,2);
alter table public.platform_fee_charges drop constraint if exists platform_fee_charges_fee_mode_check;
alter table public.platform_fee_charges add constraint platform_fee_charges_fee_mode_check check (fee_mode in ('percentage','fixed'));
alter table public.platform_fee_charges drop constraint if exists platform_fee_charges_percentage_check;
alter table public.platform_fee_charges add constraint platform_fee_charges_percentage_check check (fee_percentage is null or fee_percentage between 0 and 100);

update public.platform_global_settings
set default_fee_mode='percentage', default_fee_percentage=10, default_fee_per_order=50, updated_at=now()
where id=1;
update public.workshop_platform_settings
set fee_mode='percentage', fee_percentage=10, fee_per_order=coalesce(nullif(fee_per_order,0),50), updated_at=now();
update public.platform_fee_charges
set fee_mode='fixed', fee_percentage=null, order_total_amount=null
where fee_mode is distinct from 'fixed' or fee_percentage is not null;

create or replace function public.platform_calculate_fee(p_mode text,p_fixed numeric,p_percentage numeric,p_total numeric)
returns numeric language sql immutable set search_path=public as $$
  select round(case when coalesce(p_mode,'percentage')='percentage'
    then greatest(coalesce(p_total,0),0)*greatest(least(coalesce(p_percentage,10),100),0)/100
    else greatest(coalesce(p_fixed,50),0) end,2);
$$;

create or replace function public.create_default_platform_settings_for_workshop()
returns trigger language plpgsql security definer set search_path=public as $$
declare g public.platform_global_settings%rowtype; v_month_day smallint := (1 + floor(random()*28))::smallint; v_week_day smallint := (1 + floor(random()*7))::smallint;
begin
  select * into g from public.platform_global_settings where id=1;
  insert into public.workshop_platform_settings(workshop_id,fee_per_order,fee_mode,fee_percentage,billing_cycle,weekly_due_day,monthly_due_day,starts_on,is_enabled)
  values(new.id,coalesce(g.default_fee_per_order,50),coalesce(g.default_fee_mode,'percentage'),coalesce(g.default_fee_percentage,10),'monthly',v_week_day,v_month_day,current_date,true)
  on conflict(workshop_id) do update set is_enabled=true,updated_at=now();
  return new;
end; $$;

create or replace function public.platform_sync_eligible_orders(p_workshop_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare v_count int:=0;
begin
  insert into public.platform_fee_charges(workshop_id,work_order_id,fee_per_order,fee_mode,fee_percentage,order_total_amount,amount,charge_date,source_status,charged_at)
  select wo.workshop_id,wo.id,s.fee_per_order,s.fee_mode,
    case when s.fee_mode='percentage' then s.fee_percentage else null end,
    case when s.fee_mode='percentage' then greatest(coalesce(wo.total_amount,0),0) else null end,
    public.platform_calculate_fee(s.fee_mode,s.fee_per_order,s.fee_percentage,wo.total_amount),
    (coalesce(wo.delivered_at,wo.ready_at,wo.completed_at,wo.updated_at,now()) at time zone coalesce(w.timezone,'Europe/Istanbul'))::date,
    wo.status,coalesce(wo.delivered_at,wo.ready_at,wo.completed_at,wo.updated_at,now())
  from public.work_orders wo
  join public.workshops w on w.id=wo.workshop_id
  join public.workshop_platform_settings s on s.workshop_id=wo.workshop_id
  where wo.workshop_id=p_workshop_id and s.is_enabled
    and wo.status in ('ready','completed','delivered')
    and (coalesce(wo.delivered_at,wo.ready_at,wo.completed_at,wo.updated_at,now()) at time zone coalesce(w.timezone,'Europe/Istanbul'))::date>=s.starts_on
  on conflict(work_order_id) do update set source_status=excluded.source_status,voided_at=null,void_reason=null,updated_at=now();
  get diagnostics v_count=row_count;
  return v_count;
end; $$;

create or replace function public.sync_platform_charge_from_work_order()
returns trigger language plpgsql security definer set search_path=public as $$
declare s public.workshop_platform_settings%rowtype; v_timezone text; v_charge_time timestamptz; v_charge_date date;
begin
  if new.status='cancelled' then
    update public.platform_fee_charges set voided_at=coalesce(voided_at,now()),void_reason='Servis iptal edildi',updated_at=now() where work_order_id=new.id and voided_at is null;
    return new;
  end if;
  if new.status not in ('ready','completed','delivered') then return new; end if;
  select * into s from public.workshop_platform_settings where workshop_id=new.workshop_id;
  if not found or not s.is_enabled then return new; end if;
  select coalesce(timezone,'Europe/Istanbul') into v_timezone from public.workshops where id=new.workshop_id;
  v_charge_time:=coalesce(new.delivered_at,new.ready_at,new.completed_at,new.updated_at,now());
  v_charge_date:=(v_charge_time at time zone v_timezone)::date;
  if v_charge_date<s.starts_on then return new; end if;
  insert into public.platform_fee_charges(workshop_id,work_order_id,fee_per_order,fee_mode,fee_percentage,order_total_amount,amount,charge_date,source_status,charged_at)
  values(new.workshop_id,new.id,s.fee_per_order,s.fee_mode,
    case when s.fee_mode='percentage' then s.fee_percentage else null end,
    case when s.fee_mode='percentage' then greatest(coalesce(new.total_amount,0),0) else null end,
    public.platform_calculate_fee(s.fee_mode,s.fee_per_order,s.fee_percentage,new.total_amount),v_charge_date,new.status,v_charge_time)
  on conflict(work_order_id) do update set source_status=excluded.source_status,voided_at=null,void_reason=null,updated_at=now();
  return new;
end; $$;

drop trigger if exists work_order_platform_charge_after_change on public.work_orders;
create trigger work_order_platform_charge_after_change
after insert or update of status,completed_at,ready_at,delivered_at,total_amount on public.work_orders
for each row execute function public.sync_platform_charge_from_work_order();

create or replace function public.platform_get_fee_configuration(p_workshop_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s public.workshop_platform_settings%rowtype; g public.platform_global_settings%rowtype;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if not public.is_admin() and not public.is_workshop_owner(p_workshop_id) then raise exception 'Platform ayarına erişim yetkiniz yok'; end if;
  select * into s from public.workshop_platform_settings where workshop_id=p_workshop_id;
  select * into g from public.platform_global_settings where id=1;
  return jsonb_build_object(
    'settings',jsonb_build_object('fee_mode',coalesce(s.fee_mode,'percentage'),'fee_percentage',coalesce(s.fee_percentage,10),'fee_per_order',coalesce(s.fee_per_order,50)),
    'global_settings',jsonb_build_object('default_fee_mode',coalesce(g.default_fee_mode,'percentage'),'default_fee_percentage',coalesce(g.default_fee_percentage,10),'default_fee_per_order',coalesce(g.default_fee_per_order,50))
  );
end; $$;

create or replace function public.admin_update_platform_global_settings_v110(
  p_default_fee_mode text,p_default_fee_percentage numeric,p_default_fee_per_order numeric,
  p_bank_name text,p_account_holder text,p_iban text,p_payment_note text
) returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if not public.is_admin() then raise exception 'Yalnız Admin platform ödeme bilgilerini değiştirebilir'; end if;
  if p_default_fee_mode not in ('percentage','fixed') then raise exception 'Hesaplama türü geçersiz'; end if;
  if p_default_fee_percentage is null or p_default_fee_percentage<0 or p_default_fee_percentage>100 then raise exception 'Yüzde 0-100 arasında olmalıdır'; end if;
  if p_default_fee_per_order is null or p_default_fee_per_order<0 or p_default_fee_per_order>100000 then raise exception 'Sabit bedel geçersiz'; end if;
  if nullif(trim(coalesce(p_iban,'')),'') is not null and length(regexp_replace(p_iban,'\s','','g')) not between 10 and 34 then raise exception 'IBAN uzunluğu geçersiz'; end if;
  insert into public.platform_global_settings(id,default_fee_mode,default_fee_percentage,default_fee_per_order,bank_name,account_holder,iban,payment_note,updated_by)
  values(1,p_default_fee_mode,p_default_fee_percentage,p_default_fee_per_order,nullif(trim(p_bank_name),''),nullif(trim(p_account_holder),''),upper(nullif(trim(p_iban),'')),nullif(trim(p_payment_note),''),auth.uid())
  on conflict(id) do update set default_fee_mode=excluded.default_fee_mode,default_fee_percentage=excluded.default_fee_percentage,default_fee_per_order=excluded.default_fee_per_order,bank_name=excluded.bank_name,account_holder=excluded.account_holder,iban=excluded.iban,payment_note=excluded.payment_note,updated_by=auth.uid(),updated_at=now();
  return (select to_jsonb(g) from public.platform_global_settings g where id=1);
end; $$;

create or replace function public.admin_update_workshop_platform_settings_v110(
  p_workshop_id uuid,p_fee_mode text,p_fee_percentage numeric,p_fee_per_order numeric,
  p_billing_cycle text,p_weekly_due_day integer,p_monthly_due_day integer,p_starts_on date,p_is_enabled boolean
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_cycle public.platform_billing_cycle;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if not public.is_admin() then raise exception 'Yalnız Admin işletme platform bedelini değiştirebilir'; end if;
  if not exists(select 1 from public.workshops where id=p_workshop_id) then raise exception 'İşletme bulunamadı'; end if;
  if p_fee_mode not in ('percentage','fixed') then raise exception 'Hesaplama türü geçersiz'; end if;
  if p_fee_percentage is null or p_fee_percentage<0 or p_fee_percentage>100 then raise exception 'Yüzde 0-100 arasında olmalıdır'; end if;
  if p_fee_per_order is null or p_fee_per_order<0 or p_fee_per_order>100000 then raise exception 'Sabit bedel geçersiz'; end if;
  if p_billing_cycle not in ('weekly','monthly') then raise exception 'Ödeme periyodu geçersiz'; end if;
  if p_weekly_due_day not between 1 and 7 then raise exception 'Haftalık ödeme günü geçersiz'; end if;
  if not (p_monthly_due_day=0 or p_monthly_due_day between 1 and 28) then raise exception 'Aylık ödeme günü geçersiz'; end if;
  if p_starts_on is null then raise exception 'Başlangıç tarihi gerekli'; end if;
  v_cycle:=p_billing_cycle::public.platform_billing_cycle;
  insert into public.workshop_platform_settings(workshop_id,fee_mode,fee_percentage,fee_per_order,billing_cycle,weekly_due_day,monthly_due_day,starts_on,is_enabled,updated_by)
  values(p_workshop_id,p_fee_mode,p_fee_percentage,p_fee_per_order,v_cycle,p_weekly_due_day,p_monthly_due_day,p_starts_on,coalesce(p_is_enabled,false),auth.uid())
  on conflict(workshop_id) do update set fee_mode=excluded.fee_mode,fee_percentage=excluded.fee_percentage,fee_per_order=excluded.fee_per_order,billing_cycle=excluded.billing_cycle,weekly_due_day=excluded.weekly_due_day,monthly_due_day=excluded.monthly_due_day,starts_on=excluded.starts_on,is_enabled=excluded.is_enabled,updated_by=auth.uid(),updated_at=now();
  perform public.platform_ensure_statements(p_workshop_id);
  perform public.platform_sync_eligible_orders(p_workshop_id);
  return (select to_jsonb(s) from public.workshop_platform_settings s where workshop_id=p_workshop_id);
end; $$;

alter table public.notification_preferences drop constraint if exists notification_preferences_sound_check;
alter table public.notification_preferences add constraint notification_preferences_sound_check check (notification_sound = any (array[
  'system_loud','garage_chime','garage_pulse','garage_alert','garage_bell','garage_siren','garage_turbo','garage_metal','garage_digital','garage_retro','silent'
]::text[]));

create or replace function public.notification_channel_id(p_sound text)
returns text language sql immutable as $$
  select case p_sound
    when 'garage_chime' then 'draborngarage-appointment-chime-v5'
    when 'garage_pulse' then 'draborngarage-workshop-pulse-v5'
    when 'garage_alert' then 'draborngarage-urgent-alert-v5'
    when 'garage_bell' then 'draborngarage-classic-bell-v5'
    when 'garage_siren' then 'draborngarage-siren-v5'
    when 'garage_turbo' then 'draborngarage-turbo-v5'
    when 'garage_metal' then 'draborngarage-metal-v5'
    when 'garage_digital' then 'draborngarage-digital-v5'
    when 'garage_retro' then 'draborngarage-retro-v5'
    when 'silent' then 'draborngarage-silent-v5'
    else 'draborngarage-system-default-v5'
  end;
$$;

create or replace function public.notification_sound_file(p_sound text)
returns text language sql immutable as $$
  select case p_sound
    when 'system_loud' then 'default'
    when 'garage_chime' then 'garage_chime.wav'
    when 'garage_pulse' then 'garage_pulse.wav'
    when 'garage_alert' then 'garage_alert.wav'
    when 'garage_bell' then 'garage_bell.wav'
    when 'garage_siren' then 'garage_siren.wav'
    when 'garage_turbo' then 'garage_turbo.wav'
    when 'garage_metal' then 'garage_metal.wav'
    when 'garage_digital' then 'garage_digital.wav'
    when 'garage_retro' then 'garage_retro.wav'
    when 'silent' then null
    else 'default'
  end;
$$;

revoke all on function public.platform_calculate_fee(text,numeric,numeric,numeric) from public,anon,authenticated;
revoke all on function public.create_default_platform_settings_for_workshop() from public,anon,authenticated;
revoke all on function public.platform_sync_eligible_orders(uuid) from public,anon,authenticated;
revoke all on function public.sync_platform_charge_from_work_order() from public,anon,authenticated;
revoke all on function public.platform_get_fee_configuration(uuid) from public,anon;
grant execute on function public.platform_get_fee_configuration(uuid) to authenticated;
revoke all on function public.admin_update_platform_global_settings_v110(text,numeric,numeric,text,text,text,text) from public,anon;
grant execute on function public.admin_update_platform_global_settings_v110(text,numeric,numeric,text,text,text,text) to authenticated;
revoke all on function public.admin_update_workshop_platform_settings_v110(uuid,text,numeric,numeric,text,integer,integer,date,boolean) from public,anon;
grant execute on function public.admin_update_workshop_platform_settings_v110(uuid,text,numeric,numeric,text,integer,integer,date,boolean) to authenticated;

commit;
