-- DraBornGarage v0.8.5 rollback to v0.8.4.

do $$
begin
  if exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='mechanic_applications') then
    alter publication supabase_realtime drop table public.mechanic_applications;
  end if;
  if exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='workshop_members') then
    alter publication supabase_realtime drop table public.workshop_members;
  end if;
  if exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='profiles') then
    alter publication supabase_realtime drop table public.profiles;
  end if;
end;
$$;

drop function if exists public.owner_review_mechanic_application(uuid, boolean, text);
drop function if exists public.owner_get_mechanic_applications(uuid);
drop function if exists public.customer_get_mechanic_applications();
drop function if exists public.submit_mechanic_application(uuid, text);
drop function if exists public.search_active_workshops(text);
drop table if exists public.mechanic_applications;

create or replace function public.join_workshop_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.workshop_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  select * into invite
  from public.workshop_invites
  where code = upper(trim(p_code))
    and is_active
    and used_at is null
    and (expires_at is null or expires_at > now())
  for update;
  if invite.id is null then raise exception 'Davet kodu geçersiz, kullanılmış veya süresi dolmuş'; end if;
  insert into public.workshop_members(workshop_id, user_id, role, is_active)
  values (invite.workshop_id, auth.uid(), invite.role, true)
  on conflict (workshop_id, user_id) do update set role = excluded.role, is_active = true;
  update public.workshop_invites set used_by = auth.uid(), used_at = now(), is_active = false where id = invite.id;
  return invite.workshop_id;
end;
$$;
