-- DraBornGarage v0.9.5 -> v0.9.4 rollback
-- Restores report formulas and removes the automatic service-completion trigger.
-- Historical completion timestamps repaired by v0.9.5 are intentionally preserved.

drop trigger if exists work_order_complete_service_rows on public.work_orders;

do $$
declare
  v_sql text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef(p.oid)
  into v_sql
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'staff_get_personal_report'
  order by p.oid desc limit 1;

  if v_sql is null then raise exception 'staff_get_personal_report bulunamadı'; end if;

  v_sql := replace(v_sql,
    $old$status in ('ready','completed','delivered')$old$,
    $new$status in ('completed','delivered')$new$
  );
  v_sql := replace(v_sql,
    $old$status not in ('ready','completed','delivered','cancelled')$old$,
    $new$status not in ('completed','delivered','cancelled')$new$
  );

  v_old := $old$'service_count',coalesce((select sum(public.mechanic_order_service_count(id,v_user_id,false)) from my_orders),0),
    'completed_service_count',coalesce((select sum(public.mechanic_order_service_count(id,v_user_id,true)) from my_orders),0),
    'recorded_amount',coalesce((select sum(public.mechanic_order_recorded_amount(id,v_user_id)) from my_orders),0),$old$;
  v_new := $new$'service_count',(select count(*) from my_services),
    'completed_service_count',(select count(*) from my_services where completed),
    'recorded_amount',coalesce((select sum(price) from my_services where completed),0),$new$;
  if position(v_old in v_sql) = 0 then raise exception 'Kişisel rapor v0.9.5 özet kalıbı bulunamadı'; end if;
  v_sql := replace(v_sql, v_old, v_new);

  v_old := $old$service_totals as (
    select (wo.arrived_at at time zone v_timezone)::date day_value,
           coalesce(sum(public.mechanic_order_recorded_amount(wo.id,v_user_id)),0) recorded_amount
    from my_orders wo
    group by 1
  )$old$;
  v_new := $new$service_totals as (
    select (wo.arrived_at at time zone v_timezone)::date day_value,coalesce(sum(s.price) filter(where s.completed),0) recorded_amount
    from my_orders wo left join public.work_order_services s on s.work_order_id=wo.id and s.mechanic_id=v_user_id
    group by 1
  )$new$;
  if position(v_old in v_sql) = 0 then raise exception 'Kişisel günlük v0.9.5 kalıbı bulunamadı'; end if;
  v_sql := replace(v_sql, v_old, v_new);

  v_old := $old$'recorded_amount',public.mechanic_order_recorded_amount(wo.id,v_user_id),$old$;
  v_new := $new$'recorded_amount',coalesce((select sum(s.price) from public.work_order_services s where s.work_order_id=wo.id and s.mechanic_id=v_user_id and s.completed),0),$new$;
  if position(v_old in v_sql) = 0 then raise exception 'Kişisel iş v0.9.5 kalıbı bulunamadı'; end if;
  v_sql := replace(v_sql, v_old, v_new);

  execute v_sql;
end;
$$;

do $$
declare
  v_sql text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef(p.oid)
  into v_sql
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'owner_get_business_report'
  order by p.oid desc limit 1;

  if v_sql is null then raise exception 'owner_get_business_report bulunamadı'; end if;

  v_sql := replace(v_sql,
    $old$status in ('ready','completed','delivered')$old$,
    $new$status in ('completed','delivered')$new$
  );
  v_sql := replace(v_sql,
    $old$status not in ('ready','completed','delivered','cancelled')$old$,
    $new$status not in ('completed','delivered','cancelled')$new$
  );

  v_old := $old$'service_count',coalesce((select sum(public.mechanic_order_service_count(wo.id,m.user_id,false)) from period_orders wo where wo.assigned_mechanic_id=m.user_id or exists(select 1 from public.work_order_services s where s.work_order_id=wo.id and s.mechanic_id=m.user_id)),0),
    'completed_service_count',coalesce((select sum(public.mechanic_order_service_count(wo.id,m.user_id,true)) from period_orders wo where wo.assigned_mechanic_id=m.user_id or exists(select 1 from public.work_order_services s where s.work_order_id=wo.id and s.mechanic_id=m.user_id)),0),
    'recorded_amount',coalesce((select sum(public.mechanic_order_recorded_amount(wo.id,m.user_id)) from period_orders wo where wo.assigned_mechanic_id=m.user_id or exists(select 1 from public.work_order_services s where s.work_order_id=wo.id and s.mechanic_id=m.user_id)),0),$old$;
  v_new := $new$'service_count',(select count(*) from public.work_order_services s join period_orders wo on wo.id=s.work_order_id where s.mechanic_id=m.user_id),
    'completed_service_count',(select count(*) from public.work_order_services s join period_orders wo on wo.id=s.work_order_id where s.mechanic_id=m.user_id and s.completed),
    'recorded_amount',coalesce((select sum(s.price) from public.work_order_services s join period_orders wo on wo.id=s.work_order_id where s.mechanic_id=m.user_id and s.completed),0),$new$;
  if position(v_old in v_sql) = 0 then raise exception 'İşletme Usta v0.9.5 özet kalıbı bulunamadı'; end if;
  v_sql := replace(v_sql, v_old, v_new);

  v_old := $old$coalesce((select sum(public.mechanic_order_recorded_amount(wo.id,m.user_id)) from period_orders wo where wo.assigned_mechanic_id=m.user_id or exists(select 1 from public.work_order_services s where s.work_order_id=wo.id and s.mechanic_id=m.user_id)),0) desc,m.full_name$old$;
  v_new := $new$coalesce((select sum(s.price) from public.work_order_services s join period_orders wo on wo.id=s.work_order_id where s.mechanic_id=m.user_id and s.completed),0) desc,m.full_name$new$;
  if position(v_old in v_sql) = 0 then raise exception 'İşletme Usta v0.9.5 sıralama kalıbı bulunamadı'; end if;
  v_sql := replace(v_sql, v_old, v_new);

  execute v_sql;
end;
$$;

drop function if exists public.sync_completed_order_services();
drop function if exists public.mechanic_order_service_count(uuid,uuid,boolean);
drop function if exists public.mechanic_order_recorded_amount(uuid,uuid);

grant execute on function public.staff_get_personal_report(uuid,timestamptz,timestamptz) to authenticated;
grant execute on function public.owner_get_business_report(uuid,timestamptz,timestamptz) to authenticated;
