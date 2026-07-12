update public.workshops set
  name = case name when 'Çankaya Moto Garage • Demo' then 'Lara Moto Garage • Demo' when 'Keçiören Scooter Servis • Demo' then 'Konyaaltı Scooter Servis • Demo' else name end,
  address = case address when 'Çankaya / Ankara' then 'Muratpaşa / Lara' when 'Keçiören / Ankara' then 'Konyaaltı / Antalya' else address end,
  phone = case phone when '0312 555 10 10' then '0242 555 10 10' when '0312 555 20 20' then '0242 555 20 20' else phone end
where name in ('Çankaya Moto Garage • Demo', 'Keçiören Scooter Servis • Demo');
update public.customers set full_name = case full_name when 'Çankaya Demo Müşteri' then 'Lara Demo Müşteri' when 'Keçiören Demo Müşteri' then 'Konyaaltı Demo Müşteri' else full_name end where full_name in ('Çankaya Demo Müşteri', 'Keçiören Demo Müşteri');
update public.motorcycles set plate = case plate when '06 CNY 707' then '07 LRA 707' when '06 KEC 250' then '07 KNY 250' else plate end where plate in ('06 CNY 707', '06 KEC 250');
