-- DraBornGarage v0.8.4
-- Keep a signed-in applicant's panel synchronized when Admin reviews the application.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'business_applications'
  ) then
    alter publication supabase_realtime add table public.business_applications;
  end if;
end;
$$;
