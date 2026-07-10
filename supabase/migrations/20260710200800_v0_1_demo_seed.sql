create or replace function public.create_demo_data(p_workshop_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  batch_id uuid;
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid;
  m1 uuid; m2 uuid; m3 uuid; m4 uuid; m5 uuid;
  o1 uuid; o2 uuid; o3 uuid; o4 uuid; o5 uuid;
  w_lara uuid; w_konya uuid;
  c_lara uuid; c_konya uuid; m_lara uuid; m_konya uuid; o_lara uuid; o_konya uuid;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if not public.is_workshop_owner(p_workshop_id) then raise exception 'Demo verilerini yalnızca Admin veya işletme sahibi yönetebilir'; end if;

  select id into batch_id from public.demo_batches
  where workshop_id = p_workshop_id order by created_at desc limit 1;
  if batch_id is not null then return batch_id; end if;

  insert into public.demo_batches(workshop_id, created_by, label)
  values (p_workshop_id, auth.uid(), 'DraBornGarage v0.1 tam demo')
  returning id into batch_id;

  insert into public.customers(workshop_id, full_name, phone, note, created_by, demo_batch_id) values
    (p_workshop_id, 'Emre Kaya', '0532 410 22 18', 'Demo • hızlı servis müşterisi', auth.uid(), batch_id) returning id into c1;
  insert into public.customers(workshop_id, full_name, phone, note, created_by, demo_batch_id) values
    (p_workshop_id, 'Selin Demir', '0541 228 70 16', 'Demo • periyodik bakım', auth.uid(), batch_id) returning id into c2;
  insert into public.customers(workshop_id, full_name, phone, note, created_by, demo_batch_id) values
    (p_workshop_id, 'Burak Aydın', '0555 840 11 93', 'Demo • parça bekleyen iş', auth.uid(), batch_id) returning id into c3;
  insert into public.customers(workshop_id, full_name, phone, note, created_by, demo_batch_id) values
    (p_workshop_id, 'Mert Çelik', '0506 312 44 09', 'Demo • test aşaması', auth.uid(), batch_id) returning id into c4;
  insert into public.customers(workshop_id, full_name, phone, note, created_by, demo_batch_id) values
    (p_workshop_id, 'Ayşe Arslan', '0530 674 29 51', 'Demo • randevulu servis', auth.uid(), batch_id) returning id into c5;

  insert into public.motorcycles(workshop_id, customer_id, brand, model, year, plate, color, odometer, note, created_by) values
    (p_workshop_id, c1, 'Yamaha', 'NMAX 125', 2024, '06 DMO 101', 'Mat Gri', 18420, 'Demo motosiklet', auth.uid()) returning id into m1;
  insert into public.motorcycles(workshop_id, customer_id, brand, model, year, plate, color, odometer, note, created_by) values
    (p_workshop_id, c2, 'Honda', 'PCX 125', 2023, '06 DMO 202', 'Beyaz', 12650, 'Demo motosiklet', auth.uid()) returning id into m2;
  insert into public.motorcycles(workshop_id, customer_id, brand, model, year, plate, color, odometer, note, created_by) values
    (p_workshop_id, c3, 'Bajaj', 'Pulsar NS200', 2022, '06 DMO 303', 'Siyah', 31780, 'Demo motosiklet', auth.uid()) returning id into m3;
  insert into public.motorcycles(workshop_id, customer_id, brand, model, year, plate, color, odometer, note, created_by) values
    (p_workshop_id, c4, 'KTM', 'Duke 250', 2021, '06 DMO 404', 'Turuncu', 26890, 'Demo motosiklet', auth.uid()) returning id into m4;
  insert into public.motorcycles(workshop_id, customer_id, brand, model, year, plate, color, odometer, note, created_by) values
    (p_workshop_id, c5, 'Vespa', 'Primavera 150', 2024, '06 DMO 505', 'Mavi', 7250, 'Demo motosiklet', auth.uid()) returning id into m5;

  insert into public.work_orders(
    workshop_id, customer_id, motorcycle_id, assigned_mechanic_id, status, service_type,
    customer_waiting_status, queue_position, complaint, diagnosis, notes, odometer_in,
    price_type, quoted_price, arrived_at, started_at, created_by, demo_batch_id
  ) values (
    p_workshop_id, c1, m1, auth.uid(), 'repair_started', 'quick', 'waiting_shop', 1,
    'Yağ değişimi ve fren kontrolü', 'Yağ ömrünü tamamlamış, ön fren temizlenecek.',
    'Müşteri dükkânda bekliyor.', 18420, 'fixed', 850,
    now() - interval '38 minutes', now() - interval '31 minutes', auth.uid(), batch_id
  ) returning id into o1;

  insert into public.work_orders(
    workshop_id, customer_id, motorcycle_id, assigned_mechanic_id, status, service_type,
    customer_waiting_status, queue_position, complaint, notes, odometer_in,
    price_type, quoted_price, arrived_at, created_by, demo_batch_id
  ) values (
    p_workshop_id, c2, m2, auth.uid(), 'queued', 'quick', 'return_later', 2,
    '12.000 km periyodik bakım', 'Sıraya alındı, müşteri 1 saat sonra gelecek.', 12650,
    'fixed', 650, now() - interval '20 minutes', auth.uid(), batch_id
  ) returning id into o2;

  insert into public.work_orders(
    workshop_id, customer_id, motorcycle_id, assigned_mechanic_id, status, service_type,
    customer_waiting_status, queue_position, complaint, diagnosis, notes, odometer_in,
    price_type, estimated_price_min, estimated_price_max, arrived_at, started_at, created_by, demo_batch_id
  ) values (
    p_workshop_id, c3, m3, auth.uid(), 'parts_waiting', 'dropoff', 'left_vehicle', 3,
    'Zincir sesi ve arka fren zayıflığı', 'Zincir seti ile arka balata değişecek.',
    'Parça siparişi verildi.', 31780, 'estimated', 1500, 2200,
    now() - interval '3 hours', now() - interval '2 hours 42 minutes', auth.uid(), batch_id
  ) returning id into o3;

  insert into public.work_orders(
    workshop_id, customer_id, motorcycle_id, assigned_mechanic_id, status, service_type,
    customer_waiting_status, queue_position, complaint, diagnosis, notes, odometer_in,
    price_type, quoted_price, arrived_at, started_at, created_by, demo_batch_id
  ) values (
    p_workshop_id, c4, m4, auth.uid(), 'testing', 'dropoff', 'left_vehicle', 4,
    'Uzun yol öncesi kapsamlı bakım', 'Bakım tamamlandı, yol testi yapılıyor.',
    'Teslim öncesi son kontrol.', 26890, 'fixed', 3240,
    now() - interval '6 hours', now() - interval '5 hours 30 minutes', auth.uid(), batch_id
  ) returning id into o4;

  insert into public.work_orders(
    workshop_id, customer_id, motorcycle_id, assigned_mechanic_id, status, service_type,
    customer_waiting_status, queue_position, complaint, diagnosis, notes, odometer_in,
    price_type, quoted_price, arrived_at, started_at, completed_at, created_by, demo_batch_id
  ) values (
    p_workshop_id, c5, m5, auth.uid(), 'ready', 'appointment', 'return_later', 5,
    'Marş geç alıyor ve rölanti düzensiz', 'Buji değişti, boğaz kelebeği temizlendi.',
    'Motor hazır bildirimi bekliyor.', 7250, 'fixed', 960,
    now() - interval '2 hours', now() - interval '1 hour 45 minutes', now() - interval '18 minutes', auth.uid(), batch_id
  ) returning id into o5;

  insert into public.work_order_services(work_order_id, mechanic_id, title, description, price, completed) values
    (o1, auth.uid(), 'Yağ değişimi + fren kontrolü', 'Hızlı servis net fiyatı', 850, true),
    (o2, auth.uid(), '12.000 km bakım işçiliği', 'Sıradaki hızlı servis', 650, false),
    (o3, auth.uid(), 'Zincir ve fren kontrol işçiliği', 'Tahmini fiyatlı bırakılan motor', 900, false),
    (o4, auth.uid(), 'Kapsamlı periyodik bakım', 'Tamamlanan bakım işçiliği', 1850, true),
    (o5, auth.uid(), 'Ateşleme ve rölanti bakımı', 'Randevulu servis', 700, true);

  insert into public.work_order_parts(work_order_id, mechanic_id, part_name, quantity, unit_price) values
    (o1, auth.uid(), '10W-40 motor yağı', 1, 0),
    (o3, auth.uid(), 'Arka fren balatası', 2, 220),
    (o3, auth.uid(), 'Zincir seti', 1, 860),
    (o4, auth.uid(), '10W-50 tam sentetik yağ', 1, 950),
    (o4, auth.uid(), 'Yağ filtresi', 4, 110),
    (o5, auth.uid(), 'İridyum buji', 1, 260);

  insert into public.payments(work_order_id, amount, payment_method, received_by, note, paid_at) values
    (o1, 850, 'cash', auth.uid(), 'Demo nakit tam ödeme', now() - interval '30 minutes'),
    (o3, 1000, 'transfer', auth.uid(), 'Demo IBAN kısmi ödeme', now() - interval '1 hour'),
    (o4, 3240, 'transfer', auth.uid(), 'Demo IBAN tam ödeme', now() - interval '50 minutes');

  insert into public.workshops(name, phone, address, created_by, is_active, demo_batch_id)
  values ('Lara Moto Garage • Demo', '0242 555 10 10', 'Muratpaşa / Lara', auth.uid(), true, batch_id)
  returning id into w_lara;
  insert into public.workshops(name, phone, address, created_by, is_active, demo_batch_id)
  values ('Konyaaltı Scooter Servis • Demo', '0242 555 20 20', 'Konyaaltı / Antalya', auth.uid(), true, batch_id)
  returning id into w_konya;

  insert into public.workshop_members(workshop_id, user_id, role, is_active, availability_status) values
    (w_lara, auth.uid(), 'owner_mechanic', true, 'available'),
    (w_konya, auth.uid(), 'owner_mechanic', true, 'busy');

  insert into public.customers(workshop_id, full_name, phone, note, created_by, demo_batch_id)
  values (w_lara, 'Lara Demo Müşteri', '0500 111 22 33', 'İşletmeler arası veri ayrımı testi', auth.uid(), batch_id)
  returning id into c_lara;
  insert into public.motorcycles(workshop_id, customer_id, brand, model, plate, odometer, created_by)
  values (w_lara, c_lara, 'Honda', 'Forza 250', '07 LRA 707', 8900, auth.uid())
  returning id into m_lara;
  insert into public.work_orders(workshop_id, customer_id, motorcycle_id, assigned_mechanic_id, status, service_type, customer_waiting_status, queue_position, complaint, price_type, quoted_price, created_by, demo_batch_id)
  values (w_lara, c_lara, m_lara, auth.uid(), 'queued', 'quick', 'waiting_shop', 1, 'Lastik basıncı ve yağ kontrolü', 'fixed', 450, auth.uid(), batch_id)
  returning id into o_lara;
  insert into public.work_order_services(work_order_id, mechanic_id, title, price, completed)
  values (o_lara, auth.uid(), 'Hızlı kontrol', 450, false);

  insert into public.customers(workshop_id, full_name, phone, note, created_by, demo_batch_id)
  values (w_konya, 'Konyaaltı Demo Müşteri', '0500 444 55 66', 'İşletmeler arası veri ayrımı testi', auth.uid(), batch_id)
  returning id into c_konya;
  insert into public.motorcycles(workshop_id, customer_id, brand, model, plate, odometer, created_by)
  values (w_konya, c_konya, 'Yamaha', 'XMAX 250', '07 KNY 250', 14500, auth.uid())
  returning id into m_konya;
  insert into public.work_orders(workshop_id, customer_id, motorcycle_id, assigned_mechanic_id, status, service_type, customer_waiting_status, queue_position, complaint, price_type, estimated_price_min, estimated_price_max, created_by, demo_batch_id)
  values (w_konya, c_konya, m_konya, auth.uid(), 'precheck', 'dropoff', 'left_vehicle', 1, 'Ön takımdan ses geliyor', 'estimated', 1200, 1800, auth.uid(), batch_id)
  returning id into o_konya;

  return batch_id;
end;
$$;
