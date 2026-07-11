create index if not exists idx_receivable_events_actor on public.receivable_events(actor_id);
create index if not exists idx_receivable_notes_author on public.receivable_notes(author_id);

revoke execute on function public.can_manage_receivable(uuid) from authenticated;
revoke execute on function public.can_manage_receivable(uuid) from public, anon;
