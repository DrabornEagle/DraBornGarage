from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, text: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding='utf-8')


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    if old not in text:
        raise RuntimeError(f'{path}: expected text not found: {old[:180]}')
    write(path, text.replace(old, new, 1))


# Versions and Expo/Firebase Android config
app_path = ROOT / 'app.json'
app = json.loads(app_path.read_text(encoding='utf-8'))
expo = app['expo']
expo['version'] = '1.0.6'
expo['ios']['buildNumber'] = '24'
expo['android']['versionCode'] = 24
expo['android']['googleServicesFile'] = './google-services.json'
app_path.write_text(json.dumps(app, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

pkg_path = ROOT / 'package.json'
pkg = json.loads(pkg_path.read_text(encoding='utf-8'))
pkg['version'] = '1.0.6'
pkg_path.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# Shared types
replace_once(
    'src/types.ts',
    "  customer_motorcycle_model?: string | null;\n}",
    "  customer_motorcycle_model?: string | null;\n  customer_motorcycle_odometer?: number | null;\n}",
)
replace_once(
    'src/types.ts',
    "export interface CustomerRegistrationMotor {\n  plate: string;\n  brand: string;\n  model: string;\n}",
    "export interface CustomerRegistrationMotor {\n  plate: string;\n  brand: string;\n  model: string;\n  odometer?: number | null;\n}",
)
replace_once(
    'src/types.ts',
    "  plate?: string | null;\n  mechanic_id: string;",
    "  plate?: string | null;\n  odometer?: number | null;\n  mechanic_id: string;",
)

# Registration mileage
replace_once('src/screens/AuthScreen.tsx', "const APP_VERSION = Constants.expoConfig?.version ?? '1.0.4';", "const APP_VERSION = Constants.expoConfig?.version ?? '1.0.6';")
replace_once(
    'src/screens/AuthScreen.tsx',
    "  const [motorcycleModel, setMotorcycleModel] = useState('');\n",
    "  const [motorcycleModel, setMotorcycleModel] = useState('');\n  const [motorcycleOdometer, setMotorcycleOdometer] = useState('');\n",
)
replace_once(
    'src/screens/AuthScreen.tsx',
    "    const normalizedPlate = plate.trim().toUpperCase();\n    const customerMotorMissing = mode === 'register' && !isPrimaryAdminEmail && registerMode === 'customer'\n      && (normalizedPlate.replace(/[^A-Z0-9ÇĞİÖŞÜ]/g, '').length < 5 || !motorcycleBrand.trim() || !motorcycleModel.trim());",
    "    const normalizedPlate = plate.trim().toUpperCase();\n    const normalizedOdometerText = motorcycleOdometer.replace(/\\D/g, '');\n    const motorcycleOdometerValue = normalizedOdometerText ? Number(normalizedOdometerText) : null;\n    const customerMotorMissing = mode === 'register' && !isPrimaryAdminEmail && registerMode === 'customer'\n      && (normalizedPlate.replace(/[^A-Z0-9ÇĞİÖŞÜ]/g, '').length < 5 || !motorcycleBrand.trim() || !motorcycleModel.trim());\n    const customerOdometerInvalid = mode === 'register' && registerMode === 'customer'\n      && motorcycleOdometerValue !== null && (!Number.isInteger(motorcycleOdometerValue) || motorcycleOdometerValue < 0);",
)
replace_once(
    'src/screens/AuthScreen.tsx',
    "    if (!email.trim() || passwordInvalid || (mode === 'register' && !fullName.trim()) || customerMotorMissing || businessMissing) {",
    "    if (!email.trim() || passwordInvalid || (mode === 'register' && !fullName.trim()) || customerMotorMissing || customerOdometerInvalid || businessMissing) {",
)
replace_once(
    'src/screens/AuthScreen.tsx',
    "        customerMotorMissing\n          ? 'Kullanıcı hesabı için plaka, motosiklet markası ve modeli zorunludur.'\n          : businessMissing",
    "        customerMotorMissing\n          ? 'Kullanıcı hesabı için plaka, motosiklet markası ve modeli zorunludur.'\n          : customerOdometerInvalid\n            ? 'Kilometre sıfır veya daha büyük tam sayı olmalıdır.'\n          : businessMissing",
)
replace_once(
    'src/screens/AuthScreen.tsx',
    "          registerMode === 'customer' && !isPrimaryAdminEmail ? { plate: normalizedPlate, brand: motorcycleBrand, model: motorcycleModel } : undefined,",
    "          registerMode === 'customer' && !isPrimaryAdminEmail ? { plate: normalizedPlate, brand: motorcycleBrand, model: motorcycleModel, odometer: motorcycleOdometerValue } : undefined,",
)
replace_once(
    'src/screens/AuthScreen.tsx',
    "                    <FormField label=\"Motosiklet Modeli\" value={motorcycleModel} onChangeText={setMotorcycleModel} placeholder=\"Örn. Forza 250\" autoCapitalize=\"words\" />",
    "                    <FormField label=\"Motosiklet Modeli\" value={motorcycleModel} onChangeText={setMotorcycleModel} placeholder=\"Örn. Forza 250\" autoCapitalize=\"words\" />\n                    <FormField label=\"Güncel Kilometre (opsiyonel)\" value={motorcycleOdometer} onChangeText={(value) => setMotorcycleOdometer(value.replace(/\\D/g, ''))} placeholder=\"Örn. 24500\" keyboardType=\"number-pad\" />",
)

replace_once(
    'src/context/AuthContext.tsx',
    "customer_plate, customer_motorcycle_brand, customer_motorcycle_model'",
    "customer_plate, customer_motorcycle_brand, customer_motorcycle_model, customer_motorcycle_odometer'",
)
replace_once(
    'src/context/AuthContext.tsx',
    "        customer_motorcycle_model: customerMotor.model.trim(),\n",
    "        customer_motorcycle_model: customerMotor.model.trim(),\n        customer_motorcycle_odometer: customerMotor.odometer ?? null,\n",
)

# Customer appointment mileage
replace_once(
    'src/customer/CustomerAppointmentsScreen.tsx',
    "  const [note, setNote] = useState('');\n",
    "  const [note, setNote] = useState('');\n  const [odometer, setOdometer] = useState('');\n",
)
replace_once(
    'src/customer/CustomerAppointmentsScreen.tsx',
    "  useEffect(() => { loadAppointments(); }, [loadAppointments]);\n",
    "  useEffect(() => { loadAppointments(); }, [loadAppointments]);\n  useEffect(() => {\n    if (!odometer && profile?.customer_motorcycle_odometer != null) setOdometer(String(profile.customer_motorcycle_odometer));\n  }, [profile?.customer_motorcycle_odometer, odometer]);\n",
)
replace_once(
    'src/customer/CustomerAppointmentsScreen.tsx',
    "    if (!brand || !model || !plate) return Alert.alert('Motor bilgileri eksik', 'Randevu için Hesabım bölümünden plaka, marka ve model bilgilerini tamamla.');\n    if (!selectedWorkshop || !mechanicId || !slot || title.trim().length < 3) return Alert.alert('Eksik bilgi', 'İşletme, usta, saat ve yapılacak işlemi seç.');",
    "    if (!brand || !model || !plate) return Alert.alert('Motor bilgileri eksik', 'Randevu için Hesabım bölümünden plaka, marka ve model bilgilerini tamamla.');\n    const odometerText = odometer.replace(/\\D/g, '');\n    const odometerValue = odometerText ? Number(odometerText) : null;\n    if (odometerValue !== null && (!Number.isInteger(odometerValue) || odometerValue < 0)) return Alert.alert('Kilometre bilgisi geçersiz', 'Güncel kilometreyi sıfır veya daha büyük tam sayı olarak yaz.');\n    if (!selectedWorkshop || !mechanicId || !slot || title.trim().length < 3) return Alert.alert('Eksik bilgi', 'İşletme, usta, saat ve yapılacak işlemi seç.');",
)
replace_once(
    'src/customer/CustomerAppointmentsScreen.tsx',
    "      p_scheduled_end: slot.slot_end,\n",
    "      p_scheduled_end: slot.slot_end,\n      p_odometer: odometerValue,\n",
)
replace_once(
    'src/customer/CustomerAppointmentsScreen.tsx',
    "<Text style={[styles.choiceSub, { color: colors.textMuted }]}>{profile?.customer_plate || 'Plaka bilgisi yok'}</Text>",
    "<Text style={[styles.choiceSub, { color: colors.textMuted }]}>{profile?.customer_plate || 'Plaka bilgisi yok'}{profile?.customer_motorcycle_odometer != null ? ` • ${Number(profile.customer_motorcycle_odometer).toLocaleString('tr-TR')} km` : ''}</Text>",
)
replace_once(
    'src/customer/CustomerAppointmentsScreen.tsx',
    "          <FormField label=\"Yapılacak işlem\" value={title} onChangeText={setTitle} placeholder=\"Örn. Yağ değişimi ve genel kontrol\" multiline />\n          <FormField label=\"Ustaya not (opsiyonel)\" value={note} onChangeText={setNote} multiline />",
    "          <FormField label=\"Güncel Kilometre\" value={odometer} onChangeText={(value) => setOdometer(value.replace(/\\D/g, ''))} placeholder=\"Örn. 24500\" keyboardType=\"number-pad\" />\n          <FormField label=\"Yapılacak işlem\" value={title} onChangeText={setTitle} placeholder=\"Örn. Yağ değişimi ve genel kontrol\" multiline />\n          <FormField label=\"Ustaya not (opsiyonel)\" value={note} onChangeText={setNote} multiline />",
)

# Staff Customers page mileage
replace_once(
    'src/screens/CustomersScreen.tsx',
    "  const [brand, setBrand] = useState(''); const [model, setModel] = useState(''); const [plate, setPlate] = useState('');\n",
    "  const [brand, setBrand] = useState(''); const [model, setModel] = useState(''); const [plate, setPlate] = useState(''); const [bikeOdometer, setBikeOdometer] = useState('');\n",
)
replace_once(
    'src/screens/CustomersScreen.tsx',
    "  const addBike = async () => { if (!workshop || !selected || !brand.trim() || !model.trim()) return Alert.alert('Marka ve model gerekli'); setSaving(true); const { error } = await supabase.from('motorcycles').insert({ workshop_id: workshop.id, customer_id: selected, brand: brand.trim(), model: model.trim(), plate: plate.trim().toUpperCase() || null }); setSaving(false); if (error) return Alert.alert('Eklenemedi', error.message); setBrand(''); setModel(''); setPlate(''); setShowBike(false); await load(); };",
    "  const addBike = async () => {\n    if (!workshop || !selected || !brand.trim() || !model.trim()) return Alert.alert('Marka ve model gerekli');\n    const odometerText = bikeOdometer.replace(/\\D/g, '');\n    const odometerValue = odometerText ? Number(odometerText) : null;\n    if (odometerValue !== null && (!Number.isInteger(odometerValue) || odometerValue < 0)) return Alert.alert('Kilometre bilgisi geçersiz');\n    setSaving(true);\n    const { error } = await supabase.from('motorcycles').insert({ workshop_id: workshop.id, customer_id: selected, brand: brand.trim(), model: model.trim(), plate: plate.trim().toUpperCase() || null, odometer: odometerValue });\n    setSaving(false);\n    if (error) return Alert.alert('Eklenemedi', error.message);\n    setBrand(''); setModel(''); setPlate(''); setBikeOdometer(''); setShowBike(false); await load();\n  };",
)
replace_once(
    'src/screens/CustomersScreen.tsx',
    "{bike.plate || 'Plaka yok'} • {bikeOrders.length} servis",
    "{bike.plate || 'Plaka yok'} • {bike.odometer != null ? `${Number(bike.odometer).toLocaleString('tr-TR')} km • ` : ''}{bikeOrders.length} servis",
)
replace_once(
    'src/screens/CustomersScreen.tsx',
    "<FormField label=\"Plaka\" value={plate} onChangeText={(v) => setPlate(v.toUpperCase())} /><PrimaryButton title=\"Motosikleti Kaydet\" onPress={addBike} loading={saving} secondary />",
    "<FormField label=\"Plaka\" value={plate} onChangeText={(v) => setPlate(v.toUpperCase())} /><FormField label=\"Kilometre\" value={bikeOdometer} onChangeText={(value) => setBikeOdometer(value.replace(/\\D/g, ''))} placeholder=\"Örn. 24500\" keyboardType=\"number-pad\" /><PrimaryButton title=\"Motosikleti Kaydet\" onPress={addBike} loading={saving} secondary />",
)

# Remove Motor Ready price gate and clarify collection behavior
replace_once(
    'src/screens/WorkOrderDetailV04.tsx',
    "    const requiresFinalCharge = ['ready', 'completed', 'delivered'].includes(status);\n    if (requiresFinalCharge && Number(order?.total_amount || 0) <= 0) {\n      setPriceType('fixed');\n      setFixedPrice('');\n      setOpenSections((current) => ({ ...current, price: true, status: false }));\n      setTimeout(() => scrollRef.current?.scrollTo({ y: 420, animated: true }), 180);\n      Alert.alert(\n        'Tahsil edilecek ücret gerekli',\n        'Motor Hazır yapılmadan önce müşteriden tahsil edilecek son net ücreti veya yapılan işlem tutarını kaydetmelisin.',\n      );\n      return;\n    }\n",
    "",
)
replace_once(
    'src/screens/WorkOrderDetailV04.tsx',
    "Teslimden önce tahsilatı kaydet veya kalan tutarı Borç / Veresiye olarak aç.",
    "Teslimden önce tahsilatı kaydet veya Borç / Veresiye olarak aç. Önceden ücret girilmediyse yazdığın tahsilat ya da borç tutarı otomatik Net Fiyat olur.",
)

# Collection amount becomes fixed net price when no price exists
replace_once(
    'src/components/ReceivableManagerCard.tsx',
    "  const [paymentNote, setPaymentNote] = useState('');\n",
    "  const [paymentNote, setPaymentNote] = useState('');\n  const [debtAmount, setDebtAmount] = useState('');\n",
)
replace_once(
    'src/components/ReceivableManagerCard.tsx',
    "  const saveDebt = async () => {\n    if (dueDate && !/^\\d{4}-\\d{2}-\\d{2}$/.test(dueDate)) return Alert.alert('Tarih biçimi', 'Tarihi YYYY-AA-GG biçiminde gir.');\n    const saved = await run(supabase.rpc('staff_open_receivable', {\n      p_work_order_id: orderId,\n      p_due_date: dueDate || null,\n      p_staff_note: staffNote.trim() || null,\n      p_customer_note: customerNote.trim() || null,\n    }), detail?.receivable_status === 'open' ? 'Alacak bilgisi güncellendi ve motosiklet teslim edildi' : 'Borç / veresiye kaydı açıldı ve motosiklet teslim edildi');\n    if (saved) setCollectionChoice('debt');\n  };",
    "  const saveDebt = async () => {\n    if (dueDate && !/^\\d{4}-\\d{2}-\\d{2}$/.test(dueDate)) return Alert.alert('Tarih biçimi', 'Tarihi YYYY-AA-GG biçiminde gir.');\n    const needsInitialCharge = Number(detail?.total_amount || 0) <= 0;\n    const amount = Number(debtAmount.replace(',', '.'));\n    if (needsInitialCharge && amount <= 0) return Alert.alert('Borç tutarı gerekli', 'Ücret girilmediği için borç tutarı Net Fiyat olarak kaydedilecek.');\n    const saved = await run(supabase.rpc('staff_open_receivable', {\n      p_work_order_id: orderId,\n      p_due_date: dueDate || null,\n      p_staff_note: staffNote.trim() || null,\n      p_customer_note: customerNote.trim() || null,\n      p_amount: needsInitialCharge ? amount : null,\n    }), detail?.receivable_status === 'open' ? 'Alacak bilgisi güncellendi ve motosiklet teslim edildi' : 'Borç / veresiye kaydı açıldı ve motosiklet teslim edildi');\n    if (saved) { setCollectionChoice('debt'); setDebtAmount(''); }\n  };",
)
replace_once(
    'src/components/ReceivableManagerCard.tsx',
    "  const remaining = Number(detail.remaining_amount || 0);\n",
    "  const remaining = Number(detail.remaining_amount || 0);\n  const needsInitialCharge = Number(detail.total_amount || 0) <= 0;\n",
)
replace_once(
    'src/components/ReceivableManagerCard.tsx',
    "    {remaining > 0 ? <>",
    "    {(remaining > 0 || needsInitialCharge) ? <>",
)
replace_once(
    'src/components/ReceivableManagerCard.tsx',
    "<Text style={[styles.inlineNoticeText, { color: colors.textMuted }]}>Ödeme tutarı kalan borçtan fazla olamaz. Kısmi ödeme de kaydedilebilir.</Text>",
    "<Text style={[styles.inlineNoticeText, { color: colors.textMuted }]}>{needsInitialCharge ? 'Önceden ücret girilmedi. Yazdığın tahsilat tutarı otomatik olarak Net Fiyat kabul edilir.' : 'Ödeme tutarı kalan borçtan fazla olamaz. Kısmi ödeme de kaydedilebilir.'}</Text>",
)
replace_once(
    'src/components/ReceivableManagerCard.tsx',
    "<FormField label=\"Tahsilat tutarı\" value={paymentAmount} onChangeText={setPaymentAmount} keyboardType=\"decimal-pad\" placeholder={String(remaining)} />",
    "<FormField label=\"Tahsilat tutarı\" value={paymentAmount} onChangeText={setPaymentAmount} keyboardType=\"decimal-pad\" placeholder={needsInitialCharge ? 'Net fiyat olacak tutar' : String(remaining)} />",
)
replace_once(
    'src/components/ReceivableManagerCard.tsx',
    "          <FormField label=\"Ödeme sözü tarihi (YYYY-AA-GG)\" value={dueDate} onChangeText={setDueDate} placeholder=\"2026-07-20\" />",
    "          {needsInitialCharge && <FormField label=\"Borç tutarı / Net fiyat\" value={debtAmount} onChangeText={setDebtAmount} keyboardType=\"decimal-pad\" placeholder=\"Örn. 2500\" />}\n          <FormField label=\"Ödeme sözü tarihi (YYYY-AA-GG)\" value={dueDate} onChangeText={setDueDate} placeholder=\"2026-07-20\" />",
)

migration = r'''-- DraBornGarage v1.0.6: optional price, collection-derived net price, mileage flows

alter table public.profiles
  add column if not exists customer_motorcycle_odometer integer;

alter table public.appointments
  add column if not exists odometer integer;

alter table public.profiles drop constraint if exists profiles_customer_motorcycle_odometer_check;
alter table public.profiles add constraint profiles_customer_motorcycle_odometer_check
  check (customer_motorcycle_odometer is null or customer_motorcycle_odometer >= 0);

alter table public.appointments drop constraint if exists appointments_odometer_check;
alter table public.appointments add constraint appointments_odometer_check
  check (odometer is null or odometer >= 0);

create or replace function public.sync_new_user_customer_odometer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_odometer integer;
begin
  begin
    v_odometer := nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'customer_motorcycle_odometer',''), '[^0-9]', '', 'g'), '')::integer;
  exception when others then
    v_odometer := null;
  end;
  update public.profiles
  set customer_motorcycle_odometer = v_odometer,
      updated_at = now()
  where id = new.id and v_odometer is not null;
  return new;
end;
$$;

drop trigger if exists zz_draborngarage_customer_odometer on auth.users;
create trigger zz_draborngarage_customer_odometer
after insert on auth.users
for each row execute function public.sync_new_user_customer_odometer();

update public.profiles p
set customer_motorcycle_odometer = nullif(regexp_replace(coalesce(u.raw_user_meta_data ->> 'customer_motorcycle_odometer',''), '[^0-9]', '', 'g'), '')::integer
from auth.users u
where u.id = p.id
  and p.customer_motorcycle_odometer is null
  and nullif(regexp_replace(coalesce(u.raw_user_meta_data ->> 'customer_motorcycle_odometer',''), '[^0-9]', '', 'g'), '') is not null;

create or replace function public.sync_linked_profile_odometer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plate text;
  v_odometer integer;
begin
  if new.status = 'approved' then
    select customer_plate, customer_motorcycle_odometer
    into v_plate, v_odometer
    from public.profiles
    where id = new.user_id;

    if v_odometer is not null and nullif(public.normalize_plate(v_plate), '') is not null then
      update public.motorcycles m
      set odometer = v_odometer
      where m.workshop_id = new.workshop_id
        and m.customer_id = new.customer_id
        and public.normalize_plate(m.plate) = public.normalize_plate(v_plate);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists zz_sync_linked_profile_odometer on public.customer_links;
create trigger zz_sync_linked_profile_odometer
after insert or update of status on public.customer_links
for each row execute function public.sync_linked_profile_odometer();

create or replace function public.update_work_order_status(p_work_order_id uuid, p_status public.work_order_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_workshop uuid;
begin
  select workshop_id into target_workshop
  from public.work_orders
  where id = p_work_order_id;

  if target_workshop is null then raise exception 'İş emri bulunamadı'; end if;

  if not public.is_admin()
     and not public.is_workshop_owner(target_workshop)
     and not (public.is_workshop_worker(target_workshop) and public.can_access_work_order(p_work_order_id))
     and not (public.is_workshop_apprentice(target_workshop) and p_status in ('precheck','parts_waiting','testing')) then
    raise exception 'Servis durumunu değiştirme yetkiniz yok';
  end if;

  if p_status in ('repair_started','testing','ready','completed','delivered')
     and exists (select 1 from public.work_order_extra_requests where work_order_id=p_work_order_id and status='pending') then
    raise exception 'Bekleyen ek işlem onayı sonuçlanmadan bu aşamaya geçilemez';
  end if;

  if p_status = 'extra_approval_waiting'
     and not exists (select 1 from public.work_order_extra_requests where work_order_id=p_work_order_id and status='pending') then
    raise exception 'Onay bekleyen ek işlem bulunamadı';
  end if;

  update public.work_orders set status=p_status where id=p_work_order_id;
end;
$$;

create or replace function public.validate_work_order_price()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.price_type = 'fixed'::public.price_type and new.quoted_price is not null then
    if new.quoted_price <= 0 then raise exception 'Net ücret sıfırdan büyük olmalıdır'; end if;
    new.price_entered_at := coalesce(new.price_entered_at, now());
  elsif new.price_type = 'estimated'::public.price_type
    and new.estimated_price_min is not null and new.estimated_price_max is not null then
    if new.estimated_price_min <= 0 then raise exception 'Tahmini alt fiyat sıfırdan büyük olmalıdır'; end if;
    if new.estimated_price_max < new.estimated_price_min then raise exception 'Tahmini üst fiyat alt fiyattan küçük olamaz'; end if;
    new.price_entered_at := coalesce(new.price_entered_at, now());
  end if;
  return new;
end;
$$;

create or replace function public.staff_record_payment(
  p_work_order_id uuid,
  p_amount numeric,
  p_method text,
  p_note text default null,
  p_paid_at timestamptz default now(),
  p_collection_source text default 'service'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.work_orders%rowtype;
  v_id uuid;
  v_remaining numeric(12,2);
begin
  if not public.can_manage_receivable(p_work_order_id) then raise exception 'Tahsilat kaydetme yetkiniz yok'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Geçerli tahsilat tutarı girin'; end if;
  if p_method not in ('cash','transfer') then raise exception 'Yalnız Nakit veya IBAN kullanılabilir'; end if;
  if p_collection_source not in ('service','receivable') then raise exception 'Geçersiz tahsilat kaynağı'; end if;

  select * into v_order from public.work_orders where id=p_work_order_id for update;
  if not found then raise exception 'Servis kaydı bulunamadı'; end if;

  if coalesce(v_order.total_amount,0) <= 0 then
    update public.work_orders
    set price_type='fixed'::public.price_type,
        quoted_price=p_amount,
        estimated_price_min=null,
        estimated_price_max=null,
        price_entered_at=coalesce(price_entered_at,now())
    where id=p_work_order_id;
    perform public.refresh_work_order_totals(p_work_order_id);
    select * into v_order from public.work_orders where id=p_work_order_id for update;
  end if;

  v_remaining := greatest(0, v_order.total_amount-v_order.amount_received);
  if p_amount > v_remaining then raise exception 'Tahsilat kalan borçtan fazla olamaz. Kalan: %', v_remaining; end if;

  insert into public.payments(work_order_id,workshop_id,amount,payment_method,received_by,note,paid_at,collection_source)
  values(p_work_order_id,v_order.workshop_id,p_amount,p_method::public.payment_method,auth.uid(),nullif(trim(p_note),''),coalesce(p_paid_at,now()),p_collection_source)
  returning id into v_id;

  if v_order.status <> 'delivered'::public.work_order_status then
    perform public.update_work_order_status(p_work_order_id,'delivered'::public.work_order_status);
  end if;
  return v_id;
end;
$$;

drop function if exists public.staff_open_receivable(uuid,date,text,text);
create function public.staff_open_receivable(
  p_work_order_id uuid,
  p_due_date date,
  p_staff_note text default null,
  p_customer_note text default null,
  p_amount numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.work_orders%rowtype;
  v_old public.receivable_status;
begin
  if not public.can_manage_receivable(p_work_order_id) then raise exception 'Alacak kaydını yönetme yetkiniz yok'; end if;
  select * into v_order from public.work_orders where id=p_work_order_id for update;
  if not found then raise exception 'Servis kaydı bulunamadı'; end if;

  if coalesce(v_order.total_amount,0) <= 0 then
    if p_amount is null or p_amount <= 0 then raise exception 'Borç tutarı girin'; end if;
    update public.work_orders
    set price_type='fixed'::public.price_type,
        quoted_price=p_amount,
        estimated_price_min=null,
        estimated_price_max=null,
        price_entered_at=coalesce(price_entered_at,now())
    where id=p_work_order_id;
    perform public.refresh_work_order_totals(p_work_order_id);
    select * into v_order from public.work_orders where id=p_work_order_id for update;
  end if;

  if v_order.total_amount <= v_order.amount_received then raise exception 'Bu serviste kalan borç bulunmuyor'; end if;
  v_old := v_order.receivable_status;

  update public.work_orders
  set receivable_status='open',
      debt_promised_date=p_due_date,
      debt_written_at=coalesce(debt_written_at,now()),
      debt_closed_at=null,
      debt_note=nullif(trim(p_staff_note),''),
      debt_customer_note=nullif(trim(p_customer_note),'')
  where id=p_work_order_id;

  if nullif(trim(p_staff_note),'') is not null then
    insert into public.receivable_notes(work_order_id,workshop_id,author_id,visibility,note)
    values(p_work_order_id,v_order.workshop_id,auth.uid(),'staff',trim(p_staff_note));
  end if;
  if nullif(trim(p_customer_note),'') is not null then
    insert into public.receivable_notes(work_order_id,workshop_id,author_id,visibility,note)
    values(p_work_order_id,v_order.workshop_id,auth.uid(),'customer',trim(p_customer_note));
  end if;

  insert into public.receivable_events(work_order_id,workshop_id,actor_id,event_type,old_status,new_status,note)
  values(p_work_order_id,v_order.workshop_id,auth.uid(),case when v_old='not_set' then 'receivable_opened' else 'receivable_updated' end,v_old,'open',concat_ws(' • ',case when p_due_date is not null then 'Söz tarihi: '||p_due_date::text end,nullif(trim(p_staff_note),'')));

  if v_order.status <> 'delivered'::public.work_order_status then
    perform public.update_work_order_status(p_work_order_id,'delivered'::public.work_order_status);
  end if;
end;
$$;

drop function if exists public.customer_create_appointment(uuid,uuid,uuid,text,text,timestamptz,timestamptz);
create function public.customer_create_appointment(
  p_workshop_id uuid,
  p_motorcycle_id uuid,
  p_mechanic_id uuid,
  p_service_title text,
  p_customer_note text,
  p_scheduled_start timestamptz,
  p_scheduled_end timestamptz,
  p_odometer integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_customer uuid;
  new_id uuid;
  auto_confirm boolean;
  new_status text;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if length(trim(coalesce(p_service_title,''))) < 3 then raise exception 'Yapılacak işlem en az 3 karakter olmalı'; end if;
  if p_odometer is not null and p_odometer < 0 then raise exception 'Kilometre geçersiz'; end if;

  select m.customer_id into target_customer
  from public.motorcycles m
  join public.customer_links cl on cl.customer_id=m.customer_id and cl.workshop_id=m.workshop_id and cl.user_id=auth.uid() and cl.status='approved'
  where m.id=p_motorcycle_id and m.workshop_id=p_workshop_id;
  if target_customer is null then raise exception 'Bu motor hesabınıza bağlı değil'; end if;
  if not public.appointment_slot_available(p_workshop_id,p_mechanic_id,p_scheduled_start,p_scheduled_end,null) then raise exception 'Seçilen saat artık müsait değil'; end if;

  select appointment_auto_confirm into auto_confirm from public.workshops where id=p_workshop_id and is_active and appointments_enabled;
  if auto_confirm is null then raise exception 'İşletmede randevu sistemi kapalı'; end if;
  new_status := case when auto_confirm then 'confirmed' else 'pending' end;

  if p_odometer is not null then
    update public.motorcycles set odometer=p_odometer where id=p_motorcycle_id;
    update public.profiles set customer_motorcycle_odometer=p_odometer,updated_at=now() where id=auth.uid();
  end if;

  insert into public.appointments(workshop_id,customer_id,motorcycle_id,mechanic_id,service_title,customer_note,scheduled_start,scheduled_end,status,source,requested_by,created_by,confirmed_by,confirmed_at,odometer)
  values(p_workshop_id,target_customer,p_motorcycle_id,p_mechanic_id,trim(p_service_title),nullif(trim(p_customer_note),''),p_scheduled_start,p_scheduled_end,new_status,'customer',auth.uid(),auth.uid(),case when auto_confirm then auth.uid() else null end,case when auto_confirm then now() else null end,p_odometer)
  returning id into new_id;

  insert into public.appointment_events(appointment_id,workshop_id,actor_id,event_type,new_status,new_start,note)
  values(new_id,p_workshop_id,auth.uid(),'created',new_status,p_scheduled_start,'Müşteri randevu talebi oluşturdu');
  return new_id;
end;
$$;

drop function if exists public.customer_create_open_appointment(uuid,uuid,text,text,text,text,text,timestamptz,timestamptz);
create function public.customer_create_open_appointment(
  p_workshop_id uuid,
  p_mechanic_id uuid,
  p_brand text,
  p_model text,
  p_plate text,
  p_service_title text,
  p_customer_note text,
  p_scheduled_start timestamptz,
  p_scheduled_end timestamptz,
  p_odometer integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_rec public.profiles%rowtype;
  target_customer_id uuid;
  target_motorcycle_id uuid;
  new_id uuid;
  auto_confirm boolean;
  new_status text;
  normalized_plate text := public.normalize_plate(p_plate);
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if length(trim(coalesce(p_service_title,''))) < 3 then raise exception 'Yapılacak işlem en az 3 karakter olmalı'; end if;
  if length(normalized_plate) < 5 then raise exception 'Geçerli plaka gerekli'; end if;
  if length(trim(coalesce(p_brand,''))) < 2 or length(trim(coalesce(p_model,''))) < 1 then raise exception 'Motosiklet marka ve modeli gerekli'; end if;
  if p_odometer is not null and p_odometer < 0 then raise exception 'Kilometre geçersiz'; end if;

  select * into profile_rec from public.profiles where id=auth.uid();
  if profile_rec.id is null then raise exception 'Kullanıcı profili bulunamadı'; end if;
  if not exists(select 1 from public.workshop_members wm where wm.workshop_id=p_workshop_id and wm.user_id=p_mechanic_id and wm.is_active and wm.role in ('mechanic','owner_mechanic')) then raise exception 'Seçilen Usta bu işletmede aktif değil'; end if;
  if not public.appointment_slot_available(p_workshop_id,p_mechanic_id,p_scheduled_start,p_scheduled_end,null) then raise exception 'Seçilen saat artık müsait değil'; end if;

  select appointment_auto_confirm into auto_confirm from public.workshops where id=p_workshop_id and is_active and appointments_enabled;
  if auto_confirm is null then raise exception 'İşletmede randevu sistemi kapalı'; end if;

  select m.id,m.customer_id into target_motorcycle_id,target_customer_id
  from public.motorcycles m where m.workshop_id=p_workshop_id and public.normalize_plate(m.plate)=normalized_plate
  order by m.created_at desc limit 1;

  if target_customer_id is null then
    select c.id into target_customer_id from public.customers c
    where c.workshop_id=p_workshop_id and (c.created_by=auth.uid() or (profile_rec.phone is not null and public.normalize_phone(c.phone)=public.normalize_phone(profile_rec.phone)))
    order by c.created_at desc limit 1;
  end if;
  if target_customer_id is null then
    insert into public.customers(workshop_id,full_name,phone,note,created_by)
    values(p_workshop_id,profile_rec.full_name,profile_rec.phone,'Uygulama üzerinden randevu oluşturan kullanıcı',auth.uid())
    returning id into target_customer_id;
  end if;

  if target_motorcycle_id is null then
    insert into public.motorcycles(workshop_id,customer_id,brand,model,plate,odometer,note,created_by)
    values(p_workshop_id,target_customer_id,trim(p_brand),trim(p_model),normalized_plate,p_odometer,'Randevu sırasında oluşturuldu',auth.uid())
    returning id into target_motorcycle_id;
  elsif p_odometer is not null then
    update public.motorcycles set odometer=p_odometer where id=target_motorcycle_id;
  end if;

  if p_odometer is not null then
    update public.profiles set customer_motorcycle_odometer=p_odometer,updated_at=now() where id=auth.uid();
  end if;

  new_status := case when auto_confirm then 'confirmed' else 'pending' end;
  insert into public.appointments(workshop_id,customer_id,motorcycle_id,mechanic_id,service_title,customer_note,scheduled_start,scheduled_end,status,source,requested_by,created_by,confirmed_by,confirmed_at,odometer)
  values(p_workshop_id,target_customer_id,target_motorcycle_id,p_mechanic_id,trim(p_service_title),nullif(trim(p_customer_note),''),p_scheduled_start,p_scheduled_end,new_status,'customer',auth.uid(),auth.uid(),case when auto_confirm then auth.uid() else null end,case when auto_confirm then now() else null end,p_odometer)
  returning id into new_id;

  insert into public.appointment_events(appointment_id,workshop_id,actor_id,event_type,new_status,new_start,note)
  values(new_id,p_workshop_id,auth.uid(),'created',new_status,p_scheduled_start,'Bağlantı gerektirmeyen müşteri randevu talebi oluşturuldu');
  return new_id;
end;
$$;

create or replace function public.staff_convert_appointment_to_work_order(
  p_appointment_id uuid,
  p_waiting_status public.customer_waiting_status default 'left_vehicle',
  p_odometer integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  order_id uuid;
  v_odometer integer;
begin
  select * into rec from public.appointments where id=p_appointment_id;
  if rec.id is null then raise exception 'Randevu bulunamadı'; end if;
  if not public.is_admin() and not public.is_workshop_owner(rec.workshop_id) and not (public.is_workshop_worker(rec.workshop_id) and auth.uid()=rec.mechanic_id) then raise exception 'Randevuyu servise dönüştürme yetkiniz yok'; end if;
  if rec.status not in ('pending','confirmed','arrived') then raise exception 'Bu randevu servise dönüştürülemez'; end if;
  select id into order_id from public.work_orders where appointment_id=rec.id;
  if order_id is not null then return order_id; end if;

  v_odometer := coalesce(p_odometer,rec.odometer);
  insert into public.work_orders(workshop_id,customer_id,motorcycle_id,assigned_mechanic_id,complaint,notes,odometer_in,arrived_at,service_type,customer_waiting_status,status,appointment_id,created_by)
  values(rec.workshop_id,rec.customer_id,rec.motorcycle_id,rec.mechanic_id,rec.service_title,concat_ws(E'\n',nullif(rec.customer_note,''),nullif(rec.staff_note,'')),v_odometer,now(),'appointment',p_waiting_status,'queued',rec.id,auth.uid())
  returning id into order_id;

  update public.appointments set status='converted',converted_at=now(),arrived_at=coalesce(arrived_at,now()) where id=rec.id;
  insert into public.appointment_events(appointment_id,workshop_id,actor_id,event_type,old_status,new_status,old_start,new_start,note)
  values(rec.id,rec.workshop_id,auth.uid(),'converted',rec.status,'converted',rec.scheduled_start,rec.scheduled_start,'Randevu servis kaydına dönüştürüldü');
  return order_id;
end;
$$;

grant execute on function public.staff_record_payment(uuid,numeric,text,text,timestamptz,text) to authenticated;
grant execute on function public.staff_open_receivable(uuid,date,text,text,numeric) to authenticated;
grant execute on function public.customer_create_appointment(uuid,uuid,uuid,text,text,timestamptz,timestamptz,integer) to authenticated;
grant execute on function public.customer_create_open_appointment(uuid,uuid,text,text,text,text,text,timestamptz,timestamptz,integer) to authenticated;
grant execute on function public.staff_convert_appointment_to_work_order(uuid,public.customer_waiting_status,integer) to authenticated;
'''
write('supabase/migrations/20260715230000_v1_0_6_finance_mileage_firebase.sql', migration)

changelog = '''# DraBornGarage v1.0.6 RC\n\n- v1.0.5 kaynakları `backup/v1.0.5-before-v1.0.6-20260715` dalına yedeklendi.\n- Android Firebase `google-services.json` yapılandırması Expo projesine bağlandı.\n- Motor Hazır aşamasında ücret zorunluluğu ve “Tahsil edilecek ücret gerekli” uyarısı kaldırıldı.\n- Ücret girilmemiş servislerde Nakit/IBAN tahsilat tutarı otomatik Net Fiyat kabul edilir.\n- Ücret girilmemiş servislerde Borç tutarı otomatik Net Fiyat kabul edilir.\n- Kullanıcı kaydına motosiklet kilometresi eklendi.\n- Müşteri randevu oluştururken güncel kilometre girebilir.\n- Müşteriler ekranında motosiklet eklerken kilometre kaydedilir.\n- Randevu kilometresi servis kaydına dönüştürülürken otomatik aktarılır.\n- Uygulama sürümü 1.0.6, Android versionCode 24, iOS buildNumber 24.\n'''
write('docs/CHANGELOG_V1.0.6.md', changelog)

print('DraBornGarage v1.0.6 patch applied')
