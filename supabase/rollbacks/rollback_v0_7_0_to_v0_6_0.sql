begin;

-- v0.7 otomatik platform ücret akışını durdur.
drop trigger if exists work_order_platform_charge_after_change on public.work_orders;
drop trigger if exists workshop_platform_settings_after_insert on public.workshops;

-- Özel dekont erişim politikalarını kaldır.
drop policy if exists platform_receipts_select on storage.objects;
drop policy if exists platform_receipts_insert on storage.objects;
drop policy if exists platform_receipts_update on storage.objects;
drop policy if exists platform_receipts_delete on storage.objects;

-- İstemci ve sunucu RPC'lerini kaldır.
drop function if exists public.create_v07_demo_data(uuid);
drop function if exists public.admin_get_platform_overview();
drop function if exists public.owner_cancel_platform_payment_report(uuid);
drop function if exists public.admin_review_platform_payment(uuid,boolean,text);
drop function if exists public.owner_report_platform_payment(uuid,numeric,date,text,text);
drop function if exists public.platform_get_dashboard(uuid);
drop function if exists public.admin_update_workshop_platform_settings(uuid,numeric,text,integer,integer,date,boolean);
drop function if exists public.admin_update_platform_global_settings(numeric,text,text,text,text);
drop function if exists public.sync_platform_charge_from_work_order();
drop function if exists public.platform_sync_eligible_orders(uuid);
drop function if exists public.platform_ensure_statements(uuid);
drop function if exists public.platform_period_values(public.platform_billing_cycle,date,smallint,smallint);
drop function if exists public.create_default_platform_settings_for_workshop();

-- v0.7 platform borç, bildirim ve ayar kayıtlarını kaldır.
drop table if exists public.platform_payment_allocations;
drop table if exists public.platform_payment_reports;
drop table if exists public.platform_fee_statements;
drop table if exists public.platform_fee_charges;
drop table if exists public.workshop_platform_settings;
drop table if exists public.platform_global_settings;

drop type if exists public.platform_payment_report_status;
drop type if exists public.platform_billing_cycle;

-- Dekont dosyası bulunmuyorsa boş bucket kaldırılır. Dosya varsa veri kaybını
-- önlemek için bucket ve içindeki dosyalar korunur; Dashboard'dan ayrıca
-- yedeklenip temizlenebilir.
delete from storage.buckets b
where b.id='platform-receipts'
  and not exists(select 1 from storage.objects o where o.bucket_id=b.id);

-- v0.6 müşteri, motor, servis, randevu, ödeme, alacak ve rapor verileri korunur.
-- Bu rollback yalnız v0.7 platform hizmet bedeli kayıtlarını kaldırır.

commit;
