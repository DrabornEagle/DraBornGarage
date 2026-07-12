-- DraBornGarage v0.8.5
-- Mechanic workshop search/application/approval, invite-code direct access and realtime workspace switching.

create table if not exists public.mechanic_applications (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  applicant_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text,
  updated_at timestamptz not null default now(),
  unique (workshop_id, user_id)
);

create index if not exists idx_mechanic_applications_user_status on public.mechanic_applications(user_id, status, submitted_at desc);
create index if not exists idx_mechanic_applications_workshop_status on public.mechanic_applications(workshop_id, status, submitted_at desc);
create index if not exists idx_mechanic_applications_reviewed_by on public.mechanic_applications(reviewed_by);

alter table public.mechanic_applications enable row level security;

drop policy if exists mechanic_applications_select_self on public.mechanic_applications;
create policy mechanic_applications_select_self
on public.mechanic_applications for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists mechanic_applications_select_owner on public.mechanic_applications;
create policy mechanic_applications_select_owner
on public.mechanic_applications for select to authenticated
using (public.is_workshop_owner(workshop_id));

create or replace function public.search_active_workshops(p_query text)
returns table(id uuid, name text, phone text, address text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized_query text := trim(coalesce(p_query, ''));
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if char_length(normalized_query) < 2 then raise exception 'Arama için en az 2 karakter gerekli'; end if;

  return query
  select w.id, w.name, w.phone, w.address
  from public.workshops w
  where w.is_active
    and w.name ilike '%' || replace(replace(normalized_query, '%', ''), '_', '') || '%'
  order by
    case when lower(w.name) = lower(normalized_query) then 0
         when lower(w.name) like lower(normalized_query) || '%' then 1
         else 2 end,
    w.name
  limit 25;
end;
$$;

create or replace function public.submit_mechanic_application(p_workshop_id uuid, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  application_id uuid;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if not exists (select 1 from public.workshops w where w.id = p_workshop_id and w.is_active) then
    raise exception 'İşletme bulunamadı veya aktif değil';
  end if;
  if exists (
    select 1 from public.workshop_members wm
    where wm.workshop_id = p_workshop_id and wm.user_id = auth.uid() and wm.is_active
  ) then
    raise exception 'Bu işletmede zaten aktif personelsin';
  end if;

  insert into public.mechanic_applications(
    workshop_id, user_id, status, applicant_note, submitted_at,
    reviewed_at, reviewed_by, review_note, updated_at
  )
  values (
    p_workshop_id, auth.uid(), 'pending', nullif(trim(p_note), ''), now(),
    null, null, null, now()
  )
  on conflict (workshop_id, user_id) do update
  set status = 'pending',
      applicant_note = excluded.applicant_note,
      submitted_at = now(),
      reviewed_at = null,
      reviewed_by = null,
      review_note = null,
      updated_at = now()
  returning id into application_id;

  return application_id;
end;
$$;

create or replace function public.customer_get_mechanic_applications()
returns table(
  id uuid,
  user_id uuid,
  workshop_id uuid,
  workshop_name text,
  workshop_phone text,
  workshop_address text,
  applicant_note text,
  status text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  review_note text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  return query
  select ma.id, ma.user_id, ma.workshop_id, w.name, w.phone, w.address,
         ma.applicant_note, ma.status, ma.submitted_at, ma.reviewed_at, ma.review_note
  from public.mechanic_applications ma
  join public.workshops w on w.id = ma.workshop_id
  where ma.user_id = auth.uid()
  order by case ma.status when 'pending' then 0 when 'approved' then 1 else 2 end, ma.submitted_at desc;
end;
$$;

create or replace function public.owner_get_mechanic_applications(p_workshop_id uuid)
returns table(
  id uuid,
  user_id uuid,
  workshop_id uuid,
  workshop_name text,
  workshop_phone text,
  workshop_address text,
  applicant_name text,
  applicant_phone text,
  applicant_email text,
  applicant_note text,
  status text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  review_note text
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.is_workshop_owner(p_workshop_id) then
    raise exception 'Usta başvurularını yalnız Admin veya işletme sahibi görebilir';
  end if;

  return query
  select ma.id, ma.user_id, ma.workshop_id, w.name, w.phone, w.address,
         p.full_name, p.phone, u.email::text, ma.applicant_note,
         ma.status, ma.submitted_at, ma.reviewed_at, ma.review_note
  from public.mechanic_applications ma
  join public.workshops w on w.id = ma.workshop_id
  join public.profiles p on p.id = ma.user_id
  left join auth.users u on u.id = ma.user_id
  where ma.workshop_id = p_workshop_id
  order by case ma.status when 'pending' then 0 when 'approved' then 1 else 2 end, ma.submitted_at desc
  limit 100;
end;
$$;

create or replace function public.owner_review_mechanic_application(
  p_application_id uuid,
  p_approve boolean,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  application_record public.mechanic_applications%rowtype;
begin
  select * into application_record
  from public.mechanic_applications
  where id = p_application_id
  for update;

  if application_record.id is null then raise exception 'Usta başvurusu bulunamadı'; end if;
  if not public.is_workshop_owner(application_record.workshop_id) then
    raise exception 'Bu başvuruyu sonuçlandırma yetkin yok';
  end if;
  if application_record.status <> 'pending' then
    raise exception 'Başvuru daha önce sonuçlandırılmış';
  end if;

  if p_approve then
    insert into public.workshop_members(workshop_id, user_id, role, is_active, availability_status)
    values (application_record.workshop_id, application_record.user_id, 'mechanic', true, 'available')
    on conflict (workshop_id, user_id) do update
    set role = case
          when public.workshop_members.role in ('owner', 'owner_mechanic') then public.workshop_members.role
          else 'mechanic'::public.member_role
        end,
        is_active = true,
        availability_status = 'available';

    update public.profiles
    set account_mode = 'staff', updated_at = now()
    where id = application_record.user_id;

    update public.mechanic_applications
    set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(),
        review_note = nullif(trim(p_note), ''), updated_at = now()
    where id = application_record.id;
  else
    update public.mechanic_applications
    set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid(),
        review_note = nullif(trim(p_note), ''), updated_at = now()
    where id = application_record.id;
  end if;

  return application_record.workshop_id;
end;
$$;

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
  on conflict (workshop_id, user_id)
  do update set role = excluded.role, is_active = true;

  update public.profiles set account_mode = 'staff', updated_at = now() where id = auth.uid();

  update public.workshop_invites
  set used_by = auth.uid(), used_at = now(), is_active = false
  where id = invite.id;

  return invite.workshop_id;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='mechanic_applications') then
    alter publication supabase_realtime add table public.mechanic_applications;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='workshop_members') then
    alter publication supabase_realtime add table public.workshop_members;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
end;
$$;

revoke all on table public.mechanic_applications from anon;
revoke all on function public.search_active_workshops(text) from public, anon;
revoke all on function public.submit_mechanic_application(uuid, text) from public, anon;
revoke all on function public.customer_get_mechanic_applications() from public, anon;
revoke all on function public.owner_get_mechanic_applications(uuid) from public, anon;
revoke all on function public.owner_review_mechanic_application(uuid, boolean, text) from public, anon;

grant select on table public.mechanic_applications to authenticated, service_role;
grant execute on function public.search_active_workshops(text) to authenticated, service_role;
grant execute on function public.submit_mechanic_application(uuid, text) to authenticated, service_role;
grant execute on function public.customer_get_mechanic_applications() to authenticated, service_role;
grant execute on function public.owner_get_mechanic_applications(uuid) to authenticated, service_role;
grant execute on function public.owner_review_mechanic_application(uuid, boolean, text) to authenticated, service_role;
