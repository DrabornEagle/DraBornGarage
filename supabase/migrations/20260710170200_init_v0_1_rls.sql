alter table public.profiles enable row level security;
alter table public.workshops enable row level security;
alter table public.workshop_members enable row level security;
alter table public.workshop_invites enable row level security;
alter table public.customers enable row level security;
alter table public.motorcycles enable row level security;
alter table public.work_orders enable row level security;
alter table public.work_order_services enable row level security;
alter table public.parts enable row level security;
alter table public.work_order_parts enable row level security;
alter table public.payments enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or public.shares_workshop(id));
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy workshops_select on public.workshops for select to authenticated using (public.is_workshop_member(id));
create policy workshops_update_owner on public.workshops for update to authenticated using (public.is_workshop_owner(id)) with check (public.is_workshop_owner(id));

create policy members_select on public.workshop_members for select to authenticated using (public.is_workshop_member(workshop_id));
create policy members_insert_owner on public.workshop_members for insert to authenticated with check (public.is_workshop_owner(workshop_id));
create policy members_update_owner on public.workshop_members for update to authenticated using (public.is_workshop_owner(workshop_id)) with check (public.is_workshop_owner(workshop_id));
create policy members_delete_owner on public.workshop_members for delete to authenticated using (public.is_workshop_owner(workshop_id));

create policy invites_select_owner on public.workshop_invites for select to authenticated using (public.is_workshop_owner(workshop_id));
create policy invites_insert_owner on public.workshop_invites for insert to authenticated with check (public.is_workshop_owner(workshop_id));
create policy invites_update_owner on public.workshop_invites for update to authenticated using (public.is_workshop_owner(workshop_id));
create policy invites_delete_owner on public.workshop_invites for delete to authenticated using (public.is_workshop_owner(workshop_id));

create policy customers_select on public.customers for select to authenticated using (public.is_workshop_member(workshop_id));
create policy customers_insert on public.customers for insert to authenticated with check (public.is_workshop_member(workshop_id) and created_by = auth.uid());
create policy customers_update on public.customers for update to authenticated using (public.is_workshop_member(workshop_id)) with check (public.is_workshop_member(workshop_id));
create policy customers_delete on public.customers for delete to authenticated using (public.is_workshop_owner(workshop_id));

create policy motorcycles_select on public.motorcycles for select to authenticated using (public.is_workshop_member(workshop_id));
create policy motorcycles_insert on public.motorcycles for insert to authenticated with check (public.is_workshop_member(workshop_id) and created_by = auth.uid());
create policy motorcycles_update on public.motorcycles for update to authenticated using (public.is_workshop_member(workshop_id)) with check (public.is_workshop_member(workshop_id));
create policy motorcycles_delete on public.motorcycles for delete to authenticated using (public.is_workshop_owner(workshop_id));

create policy work_orders_select on public.work_orders for select to authenticated using (
  public.is_workshop_owner(workshop_id) or assigned_mechanic_id = auth.uid() or created_by = auth.uid()
);
create policy work_orders_insert on public.work_orders for insert to authenticated with check (public.is_workshop_member(workshop_id) and created_by = auth.uid());
create policy work_orders_update on public.work_orders for update to authenticated using (
  public.is_workshop_owner(workshop_id) or assigned_mechanic_id = auth.uid() or created_by = auth.uid()
) with check (public.is_workshop_member(workshop_id));
create policy work_orders_delete on public.work_orders for delete to authenticated using (public.is_workshop_owner(workshop_id));

create policy services_select on public.work_order_services for select to authenticated using (public.is_workshop_owner(workshop_id) or mechanic_id = auth.uid());
create policy services_insert on public.work_order_services for insert to authenticated with check (public.is_workshop_owner(workshop_id) or mechanic_id = auth.uid());
create policy services_update on public.work_order_services for update to authenticated using (public.is_workshop_owner(workshop_id) or mechanic_id = auth.uid()) with check (public.is_workshop_owner(workshop_id) or mechanic_id = auth.uid());
create policy services_delete on public.work_order_services for delete to authenticated using (public.is_workshop_owner(workshop_id) or mechanic_id = auth.uid());

create policy parts_select on public.parts for select to authenticated using (public.is_workshop_member(workshop_id));
create policy parts_insert on public.parts for insert to authenticated with check (public.is_workshop_member(workshop_id));
create policy parts_update on public.parts for update to authenticated using (public.is_workshop_member(workshop_id)) with check (public.is_workshop_member(workshop_id));
create policy parts_delete on public.parts for delete to authenticated using (public.is_workshop_owner(workshop_id));

create policy work_order_parts_select on public.work_order_parts for select to authenticated using (public.is_workshop_owner(workshop_id) or mechanic_id = auth.uid() or public.can_access_work_order(work_order_id));
create policy work_order_parts_insert on public.work_order_parts for insert to authenticated with check (public.is_workshop_owner(workshop_id) or mechanic_id = auth.uid() or public.can_access_work_order(work_order_id));
create policy work_order_parts_update on public.work_order_parts for update to authenticated using (public.is_workshop_owner(workshop_id) or mechanic_id = auth.uid()) with check (public.is_workshop_owner(workshop_id) or mechanic_id = auth.uid());
create policy work_order_parts_delete on public.work_order_parts for delete to authenticated using (public.is_workshop_owner(workshop_id) or mechanic_id = auth.uid());

create policy payments_select on public.payments for select to authenticated using (public.is_workshop_owner(workshop_id) or received_by = auth.uid() or public.can_access_work_order(work_order_id));
create policy payments_insert on public.payments for insert to authenticated with check (public.is_workshop_member(workshop_id) and (public.can_access_work_order(work_order_id) or public.is_workshop_owner(workshop_id)) and received_by = auth.uid());
create policy payments_update on public.payments for update to authenticated using (public.is_workshop_owner(workshop_id) or received_by = auth.uid()) with check (public.is_workshop_owner(workshop_id) or received_by = auth.uid());
create policy payments_delete on public.payments for delete to authenticated using (public.is_workshop_owner(workshop_id) or received_by = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.create_workshop(text, text, text) to authenticated;
grant execute on function public.create_workshop_invite(uuid, public.member_role, integer) to authenticated;
grant execute on function public.join_workshop_by_code(text) to authenticated;

comment on table public.work_order_services is 'Usta bazlı kaydedilen servis işlemleri. Tutarlar maaş, komisyon veya kâr paylaşımı değildir.';
comment on column public.work_order_services.price is 'Müşteriye yansıtılan/kaydedilen işlem tutarı; usta içi pay hesabı değildir.';
