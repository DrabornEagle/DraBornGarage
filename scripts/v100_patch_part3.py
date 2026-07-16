from pathlib import Path
import json, math, re, struct, wave
ROOT=Path.cwd()

def p(rel): return ROOT/rel

def replace(rel, old, new, count=-1):
    path=p(rel); text=path.read_text()
    if old not in text:
        raise RuntimeError(f'{rel}: target not found: {old[:140]!r}')
    path.write_text(text.replace(old,new,count))

def regex_replace(rel, pattern, repl, count=0, flags=re.S):
    path=p(rel); text=path.read_text()
    out,n=re.subn(pattern,repl,text,count=count,flags=flags)
    if not n: raise RuntimeError(f'{rel}: regex target not found: {pattern[:140]}')
    path.write_text(out)

rel='src/screens/WorkOrdersScreen.tsx'
replace(rel,"import { supabase } from '../lib/supabase';","import { supabase } from '../lib/supabase';\nimport { useSmartAutoRefresh } from '../hooks/useSmartAutoRefresh';")
replace(rel,"  const load = useCallback(async () => {","  const load = useCallback(async (silent = false) => {")
replace(rel,"    if (error) Alert.alert('Servis kayıtları alınamadı', error.message);","    if (error && !silent) Alert.alert('Servis kayıtları alınamadı', error.message);")
replace(rel,"  useEffect(() => { load(); }, [load]);\n\n  const visible","""  useEffect(() => { load(); }, [load]);
  useSmartAutoRefresh(() => load(true), 55000, Boolean(workshop && membership && !selected));
  useEffect(() => {
    if (!workshop?.id || selected) return;
    const refreshSilently = () => { load(true).catch(() => undefined); };
    const channel = supabase.channel(`work-orders-live-${workshop.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders', filter: `workshop_id=eq.${workshop.id}` }, refreshSilently)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workshop?.id, selected, load]);

  const visible""")
replace(rel,"'v0.4 SERVİS YÖNETİMİ'","'SERVİS YÖNETİMİ'")

rel='src/screens/CustomerMemoryScreen.tsx'
replace(rel,"import { supabase } from '../lib/supabase';","import { supabase } from '../lib/supabase';\nimport { useSmartAutoRefresh } from '../hooks/useSmartAutoRefresh';")
replace(rel,"  const load = useCallback(async () => {","  const load = useCallback(async (silent = false) => {")
replace(rel,"      Alert.alert('Müşteri hafızası açılamadı', customerResult.error?.message || motorcycleResult.error?.message || orderResult.error?.message || 'Bilinmeyen hata');","      if (!silent) Alert.alert('Müşteri hafızası açılamadı', customerResult.error?.message || motorcycleResult.error?.message || orderResult.error?.message || 'Bilinmeyen hata');")
replace(rel,"  useEffect(() => { load(); }, [load]);\n\n  const visibleCustomers","""  useEffect(() => { load(); }, [load]);
  useSmartAutoRefresh(() => load(true), 60000, Boolean(workshop));
  useEffect(() => {
    if (!workshop?.id) return;
    const refreshSilently = () => { load(true).catch(() => undefined); };
    const channel = supabase.channel(`customer-memory-live-${workshop.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers', filter: `workshop_id=eq.${workshop.id}` }, refreshSilently)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'motorcycles', filter: `workshop_id=eq.${workshop.id}` }, refreshSilently)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders', filter: `workshop_id=eq.${workshop.id}` }, refreshSilently)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workshop?.id, load]);

  const visibleCustomers""")
replace(rel,'eyebrow="v1.0.1 MÜŞTERİ HAFIZASI"','eyebrow="MÜŞTERİ HAFIZASI"')

rel='src/screens/HomeScreen.tsx'
replace(rel,"import { supabase } from '../lib/supabase';","import { supabase } from '../lib/supabase';\nimport { useSmartAutoRefresh } from '../hooks/useSmartAutoRefresh';")
replace(rel,"  useEffect(() => { load(); }, [load]);\n\n  useEffect(() => {","  useEffect(() => { load(); }, [load]);\n  useSmartAutoRefresh(load, 60000, Boolean(workshop && membership));\n\n  useEffect(() => {")

rel='src/screens/ReceivablesScreen.tsx'
replace(rel,"import { supabase } from '../lib/supabase';","import { supabase } from '../lib/supabase';\nimport { useSmartAutoRefresh } from '../hooks/useSmartAutoRefresh';")
replace(rel,"  const load = useCallback(async () => {","  const load = useCallback(async (silent = false) => {")
replace(rel,"    if (listResult.error) Alert.alert('Alacaklar alınamadı', listResult.error.message);","    if (listResult.error && !silent) Alert.alert('Alacaklar alınamadı', listResult.error.message);")
replace(rel,"  useEffect(() => {\n    const timer = setTimeout(load, 260);\n    return () => clearTimeout(timer);\n  }, [load]);\n\n  const refresh","""  useEffect(() => {
    const timer = setTimeout(() => load(), 260);
    return () => clearTimeout(timer);
  }, [load]);
  useSmartAutoRefresh(() => load(true), 60000, Boolean(workshop && canView && !selectedId));
  useEffect(() => {
    if (!workshop?.id || !canView || selectedId) return;
    const refreshSilently = () => { load(true).catch(() => undefined); };
    const channel = supabase.channel(`receivables-live-${workshop.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders', filter: `workshop_id=eq.${workshop.id}` }, refreshSilently)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `workshop_id=eq.${workshop.id}` }, refreshSilently)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workshop?.id, canView, selectedId, load]);

  const refresh""")
replace(rel,'eyebrow="v0.5 ALACAK TAKİBİ"','eyebrow="ALACAK TAKİBİ"')

rel='src/screens/ApplicationEntryScreen.tsx'
replace(rel,"import { supabase } from '../lib/supabase';","import { supabase } from '../lib/supabase';\nimport { useSmartAutoRefresh } from '../hooks/useSmartAutoRefresh';\nimport { APP_VERSION_LABEL } from '../lib/appVersion';")
replace(rel,"  useEffect(() => {\n    loadAccessRequests();\n  }, [loadAccessRequests]);","  useEffect(() => { loadAccessRequests(); }, [loadAccessRequests]);\n  useSmartAutoRefresh(loadAccessRequests, 60000, Boolean(profile?.id));")
replace(rel,'DraBornGarage • v1.0.4 RC','DraBornGarage • {APP_VERSION_LABEL}')

rel='src/screens/NotificationPermissionScreen.tsx'
replace(rel,"import { useTheme } from '../context/ThemeContext';","import { useTheme } from '../context/ThemeContext';\nimport { APP_VERSION_LABEL } from '../lib/appVersion';")
replace(rel,'DraBornGarage • v1.0.6','DraBornGarage • {APP_VERSION_LABEL}')

rel='src/screens/SettingsScreen.tsx'
replace(rel,"import { ThemeMode } from '../types';","import { ThemeMode } from '../types';\nimport { APP_VERSION_LABEL } from '../lib/appVersion';")
replace(rel,'<SettingsAccordion title="Uygulama" subtitle="v1.0.4 RC • Başvuru merkezi ve erişim düzeni"','<SettingsAccordion title="Uygulama" subtitle={`${APP_VERSION_LABEL} • Google Play Final Adayı`}')
regex_replace(rel,r'<GlassCard style=\{styles\.info\}><Info icon="layers" label="Sürüm" value="v1\.0\.4 RC • Expo Test Adayı"[\s\S]*?</GlassCard>', '<GlassCard style={styles.info}><Info icon="layers" label="Sürüm" value={`${APP_VERSION_LABEL} • Google Play Final Adayı`} /><Info icon="shield-checkmark" label="Motor Hazır kuralı" value="Ücret isteğe bağlı • Tahsilat veya borç tutarı Net Fiyat olabilir" /><Info icon="key" label="İmza güvenliği" value="Kalıcı DraBornGarage production upload keystore" /><Info icon="archive" label="Bu sürüm öncesi yedek" value="backup/v1.0.8-production-before-v1.0.0-final-20260716" /><Info icon="refresh" label="Geri alma" value="Kod ve veritabanıyla v1.0.8 Production" /><Info icon="phone-portrait" label="Test yöntemi" value="Gerçek keystore imzalı Production APK" /><Info icon="storefront" label="Mağaza durumu" value="Son cihaz testleri • sonraki adım v1.0 Final AAB" /></GlassCard>',count=1)
replace(rel,'v0.9 pilot verileri yüklensin mi?','Pilot test verileri yüklensin mi?')
replace(rel,'v0.9 pilot ortamı hazır','Pilot ortamı hazır')
replace(rel,'v0.9 Ana Akış Testleri','Ana Akış Testleri')
replace('src/screens/AuthScreen.tsx',"Constants.expoConfig?.version ?? '1.0.6'","Constants.expoConfig?.version ?? '1.0.0'")

p('supabase/migrations/20260716040000_v1_0_0_final_candidate_notifications_refresh.sql').write_text("""-- DraBornGarage v1.0.0 Final Candidate notification channels and closed-app test
begin;

alter table public.notification_preferences drop constraint if exists notification_preferences_sound_check;
alter table public.notification_preferences add constraint notification_preferences_sound_check
check (notification_sound = any (array['system_loud','garage_chime','garage_pulse','garage_alert','silent']::text[]));

create or replace function public.notification_channel_id(p_sound text)
returns text language sql immutable as $$
  select case p_sound
    when 'garage_chime' then 'draborngarage-appointment-chime-v4'
    when 'garage_pulse' then 'draborngarage-workshop-pulse-v4'
    when 'garage_alert' then 'draborngarage-urgent-alert-v4'
    when 'silent' then 'draborngarage-silent-v4'
    else 'draborngarage-system-loud-v4'
  end;
$$;

create or replace function public.notification_sound_file(p_sound text)
returns text language sql immutable as $$
  select case p_sound
    when 'garage_chime' then 'garage_chime.wav'
    when 'garage_pulse' then 'garage_pulse.wav'
    when 'garage_alert' then 'garage_alert.wav'
    when 'silent' then null
    else 'default'
  end;
$$;

create or replace function public.notification_schedule_closed_app_test(p_delay_seconds integer default 45)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user uuid:=auth.uid();
  v_delay integer:=greatest(20,least(coalesce(p_delay_seconds,45),120));
  v_id uuid;
begin
  if v_user is null then raise exception 'Oturum gerekli'; end if;
  v_id:=public.enqueue_user_notification(
    v_user,null,'system','closed_app_push_test',
    'DraBornGarage kapalı uygulama testi',
    'Bu bildirimi uygulama tamamen kapalıyken görüyorsan FCM V1 bağlantısı başarıyla çalışıyor.',
    'urgent','profile',v_user,
    jsonb_build_object('target_tab','settings','target_section','notifications','closed_app_test',true),
    v_user::text||':closed-app-test:'||extract(epoch from date_trunc('minute',now()))::bigint::text,
    now()+make_interval(secs=>v_delay),null,null
  );
  return jsonb_build_object('scheduled',v_id is not null,'notification_id',v_id,'deliver_at',now()+make_interval(secs=>v_delay),'delay_seconds',v_delay);
end;
$$;

revoke all on function public.notification_schedule_closed_app_test(integer) from public,anon;
grant execute on function public.notification_schedule_closed_app_test(integer) to authenticated;

commit;
""")

for rel in ['.github/workflows/_temporary-export-source.yml','.runtime/v100-inventory.txt','.runtime/source-export-run.txt']:
    q=p(rel)
    if q.exists(): q.unlink()

print('v1.0.0 patch part 3 complete')
