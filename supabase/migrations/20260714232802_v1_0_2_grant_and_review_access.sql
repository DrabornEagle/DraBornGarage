-- DraBornGarage v1.0.2 RC
-- İşletme sahibinin kullanıcıya İşletme, Usta veya iki paneli vermesi.

create or replace function public.owner_grant_workshop_access(
  p_workshop_id uuid,p_user_id uuid,p_business_panel boolean,p_mechanic_panel boolean
)
returns public.member_role
language plpgsql
security definer
set search_path=public
as $$
declare
  v_role public.member_role;
  v_workshop_name text;
begin
  if not public.is_workshop_owner(p_workshop_id) then raise exception 'Ekip yönetme yetkin yok'; end if;
  if p_user_id=auth.uid() then raise exception 'Kendi erişimini bu ekrandan değiştiremezsin'; end if;
  if not coalesce(p_business_panel,false) and not coalesce(p_mechanic_panel,false) then raise exception 'En az bir panel seçmelisin'; end if;
  if not exists(select 1 from public.profiles where id=p_user_id and not coalesce(is_admin,false)) then raise exception 'Kullanıcı bulunamadı'; end if;

  v_role := case
    when p_business_panel and p_mechanic_panel then 'owner_mechanic'::public.member_role
    when p_business_panel then 'owner'::public.member_role
    else 'mechanic'::public.member_role
  end;

  insert into public.workshop_members(workshop_id,user_id,role,is_active,availability_status)
  values(p_workshop_id,p_user_id,v_role,true,'available')
  on conflict(workshop_id,user_id) do update set role=excluded.role,is_active=true,
    availability_status=case when excluded.role='owner' then public.workshop_members.availability_status else 'available' end;
  update public.profiles set account_mode='staff',updated_at=now() where id=p_user_id;
  update public.workshop_access_requests
  set status='approved',reviewed_at=now(),reviewed_by=auth.uid(),review_note='İşletme ekibinden doğrudan erişim verildi',updated_at=now()
  where workshop_id=p_workshop_id and user_id=p_user_id and status='pending';
  select name into v_workshop_name from public.workshops where id=p_workshop_id;

  insert into public.user_notifications(user_id,workshop_id,category,notification_type,priority,entity_type,entity_id,title,body,data,dedupe_key)
  values(p_user_id,p_workshop_id,'system','workshop_access_granted','high','workshop',p_workshop_id,
    'İşletme erişimin açıldı',coalesce(v_workshop_name,'İşletme')||' için '||case v_role when 'owner_mechanic' then 'İşletme ve Usta panellerin' when 'owner' then 'İşletme panelin' else 'Usta panelin' end||' açıldı.',
    jsonb_build_object('target_tab','home','workshop_id',p_workshop_id,'role',v_role::text),
    'access-granted:'||p_workshop_id::text||':'||p_user_id::text)
  on conflict(user_id,dedupe_key) where dedupe_key is not null do update
    set body=excluded.body,data=excluded.data,read_at=null,archived_at=null,deliver_at=now(),updated_at=now(),push_attempted_at=null,push_sent_at=null,push_error=null;
  return v_role;
end;
$$;

create or replace function public.owner_review_workshop_access_request(p_request_id uuid,p_approve boolean,p_note text default null)
returns public.member_role
language plpgsql
security definer
set search_path=public
as $$
declare
  v_request public.workshop_access_requests%rowtype;
  v_role public.member_role;
  v_workshop_name text;
begin
  select * into v_request from public.workshop_access_requests where id=p_request_id for update;
  if v_request.id is null then raise exception 'Başvuru bulunamadı'; end if;
  if not public.is_workshop_owner(v_request.workshop_id) then raise exception 'Başvuruyu sonuçlandırma yetkin yok'; end if;
  if v_request.status<>'pending' then raise exception 'Başvuru daha önce sonuçlandırılmış'; end if;
  if p_approve then
    v_role := case when v_request.request_business_panel and v_request.request_mechanic_panel then 'owner_mechanic'::public.member_role when v_request.request_business_panel then 'owner'::public.member_role else 'mechanic'::public.member_role end;
    insert into public.workshop_members(workshop_id,user_id,role,is_active,availability_status)
    values(v_request.workshop_id,v_request.user_id,v_role,true,'available')
    on conflict(workshop_id,user_id) do update set role=excluded.role,is_active=true,availability_status='available';
    update public.profiles set account_mode='staff',updated_at=now() where id=v_request.user_id;
    update public.workshop_access_requests set status='approved',reviewed_at=now(),reviewed_by=auth.uid(),review_note=nullif(left(trim(coalesce(p_note,'')),1000),''),updated_at=now() where id=p_request_id;
  else
    update public.workshop_access_requests set status='rejected',reviewed_at=now(),reviewed_by=auth.uid(),review_note=nullif(left(trim(coalesce(p_note,'')),1000),''),updated_at=now() where id=p_request_id;
  end if;
  select name into v_workshop_name from public.workshops where id=v_request.workshop_id;
  insert into public.user_notifications(user_id,workshop_id,category,notification_type,priority,entity_type,entity_id,title,body,data,dedupe_key)
  values(v_request.user_id,v_request.workshop_id,'system',case when p_approve then 'workshop_access_approved' else 'workshop_access_rejected' end,
    case when p_approve then 'high' else 'normal' end,'workshop_access_request',v_request.id,
    case when p_approve then 'İşletme erişim başvurun onaylandı' else 'İşletme erişim başvurun sonuçlandı' end,
    case when p_approve then coalesce(v_workshop_name,'İşletme')||' için panel erişimin açıldı.' else coalesce(v_workshop_name,'İşletme')||' başvurun onaylanmadı.' end,
    jsonb_build_object('target_tab',case when p_approve then 'home' else 'account' end,'workshop_id',v_request.workshop_id,'request_id',v_request.id),
    'access-review:'||v_request.id::text)
  on conflict(user_id,dedupe_key) where dedupe_key is not null do update
    set title=excluded.title,body=excluded.body,data=excluded.data,read_at=null,archived_at=null,deliver_at=now(),updated_at=now(),push_attempted_at=null,push_sent_at=null,push_error=null;
  return v_role;
end;
$$;

revoke all on function public.owner_grant_workshop_access(uuid,uuid,boolean,boolean) from public,anon;
revoke all on function public.owner_review_workshop_access_request(uuid,boolean,text) from public,anon;
grant execute on function public.owner_grant_workshop_access(uuid,uuid,boolean,boolean) to authenticated;
grant execute on function public.owner_review_workshop_access_request(uuid,boolean,text) to authenticated;
