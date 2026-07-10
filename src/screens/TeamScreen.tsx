import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { money, shortDate } from '../lib/format';
import { supabase } from '../lib/supabase';
import { MemberRole } from '../types';

const roleLabels: Record<MemberRole, string> = {
  owner: 'İşletme Sahibi',
  owner_mechanic: 'İşletme Sahibi + Usta',
  mechanic: 'Usta',
  apprentice: 'Çırak',
};

export function TeamScreen() {
  const { colors } = useTheme();
  const { workshop, workshops, membership, isAdmin, createInviteCode, selectWorkshop, createWorkshop, refreshWorkspace } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [latestCode, setLatestCode] = useState<{ code: string; role: MemberRole } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [editName, setEditName] = useState(workshop?.name ?? '');
  const [editPhone, setEditPhone] = useState(workshop?.phone ?? '');
  const [editAddress, setEditAddress] = useState(workshop?.address ?? '');
  const isOwner = isAdmin || membership?.role === 'owner' || membership?.role === 'owner_mechanic';

  useEffect(() => {
    setEditName(workshop?.name ?? '');
    setEditPhone(workshop?.phone ?? '');
    setEditAddress(workshop?.address ?? '');
  }, [workshop?.id, workshop?.name, workshop?.phone, workshop?.address]);

  const load = useCallback(async () => {
    if (!workshop || !membership) return;
    if (isOwner) {
      const [memberResult, serviceResult] = await Promise.all([
        supabase.from('workshop_members').select('user_id,role,is_active,joined_at,availability_status,staff_note,profile:profiles(full_name,phone)').eq('workshop_id', workshop.id).order('joined_at'),
        supabase.from('work_order_services').select('mechanic_id,price,completed').eq('workshop_id', workshop.id).eq('completed', true),
      ]);
      setMembers(memberResult.data ?? []);
      setServices(serviceResult.data ?? []);
    } else {
      const { data } = await supabase.from('work_order_services').select('id,title,price,completed,created_at,work_order:work_orders(customer:customers(full_name),motorcycle:motorcycles(brand,model,plate))').eq('mechanic_id', membership.user_id).eq('completed', true).order('created_at', { ascending: false });
      setServices(data ?? []);
    }
  }, [workshop, membership, isOwner]);

  useEffect(() => { load(); }, [load]);

  const generate = async (role: MemberRole) => {
    setLoading(true);
    const result = await createInviteCode(role);
    setLoading(false);
    if (result.error || !result.code) return Alert.alert('Kod üretilemedi', result.error);
    setLatestCode({ code: result.code, role });
  };

  const createBusiness = async () => {
    if (!businessName.trim()) return Alert.alert('İşletme adı gerekli');
    setLoading(true);
    const error = await createWorkshop(businessName, businessPhone, businessAddress);
    setLoading(false);
    if (error) return Alert.alert('İşletme oluşturulamadı', error);
    setBusinessName(''); setBusinessPhone(''); setBusinessAddress(''); setShowBusinessForm(false);
  };

  const saveBusiness = async () => {
    if (!workshop || !editName.trim()) return;
    setLoading(true);
    const { error } = await supabase.rpc('update_workshop_details', {
      p_workshop_id: workshop.id,
      p_name: editName.trim(),
      p_phone: editPhone.trim() || null,
      p_address: editAddress.trim() || null,
    });
    setLoading(false);
    if (error) return Alert.alert('İşletme güncellenemedi', error.message);
    await refreshWorkspace(workshop.id);
    Alert.alert('İşletme güncellendi');
  };

  const toggleBusiness = async (id: string, active: boolean) => {
    const { error } = await supabase.rpc('admin_set_workshop_active', { p_workshop_id: id, p_is_active: active });
    if (error) return Alert.alert('İşletme durumu değiştirilemedi', error.message);
    await refreshWorkspace(workshop?.id ?? null);
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

  if (!isOwner) {
    const total = services.reduce((sum, item) => sum + Number(item.price), 0);
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader eyebrow="KİŞİSEL USTA PANELİ" title="Kazanç Geçmişim" subtitle="Yalnızca senin yaptığın ve tutarı kaydedilen servis işlemleri." />
        <GlassCard style={styles.heroCard}>
          <View style={[styles.bigIcon, { backgroundColor: `${colors.green}1C` }]}><Ionicons name="wallet" size={27} color={colors.green} /></View>
          <Text style={[styles.totalLabel, { color: colors.textMuted }]}>KAYDEDİLEN TOPLAM İŞ TUTARI</Text>
          <Text style={[styles.totalValue, { color: colors.text }]}>{money(total)}</Text>
          <Text style={[styles.disclaimer, { color: colors.textMuted }]}>Bu değer maaş, komisyon, ortaklık payı veya net kâr hesabı değildir.</Text>
        </GlassCard>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>İşlem geçmişi</Text>
        <View style={styles.list}>
          {services.length === 0 ? <GlassCard><Text style={[styles.empty, { color: colors.textMuted }]}>Henüz tamamlanmış işlem kaydın yok.</Text></GlassCard> : services.map((item) => (
            <GlassCard key={item.id} style={styles.serviceCard}>
              <View style={styles.row}><View style={[styles.serviceIcon, { backgroundColor: `${colors.primary}18` }]}><Ionicons name="construct" size={20} color={colors.primary} /></View><View style={styles.copy}><Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text><Text style={[styles.itemMeta, { color: colors.textMuted }]}>{item.work_order?.motorcycle?.brand} {item.work_order?.motorcycle?.model} • {item.work_order?.customer?.full_name}</Text><Text style={[styles.itemMeta, { color: colors.textMuted }]}>{shortDate(item.created_at)}</Text></View><Text style={[styles.amount, { color: colors.green }]}>{money(item.price)}</Text></View>
            </GlassCard>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader eyebrow={isAdmin ? 'ADMIN' : 'İŞLETME YÖNETİMİ'} title={isAdmin ? 'Platform ve İşletmeler' : 'Ekip ve Yetkiler'} subtitle={isAdmin ? 'Tüm işletmeleri ayrı ayrı seç, düzenle, aktif/pasif yap ve personeli yönet.' : 'Kendi işletmendeki Usta ve Çırak hesaplarını yönet.'} />

      {isAdmin && (
        <>
          <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.text }]}>İşletmeler</Text><AnimatedPressable onPress={() => setShowBusinessForm((value) => !value)} style={[styles.smallAction, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}45` }]}><Ionicons name={showBusinessForm ? 'close' : 'add'} size={18} color={colors.primary} /><Text style={[styles.smallActionText, { color: colors.primary }]}>{showBusinessForm ? 'Kapat' : 'İşletme Ekle'}</Text></AnimatedPressable></View>
          {showBusinessForm && <GlassCard style={styles.formCard}><FormField label="İşletme adı" value={businessName} onChangeText={setBusinessName} placeholder="Lara Moto Garage" /><FormField label="Telefon" value={businessPhone} onChangeText={setBusinessPhone} keyboardType="phone-pad" /><FormField label="Adres" value={businessAddress} onChangeText={setBusinessAddress} multiline /><PrimaryButton title="İşletmeyi Oluştur" onPress={createBusiness} loading={loading} /></GlassCard>}
          <View style={styles.list}>{workshops.map((item) => <GlassCard key={item.id} style={[styles.businessCard, workshop?.id === item.id && { borderColor: colors.primary }]}><AnimatedPressable onPress={() => selectWorkshop(item.id)} style={styles.businessMain}><View style={[styles.businessIcon, { backgroundColor: item.is_active === false ? `${colors.red}16` : `${colors.primary}18` }]}><Ionicons name="business" size={23} color={item.is_active === false ? colors.red : colors.primary} /></View><View style={styles.copy}><Text style={[styles.memberName, { color: colors.text }]}>{item.name}</Text><Text style={[styles.itemMeta, { color: colors.textMuted }]}>{item.address || 'Adres eklenmedi'} • {item.is_active === false ? 'Pasif' : 'Aktif'}</Text></View>{workshop?.id === item.id && <Ionicons name="checkmark-circle" size={23} color={colors.green} />}</AnimatedPressable><AnimatedPressable onPress={() => toggleBusiness(item.id, item.is_active === false)} style={[styles.stateButton, { backgroundColor: item.is_active === false ? `${colors.green}12` : `${colors.red}10`, borderColor: item.is_active === false ? `${colors.green}35` : `${colors.red}35` }]}><Text style={[styles.stateButtonText, { color: item.is_active === false ? colors.green : colors.red }]}>{item.is_active === false ? 'Aktif Yap' : 'Pasif Yap'}</Text></AnimatedPressable></GlassCard>)}</View>
        </>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Seçili İşletme</Text>
      <GlassCard style={styles.formCard}>
        <FormField label="İşletme adı" value={editName} onChangeText={setEditName} />
        <FormField label="Telefon" value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
        <FormField label="Adres" value={editAddress} onChangeText={setEditAddress} multiline />
        <PrimaryButton title="İşletme Bilgilerini Güncelle" onPress={saveBusiness} loading={loading} secondary />
      </GlassCard>

      <GlassCard style={styles.inviteCard}>
        <View style={styles.inviteHeader}><View style={[styles.bigIcon, { backgroundColor: `${colors.primary}1C` }]}><Ionicons name="person-add" size={26} color={colors.primary} /></View><View style={styles.copy}><Text style={[styles.inviteTitle, { color: colors.text }]}>Personel daveti</Text><Text style={[styles.inviteText, { color: colors.textMuted }]}>Kod 30 gün geçerli ve tek kullanımlıdır. İşletme sahibi rolleri yalnız Admin tarafından oluşturulur.</Text></View></View>
        <View style={styles.inviteGrid}>
          <AnimatedPressable onPress={() => generate('mechanic')} style={[styles.inviteButton, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}45` }]}><Ionicons name="construct" size={20} color={colors.primary} /><Text style={[styles.inviteButtonText, { color: colors.primary }]}>Usta Kodu</Text></AnimatedPressable>
          <AnimatedPressable onPress={() => generate('apprentice')} style={[styles.inviteButton, { backgroundColor: `${colors.orange}18`, borderColor: `${colors.orange}45` }]}><Ionicons name="school" size={20} color={colors.orange} /><Text style={[styles.inviteButtonText, { color: colors.orange }]}>Çırak Kodu</Text></AnimatedPressable>
          {isAdmin && <AnimatedPressable onPress={() => generate('owner_mechanic')} style={[styles.inviteButton, { backgroundColor: `${colors.green}18`, borderColor: `${colors.green}45` }]}><Ionicons name="shield-checkmark" size={20} color={colors.green} /><Text style={[styles.inviteButtonText, { color: colors.green }]}>Sahip + Usta</Text></AnimatedPressable>}
          {isAdmin && <AnimatedPressable onPress={() => generate('owner')} style={[styles.inviteButton, { backgroundColor: `${colors.cyan}18`, borderColor: `${colors.cyan}45` }]}><Ionicons name="business" size={20} color={colors.cyan} /><Text style={[styles.inviteButtonText, { color: colors.cyan }]}>Sadece Sahip</Text></AnimatedPressable>}
        </View>
        {latestCode && <AnimatedPressable onPress={() => Share.share({ message: `${workshop?.name} DraBornGarage ${roleLabels[latestCode.role]} davet kodu: ${latestCode.code}` })} style={[styles.codeBox, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}><View><Text style={[styles.codeLabel, { color: colors.textMuted }]}>{roleLabels[latestCode.role].toLocaleUpperCase('tr-TR')} KODU</Text><Text style={[styles.code, { color: colors.text }]}>{latestCode.code}</Text></View><Ionicons name="share-social" size={22} color={colors.primary} /></AnimatedPressable>}
      </GlassCard>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Personel</Text>
      <View style={styles.list}>
        {members.map((member) => {
          const memberServices = services.filter((service) => service.mechanic_id === member.user_id);
          const total = memberServices.reduce((sum, item) => sum + Number(item.price), 0);
          const accent = member.role === 'apprentice' ? colors.orange : member.role === 'owner' || member.role === 'owner_mechanic' ? colors.green : colors.primary;
          return (
            <GlassCard key={member.user_id} style={[styles.personCard, !member.is_active && { opacity: 0.6 }]}>
              <View style={styles.memberCard}>
                <View style={[styles.avatar, { backgroundColor: `${accent}20` }]}><Text style={[styles.avatarText, { color: accent }]}>{member.profile?.full_name?.charAt(0) || 'P'}</Text></View>
                <View style={styles.copy}><Text style={[styles.memberName, { color: colors.text }]}>{member.profile?.full_name || 'Personel'}</Text><Text style={[styles.itemMeta, { color: colors.textMuted }]}>{roleLabels[member.role as MemberRole]} • {member.availability_status === 'busy' ? 'Meşgul' : member.availability_status === 'off' ? 'Kapalı' : 'Müsait'} • {member.is_active ? 'Aktif' : 'Pasif'}</Text></View>
                {member.role !== 'apprentice' && <View style={styles.memberRight}><Text style={[styles.amount, { color: colors.green }]}>{money(total)}</Text><Text style={[styles.recorded, { color: colors.textMuted }]}>{memberServices.length} işlem</Text></View>}
              </View>
              <View style={styles.staffActions}>
                {(member.role === 'mechanic' || member.role === 'apprentice') && <AnimatedPressable onPress={() => changeRole(member, member.role === 'mechanic' ? 'apprentice' : 'mechanic')} style={[styles.staffButton, { borderColor: colors.border }]}><Ionicons name="swap-horizontal" size={17} color={colors.primary} /><Text style={[styles.staffButtonText, { color: colors.text }]}>{member.role === 'mechanic' ? 'Çırak Yap' : 'Usta Yap'}</Text></AnimatedPressable>}
                <AnimatedPressable onPress={() => toggleStaff(member)} style={[styles.staffButton, { borderColor: member.is_active ? `${colors.red}35` : `${colors.green}35` }]}><Ionicons name={member.is_active ? 'pause-circle' : 'play-circle'} size={17} color={member.is_active ? colors.red : colors.green} /><Text style={[styles.staffButtonText, { color: member.is_active ? colors.red : colors.green }]}>{member.is_active ? 'Pasifleştir' : 'Aktifleştir'}</Text></AnimatedPressable>
              </View>
            </GlassCard>
          );
        })}
      </View>
      <GlassCard><Text style={[styles.disclaimer, { color: colors.textMuted }]}>Usta bazlı rakamlar yalnız servis kayıtlarına girilen işlem tutarlarıdır. Sistem maaş, yüzde, prim, ortak payı veya kazanç bölüşümü hesaplamaz. Çırak finansal kayıtları göremez.</Text></GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 17 },
  heroCard: { alignItems: 'center', gap: 10, paddingVertical: 25 },
  bigIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  totalLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  totalValue: { fontSize: 35, fontWeight: '900', letterSpacing: -1.2 },
  disclaimer: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionTitle: { fontSize: 19, fontWeight: '900', marginTop: 4 },
  smallAction: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6 },
  smallActionText: { fontSize: 11, fontWeight: '900' },
  list: { gap: 10 },
  serviceCard: { padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  serviceIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '900' },
  itemMeta: { fontSize: 11, marginTop: 3 },
  amount: { fontSize: 15, fontWeight: '900' },
  empty: { textAlign: 'center', paddingVertical: 10 },
  formCard: { gap: 13 },
  businessCard: { gap: 10, padding: 14 },
  businessMain: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  businessIcon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  stateButton: { minHeight: 40, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stateButtonText: { fontSize: 11, fontWeight: '900' },
  inviteCard: { gap: 14 },
  inviteHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inviteTitle: { fontSize: 17, fontWeight: '900' },
  inviteText: { fontSize: 12, lineHeight: 17, marginTop: 3 },
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
  memberRight: { alignItems: 'flex-end' },
  recorded: { fontSize: 9, marginTop: 3 },
  staffActions: { flexDirection: 'row', gap: 8 },
  staffButton: { flex: 1, minHeight: 40, borderWidth: 1, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  staffButtonText: { fontSize: 10, fontWeight: '900' },
});
