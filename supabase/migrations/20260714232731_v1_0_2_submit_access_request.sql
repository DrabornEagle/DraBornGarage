-- DraBornGarage v1.0.2 RC
-- Oturumlu kullanıcının mevcut işletmeye panel erişimi istemesi ve sahip bildirimi.

create or replace function public.submit_workshop_access_request(
  p_workshop_id uuid,
  p_request_business_panel boolean default true,
  p_request_mechanic_panel boolean default false,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then raise exception 'Oturum gerekli'; end if;
  if not coalesce(p_request_business_panel,false) and not coalesce(p_request_mechanic_panel,false) then raise exception 'En az bir panel seçmelisin'; end if;
  if not exists(select 1 from public.workshops where id=p_workshop_id and is_active) then raise exception 'İşletme bulunamadı veya aktif değil'; end if;
  if exists(select 1 from public.workshop_members where workshop_id=p_workshop_id and user_id=v_user and is_active) then raise exception 'Bu işletmede zaten aktif erişimin var'; end if;

  insert into public.workshop_access_requests(
    workshop_id,user_id,request_business_panel,request_mechanic_panel,source,status,applicant_note,
    submitted_at,reviewed_at,reviewed_by,review_note,updated_at
  ) values(
    p_workshop_id,v_user,coalesce(p_request_business_panel,true),coalesce(p_request_mechanic_panel,false),'profile','pending',
    nullif(left(trim(coalesce(p_note,'')),500),''),now(),null,null,null,now()
  )
  on conflict(workshop_id,user_id) do update set
    request_business_panel=excluded.request_business_panel,
    request_mechanic_panel=excluded.request_mechanic_panel,
    source='profile',status='pending',applicant_note=excluded.applicant_note,submitted_at=now(),
    reviewed_at=null,reviewed_by=null,review_note=null,updated_at=now()
  returning id into v_id;

  insert into public.user_notifications(user_id,workshop_id,category,notification_type,priority,entity_type,entity_id,title,body,data,dedupe_key)
  select wm.user_id,p_workshop_id,'system','workshop_access_request','high','workshop_access_request',v_id,
         'Yeni işletme erişim başvurusu',
         coalesce(p.full_name,'Bir kullanıcı')||' işletme paneline'||case when p_request_mechanic_panel then ' ve Usta paneline' else '' end||' erişim istiyor.',
         jsonb_build_object('target_tab','team','target_section','access_requests','request_id',v_id,'workshop_id',p_workshop_id),
         'access-request:'||v_id::text||':'||wm.user_id::text
  from public.workshop_members wm
  left join public.profiles p on p.id=v_user
  where wm.workshop_id=p_workshop_id and wm.is_active and wm.role in ('owner','owner_mechanic')
  on conflict(user_id,dedupe_key) where dedupe_key is not null do update
    set read_at=null,archived_at=null,deliver_at=now(),updated_at=now(),push_attempted_at=null,push_sent_at=null,push_error=null;
  return v_id;
end;
$$;

revoke all on function public.submit_workshop_access_request(uuid,boolean,boolean,text) from public,anon;
grant execute on function public.submit_workshop_access_request(uuid,boolean,boolean,text) to authenticated;
