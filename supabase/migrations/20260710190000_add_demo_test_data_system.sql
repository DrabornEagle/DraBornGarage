-- DraBornGarage v0.1 temporary demo data system.
-- Demo records are isolated by batch and can be removed without touching real workshop data.

create table if not exists public.demo_batches (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  label text not null default 'DraBornGarage v0.1 demo',
  created_at timestamptz not null default now()
);

alter table public.demo_batches enable row level security;

alter table public.customers
  add column if not exists demo_batch_id uuid references public.demo_batches(id) on delete set null;

alter table public.work_orders
  add column if not exists demo_batch_id uuid references public.demo_batches(id) on delete set null;

create index if not exists idx_demo_batches_workshop on public.demo_batches(workshop_id, created_at desc);
create index if not exists idx_customers_demo_batch on public.customers(demo_batch_id) where demo_batch_id is not null;
create index if not exists idx_work_orders_demo_batch on public.work_orders(demo_batch_id) where demo_batch_id is not null;

create policy demo_batches_select_owner on public.demo_batches
for select to authenticated
using (public.is_workshop_owner(workshop_id));

create policy demo_batches_delete_owner on public.demo_batches
for delete to authenticated
using (public.is_workshop_owner(workshop_id));

create or replace function public.demo_data_status(p_workshop_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'active', exists(
      select 1 from public.demo_batches db
      where db.workshop_id = p_workshop_id
    ),
    'batch_id', (
      select db.id from public.demo_batches db
      where db.workshop_id = p_workshop_id
      order by db.created_at desc
      limit 1
    ),
    'created_at', (
      select db.created_at from public.demo_batches db
      where db.workshop_id = p_workshop_id
      order by db.created_at desc
      limit 1
    ),
    'customer_count', (
      select count(*) from public.customers c
      where c.workshop_id = p_workshop_id and c.demo_batch_id is not null
    ),
    'work_order_count', (
      select count(*) from public.work_orders wo
      where wo.workshop_id = p_workshop_id and wo.demo_batch_id is not null
    )
  )
  where public.is_workshop_owner(p_workshop_id);
$$;

create or replace function public.create_demo_data(p_workshop_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  batch_id uuid;
  c1 uuid;
  c2 uuid;
  c3 uuid;
  c4 uuid;
  c5 uuid;
  m1 uuid;
  m2 uuid;
  m3 uuid;
  m4 uuid;
  m5 uuid;
  w1 uuid;
  w2 uuid;
  w3 uuid;
  w4 uuid;
  w5 uuid;
begin
  if auth.uid() is null then
    raise exception 'Oturum gerekli';
  end if;

  if not public.is_workshop_owner(p_workshop_id) then
    raise exception 'Demo verilerini yalnızca işletme sahibi yönetebilir';
  end if;

  select id into batch_id
  from public.demo_batches
  where workshop_id = p_workshop_id
  order by created_at desc
  limit 1;

  if batch_id is not null then
    return batch_id;
  end if;

  insert into public.demo_batches(workshop_id, created_by)
  values (p_workshop_id, auth.uid())
  returning id into batch_id;

  insert into public.customers(workshop_id, full_name, phone, note, created_by, demo_batch_id)
  values (p_workshop_id, 'Emre Kaya', '0532 410 22 18', 'Demo müşteri • işe giderken günlük kullanıyor', auth.uid(), batch_id)
  returning id into c1;

  insert into public.customers(workshop_id, full_name, phone, note, created_by, demo_batch_id)
  values (p_workshop_id, 'Selin Demir', '0541 228 70 16', 'Demo müşteri • periyodik bakım', auth.uid(), batch_id)
  returning id into c2;

  insert into public.customers(workshop_id, full_name, phone, note, created_by, demo_batch_id)
  values (p_workshop_id, 'Burak Aydın', '0555 840 11 93', 'Demo müşteri • performans ve fren kontrolü', auth.uid(), batch_id)
  returning id into c3;

  insert into public.customers(workshop_id, full_name, phone, note, created_by, demo_batch_id)
  values (p_workshop_id, 'Mert Çelik', '0506 312 44 09', 'Demo müşteri • uzun yol öncesi bakım', auth.uid(), batch_id)
  returning id into c4;

  insert into public.customers(workshop_id, full_name, phone, note, created_by, demo_batch_id)
  values (p_workshop_id, 'Ayşe Arslan', '0530 674 29 51', 'Demo müşteri • şehir içi kullanım', auth.uid(), batch_id)
  returning id into c5;

  insert into public.motorcycles(workshop_id, customer_id, brand, model, year, plate, color, odometer, note, created_by)
  values (p_workshop_id, c1, 'Yamaha', 'NMAX 125', 2024, '06 DMO 101', 'Mat Gri', 18420, 'Demo motosiklet', auth.uid())
  returning id into m1;

  insert into public.motorcycles(workshop_id, customer_id, brand, model, year, plate, color, odometer, note, created_by)
  values (p_workshop_id, c2, 'Honda', 'PCX 125', 2023, '06 DMO 202', 'Beyaz', 12650, 'Demo motosiklet', auth.uid())
  returning id into m2;

  insert into public.motorcycles(workshop_id, customer_id, brand, model, year, plate, color, odometer, note, created_by)
  values (p_workshop_id, c3, 'Bajaj', 'Pulsar NS200', 2022, '06 DMO 303', 'Siyah', 31780, 'Demo motosiklet', auth.uid())
  returning id into m3;

  insert into public.motorcycles(workshop_id, customer_id, brand, model, year, plate, color, odometer, note, created_by)
  values (p_workshop_id, c4, 'KTM', 'Duke 250', 2021, '06 DMO 404', 'Turuncu', 26890, 'Demo motosiklet', auth.uid())
  returning id into m4;

  insert into public.motorcycles(workshop_id, customer_id, brand, model, year, plate, color, odometer, note, created_by)
  values (p_workshop_id, c5, 'Vespa', 'Primavera 150', 2024, '06 DMO 505', 'Mavi', 7250, 'Demo motosiklet', auth.uid())
  returning id into m5;

  insert into public.work_orders(
    workshop_id, customer_id, motorcycle_id, assigned_mechanic_id, status,
    complaint, diagnosis, notes, odometer_in, arrived_at, started_at, created_by, demo_batch_id
  ) values (
    p_workshop_id, c1, m1, auth.uid(), 'in_progress',
    'Ön taraftan titreşim geliyor, fren kontrol edilecek.',
    'Ön balata yüzeyi düzensiz; disk ve kaliper temizliği yapılıyor.',
    'Müşteri saat 20.30 sonrası teslim alabilir.', 18420,
    now() - interval '42 minutes', now() - interval '29 minutes', auth.uid(), batch_id
  ) returning id into w1;

  insert into public.work_orders(
    workshop_id, customer_id, motorcycle_id, assigned_mechanic_id, status,
    complaint, notes, odometer_in, arrived_at, created_by, demo_batch_id
  ) values (
    p_workshop_id, c2, m2, auth.uid(), 'waiting',
    '12.000 km periyodik bakım ve genel kontrol.',
    'Yağ, filtre, lastik basıncı ve fren sıvısı kontrol edilecek.', 12650,
    now() - interval '18 minutes', auth.uid(), batch_id
  ) returning id into w2;

  insert into public.work_orders(
    workshop_id, customer_id, motorcycle_id, assigned_mechanic_id, status,
    complaint, diagnosis, notes, odometer_in, arrived_at, started_at, completed_at, created_by, demo_batch_id
  ) values (
    p_workshop_id, c3, m3, auth.uid(), 'completed',
    'Zincir sesi, arka fren zayıflığı ve genel bakım.',
    'Zincir gevşek, arka balatalar sınırda ve hava filtresi kirli.',
    'Müşteriye ek parça bilgisi verildi.', 31780,
    now() - interval '3 hours 15 minutes', now() - interval '3 hours', now() - interval '38 minutes', auth.uid(), batch_id
  ) returning id into w3;

  insert into public.work_orders(
    workshop_id, customer_id, motorcycle_id, assigned_mechanic_id, status,
    complaint, diagnosis, notes, odometer_in, arrived_at, started_at, completed_at, delivered_at, created_by, demo_batch_id
  ) values (
    p_workshop_id, c4, m4, auth.uid(), 'delivered',
    'Uzun yol öncesi kapsamlı bakım ve sıvı kontrolleri.',
    'Bakım tamamlandı; ön lastik basıncı ve zincir ayarı düzeltildi.',
    'Motosiklet test sürüşü sonrası teslim edildi.', 26890,
    now() - interval '7 hours', now() - interval '6 hours 42 minutes', now() - interval '4 hours 5 minutes', now() - interval '3 hours 40 minutes', auth.uid(), batch_id
  ) returning id into w4;

  insert into public.work_orders(
    workshop_id, customer_id, motorcycle_id, assigned_mechanic_id, status,
    complaint, diagnosis, notes, odometer_in, arrived_at, started_at, completed_at, created_by, demo_batch_id
  ) values (
    p_workshop_id, c5, m5, auth.uid(), 'completed',
    'Marş geç alıyor ve rölantide düzensizlik var.',
    'Buji kirli; boğaz kelebeği temizliği gerekiyor.',
    'Teslim öncesi son çalıştırma testi yapılacak.', 7250,
    now() - interval '2 hours 10 minutes', now() - interval '2 hours', now() - interval '22 minutes', auth.uid(), batch_id
  ) returning id into w5;

  insert into public.work_order_services(work_order_id, mechanic_id, title, description, price, completed)
  values
    (w1, auth.uid(), 'Fren sistemi kontrolü', 'Disk, kaliper ve balata kontrolü', 350, true),
    (w3, auth.uid(), 'Zincir bakım ve ayarı', 'Temizlik, yağlama ve gerginlik ayarı', 450, true),
    (w3, auth.uid(), 'Genel bakım işçiliği', 'Kontrol listesi ve test sürüşü', 900, true),
    (w4, auth.uid(), 'Kapsamlı periyodik bakım', 'Motor yağı, filtreler ve genel kontroller', 1200, true),
    (w4, auth.uid(), 'Zincir ve yol hazırlık kontrolü', 'Zincir ayarı, lastik ve aydınlatma kontrolü', 650, true),
    (w5, auth.uid(), 'Ateşleme ve rölanti bakımı', 'Buji değişimi ve boğaz kelebeği temizliği', 700, true);

  insert into public.work_order_parts(work_order_id, mechanic_id, part_name, quantity, unit_price)
  values
    (w3, auth.uid(), 'Arka fren balatası', 2, 220),
    (w3, auth.uid(), 'Hava filtresi', 1, 180),
    (w4, auth.uid(), '10W-50 tam sentetik yağ', 1, 950),
    (w4, auth.uid(), 'Yağ filtresi ve conta seti', 4, 110),
    (w5, auth.uid(), 'İridyum buji', 1, 260);

  insert into public.payments(work_order_id, amount, payment_method, received_by, note, paid_at)
  values
    (w3, 1000, 'cash', auth.uid(), 'Demo kısmi tahsilat', now() - interval '31 minutes'),
    (w4, 3240, 'card', auth.uid(), 'Demo tam tahsilat', now() - interval '3 hours 40 minutes');

  return batch_id;
end;
$$;

create or replace function public.clear_demo_data(p_workshop_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_orders integer := 0;
  deleted_customers integer := 0;
  deleted_batches integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Oturum gerekli';
  end if;

  if not public.is_workshop_owner(p_workshop_id) then
    raise exception 'Demo verilerini yalnızca işletme sahibi yönetebilir';
  end if;

  delete from public.work_orders
  where workshop_id = p_workshop_id and demo_batch_id is not null;
  get diagnostics deleted_orders = row_count;

  delete from public.customers
  where workshop_id = p_workshop_id and demo_batch_id is not null;
  get diagnostics deleted_customers = row_count;

  delete from public.demo_batches
  where workshop_id = p_workshop_id;
  get diagnostics deleted_batches = row_count;

  return jsonb_build_object(
    'deleted_work_orders', deleted_orders,
    'deleted_customers', deleted_customers,
    'deleted_batches', deleted_batches
  );
end;
$$;

revoke execute on function public.demo_data_status(uuid) from public, anon;
revoke execute on function public.create_demo_data(uuid) from public, anon;
revoke execute on function public.clear_demo_data(uuid) from public, anon;

grant execute on function public.demo_data_status(uuid) to authenticated;
grant execute on function public.create_demo_data(uuid) to authenticated;
grant execute on function public.clear_demo_data(uuid) to authenticated;

comment on table public.demo_batches is 'Temporary test batches for DraBornGarage. Clearing a batch never removes real workshop records.';
comment on column public.customers.demo_batch_id is 'Non-null only for temporary demo customers.';
comment on column public.work_orders.demo_batch_id is 'Non-null only for temporary demo work orders.';
