-- DraBornGarage v1.1.0
-- Recalculate the same work order charge when its final total changes,
-- without retroactively repricing unrelated historical charges.
begin;

create or replace function public.sync_platform_charge_from_work_order()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  s public.workshop_platform_settings%rowtype;
  v_timezone text;
  v_charge_time timestamptz;
  v_charge_date date;
begin
  if new.status='cancelled' then
    update public.platform_fee_charges
    set voided_at=coalesce(voided_at,now()),
        void_reason='Servis iptal edildi',
        updated_at=now()
    where work_order_id=new.id and voided_at is null;
    return new;
  end if;

  if new.status not in ('ready','completed','delivered') then
    return new;
  end if;

  select * into s
  from public.workshop_platform_settings
  where workshop_id=new.workshop_id;

  if not found or not s.is_enabled then
    return new;
  end if;

  select coalesce(timezone,'Europe/Istanbul')
  into v_timezone
  from public.workshops
  where id=new.workshop_id;

  v_charge_time:=coalesce(new.delivered_at,new.ready_at,new.completed_at,new.updated_at,now());
  v_charge_date:=(v_charge_time at time zone v_timezone)::date;

  if v_charge_date<s.starts_on then
    return new;
  end if;

  insert into public.platform_fee_charges(
    workshop_id,work_order_id,fee_per_order,fee_mode,fee_percentage,
    order_total_amount,amount,charge_date,source_status,charged_at
  )
  values(
    new.workshop_id,new.id,s.fee_per_order,s.fee_mode,
    case when s.fee_mode='percentage' then s.fee_percentage else null end,
    case when s.fee_mode='percentage' then greatest(coalesce(new.total_amount,0),0) else null end,
    public.platform_calculate_fee(s.fee_mode,s.fee_per_order,s.fee_percentage,new.total_amount),
    v_charge_date,new.status,v_charge_time
  )
  on conflict(work_order_id) do update set
    fee_per_order=excluded.fee_per_order,
    fee_mode=excluded.fee_mode,
    fee_percentage=excluded.fee_percentage,
    order_total_amount=excluded.order_total_amount,
    amount=excluded.amount,
    charge_date=excluded.charge_date,
    source_status=excluded.source_status,
    charged_at=excluded.charged_at,
    voided_at=null,
    void_reason=null,
    updated_at=now();

  return new;
end;
$$;

revoke all on function public.sync_platform_charge_from_work_order() from public,anon,authenticated;

commit;
