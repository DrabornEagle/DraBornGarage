create index if not exists idx_platform_global_settings_updated_by
  on public.platform_global_settings(updated_by)
  where updated_by is not null;

create index if not exists idx_workshop_platform_settings_updated_by
  on public.workshop_platform_settings(updated_by)
  where updated_by is not null;

drop policy if exists platform_global_settings_select on public.platform_global_settings;
create policy platform_global_settings_select
on public.platform_global_settings
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.workshop_members wm
    where wm.user_id=(select auth.uid())
      and wm.is_active
      and wm.role in ('owner','owner_mechanic')
  )
);
