import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { money, shortDate } from '../lib/format';
import { supabase } from '../lib/supabase';

export function TeamScreen() {
  const { colors } = useTheme();
  const { workshop, membership, createInviteCode } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [latestCode, setLatestCode] = useState<{ code: string; role: 'owner' | 'mechanic' } | null>(null);
  const [loading, setLoading] = useState(false);
  const isOwner = membership?.role === 'owner';

  const load = useCallback(async () => {
    if (!workshop || !membership) return;
    if (isOwner) {
      const [memberResult, serviceResult] = await Promise.all([
        supabase.from('workshop_members').select('user_id,role,is_active,joined_at,profile:profiles(full_name,phone)').eq('workshop_id', workshop.id).eq('is_active', true).order('joined_at'),
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

  const generate = async (role: 'owner' | 'mechanic') => {
    setLoading(true);
    const result = await createInviteCode(role);
    setLoading(false);
    if (result.error || !result.code) return Alert.alert('Kod üretilemedi', result.error);
    setLatestCode({ code: result.code, role });
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
      <ScreenHeader eyebrow="İŞLETME YÖNETİMİ" title="Ekip ve Yetkiler" subtitle="Birden fazla işletme sahibi ve her usta için ayrı kişisel panel." />

      <GlassCard style={styles.inviteCard}>
        <View style={styles.inviteHeader}><View style={[styles.bigIcon, { backgroundColor: `${colors.primary}1C` }]}><Ionicons name="person-add" size={26} color={colors.primary} /></View><View style={styles.copy}><Text style={[styles.inviteTitle, { color: colors.text }]}>Yeni ekip daveti</Text><Text style={[styles.inviteText, { color: colors.textMuted }]}>Kod 30 gün geçerlidir ve tek hesap tarafından kullanılabilir.</Text></View></View>
        <View style={styles.buttonRow}><View style={styles.buttonFlex}><PrimaryButton title="Usta Kodu" onPress={() => generate('mechanic')} loading={loading} /></View><View style={styles.buttonFlex}><PrimaryButton title="Ortak Sahibi Kodu" onPress={() => generate('owner')} loading={loading} secondary /></View></View>
        {latestCode && (
          <AnimatedPressable onPress={() => Share.share({ message: `${workshop?.name} DraBornGarage ${latestCode.role === 'owner' ? 'ortak işletme sahibi' : 'usta'} davet kodu: ${latestCode.code}` })} style={[styles.codeBox, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}> 
            <View><Text style={[styles.codeLabel, { color: colors.textMuted }]}>{latestCode.role === 'owner' ? 'ORTAK SAHİBİ KODU' : 'USTA KODU'}</Text><Text style={[styles.code, { color: colors.text }]}>{latestCode.code}</Text></View><Ionicons name="share-social" size={22} color={colors.primary} />
          </AnimatedPressable>
        )}
      </GlassCard>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Aktif ekip</Text>
      <View style={styles.list}>
        {members.map((member) => {
          const memberServices = services.filter((service) => service.mechanic_id === member.user_id);
          const total = memberServices.reduce((sum, item) => sum + Number(item.price), 0);
          return (
            <GlassCard key={member.user_id} style={styles.memberCard}>
              <View style={[styles.avatar, { backgroundColor: member.role === 'owner' ? `${colors.orange}20` : `${colors.primary}20` }]}><Text style={[styles.avatarText, { color: member.role === 'owner' ? colors.orange : colors.primary }]}>{member.profile?.full_name?.charAt(0) || 'U'}</Text></View>
              <View style={styles.copy}><Text style={[styles.memberName, { color: colors.text }]}>{member.profile?.full_name || 'Ekip üyesi'}</Text><Text style={[styles.itemMeta, { color: colors.textMuted }]}>{member.role === 'owner' ? 'İşletme sahibi' : 'Usta'} • {memberServices.length} işlem</Text></View>
              <View style={styles.memberRight}><Text style={[styles.amount, { color: colors.green }]}>{money(total)}</Text><Text style={[styles.recorded, { color: colors.textMuted }]}>kayıtlı toplam</Text></View>
            </GlassCard>
          );
        })}
      </View>
      <GlassCard><Text style={[styles.disclaimer, { color: colors.textMuted }]}>Usta bazlı rakamlar yalnızca servis kayıtlarına girilen tutarların toplamıdır. Sistem maaş, komisyon, gider, kâr veya ortaklık payı bölüştürmez.</Text></GlassCard>
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
  sectionTitle: { fontSize: 19, fontWeight: '900', marginTop: 4 },
  list: { gap: 10 },
  serviceCard: { padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  serviceIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '900' },
  itemMeta: { fontSize: 11, marginTop: 3 },
  amount: { fontSize: 15, fontWeight: '900' },
  empty: { textAlign: 'center', paddingVertical: 10 },
  inviteCard: { gap: 14 },
  inviteHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inviteTitle: { fontSize: 17, fontWeight: '900' },
  inviteText: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  buttonRow: { flexDirection: 'row', gap: 9 },
  buttonFlex: { flex: 1 },
  codeBox: { minHeight: 72, borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  code: { fontSize: 23, fontWeight: '900', letterSpacing: 3, marginTop: 4 },
  memberCard: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '900' },
  memberName: { fontSize: 14, fontWeight: '900' },
  memberRight: { alignItems: 'flex-end' },
  recorded: { fontSize: 9, marginTop: 3 },
});
