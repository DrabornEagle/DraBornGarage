create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  local_notifications_enabled boolean not null default true,
  service_updates boolean not null default true,
  appointment_reminders boolean not null default true,
  appointment_reminder_24h boolean not null default true,
  appointment_reminder_2h boolean not null default true,
  payment_updates boolean not null default true,
  receivable_reminders boolean not null default true,
  platform_reminders boolean not null default true,
  customer_link_updates boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workshop_id uuid references public.workshops(id) on delete cascade,
  category text not null check (category in ('service','appointments','payments','receivables','platform','customer_links','system')),
  notification_type text not null check (length(notification_type) between 2 and 80),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  entity_type text,
  entity_id uuid,
  title text not null check (length(title) between 1 and 180),
  body text not null check (length(body) between 1 and 1200),
  data jsonb not null default '{}'::jsonb,
  dedupe_key text check (dedupe_key is null or length(dedupe_key) between 3 and 320),
  deliver_at timestamptz not null default now(),
  read_at timestamptz,
  archived_at timestamptz,
  demo_batch_id uuid references public.demo_batches(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_user_notifications_dedupe
  on public.user_notifications(user_id,dedupe_key)
  where dedupe_key is not null;
create index if not exists idx_user_notifications_feed
  on public.user_notifications(user_id,deliver_at desc)
  where archived_at is null;
create index if not exists idx_user_notifications_unread
  on public.user_notifications(user_id,deliver_at desc)
  where archived_at is null and read_at is null;
create index if not exists idx_user_notifications_upcoming
  on public.user_notifications(user_id,deliver_at)
  where archived_at is null;
create index if not exists idx_user_notifications_workshop
  on public.user_notifications(workshop_id,user_id,deliver_at desc)
  where archived_at is null;
create index if not exists idx_user_notifications_entity
  on public.user_notifications(entity_type,entity_id,user_id)
  where archived_at is null;
create index if not exists idx_user_notifications_demo
  on public.user_notifications(demo_batch_id)
  where demo_batch_id is not null;

create trigger notification_preferences_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();
create trigger user_notifications_updated_at
before update on public.user_notifications
for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;
alter table public.user_notifications enable row level security;

create policy notification_preferences_select on public.notification_preferences
for select to authenticated using (user_id=(select auth.uid()));
create policy notification_preferences_insert on public.notification_preferences
for insert to authenticated with check (user_id=(select auth.uid()));
create policy notification_preferences_update on public.notification_preferences
for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy user_notifications_select on public.user_notifications
for select to authenticated using (user_id=(select auth.uid()));
create policy user_notifications_update on public.user_notifications
for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

create or replace function public.notification_preference_allows(p_user_id uuid,p_category text,p_subtype text default null)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare p public.notification_preferences%rowtype;
begin
  select * into p from public.notification_preferences where user_id=p_user_id;
  if not found then return true; end if;
  if p_category='service' then return p.service_updates;
  elsif p_category='appointments' then
    if not p.appointment_reminders then return false; end if;
    if p_subtype='24h' then return p.appointment_reminder_24h; end if;
    if p_subtype='2h' then return p.appointment_reminder_2h; end if;
    return true;
  elsif p_category='payments' then return p.payment_updates;
  elsif p_category='receivables' then return p.receivable_reminders;
  elsif p_category='platform' then return p.platform_reminders;
  elsif p_category='customer_links' then return p.customer_link_updates;
  else return true;
  end if;
end; $$;

create or replace function public.enqueue_user_notification(
  p_user_id uuid,p_workshop_id uuid,p_category text,p_notification_type text,p_title text,p_body text,
  p_priority text default 'normal',p_entity_type text default null,p_entity_id uuid default null,
  p_data jsonb default '{}'::jsonb,p_dedupe_key text default null,p_deliver_at timestamptz default now(),
  p_demo_batch_id uuid default null,p_preference_subtype text default null
)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if p_user_id is null or not exists(select 1 from public.profiles where id=p_user_id) then return null; end if;
  if p_category not in ('service','appointments','payments','receivables','platform','customer_links','system') then raise exception 'Geçersiz bildirim kategorisi'; end if;
  if p_priority not in ('low','normal','high','urgent') then raise exception 'Geçersiz bildirim önceliği'; end if;
  if length(trim(coalesce(p_title,''))) not between 1 and 180 then raise exception 'Bildirim başlığı geçersiz'; end if;
  if length(trim(coalesce(p_body,''))) not between 1 and 1200 then raise exception 'Bildirim metni geçersiz'; end if;
  insert into public.notification_preferences(user_id) values(p_user_id) on conflict(user_id) do nothing;
  if not public.notification_preference_allows(p_user_id,p_category,p_preference_subtype) then return null; end if;
  insert into public.user_notifications(user_id,workshop_id,category,notification_type,priority,entity_type,entity_id,title,body,data,dedupe_key,deliver_at,demo_batch_id)
  values(p_user_id,p_workshop_id,p_category,p_notification_type,p_priority,p_entity_type,p_entity_id,trim(p_title),trim(p_body),coalesce(p_data,'{}'::jsonb),p_dedupe_key,coalesce(p_deliver_at,now()),p_demo_batch_id)
  on conflict(user_id,dedupe_key) where dedupe_key is not null do update set
    workshop_id=excluded.workshop_id,category=excluded.category,notification_type=excluded.notification_type,
    priority=excluded.priority,entity_type=excluded.entity_type,entity_id=excluded.entity_id,title=excluded.title,
    body=excluded.body,data=excluded.data,deliver_at=excluded.deliver_at,
    demo_batch_id=coalesce(excluded.demo_batch_id,public.user_notifications.demo_batch_id),archived_at=null,updated_at=now()
  returning id into v_id;
  return v_id;
end; $$;

create or replace function public.notification_archive_entity(p_entity_type text,p_entity_id uuid,p_notification_types text[] default null,p_only_future boolean default true)
returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  update public.user_notifications set archived_at=now(),updated_at=now()
  where entity_type=p_entity_type and entity_id=p_entity_id and archived_at is null
    and (p_notification_types is null or notification_type=any(p_notification_types))
    and (not p_only_future or deliver_at>now());
  get diagnostics v_count=row_count;
  return v_count;
end; $$;

create or replace function public.notify_customer_users(
  p_customer_id uuid,p_workshop_id uuid,p_category text,p_notification_type text,p_title text,p_body text,
  p_priority text default 'normal',p_entity_type text default null,p_entity_id uuid default null,
  p_data jsonb default '{}'::jsonb,p_dedupe_suffix text default null,p_deliver_at timestamptz default now(),
  p_demo_batch_id uuid default null,p_preference_subtype text default null
)
returns integer language plpgsql security definer set search_path=public as $$
declare r record; v_count integer:=0; v_key text;
begin
  for r in select distinct cl.user_id from public.customer_links cl
    where cl.customer_id=p_customer_id and cl.workshop_id=p_workshop_id and cl.status='approved'
  loop
    v_key:=case when p_dedupe_suffix is null then null else r.user_id::text||':'||p_dedupe_suffix end;
    if public.enqueue_user_notification(r.user_id,p_workshop_id,p_category,p_notification_type,p_title,p_body,p_priority,p_entity_type,p_entity_id,p_data,v_key,p_deliver_at,p_demo_batch_id,p_preference_subtype) is not null then v_count:=v_count+1; end if;
  end loop;
  return v_count;
end; $$;

create or replace function public.notify_workshop_owners(
  p_workshop_id uuid,p_category text,p_notification_type text,p_title text,p_body text,
  p_priority text default 'normal',p_entity_type text default null,p_entity_id uuid default null,
  p_data jsonb default '{}'::jsonb,p_dedupe_suffix text default null,p_deliver_at timestamptz default now(),
  p_demo_batch_id uuid default null,p_preference_subtype text default null
)
returns integer language plpgsql security definer set search_path=public as $$
declare r record; v_count integer:=0; v_key text;
begin
  for r in select distinct wm.user_id from public.workshop_members wm
    where wm.workshop_id=p_workshop_id and wm.is_active and wm.role in ('owner','owner_mechanic')
  loop
    v_key:=case when p_dedupe_suffix is null then null else r.user_id::text||':'||p_dedupe_suffix end;
    if public.enqueue_user_notification(r.user_id,p_workshop_id,p_category,p_notification_type,p_title,p_body,p_priority,p_entity_type,p_entity_id,p_data,v_key,p_deliver_at,p_demo_batch_id,p_preference_subtype) is not null then v_count:=v_count+1; end if;
  end loop;
  return v_count;
end; $$;

create or replace function public.notify_platform_admins(
  p_workshop_id uuid,p_category text,p_notification_type text,p_title text,p_body text,
  p_priority text default 'normal',p_entity_type text default null,p_entity_id uuid default null,
  p_data jsonb default '{}'::jsonb,p_dedupe_suffix text default null,p_deliver_at timestamptz default now(),
  p_demo_batch_id uuid default null,p_preference_subtype text default null
)
returns integer language plpgsql security definer set search_path=public as $$
declare r record; v_count integer:=0; v_key text;
begin
  for r in select id as user_id from public.profiles where is_admin loop
    v_key:=case when p_dedupe_suffix is null then null else r.user_id::text||':'||p_dedupe_suffix end;
    if public.enqueue_user_notification(r.user_id,p_workshop_id,p_category,p_notification_type,p_title,p_body,p_priority,p_entity_type,p_entity_id,p_data,v_key,p_deliver_at,p_demo_batch_id,p_preference_subtype) is not null then v_count:=v_count+1; end if;
  end loop;
  return v_count;
end; $$;

do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime')
     and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='user_notifications') then
    alter publication supabase_realtime add table public.user_notifications;
  end if;
end $$;

revoke all on function public.notification_preference_allows(uuid,text,text) from public,anon,authenticated;
revoke all on function public.enqueue_user_notification(uuid,uuid,text,text,text,text,text,text,uuid,jsonb,text,timestamptz,uuid,text) from public,anon,authenticated;
revoke all on function public.notification_archive_entity(text,uuid,text[],boolean) from public,anon,authenticated;
revoke all on function public.notify_customer_users(uuid,uuid,text,text,text,text,text,text,uuid,jsonb,text,timestamptz,uuid,text) from public,anon,authenticated;
revoke all on function public.notify_workshop_owners(uuid,text,text,text,text,text,text,uuid,jsonb,text,timestamptz,uuid,text) from public,anon,authenticated;
revoke all on function public.notify_platform_admins(uuid,text,text,text,text,text,text,uuid,jsonb,text,timestamptz,uuid,text) from public,anon,authenticated;
