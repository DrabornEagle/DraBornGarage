create or replace function public.notify_customer_claim_event()
returns trigger language plpgsql security definer set search_path=public as $$
declare r record;
begin
  begin
    select p.full_name claimant,c.full_name customer_name,m.brand||' '||m.model||case when m.plate is null then '' else ' • '||m.plate end vehicle
    into r from public.profiles p join public.customers c on c.id=new.customer_id join public.motorcycles m on m.id=new.motorcycle_id where p.id=new.user_id;
    if tg_op='INSERT' and new.status='pending' then
      perform public.notify_workshop_owners(new.workshop_id,'customer_links','customer_claim_pending','Yeni müşteri eşleştirme talebi',r.claimant||' • '||r.customer_name||' • '||r.vehicle,'high','customer_claim',new.id,jsonb_build_object('target_tab','customers','claim_id',new.id),'customer-claim:'||new.id||':owners:pending',now(),null,null);
    elsif tg_op='UPDATE' and old.status is distinct from new.status and new.status in ('rejected','expired','cancelled') then
      perform public.enqueue_user_notification(new.user_id,new.workshop_id,'customer_links','customer_claim_'||new.status,case new.status when 'rejected' then 'Eşleştirme talebi reddedildi' when 'expired' then 'Eşleştirme talebinin süresi doldu' else 'Eşleştirme talebi iptal edildi' end,r.vehicle||case when new.review_note is null then '' else ' • '||new.review_note end,'high','customer_claim',new.id,jsonb_build_object('target_tab','home','claim_id',new.id,'status',new.status),new.user_id||':customer-claim:'||new.id||':'||new.status,now(),null,null);
    end if;
  exception when others then raise warning 'Customer claim notification skipped: %',sqlerrm; end;
  return new;
end; $$;

drop trigger if exists customer_claim_notifications_after_change on public.customer_claims;
create trigger customer_claim_notifications_after_change after insert or update of status on public.customer_claims for each row execute function public.notify_customer_claim_event();

create or replace function public.notify_customer_link_event()
returns trigger language plpgsql security definer set search_path=public as $$
declare r record;
begin
  begin
    if new.status='approved' and (tg_op='INSERT' or old.status is distinct from new.status) then
      select w.name workshop_name,m.brand||' '||m.model||case when m.plate is null then '' else ' • '||m.plate end vehicle
      into r from public.workshops w left join public.motorcycles m on m.customer_id=new.customer_id and m.workshop_id=new.workshop_id
      where w.id=new.workshop_id order by m.created_at desc nulls last limit 1;
      perform public.enqueue_user_notification(new.user_id,new.workshop_id,'customer_links','customer_link_approved','Motor ve işletme eşleştirildi',coalesce(r.vehicle,'Müşteri kaydı')||' • '||r.workshop_name,'high','customer_link',new.id,jsonb_build_object('target_tab','motorcycles','customer_link_id',new.id),new.user_id||':customer-link:'||new.id||':approved',now(),null,null);
    end if;
  exception when others then raise warning 'Customer link notification skipped: %',sqlerrm; end;
  return new;
end; $$;

drop trigger if exists customer_link_notifications_after_change on public.customer_links;
create trigger customer_link_notifications_after_change after insert or update of status on public.customer_links for each row execute function public.notify_customer_link_event();

revoke all on function public.notify_customer_claim_event() from public,anon,authenticated;
revoke all on function public.notify_customer_link_event() from public,anon,authenticated;
