-- DraBornGarage v0.9.5
-- A ready motorcycle is completed work and must not remain in active report counts.

do $$
declare
  v_sql text;
begin
  select pg_get_functiondef(p.oid)
  into v_sql
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'staff_get_personal_report'
  order by p.oid desc limit 1;

  if v_sql is null then raise exception 'staff_get_personal_report bulunamadı'; end if;
  if position($old$status not in ('completed','delivered','cancelled')$old$ in v_sql) = 0 then
    raise exception 'Kişisel rapor aktif iş kalıbı bulunamadı';
  end if;

  v_sql := replace(
    v_sql,
    $old$status not in ('completed','delivered','cancelled')$old$,
    $new$status not in ('ready','completed','delivered','cancelled')$new$
  );
  execute v_sql;
end;
$$;

do $$
declare
  v_sql text;
begin
  select pg_get_functiondef(p.oid)
  into v_sql
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'owner_get_business_report'
  order by p.oid desc limit 1;

  if v_sql is null then raise exception 'owner_get_business_report bulunamadı'; end if;
  if position($old$status not in ('completed','delivered','cancelled')$old$ in v_sql) = 0 then
    raise exception 'İşletme raporu aktif iş kalıbı bulunamadı';
  end if;

  v_sql := replace(
    v_sql,
    $old$status not in ('completed','delivered','cancelled')$old$,
    $new$status not in ('ready','completed','delivered','cancelled')$new$
  );
  execute v_sql;
end;
$$;

grant execute on function public.staff_get_personal_report(uuid,timestamptz,timestamptz) to authenticated;
grant execute on function public.owner_get_business_report(uuid,timestamptz,timestamptz) to authenticated;
