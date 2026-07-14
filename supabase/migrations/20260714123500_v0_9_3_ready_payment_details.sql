-- DraBornGarage v0.9.3
-- Display-only mechanic IBAN information for customer services in Motor Hazır status.
-- DraBornGarage does not process, hold or transfer money.

alter table public.workshop_members
  add column if not exists ready_payment_enabled boolean not null default false,
  add column if not exists ready_payment_bank_name text,
  add column if not exists ready_payment_account_holder text,
  add column if not exists ready_payment_iban text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workshop_members_ready_payment_iban_check'
      and conrelid = 'public.workshop_members'::regclass
  ) then
    alter table public.workshop_members
      add constraint workshop_members_ready_payment_iban_check
      check (ready_payment_iban is null or ready_payment_iban ~ '^TR[0-9]{24}$');
  end if;
end;
$$;

create or replace function public.staff_get_ready_payment_details(p_workshop_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_member public.workshop_members%rowtype;
begin
  if v_user is null then
    raise exception 'Oturum gerekli';
  end if;

  select * into v_member
  from public.workshop_members wm
  where wm.workshop_id = p_workshop_id
    and wm.user_id = v_user
    and wm.is_active
    and wm.role::text in ('mechanic', 'owner_mechanic');

  if v_member.user_id is null then
    raise exception 'Bu işletmede Usta yetkisi gerekli';
  end if;

  return jsonb_build_object(
    'enabled', coalesce(v_member.ready_payment_enabled, false),
    'bank_name', v_member.ready_payment_bank_name,
    'account_holder', v_member.ready_payment_account_holder,
    'iban', v_member.ready_payment_iban
  );
end;
$$;

create or replace function public.staff_update_ready_payment_details(
  p_workshop_id uuid,
  p_enabled boolean,
  p_bank_name text default null,
  p_account_holder text default null,
  p_iban text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_iban text := nullif(regexp_replace(upper(coalesce(p_iban, '')), '[^A-Z0-9]', '', 'g'), '');
  v_bank_name text := nullif(left(trim(coalesce(p_bank_name, '')), 120), '');
  v_account_holder text := nullif(left(trim(coalesce(p_account_holder, '')), 160), '');
  v_member public.workshop_members%rowtype;
begin
  if v_user is null then
    raise exception 'Oturum gerekli';
  end if;

  select * into v_member
  from public.workshop_members wm
  where wm.workshop_id = p_workshop_id
    and wm.user_id = v_user
    and wm.is_active
    and wm.role::text in ('mechanic', 'owner_mechanic')
  for update;

  if v_member.user_id is null then
    raise exception 'Bu işletmede Usta yetkisi gerekli';
  end if;

  if coalesce(p_enabled, false) then
    if v_bank_name is null or v_account_holder is null then
      raise exception 'Banka adı ve hesap sahibi zorunludur';
    end if;
    if v_iban is null or v_iban !~ '^TR[0-9]{24}$' then
      raise exception 'TR ile başlayan 26 karakterli geçerli IBAN gerekli';
    end if;
  end if;

  update public.workshop_members
  set ready_payment_enabled = coalesce(p_enabled, false),
      ready_payment_bank_name = v_bank_name,
      ready_payment_account_holder = v_account_holder,
      ready_payment_iban = v_iban
  where workshop_id = p_workshop_id
    and user_id = v_user
  returning * into v_member;

  return jsonb_build_object(
    'enabled', v_member.ready_payment_enabled,
    'bank_name', v_member.ready_payment_bank_name,
    'account_holder', v_member.ready_payment_account_holder,
    'iban', v_member.ready_payment_iban
  );
end;
$$;

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
     and cl.status = 'approved'
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

revoke all on function public.staff_get_ready_payment_details(uuid) from public, anon;
revoke all on function public.staff_update_ready_payment_details(uuid, boolean, text, text, text) from public, anon;
revoke all on function public.customer_get_ready_payment_details(uuid) from public, anon;

grant execute on function public.staff_get_ready_payment_details(uuid) to authenticated;
grant execute on function public.staff_update_ready_payment_details(uuid, boolean, text, text, text) to authenticated;
grant execute on function public.customer_get_ready_payment_details(uuid) to authenticated;
