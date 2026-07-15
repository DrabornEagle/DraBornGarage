import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { GlassCard } from '../components/GlassCard';
import { PremiumBackground } from '../components/PremiumBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { useTheme } from '../context/ThemeContext';
import {
  markNotificationIntroCompleted,
  openNotificationSettings,
  requestDeviceNotificationPermission,
} from '../notifications/notificationPermissions';

export function NotificationPermissionScreen({ onComplete }: { onComplete: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [requesting, setRequesting] = useState(false);
  const [denied, setDenied] = useState(false);

  const enable = async () => {
    setRequesting(true);
    try {
      const result = await requestDeviceNotificationPermission();
      await markNotificationIntroCompleted();
      if (result.status === 'granted') onComplete();
      else setDenied(true);
    } finally {
      setRequesting(false);
    }
  };

  const skip = async () => {
    await markNotificationIntroCompleted();
    onComplete();
  };

  if (denied) {
    return <PremiumBackground>
      <View style={[styles.page, { paddingTop: Math.max(insets.top, 28), paddingBottom: Math.max(insets.bottom, 24) }]}>
        <GlassCard style={styles.deniedCard}>
          <View style={[styles.mainIcon, { backgroundColor: `${colors.orange}18`, borderColor: `${colors.orange}45` }]}>
            <Ionicons name="notifications-off" size={42} color={colors.orange} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Bildirim izni kapalı</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Telefon ayarlarından DraBornGarage bildirimlerini açtığında servis, randevu, ödeme ve teslim bilgileri bildirim alanında gösterilir.</Text>
          <PrimaryButton title="Telefon Ayarlarını Aç" onPress={openNotificationSettings} />
          <AnimatedPressable onPress={skip} style={[styles.secondaryButton, { borderColor: colors.border }]}>
            <Text style={[styles.secondaryText, { color: colors.textMuted }]}>Şimdilik Devam Et</Text>
          </AnimatedPressable>
        </GlassCard>
      </View>
    </PremiumBackground>;
  }

  return <PremiumBackground>
    <View style={[styles.page, { paddingTop: Math.max(insets.top, 28), paddingBottom: Math.max(insets.bottom, 24) }]}>
      <View style={styles.hero}>
        <View style={[styles.mainIcon, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}48` }]}>
          <Ionicons name="notifications" size={44} color={colors.primary} />
        </View>
        <Text style={[styles.eyebrow, { color: colors.green }]}>DraBornGarage • v1.0.6</Text>
        <Text style={[styles.title, { color: colors.text }]}>Önemli gelişmeleri kaçırma</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Bildirim izni yalnız servis ve hesap hareketlerini zamanında göstermek için kullanılır. Reklam bildirimi gönderilmez.</Text>
      </View>

      <GlassCard style={styles.features}>
        <Feature icon="construct" title="Servis hareketleri" text="İşe başlandı, fiyat güncellendi, motor hazır ve teslim edildi bilgileri." />
        <Feature icon="calendar" title="Randevu hatırlatmaları" text="Randevu yaklaşınca ve saat değiştiğinde telefonuna haber verir." />
        <Feature icon="volume-high" title="Telefonun bildirim sesi" text="Ses yüksekliği telefonunun Bildirim Sesi ayarını takip eder." />
        <Feature icon="shield-checkmark" title="Gizli ve güvenli" text="Yalnız kendi hesabına ait bildirimler gösterilir." last />
      </GlassCard>

      <View style={styles.actions}>
        <PrimaryButton title="Bildirimleri Aç" onPress={enable} loading={requesting} />
        <AnimatedPressable onPress={skip} disabled={requesting} style={[styles.secondaryButton, { borderColor: colors.border }]}>
          <Text style={[styles.secondaryText, { color: colors.textMuted }]}>Şimdilik Değil</Text>
        </AnimatedPressable>
      </View>
    </View>
  </PremiumBackground>;
}

function Feature({ icon, title, text, last }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; last?: boolean }) {
  const { colors } = useTheme();
  return <View style={[styles.feature, !last && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
    <View style={[styles.featureIcon, { backgroundColor: `${colors.cyan}14` }]}><Ionicons name={icon} size={23} color={colors.cyan} /></View>
    <View style={styles.copy}><Text style={[styles.featureTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.featureText, { color: colors.textMuted }]}>{text}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 20, justifyContent: 'center', gap: 20 },
  hero: { alignItems: 'center', gap: 9 },
  mainIcon: { width: 88, height: 88, borderRadius: 30, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 12, fontWeight: '900', letterSpacing: 1.1, marginTop: 5 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '900', letterSpacing: -0.8, textAlign: 'center' },
  subtitle: { maxWidth: 370, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  features: { paddingVertical: 2 },
  feature: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  featureIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  featureTitle: { fontSize: 14.5, fontWeight: '900' },
  featureText: { fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  actions: { gap: 10 },
  secondaryButton: { minHeight: 52, borderWidth: 1, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 13, fontWeight: '900' },
  deniedCard: { alignItems: 'center', gap: 14, paddingVertical: 24 },
});
