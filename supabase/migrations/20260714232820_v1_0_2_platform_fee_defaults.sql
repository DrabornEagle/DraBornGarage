-- DraBornGarage v1.0.2 RC
-- Yeni işletmede platform hizmet bedelini otomatik açar ve rastgele ödeme günü belirler.

create or replace function public.create_default_platform_settings_for_workshop()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_default numeric(12,2);
  v_month_day smallint := (1 + floor(random()*28))::smallint;
  v_week_day smallint := (1 + floor(random()*7))::smallint;
begin
  select default_fee_per_order into v_default from public.platform_global_settings where id=1;
  insert into public.workshop_platform_settings(
    workshop_id,fee_per_order,billing_cycle,weekly_due_day,monthly_due_day,starts_on,is_enabled
  ) values(
    new.id,coalesce(v_default,20),'monthly',v_week_day,v_month_day,current_date,true
  )
  on conflict(workshop_id) do update set
    is_enabled=true,
    monthly_due_day=case when public.workshop_platform_settings.is_enabled then public.workshop_platform_settings.monthly_due_day else excluded.monthly_due_day end,
    starts_on=least(public.workshop_platform_settings.starts_on,current_date),
    updated_at=now();
  return new;
end;
$$;

revoke all on function public.create_default_platform_settings_for_workshop() from public,anon,authenticated;
