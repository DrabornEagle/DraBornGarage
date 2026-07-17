-- DraBornGarage v1.1.8
-- Cover foreign keys used for workshop/customer/audit cleanup and reporting.

create index if not exists customer_registration_links_workshop_idx
  on public.customer_registration_links(workshop_id);
create index if not exists customer_registration_links_customer_idx
  on public.customer_registration_links(customer_id);
create index if not exists customer_registration_links_created_by_idx
  on public.customer_registration_links(created_by);
create index if not exists customer_registration_links_used_by_idx
  on public.customer_registration_links(used_by)
  where used_by is not null;
