-- DraBornGarage v0.9.7
-- Bugünkü atölye sırası yalnız bugünün kayıtlarını gösterir (uygulama sorgusu).
-- Tamire fiyat girmeden başlanabilir; Motor Hazır/Tamamlandı/Teslim Edildi için final tutar zorunludur.

create or replace function public.update_work_order_status(
  p_work_order_id uuid,
  p_status public.work_order_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
       where work_order_id = p_work_order_id and status = 'pending'
     ) then
    raise exception 'Bekleyen ek işlem onayı sonuçlanmadan bu aşamaya geçilemez';
  end if;

  if p_status = 'extra_approval_waiting'
     and not exists (
       select 1
       from public.work_order_extra_requests
       where work_order_id = p_work_order_id and status = 'pending'
     ) then
    raise exception 'Onay bekleyen ek işlem bulunamadı';
  end if;

  if p_status in ('ready','completed','delivered') and coalesce(target_total,0) <= 0 then
    raise exception 'Motor Hazır yapılmadan önce tahsil edilecek son net ücret veya işlem tutarı kaydedilmelidir.';
  end if;

  update public.work_orders
  set status = p_status
  where id = p_work_order_id;
end;
$$;

create or replace function public.validate_work_order_price()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.price_type = 'fixed'::public.price_type and new.quoted_price is not null then
    if new.quoted_price <= 0 then
      raise exception 'Net ücret sıfırdan büyük olmalıdır';
    end if;
    new.price_entered_at := coalesce(new.price_entered_at, now());
  elsif new.price_type = 'estimated'::public.price_type
    and new.estimated_price_min is not null and new.estimated_price_max is not null then
    if new.estimated_price_min <= 0 then
      raise exception 'Tahmini alt fiyat sıfırdan büyük olmalıdır';
    end if;
    if new.estimated_price_max < new.estimated_price_min then
      raise exception 'Tahmini üst fiyat alt fiyattan küçük olamaz';
    end if;
    new.price_entered_at := coalesce(new.price_entered_at, now());
  end if;

  if new.status in ('ready','completed','delivered')
    and coalesce(new.total_amount,0) <= 0 then
    raise exception 'Motor Hazır yapılmadan önce tahsil edilecek son net ücret veya işlem tutarı kaydedilmelidir.';
  end if;

  return new;
end;
$$;

revoke all on function public.update_work_order_status(uuid, public.work_order_status) from public;
grant execute on function public.update_work_order_status(uuid, public.work_order_status) to authenticated;
