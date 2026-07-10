alter type public.member_role add value if not exists 'owner_mechanic';
alter type public.member_role add value if not exists 'apprentice';

alter type public.work_order_status add value if not exists 'opened';
alter type public.work_order_status add value if not exists 'received';
alter type public.work_order_status add value if not exists 'queued';
alter type public.work_order_status add value if not exists 'precheck';
alter type public.work_order_status add value if not exists 'price_entered';
alter type public.work_order_status add value if not exists 'approval_waiting';
alter type public.work_order_status add value if not exists 'repair_started';
alter type public.work_order_status add value if not exists 'extra_approval_waiting';
alter type public.work_order_status add value if not exists 'parts_waiting';
alter type public.work_order_status add value if not exists 'testing';
alter type public.work_order_status add value if not exists 'ready';

do $$ begin
  create type public.service_type as enum ('appointment', 'quick', 'dropoff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.customer_waiting_status as enum ('waiting_shop', 'left_vehicle', 'return_later', 'third_party_delivery');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.price_type as enum ('estimated', 'fixed');
exception when duplicate_object then null; end $$;
