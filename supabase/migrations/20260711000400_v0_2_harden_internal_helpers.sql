revoke execute on function public.normalize_phone(text) from public, anon, authenticated;
revoke execute on function public.normalize_plate(text) from public, anon, authenticated;
revoke execute on function public.is_customer_linked(uuid) from public, anon, authenticated;
revoke execute on function public.is_customer_workshop(uuid) from public, anon, authenticated;
revoke execute on function public.approve_customer_link(uuid, uuid, uuid, text, uuid) from public, anon, authenticated;

revoke execute on function public.generate_tracking_code() from public, anon;
grant execute on function public.generate_tracking_code() to authenticated;

grant execute on function public.normalize_phone(text) to postgres, service_role;
grant execute on function public.normalize_plate(text) to postgres, service_role;
grant execute on function public.is_customer_linked(uuid) to postgres, service_role;
grant execute on function public.is_customer_workshop(uuid) to postgres, service_role;
grant execute on function public.approve_customer_link(uuid, uuid, uuid, text, uuid) to postgres, service_role;
