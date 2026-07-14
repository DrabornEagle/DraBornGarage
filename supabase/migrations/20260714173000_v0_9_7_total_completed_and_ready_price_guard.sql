-- DraBornGarage v0.9.7
-- Motor Hazır / Tamamlandı / Teslim Edildi durumlarına geçmeden önce
-- son tahsilat/net servis tutarının oluşmasını zorunlu kılar.

create or replace function public.update_work_order_status(
  p_work_order_id uuid,
  p_status public.work_order_status
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  target_workshop uuid;
  target_total numeric(12,2);
begin
  select workshop_id, total_amount
  into target_workshop, target_total
  from public.work_orders
  where id = p_work_order_id;

  if target_workshop is null then
    raise exception 'İş emri bulunamadı';
  end if;

  if not public.is_admin()
     and not public.is_workshop_owner(target_workshop)
     and not (public.is_workshop_worker(target_workshop) and public.can_access_work_order(p_work_order_id))
     and not (public.is_workshop_apprentice(target_workshop) and p_status in ('precheck','parts_waiting','testing')) then
    raise exception 'Servis durumunu değiştirme yetkiniz yok';
  end if;

  if p_status in ('repair_started','testing','ready','completed','delivered')
     and exists (
       select 1
       from public.work_order_extra_requests
       where work_order_id = p_work_order_id
         and status = 'pending'
     ) then
    raise exception 'Bekleyen ek işlem onayı sonuçlanmadan bu aşamaya geçilemez';
  end if;

  if p_status = 'extra_approval_waiting'
     and not exists (
       select 1
       from public.work_order_extra_requests
       where work_order_id = p_work_order_id
         and status = 'pending'
     ) then
    raise exception 'Onay bekleyen ek işlem bulunamadı';
  end if;

  if p_status in ('ready','completed','delivered')
     and coalesce(target_total, 0) <= 0 then
    raise exception 'Motoru hazır veya tamamlanmış duruma almadan önce tahsilat ücreti ya da işlem tutarı kaydedilmelidir.';
  end if;

  update public.work_orders
  set status = p_status
  where id = p_work_order_id;
end;
$function$;

revoke all on function public.update_work_order_status(uuid, public.work_order_status) from public;
revoke all on function public.update_work_order_status(uuid, public.work_order_status) from anon;
grant execute on function public.update_work_order_status(uuid, public.work_order_status) to authenticated;
