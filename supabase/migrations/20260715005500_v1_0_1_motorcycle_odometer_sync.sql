begin;

create or replace function public.sync_motorcycle_odometer_from_work_order()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.motorcycle_id is not null and new.odometer_in is not null then
    update public.motorcycles
       set odometer = greatest(coalesce(odometer, 0), new.odometer_in),
           updated_at = now()
     where id = new.motorcycle_id
       and workshop_id = new.workshop_id;
  end if;
  return new;
end;
$function$;

drop trigger if exists work_order_motorcycle_odometer_sync_trigger on public.work_orders;
create trigger work_order_motorcycle_odometer_sync_trigger
after insert or update of odometer_in, motorcycle_id on public.work_orders
for each row execute function public.sync_motorcycle_odometer_from_work_order();

update public.motorcycles m
   set odometer = source.latest_odometer,
       updated_at = now()
  from (
    select motorcycle_id, max(odometer_in)::integer as latest_odometer
      from public.work_orders
     where motorcycle_id is not null
       and odometer_in is not null
     group by motorcycle_id
  ) source
 where m.id = source.motorcycle_id
   and source.latest_odometer > coalesce(m.odometer, 0);

commit;
