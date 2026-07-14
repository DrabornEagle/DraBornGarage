-- DraBornGarage v0.9.4 -> v0.9.3 rollback

revoke all on function public.customer_create_payment_report(uuid, numeric, text) from public, anon, authenticated;
revoke all on function public.staff_get_pending_customer_payment_reports(uuid) from public, anon, authenticated;
revoke all on function public.staff_review_customer_payment_report(uuid, boolean, text) from public, anon, authenticated;

drop function if exists public.customer_create_payment_report(uuid, numeric, text);
drop function if exists public.staff_get_pending_customer_payment_reports(uuid);
drop function if exists public.staff_review_customer_payment_report(uuid, boolean, text);

drop table if exists public.customer_payment_reports;

alter table public.workshop_members
  alter column ready_payment_enabled set default false;

create or replace function public.customer_get_ready_payment_details(p_work_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  if v_user is null then
    raise exception 'Oturum gerekli';
  end if;

  if not exists (
    select 1
    from public.work_orders wo
    join public.customer_links cl
      on cl.customer_id = wo.customer_id
     and cl.workshop_id = wo.workshop_id
     and cl.user_id = v_user
     and cl.status::text = 'approved'
    where wo.id = p_work_order_id
  ) then
    raise exception 'Servis kaydı bulunamadı';
  end if;

  select jsonb_build_object(
    'mechanic_name', p.full_name,
    'bank_name', wm.ready_payment_bank_name,
    'account_holder', wm.ready_payment_account_holder,
    'iban', wm.ready_payment_iban,
    'transfer_description', concat_ws(' • ', nullif(m.plate, ''), 'Servis ödemesi')
  )
  into v_result
  from public.work_orders wo
  join public.motorcycles m on m.id = wo.motorcycle_id
  join public.workshop_members wm
    on wm.workshop_id = wo.workshop_id
   and wm.user_id = wo.assigned_mechanic_id
   and wm.is_active
   and wm.role::text in ('mechanic', 'owner_mechanic')
   and wm.ready_payment_enabled
  join public.profiles p on p.id = wm.user_id
  where wo.id = p_work_order_id
    and wo.status::text = 'ready'
    and wm.ready_payment_iban ~ '^TR[0-9]{24}$'
  limit 1;

  return v_result;
end;
$$;

revoke all on function public.customer_get_ready_payment_details(uuid) from public, anon;
grant execute on function public.customer_get_ready_payment_details(uuid) to authenticated;
