drop policy if exists workshops_select on public.workshops;
create policy workshops_select on public.workshops for select to authenticated
using (public.is_admin() or public.is_workshop_member(id));

drop policy if exists workshops_update_owner on public.workshops;
create policy workshops_update_owner on public.workshops for update to authenticated
using (public.is_workshop_owner(id))
with check (public.is_workshop_owner(id));

create or replace function public.create_workshop_invite(
  p_workshop_id uuid,
  p_role public.member_role,
  p_expires_in_days integer default 30
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare generated_code text;
begin
  if not public.is_workshop_owner(p_workshop_id) then
    raise exception 'Yalnızca Admin veya işletme sahibi davet oluşturabilir';
  end if;

  if p_role in ('owner'::public.member_role, 'owner_mechanic'::public.member_role)
     and not public.is_admin() then
    raise exception 'İşletme sahibi daveti Admin onayı gerektirir';
  end if;

  generated_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.workshop_invites(workshop_id, code, role, created_by, expires_at)
  values (p_workshop_id, generated_code, p_role, auth.uid(), now() + make_interval(days => greatest(1, p_expires_in_days)));
  return generated_code;
end;
$$;
