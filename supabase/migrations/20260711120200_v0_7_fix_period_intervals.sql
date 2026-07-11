create or replace function public.platform_period_values(
  p_cycle public.platform_billing_cycle,
  p_reference date,
  p_weekly_due_day smallint,
  p_monthly_due_day smallint
)
returns table(cycle_start date,cycle_end date,due_date date)
language plpgsql immutable set search_path=public as $$
declare
  v_next_month date;
  v_offset int;
begin
  if p_cycle='weekly' then
    cycle_start := p_reference-(extract(isodow from p_reference)::int-1);
    cycle_end := cycle_start+6;
    v_offset := (p_weekly_due_day-extract(isodow from cycle_end)::int+7)%7;
    if v_offset=0 then v_offset:=7; end if;
    due_date := cycle_end+v_offset;
  else
    cycle_start := date_trunc('month',p_reference)::date;
    cycle_end := (cycle_start+interval '1 month' - interval '1 day')::date;
    v_next_month := cycle_end+1;
    if p_monthly_due_day=0 then
      due_date := (v_next_month+interval '1 month' - interval '1 day')::date;
    else
      due_date := v_next_month+(p_monthly_due_day-1);
    end if;
  end if;
  return next;
end; $$;

revoke all on function public.platform_period_values(public.platform_billing_cycle,date,smallint,smallint) from public,anon,authenticated;
