-- DraBornGarage v0.8.5 staff application rollback.

do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'staff_applications'
  ) then
    alter publication supabase_realtime drop table public.staff_applications;
  end if;
end;
$$;

drop function if exists public.owner_review_staff_application(uuid, boolean, text);
drop function if exists public.owner_get_staff_applications(uuid);
drop function if exists public.customer_get_staff_applications();
drop function if exists public.customer_submit_staff_application(uuid, public.member_role, text);
drop table if exists public.staff_applications;
