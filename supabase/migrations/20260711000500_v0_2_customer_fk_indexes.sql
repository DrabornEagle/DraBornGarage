create index if not exists idx_customer_claims_customer_id on public.customer_claims(customer_id);
create index if not exists idx_customer_claims_reviewed_by on public.customer_claims(reviewed_by) where reviewed_by is not null;
create index if not exists idx_customer_links_approved_by on public.customer_links(approved_by) where approved_by is not null;
