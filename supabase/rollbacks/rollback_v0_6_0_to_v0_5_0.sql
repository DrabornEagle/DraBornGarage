begin;

-- v0.6 rapor ve demo RPC'lerini kaldır.
drop function if exists public.create_v06_demo_data(uuid);
drop function if exists public.owner_get_business_report(uuid,timestamptz,timestamptz);
drop function if exists public.staff_get_personal_report(uuid,timestamptz,timestamptz);

-- v0.6 için eklenen bileşik rapor indekslerini kaldır.
drop index if exists public.idx_services_workshop_mechanic_completed;
drop index if exists public.idx_parts_workshop_mechanic_used;
drop index if exists public.idx_payments_workshop_receiver_paid;
drop index if exists public.idx_orders_workshop_mechanic_arrived;

-- v0.6 yeni tablo veya kolon eklemediği için v0.5 ödeme,
-- alacak, müşteri, servis ve personel verileri aynen korunur.
-- create_v06_demo_data yalnız geçici demo kayıtlarının tarih/saatlerini
-- rapor dönemlerine dağıtır; gerçek kayıtları değiştirmez.

commit;
