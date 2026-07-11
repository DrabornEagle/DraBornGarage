import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { PlatformFeesDashboard } from '../components/PlatformFeesDashboard';
import { PrimaryButton } from '../components/PrimaryButton';
import { ReportsDashboard } from '../components/ReportsDashboard';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { money } from '../lib/format';
import { supabase } from '../lib/supabase';
import { BusinessApplication, MemberRole } from '../types';

type Section = 'management' | 'reports' | 'platform';

const roleLabels: Record<MemberRole, string> = {
  owner: 'İşletme Sahibi',
  owner_mechanic: 'İşletme Sahibi + Usta',
  mechanic: 'Usta',
  apprentice: 'Çırak',
};

export function AdminScreen() {
  const { colors } = useTheme();
  const {
    workshop,
    workshops,
    createInviteCode,
    selectWorkshop,
    createWorkshop,
    refreshWorkspace,
  } = useAuth();
  const [section, setSection] = useState<Section>('management');
  const [members, setMembers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [applications, setApplications] = useState<BusinessApplication[]>([]);
  const [latestCode, setLatestCode] = useState<{ code: string; role: MemberRole } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessTaxOffice, setBusinessTaxOffice] = useState('');
  const [businessTaxNumber, setBusinessTaxNumber] = useState('');
  const [editName, setEditName] = useState(workshop?.name ?? '');
  const [editPhone, setEditPhone] = useState(workshop?.phone ?? '');
  const [editAddress, setEditAddress] = useState(workshop?.address ?? '');
  const [editTaxOffice, setEditTaxOffice] = useState(workshop?.tax_office ?? '');
  const [editTaxNumber, setEditTaxNumber] = useState(workshop?.tax_number ?? '');

  useEffect(() => {
    setEditName(workshop?.name ?? '');
    setEditPhone(workshop?.phone ?? '');
    setEditAddress(workshop?.address ?? '');
    setEditTaxOffice(workshop?.tax_office ?? '');
    setEditTaxNumber(workshop?.tax_number ?? '');
  }, [workshop?.id, workshop?.name, workshop?.phone, workshop?.address, workshop?.tax_office, workshop?.tax_number]);

  const load = useCallback(async () => {
    const applicationResult = await supabase.rpc('admin_get_business_applications');
    setApplications((applicationResult.data as BusinessApplication[] | null) ?? []);
    if (!workshop) { setMembers([]); setServices([]); return; }
    const [memberResult, serviceResult] = await Promise.all([
      supabase
        .from('workshop_members')
        .select('user_id,role,is_active,joined_at,availability_status,staff_note,profile:profiles(full_name,phone)')
        .eq('workshop_id', workshop.id)
        .order('joined_at'),
      supabase
        .from('work_order_services')
        .select('mechanic_id,price,completed')
        .eq('workshop_id', workshop.id)
        .eq('completed', true),
    ]);
    setMembers(memberResult.data ?? []);
    setServices(serviceResult.data ?? []);
  }, [workshop]);

  useEffect(() => { load(); }, [load]);

  const createBusiness = async () => {
    const normalizedTaxNumber = businessTaxNumber.replace(/\D/g, '');
    if (!businessName.trim()) return Alert.alert('İşletme adı gerekli');
    if (!businessTaxOffice.trim() || ![10, 11].includes(normalizedTaxNumber.length)) return Alert.alert('Vergi bilgileri gerekli', 'Vergi Dairesi ile 10 veya 11 haneli Vergi Numarasını gir.');
    setLoading(true);
    const error = await createWorkshop(businessName, businessPhone, businessAddress, businessTaxOffice, normalizedTaxNumber);
    setLoading(false);
    if (error) return Alert.alert('İşletme oluşturulamadı', error);
    setBusinessName('');
    setBusinessPhone('');
    setBusinessAddress('');
    setBusinessTaxOffice('');
    setBusinessTaxNumber('');
    setShowBusinessForm(false);
  };

  const saveBusiness = async () => {
    if (!workshop || !editName.trim()) return;
    setLoading(true);
    const { error } = await supabase.rpc('update_workshop_details', {
      p_workshop_id: workshop.id,
      p_name: editName.trim(),
      p_phone: editPhone.trim() || null,
      p_address: editAddress.trim() || null,
      p_tax_office: editTaxOffice.trim(),
      p_tax_number: editTaxNumber.replace(/\D/g, ''),
    });
    setLoading(false);
    if (error) return Alert.alert('İşletme güncellenemedi', error.message);
    await refreshWorkspace(workshop.id);
    Alert.alert('İşletme güncellendi');
  };

  const reviewApplication = (application: BusinessApplication, approve: boolean) => Alert.alert(
    approve ? 'İşletme başvurusunu onayla' : 'İşletme başvurusunu reddet',
    `${application.business_name} • ${application.applicant_name || 'Başvuru sahibi'}`,
    [
      { text: 'Vazgeç', style: 'cancel' },
      { text: approve ? 'Onayla ve İşletmeyi Aç' : 'Reddet', style: approve ? 'default' : 'destructive', onPress: async () => {
        setLoading(true);
        const { error } = await supabase.rpc('admin_review_business_application', { p_application_id: application.id, p_approve: approve, p_note: approve ? 'Admin tarafından onaylandı' : 'Başvuru Admin tarafından uygun bulunmadı' });
        setLoading(false);
        if (error) return Alert.alert('Başvuru sonuçlandırılamadı', error.message);
        await refreshWorkspace(workshop?.id ?? null);
        await load();
        Alert.alert(approve ? 'İşletme hesabı açıldı' : 'Başvuru reddedildi');
      } },
    ],
  );

  const toggleBusiness = async (id: string, active: boolean) => {
    const { error } = await supabase.rpc('admin_set_workshop_active', {
      p_workshop_id: id,
      p_is_active: active,
    });
    if (error) return Alert.alert('İşletme durumu değiştirilemedi', error.message);
    await refreshWorkspace(workshop?.id ?? null);
  };

  const generate = async (role: MemberRole) => {
    setLoading(true);
    const result = await createInviteCode(role);
    setLoading(false);
    if (result.error || !result.code) return Alert.alert('Kod üretilemedi', result.error);
    setLatestCode({ code: result.code, role });
  };

  const toggleStaff = async (member: any) => {
    const { error } = await supabase.rpc('set_staff_active', {
      p_workshop_id: workshop?.id,
      p_user_id: member.user_id,
      p_is_active: !member.is_active,
    });
    if (error) return Alert.alert('Personel durumu değiştirilemedi', error.message);
    load();
  };

  const changeRole = async (member: any, role: MemberRole) => {
    const { error } = await supabase.rpc('set_staff_role', {
      p_workshop_id: workshop?.id,
      p_user_id: member.user_id,
      p_role: role,
    });
    if (error) return Alert.alert('Rol değiştirilemedi', error.message);
    load();
  };

  if (section === 'reports') {
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow="ADMIN RAPORLARI" title="Platform ve İşletme Raporları" subtitle="Seçili işletmenin toplamları, Usta kayıtları, tahsilatları ve servis hareketleri." />
        <AdminSwitch value={section} onChange={setSection} />
        <ReportsDashboard />
      </ScrollView>
    );
  }

  if (section === 'platform') {
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow="ADMIN PLATFORM YÖNETİMİ" title="Platform Ödeme Merkezi" subtitle="İşletme bazlı hizmet bedeli, dönem borcu, ödeme bildirimi, dekont ve Admin onayı." />
        <AdminSwitch value={section} onChange={setSection} />
        <PlatformFeesDashboard />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeader eyebrow="ADMIN PANELİ" title="DraBornGarage Yönetim Merkezi" subtitle="Tüm işletmeleri, işletme sahiplerini, Ustaları, Çırakları ve seçili işletmenin ayarlarını yönet." />
      <AdminSwitch value={section} onChange={setSection} />

      <GlassCard style={styles.adminHero}>
        <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}18` }]}>
          <Ionicons name="shield-checkmark" size={29} color={colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Admin yetkisi aktif</Text>
          <Text style={[styles.heroText, { color: colors.textMuted }]}>{workshops.length} işletme • Seçili işletme: {workshop?.name || 'Yok'}</Text>
        </View>
      </GlassCard>

      <View style={styles.sectionHeader}><View><Text style={[styles.sectionTitle, { color: colors.text }]}>İşletme Başvuruları</Text><Text style={[styles.itemMeta, { color: colors.textMuted }]}>{applications.filter((item) => item.status === 'pending').length} başvuru inceleme bekliyor</Text></View></View>
      <View style={styles.list}>
        {applications.length === 0 ? <GlassCard style={styles.applicationEmpty}><Ionicons name="checkmark-done-circle" size={34} color={colors.green} /><Text style={[styles.memberName, { color: colors.text }]}>Bekleyen işletme başvurusu yok</Text></GlassCard> : applications.map((application) => { const accent = application.status === 'approved' ? colors.green : application.status === 'rejected' ? colors.red : colors.orange; return <GlassCard key={application.id} style={[styles.applicationCard, { borderColor: `${accent}45` }]}><View style={styles.applicationTop}><View style={[styles.businessIcon, { backgroundColor: `${accent}18` }]}><Ionicons name={application.status === 'approved' ? 'checkmark-circle' : application.status === 'rejected' ? 'close-circle' : 'hourglass'} size={24} color={accent} /></View><View style={styles.copy}><Text style={[styles.memberName, { color: colors.text }]}>{application.business_name}</Text><Text style={[styles.itemMeta, { color: colors.textMuted }]}>{application.applicant_name || 'Başvuru sahibi'} • {application.applicant_email || 'E-posta yok'}</Text><Text style={[styles.itemMeta, { color: colors.textMuted }]}>{application.tax_office} • {application.tax_number}</Text><Text style={[styles.itemMeta, { color: colors.textMuted }]}>{application.business_address || 'Adres eklenmedi'}</Text></View><Text style={[styles.applicationStatus, { color: accent }]}>{application.status === 'pending' ? 'BEKLİYOR' : application.status === 'approved' ? 'ONAYLI' : 'RED'}</Text></View>{application.status === 'pending' && <View style={styles.applicationActions}><AnimatedPressable onPress={() => reviewApplication(application, false)} style={[styles.reviewButton, { borderColor: `${colors.red}45`, backgroundColor: `${colors.red}0D` }]}><Ionicons name="close" size={18} color={colors.red} /><Text style={[styles.reviewText, { color: colors.red }]}>Reddet</Text></AnimatedPressable><AnimatedPressable onPress={() => reviewApplication(application, true)} style={[styles.reviewButton, { borderColor: `${colors.green}45`, backgroundColor: `${colors.green}0D` }]}><Ionicons name="checkmark" size={18} color={colors.green} /><Text style={[styles.reviewText, { color: colors.green }]}>Onayla</Text></AnimatedPressable></View>}</GlassCard>; })}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>İşletmeler</Text>
        <AnimatedPressable onPress={() => setShowBusinessForm((value) => !value)} style={[styles.smallAction, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}45` }]}>
          <Ionicons name={showBusinessForm ? 'close' : 'add'} size={18} color={colors.primary} />
          <Text style={[styles.smallActionText, { color: colors.primary }]}>{showBusinessForm ? 'Kapat' : 'İşletme Ekle'}</Text>
        </AnimatedPressable>
      </View>

      {showBusinessForm && (
        <GlassCard style={styles.formCard}>
          <FormField label="İşletme adı" value={businessName} onChangeText={setBusinessName} placeholder="Lara Moto Garage" />
          <FormField label="Telefon" value={businessPhone} onChangeText={setBusinessPhone} keyboardType="phone-pad" />
          <FormField label="Adres" value={businessAddress} onChangeText={setBusinessAddress} multiline />
          <FormField label="Vergi Dairesi" value={businessTaxOffice} onChangeText={setBusinessTaxOffice} />
          <FormField label="Vergi Numarası" value={businessTaxNumber} onChangeText={(value) => setBusinessTaxNumber(value.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={11} />
          <PrimaryButton title="İşletmeyi Oluştur" onPress={createBusiness} loading={loading} />
        </GlassCard>
      )}

      <View style={styles.list}>
        {workshops.map((item) => (
          <GlassCard key={item.id} style={[styles.businessCard, workshop?.id === item.id && { borderColor: colors.primary }]}>
            <AnimatedPressable onPress={() => selectWorkshop(item.id)} style={styles.businessMain}>
              <View style={[styles.businessIcon, { backgroundColor: item.is_active === false ? `${colors.red}16` : `${colors.primary}18` }]}>
                <Ionicons name="business" size={23} color={item.is_active === false ? colors.red : colors.primary} />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.memberName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.itemMeta, { color: colors.textMuted }]}>{item.address || 'Adres eklenmedi'} • {item.is_active === false ? 'Pasif' : 'Aktif'}</Text>
              </View>
              {workshop?.id === item.id && <Ionicons name="checkmark-circle" size={23} color={colors.green} />}
            </AnimatedPressable>
            <AnimatedPressable onPress={() => toggleBusiness(item.id, item.is_active === false)} style={[styles.stateButton, { borderColor: item.is_active === false ? `${colors.green}35` : `${colors.red}35` }]}>
              <Text style={[styles.stateButtonText, { color: item.is_active === false ? colors.green : colors.red }]}>{item.is_active === false ? 'Aktif Yap' : 'Pasif Yap'}</Text>
            </AnimatedPressable>
          </GlassCard>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Seçili İşletme</Text>
      <GlassCard style={styles.formCard}>
        <FormField label="İşletme adı" value={editName} onChangeText={setEditName} />
        <FormField label="Telefon" value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
        <FormField label="Adres" value={editAddress} onChangeText={setEditAddress} multiline />
        <FormField label="Vergi Dairesi" value={editTaxOffice} onChangeText={setEditTaxOffice} />
        <FormField label="Vergi Numarası" value={editTaxNumber} onChangeText={(value) => setEditTaxNumber(value.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={11} />
        <PrimaryButton title="İşletme Bilgilerini Güncelle" onPress={saveBusiness} loading={loading} secondary />
      </GlassCard>

      <GlassCard style={styles.inviteCard}>
        <Text style={[styles.inviteTitle, { color: colors.text }]}>Personel ve işletme sahibi davetleri</Text>
        <Text style={[styles.inviteText, { color: colors.textMuted }]}>Kodlar 30 gün geçerli ve tek kullanımlıdır.</Text>
        <View style={styles.inviteGrid}>
          <InviteButton label="Usta Kodu" icon="construct" color={colors.primary} onPress={() => generate('mechanic')} />
          <InviteButton label="Çırak Kodu" icon="school" color={colors.orange} onPress={() => generate('apprentice')} />
          <InviteButton label="Sahip + Usta" icon="shield-checkmark" color={colors.green} onPress={() => generate('owner_mechanic')} />
          <InviteButton label="Sadece Sahip" icon="business" color={colors.cyan} onPress={() => generate('owner')} />
        </View>
        {latestCode && (
          <AnimatedPressable onPress={() => Share.share({ message: `${workshop?.name} DraBornGarage ${roleLabels[latestCode.role]} davet kodu: ${latestCode.code}` })} style={[styles.codeBox, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
            <View><Text style={[styles.codeLabel, { color: colors.textMuted }]}>{roleLabels[latestCode.role].toLocaleUpperCase('tr-TR')} KODU</Text><Text style={[styles.code, { color: colors.text }]}>{latestCode.code}</Text></View>
            <Ionicons name="share-social" size={22} color={colors.primary} />
          </AnimatedPressable>
        )}
      </GlassCard>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Seçili İşletme Personeli</Text>
      <View style={styles.list}>
        {members.map((member) => {
          const memberServices = services.filter((service) => service.mechanic_id === member.user_id);
          const total = memberServices.reduce((sum, item) => sum + Number(item.price), 0);
          const accent = member.role === 'apprentice' ? colors.orange : member.role === 'owner' || member.role === 'owner_mechanic' ? colors.green : colors.primary;
          return (
            <GlassCard key={member.user_id} style={[styles.personCard, !member.is_active && { opacity: 0.6 }]}>
              <View style={styles.memberCard}>
                <View style={[styles.avatar, { backgroundColor: `${accent}20` }]}><Text style={[styles.avatarText, { color: accent }]}>{member.profile?.full_name?.charAt(0) || 'P'}</Text></View>
                <View style={styles.copy}><Text style={[styles.memberName, { color: colors.text }]}>{member.profile?.full_name || 'Personel'}</Text><Text style={[styles.itemMeta, { color: colors.textMuted }]}>{roleLabels[member.role as MemberRole]} • {member.is_active ? 'Aktif' : 'Pasif'}</Text></View>
                {member.role !== 'apprentice' && <View><Text style={[styles.amount, { color: colors.green }]}>{money(total)}</Text><Text style={[styles.itemMeta, { color: colors.textMuted }]}>{memberServices.length} işlem</Text></View>}
              </View>
              <View style={styles.staffActions}>
                {(member.role === 'mechanic' || member.role === 'apprentice') && <AnimatedPressable onPress={() => changeRole(member, member.role === 'mechanic' ? 'apprentice' : 'mechanic')} style={[styles.staffButton, { borderColor: colors.border }]}><Ionicons name="swap-horizontal" size={17} color={colors.primary} /><Text style={[styles.staffButtonText, { color: colors.text }]}>{member.role === 'mechanic' ? 'Çırak Yap' : 'Usta Yap'}</Text></AnimatedPressable>}
                <AnimatedPressable onPress={() => toggleStaff(member)} style={[styles.staffButton, { borderColor: member.is_active ? `${colors.red}35` : `${colors.green}35` }]}><Ionicons name={member.is_active ? 'pause-circle' : 'play-circle'} size={17} color={member.is_active ? colors.red : colors.green} /><Text style={[styles.staffButtonText, { color: member.is_active ? colors.red : colors.green }]}>{member.is_active ? 'Pasifleştir' : 'Aktifleştir'}</Text></AnimatedPressable>
              </View>
            </GlassCard>
          );
        })}
      </View>
    </ScrollView>
  );
}

function AdminSwitch({ value, onChange }: { value: Section; onChange: (value: Section) => void }) {
  const { colors } = useTheme();
  const items: { key: Section; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'management', label: 'Admin', icon: 'shield-checkmark' },
    { key: 'reports', label: 'Raporlar', icon: 'stats-chart' },
    { key: 'platform', label: 'Platform', icon: 'card' },
  ];
  return <View style={[styles.switch, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>{items.map((item) => { const active = value === item.key; return <AnimatedPressable key={item.key} onPress={() => onChange(item.key)} style={[styles.switchButton, active && { backgroundColor: colors.cardStrong, borderColor: colors.primary }]}><Ionicons name={item.icon} size={17} color={active ? colors.primary : colors.textMuted} /><Text style={[styles.switchText, { color: active ? colors.text : colors.textMuted }]}>{item.label}</Text></AnimatedPressable>; })}</View>;
}

function InviteButton({ label, icon, color, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; onPress: () => void }) {
  return <AnimatedPressable onPress={onPress} style={[styles.inviteButton, { backgroundColor: `${color}18`, borderColor: `${color}45` }]}><Ionicons name={icon} size={20} color={color} /><Text style={[styles.inviteButtonText, { color }]}>{label}</Text></AnimatedPressable>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 17 },
  switch: { minHeight: 56, borderWidth: 1, borderRadius: 19, padding: 5, flexDirection: 'row', gap: 5 },
  switchButton: { flex: 1, minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  switchText: { fontSize: 10.5, fontWeight: '900' },
  adminHero: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: { width: 55, height: 55, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 17, fontWeight: '900' },
  heroText: { fontSize: 11, marginTop: 4 },
  copy: { flex: 1, minWidth: 0 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionTitle: { fontSize: 19, fontWeight: '900', marginTop: 4 },
  smallAction: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6 },
  smallActionText: { fontSize: 11, fontWeight: '900' },
  formCard: { gap: 13 },
  list: { gap: 10 },
  applicationEmpty: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  applicationCard: { gap: 12, padding: 14 },
  applicationTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  applicationStatus: { fontSize: 9.5, fontWeight: '900' },
  applicationActions: { flexDirection: 'row', gap: 8 },
  reviewButton: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  reviewText: { fontSize: 11, fontWeight: '900' },
  businessCard: { gap: 10, padding: 14 },
  businessMain: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  businessIcon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  stateButton: { minHeight: 40, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stateButtonText: { fontSize: 11, fontWeight: '900' },
  inviteCard: { gap: 13 },
  inviteTitle: { fontSize: 17, fontWeight: '900' },
  inviteText: { fontSize: 11, lineHeight: 17 },
  inviteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inviteButton: { width: '48.5%', minHeight: 50, borderWidth: 1, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  inviteButtonText: { fontSize: 11, fontWeight: '900' },
  codeBox: { minHeight: 72, borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  code: { fontSize: 23, fontWeight: '900', letterSpacing: 3, marginTop: 4 },
  personCard: { padding: 14, gap: 11 },
  memberCard: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '900' },
  memberName: { fontSize: 14, fontWeight: '900' },
  itemMeta: { fontSize: 10, marginTop: 3 },
  amount: { fontSize: 14, fontWeight: '900', textAlign: 'right' },
  staffActions: { flexDirection: 'row', gap: 8 },
  staffButton: { flex: 1, minHeight: 40, borderWidth: 1, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  staffButtonText: { fontSize: 10, fontWeight: '900' },
});
