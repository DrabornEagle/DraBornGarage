create index if not exists idx_work_order_events_workshop on public.work_order_events(workshop_id, created_at desc);
create index if not exists idx_work_order_extra_request_events_workshop on public.work_order_extra_request_events(workshop_id, created_at desc);
create index if not exists idx_work_order_notes_workshop on public.work_order_notes(workshop_id, created_at desc);

revoke execute on function public.log_work_order_status_event() from public, anon, authenticated;
grant execute on function public.log_work_order_status_event() to postgres, service_role;

revoke execute on function public.recalculate_work_order_totals() from public, anon, authenticated;
grant execute on function public.recalculate_work_order_totals() to postgres, service_role;
