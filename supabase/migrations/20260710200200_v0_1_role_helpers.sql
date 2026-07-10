create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

create or replace function public.is_workshop_member(check_workshop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.workshop_members wm
    join public.workshops w on w.id = wm.workshop_id
    where wm.workshop_id = check_workshop_id
      and wm.user_id = auth.uid()
      and wm.is_active
      and w.is_active
  );
$$;

create or replace function public.is_workshop_owner(check_workshop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.workshop_members wm
    where wm.workshop_id = check_workshop_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner'::public.member_role, 'owner_mechanic'::public.member_role)
      and wm.is_active
  );
$$;

create or replace function public.is_workshop_worker(check_workshop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.workshop_members wm
    where wm.workshop_id = check_workshop_id
      and wm.user_id = auth.uid()
      and wm.role in ('mechanic'::public.member_role, 'owner_mechanic'::public.member_role)
      and wm.is_active
  );
$$;

create or replace function public.is_workshop_apprentice(check_workshop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workshop_members wm
    where wm.workshop_id = check_workshop_id
      and wm.user_id = auth.uid()
      and wm.role = 'apprentice'::public.member_role
      and wm.is_active
  );
$$;

create or replace function public.shares_workshop(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1
    from public.workshop_members mine
    join public.workshop_members theirs on theirs.workshop_id = mine.workshop_id and theirs.is_active
    where mine.user_id = auth.uid()
      and mine.is_active
      and theirs.user_id = check_user_id
  );
$$;

create or replace function public.can_access_work_order(check_work_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.work_orders wo
    where wo.id = check_work_order_id
      and (
        public.is_workshop_owner(wo.workshop_id)
        or wo.assigned_mechanic_id = auth.uid()
        or wo.created_by = auth.uid()
      )
  );
$$;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_workshop_worker(uuid) from public, anon;
revoke execute on function public.is_workshop_apprentice(uuid) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_workshop_worker(uuid) to authenticated;
grant execute on function public.is_workshop_apprentice(uuid) to authenticated;
