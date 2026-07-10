-- Prevent anonymous/direct RPC access to internal SECURITY DEFINER functions.
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from authenticated;

-- Public app RPC endpoints. Each function performs its own auth/role validation.
grant execute on function public.create_workshop(text, text, text) to authenticated;
grant execute on function public.create_workshop_invite(uuid, public.member_role, integer) to authenticated;
grant execute on function public.join_workshop_by_code(text) to authenticated;

-- RLS helper functions required while evaluating authenticated policies.
grant execute on function public.is_workshop_member(uuid) to authenticated;
grant execute on function public.is_workshop_owner(uuid) to authenticated;
grant execute on function public.shares_workshop(uuid) to authenticated;
grant execute on function public.can_access_work_order(uuid) to authenticated;
