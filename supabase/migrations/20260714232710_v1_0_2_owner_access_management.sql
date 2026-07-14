-- DraBornGarage v1.0.2 RC
-- İşletme sahibinin bekleyen ortaklık taleplerini ve kayıtlı kullanıcıları görüntülemesi.

create or replace function public.owner_get_workshop_access_requests(p_workshop_id uuid)
returns table(
  id uuid,user_id uuid,applicant_name text,applicant_phone text,applicant_email text,
  request_business_panel boolean,request_mechanic_panel boolean,source text,status text,
  applicant_note text,submitted_at timestamptz,reviewed_at timestamptz,review_note text
)
language sql
stable
security definer
set search_path=public,auth
as $$
  select r.id,r.user_id,p.full_name,p.phone,u.email::text,
         r.request_business_panel,r.request_mechanic_panel,r.source,r.status,
         r.applicant_note,r.submitted_at,r.reviewed_at,r.review_note
  from public.workshop_access_requests r
  join public.profiles p on p.id=r.user_id
  left join auth.users u on u.id=r.user_id
  where r.workshop_id=p_workshop_id and public.is_workshop_owner(p_workshop_id)
  order by case r.status when 'pending' then 0 else 1 end,r.submitted_at desc;
$$;

create or replace function public.owner_search_users(p_workshop_id uuid,p_query text)
returns table(
  user_id uuid,full_name text,phone text,email text,membership_role public.member_role,membership_active boolean
)
language plpgsql
stable
security definer
set search_path=public,auth
as $$
declare v_query text := trim(coalesce(p_query,''));
begin
  if not public.is_workshop_owner(p_workshop_id) then raise exception 'Ekip yönetme yetkin yok'; end if;
  if char_length(v_query)<2 then raise exception 'Kullanıcı aramak için en az 2 karakter gerekli'; end if;
  return query
  select p.id,p.full_name,p.phone,u.email::text,wm.role,wm.is_active
  from public.profiles p
  left join auth.users u on u.id=p.id
  left join public.workshop_members wm on wm.workshop_id=p_workshop_id and wm.user_id=p.id
  where p.id<>auth.uid() and not coalesce(p.is_admin,false)
    and (p.full_name ilike '%'||replace(replace(v_query,'%',''),'_','')||'%'
      or coalesce(p.phone,'') ilike '%'||replace(replace(v_query,'%',''),'_','')||'%'
      or coalesce(u.email,'') ilike '%'||replace(replace(v_query,'%',''),'_','')||'%')
  order by case when lower(p.full_name)=lower(v_query) then 0 when lower(p.full_name) like lower(v_query)||'%' then 1 else 2 end,p.full_name
  limit 20;
end;
$$;

revoke all on function public.owner_get_workshop_access_requests(uuid) from public,anon;
revoke all on function public.owner_search_users(uuid,text) from public,anon;
grant execute on function public.owner_get_workshop_access_requests(uuid) to authenticated;
grant execute on function public.owner_search_users(uuid,text) to authenticated;
