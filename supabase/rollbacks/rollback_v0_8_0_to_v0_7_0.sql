begin;

-- v0.8 bildirim trigger'larını kapat.
drop trigger if exists work_order_notifications_after_change on public.work_orders;
drop trigger if exists extra_request_notifications_after_change on public.work_order_extra_requests;
drop trigger if exists appointment_notifications_after_change on public.appointments;
drop trigger if exists customer_claim_notifications_after_change on public.customer_claims;
drop trigger if exists customer_link_notifications_after_change on public.customer_links;
drop trigger if exists platform_payment_report_notifications_after_change on public.platform_payment_reports;
drop trigger if exists platform_charge_notifications_after_change on public.platform_fee_charges;
drop trigger if exists platform_statement_notifications_after_change on public.platform_fee_statements;

-- Realtime yayından bildirim tablosunu çıkar.
do $$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime')
     and exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='user_notifications') then
    alter publication supabase_realtime drop table public.user_notifications;
  end if;
end $$;

-- İstemci API'leri.
drop function if exists public.create_v08_demo_data(uuid);
drop function if exists public.notification_update_preferences(boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean);
drop function if exists public.notification_archive(uuid);
drop function if exists public.notification_mark_all_read();
drop function if exists public.notification_mark_read(uuid);
drop function if exists public.notification_get_center(integer);
drop function if exists public.notification_refresh_reminders();

-- Olay ve zamanlayıcı fonksiyonları.
drop function if exists public.notify_platform_statement_event();
drop function if exists public.notify_platform_statement_from_charge();
drop function if exists public.notify_platform_report_event();
drop function if exists public.notify_customer_link_event();
drop function if exists public.notify_customer_claim_event();
drop function if exists public.notify_appointment_event();
drop function if exists public.notify_extra_request_event();
drop function if exists public.notify_work_order_event();
drop function if exists public.notification_schedule_platform_statement(uuid);
drop function if exists public.notification_schedule_appointment(uuid);
drop function if exists public.notification_schedule_receivable(uuid);

-- İç bildirim yardımcıları.
drop function if exists public.notify_platform_admins(uuid,text,text,text,text,text,text,uuid,jsonb,text,timestamptz,uuid,text);
drop function if exists public.notify_workshop_owners(uuid,text,text,text,text,text,text,uuid,jsonb,text,timestamptz,uuid,text);
drop function if exists public.notify_customer_users(uuid,uuid,text,text,text,text,text,text,uuid,jsonb,text,timestamptz,uuid,text);
drop function if exists public.notification_archive_entity(text,uuid,text[],boolean);
drop function if exists public.enqueue_user_notification(uuid,uuid,text,text,text,text,text,text,uuid,jsonb,text,timestamptz,uuid,text);
drop function if exists public.notification_preference_allows(uuid,text,text);

-- v0.8 kullanıcı bildirim ve tercih verilerini kaldır.
drop table if exists public.user_notifications;
drop table if exists public.notification_preferences;

-- v0.7 servis, müşteri, randevu, ödeme, alacak, rapor ve platform
-- hizmet bedeli verileri korunur.

commit;
