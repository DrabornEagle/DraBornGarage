-- DraBornGarage v0.8.5
-- Linked customers can request Usta/Çırak access; workshop owners review applications.

create table if not exists public.staff_applications (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  requested_role public.member_role not null check (requested_role in ('mechanic'::public.member_role, 'apprentice'::public.member_role)),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text,
  updated_at timestamptz not null default now(),
  unique (workshop_id, user_id)
);

create index if not exists idx_staff_applications_workshop_status
  on public.staff_applications(workshop_id, status, submitted_at desc);
create index if not exists idx_staff_applications_user
  on public.staff_applications(user_id, submitted_at desc);

alter table public.staff_applications enable row level security;

drop policy if exists staff_applications_select_self on public.staff_applications;
create policy staff_applications_select_self
  on public.staff_applications for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists staff_applications_select_owner on public.staff_applications;
create policy staff_applications_select_owner
  on public.staff_applications for select to authenticated
  using (public.is_workshop_owner(workshop_id));

create or replace function public.customer_submit_staff_application(
  p_workshop_id uuid,
  p_role public.member_role,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  application_id uuid;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if p_role not in ('mechanic'::public.member_role, 'apprentice'::public.member_role) then
    raise exception 'Yalnız Usta veya Çırak başvurusu yapılabilir';
  end if;
  if not exists (select 1 from public.workshops w where w.id = p_workshop_id and w.is_active) then
    raise exception 'İşletme bulunamadı veya pasif';
  end if;
  if not exists (
    select 1 from public.customer_links cl
    where cl.user_id = auth.uid()
      and cl.workshop_id = p_workshop_id
      and cl.status = 'approved'
  ) then
    raise exception 'Önce motorunu bu işletmeyle güvenli biçimde eşleştirmelisin';
  end if;
  if exists (
    select 1 from public.workshop_members wm
    where wm.workshop_id = p_workshop_id
      and wm.user_id = auth.uid()
      and wm.is_active
  ) then
    raise exception 'Bu işletmede zaten aktif personelsin';
  end if;

  insert into public.staff_applications(
    workshop_id, user_id, requested_role, status, note,
    submitted_at, reviewed_at, reviewed_by, review_note, updated_at
  )
  values (
    p_workshop_id, auth.uid(), p_role, 'pending', nullif(trim(p_note), ''),
    now(), null, null, null, now()
  )
  on conflict (workshop_id, user_id) do update
  set requested_role = excluded.requested_role,
      status = 'pending',
      note = excluded.note,
      submitted_at = now(),
      reviewed_at = null,
      reviewed_by = null,
      review_note = null,
      updated_at = now()
  returning id into application_id;

  return application_id;
end;
$$;

create or replace function public.customer_get_staff_applications()
returns table(
  id uuid,
  workshop_id uuid,
  workshop_name text,
  requested_role public.member_role,
  status text,
  note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  review_note text
)
language sql
stable
security definer
set search_path = public
as $$
  select sa.id, sa.workshop_id, w.name, sa.requested_role, sa.status,
         sa.note, sa.submitted_at, sa.reviewed_at, sa.review_note
  from public.staff_applications sa
  join public.workshops w on w.id = sa.workshop_id
  where sa.user_id = auth.uid()
  order by sa.submitted_at desc;
$$;

create or replace function public.owner_get_staff_applications(p_workshop_id uuid)
returns table(
  id uuid,
  workshop_id uuid,
  user_id uuid,
  applicant_name text,
  applicant_phone text,
  requested_role public.member_role,
  status text,
  note text,
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
  if not public.is_workshop_owner(p_workshop_id) then
    raise exception 'Bu işletmenin personel başvurularını görme yetkin yok';
  end if;

  return query
  select sa.id, sa.workshop_id, sa.user_id, p.full_name, p.phone,
         sa.requested_role, sa.status, sa.note, sa.submitted_at,
         sa.reviewed_at, sa.review_note
  from public.staff_applications sa
  join public.profiles p on p.id = sa.user_id
  where sa.workshop_id = p_workshop_id
  order by case sa.status when 'pending' then 0 when 'approved' then 1 else 2 end,
           sa.submitted_at desc;
end;
$$;

create or replace function public.owner_review_staff_application(
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
  application_record public.staff_applications%rowtype;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;

  select * into application_record
  from public.staff_applications
  where id = p_application_id
  for update;

  if application_record.id is null then raise exception 'Personel başvurusu bulunamadı'; end if;
  if not public.is_workshop_owner(application_record.workshop_id) then
    raise exception 'Bu başvuruyu sonuçlandırma yetkin yok';
  end if;
  if application_record.status <> 'pending' then
    raise exception 'Başvuru daha önce sonuçlandırılmış';
  end if;

  if p_approve then
    insert into public.workshop_members(workshop_id, user_id, role, is_active)
    values (application_record.workshop_id, application_record.user_id, application_record.requested_role, true)
    on conflict (workshop_id, user_id) do update
    set role = excluded.role,
        is_active = true;

    update public.profiles
    set account_mode = 'staff', updated_at = now()
    where id = application_record.user_id;

    update public.staff_applications
    set status = 'approved',
        reviewed_at = now(),
        reviewed_by = auth.uid(),
        review_note = nullif(trim(p_note), ''),
        updated_at = now()
    where id = p_application_id;
  else
    update public.staff_applications
    set status = 'rejected',
        reviewed_at = now(),
        reviewed_by = auth.uid(),
        review_note = nullif(trim(p_note), ''),
        updated_at = now()
    where id = p_application_id;
  end if;

  return application_record.workshop_id;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'staff_applications'
  ) then
    alter publication supabase_realtime add table public.staff_applications;
  end if;
end;
$$;

revoke all on table public.staff_applications from anon;
revoke all on function public.customer_submit_staff_application(uuid, public.member_role, text) from public, anon;
revoke all on function public.customer_get_staff_applications() from public, anon;
revoke all on function public.owner_get_staff_applications(uuid) from public, anon;
revoke all on function public.owner_review_staff_application(uuid, boolean, text) from public, anon;

grant select on table public.staff_applications to authenticated, service_role;
grant execute on function public.customer_submit_staff_application(uuid, public.member_role, text) to authenticated, service_role;
grant execute on function public.customer_get_staff_applications() to authenticated, service_role;
grant execute on function public.owner_get_staff_applications(uuid) to authenticated, service_role;
grant execute on function public.owner_review_staff_application(uuid, boolean, text) to authenticated, service_role;
