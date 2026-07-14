-- DraBornGarage v0.9.3 -> v0.9.2 rollback

drop function if exists public.customer_get_ready_payment_details(uuid);
drop function if exists public.staff_update_ready_payment_details(uuid, boolean, text, text, text);
drop function if exists public.staff_get_ready_payment_details(uuid);

alter table public.workshop_members
  drop constraint if exists workshop_members_ready_payment_iban_check,
  drop column if exists ready_payment_enabled,
  drop column if exists ready_payment_bank_name,
  drop column if exists ready_payment_account_holder,
  drop column if exists ready_payment_iban;
