-- DraBornGarage v0.9.0 -> v0.8.16 rollback

revoke all on function public.admin_update_account_deletion_request(uuid, text, text) from authenticated;
revoke all on function public.admin_get_account_deletion_requests() from authenticated;
revoke all on function public.account_role_access_snapshot() from authenticated;
revoke all on function public.account_cancel_deletion() from authenticated;
revoke all on function public.account_request_deletion(text) from authenticated;
revoke all on function public.account_privacy_status() from authenticated;

drop function if exists public.admin_update_account_deletion_request(uuid, text, text);
drop function if exists public.admin_get_account_deletion_requests();
drop function if exists public.account_role_access_snapshot();
drop function if exists public.account_cancel_deletion();
drop function if exists public.account_request_deletion(text);
drop function if exists public.account_privacy_status();

drop table if exists public.account_deletion_requests;

-- v0.8.16 compatibility grants.
grant execute on function public.platform_get_charge_detail(uuid) to authenticated;
grant execute on function public.platform_workshop_today(uuid) to authenticated;

-- Internal helper functions intentionally remain non-public after rollback.
