from __future__ import annotations

import json
from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_required(path: str, before: str, after: str, count: int = 1) -> None:
    source = read(path)
    if before not in source:
        raise RuntimeError(f"{path}: target not found\n{before[:500]}")
    write(path, source.replace(before, after, count))


write(
    "src/notifications/NotificationBell.tsx",
    """import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from './NotificationContext';

export function NotificationBell() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { unreadCount, upcomingCount, openCenter, loading } = useNotifications();
  const badge = unreadCount > 99 ? '99+' : String(unreadCount);
  const emphasis = useRef(new Animated.Value(0)).current;
  const [acknowledgedUnreadCount, setAcknowledgedUnreadCount] = useState(0);
  const needsAttention = unreadCount > 0 && unreadCount > acknowledgedUnreadCount;

  useEffect(() => {
    if (unreadCount === 0) setAcknowledgedUnreadCount(0);
  }, [unreadCount]);

  useEffect(() => {
    emphasis.stopAnimation();
    emphasis.setValue(0);
    if (!needsAttention) return;

    const loop = Animated.loop(Animated.sequence([
      Animated.timing(emphasis, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(emphasis, { toValue: -1, duration: 90, useNativeDriver: true }),
      Animated.timing(emphasis, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(emphasis, { toValue: -1, duration: 90, useNativeDriver: true }),
      Animated.timing(emphasis, { toValue: 0, duration: 110, useNativeDriver: true }),
      Animated.delay(180),
    ]));
    loop.start();
    return () => loop.stop();
  }, [needsAttention, emphasis]);

  const handlePress = () => {
    setAcknowledgedUnreadCount(unreadCount);
    emphasis.stopAnimation();
    emphasis.setValue(0);
    openCenter();
  };

  const rotate = emphasis.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-11deg', '0deg', '11deg'] });
  const scale = emphasis.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.08, 1, 1.08] });
  const haloOpacity = emphasis.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.72, 0.28, 0.72] });

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: Math.max(insets.top + 8, 18) }]}>
      {needsAttention && <Animated.View pointerEvents="none" style={[styles.halo, { borderColor: colors.orange, opacity: haloOpacity, transform: [{ scale }] }]} />}
      <Animated.View style={{ transform: [{ rotate }, { scale }] }}>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={`${unreadCount} okunmamış bildirim`}
          onPress={handlePress}
          style={[styles.button, { backgroundColor: colors.cardStrong, borderColor: unreadCount > 0 ? `${colors.orange}8A` : colors.border, shadowColor: colors.primary }]}
        >
          {unreadCount > 0 ? (
            <LinearGradient colors={[colors.orange, colors.red]} style={styles.iconShell}>
              <Ionicons name="notifications" size={20} color="#fff" />
            </LinearGradient>
          ) : (
            <View style={[styles.iconShell, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name={loading ? 'sync' : 'notifications-outline'} size={20} color={colors.primary} />
            </View>
          )}
          {unreadCount > 0 && <Animated.View style={[styles.badge, { backgroundColor: colors.red, borderColor: colors.cardStrong, transform: [{ scale }] }]}><Text style={styles.badgeText}>{badge}</Text></Animated.View>}
          {unreadCount === 0 && upcomingCount > 0 && <View style={[styles.futureDot, { backgroundColor: colors.cyan, borderColor: colors.cardStrong }]} />}
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 16, zIndex: 90, elevation: 22 },
  halo: { position: 'absolute', left: -7, right: -7, top: -7, bottom: -7, borderRadius: 25, borderWidth: 2 },
  button: { width: 49, height: 49, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 12 },
  iconShell: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -5, right: -6, minWidth: 22, height: 22, paddingHorizontal: 5, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  futureDot: { position: 'absolute', top: 2, right: 2, width: 11, height: 11, borderRadius: 6, borderWidth: 2 },
});
""",
)

replace_required(
    "src/AppShell.tsx",
    "{tab !== 'customers' && tab !== 'receivables' && <NotificationBell />}",
    "{!['orders', 'appointments', 'customers', 'receivables'].includes(tab) && <NotificationBell />}",
)

replace_required(
    "src/customer/CustomerShell.tsx",
    "    <NotificationBell />",
    "    {!['appointments', 'services'].includes(tab) && <NotificationBell />}",
)

replace_required(
    "src/components/PlatformFeesDashboard.tsx",
    "  listTitle: { fontSize: 18, fontWeight: '900', marginTop: 3 }, reportCard: { gap: 10 }, reportIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, rowTitle: { fontSize: 13.5, fontWeight: '900' }, rowMeta: { fontSize: 11, lineHeight: 14, marginTop: 3 }, rowAmount: { fontSize: 13, fontWeight: '900' }, note: { fontSize: 12, lineHeight: 16 }, allocationWrap: { gap: 6 }, allocation: { minHeight: 42, borderRadius: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, allocationText: { fontSize: 10 }, allocationAmount: { fontSize: 12, fontWeight: '900' }, receiptOpen: { minHeight: 43, borderRadius: 13, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, receiptOpenText: { fontSize: 12, fontWeight: '900' }, adminNote: { minHeight: 44, borderRadius: 13, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 7 }, adminNoteText: { flex: 1, fontSize: 11, lineHeight: 14 }, reviewBox: { gap: 9 }, actionRow: { flexDirection: 'row', gap: 8 }, actionButton: { flex: 1, minHeight: 46, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, actionText: { fontSize: 12.5, fontWeight: '900' }, cancelButton: { minHeight: 42, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, cancelText: { fontSize: 12, fontWeight: '900' },",
    "  listTitle: { fontSize: 19, fontWeight: '900', marginTop: 3 }, reportCard: { gap: 11 }, reportIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, rowTitle: { fontSize: 15, fontWeight: '900' }, rowMeta: { fontSize: 12.5, lineHeight: 17, marginTop: 4 }, rowAmount: { fontSize: 14.5, fontWeight: '900' }, note: { fontSize: 13.5, lineHeight: 19 }, allocationWrap: { gap: 7 }, allocation: { minHeight: 46, borderRadius: 13, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, allocationText: { fontSize: 11.5 }, allocationAmount: { fontSize: 13.5, fontWeight: '900' }, receiptOpen: { minHeight: 46, borderRadius: 13, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, receiptOpenText: { fontSize: 13, fontWeight: '900' }, adminNote: { minHeight: 48, borderRadius: 13, borderWidth: 1, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8 }, adminNoteText: { flex: 1, fontSize: 12.5, lineHeight: 17 }, reviewBox: { gap: 10 }, actionRow: { flexDirection: 'row', gap: 8 }, actionButton: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, actionText: { fontSize: 13, fontWeight: '900' }, cancelButton: { minHeight: 45, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, cancelText: { fontSize: 13, fontWeight: '900' },",
)

replace_required(
    "src/components/PlatformFeesDashboard.tsx",
    "  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' }, detailModal: { maxHeight: '91%', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, paddingTop: 14, overflow: 'hidden' }, detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 12 }, detailHeaderIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, detailTitle: { fontSize: 18, fontWeight: '900' }, detailScroll: { paddingHorizontal: 15, paddingBottom: 36, gap: 11 }, detailHero: { minHeight: 125, borderRadius: 23, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, detailHeroValue: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 7 }, detailCard: { gap: 9 }, detailSectionTitle: { fontSize: 16, fontWeight: '900' }, detailLine: { minHeight: 54, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 9 }, detailValue: { fontSize: 13, fontWeight: '800', marginTop: 3 }, detailItem: { minHeight: 58, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },",
    "  detailOverlay: { flex: 1, backgroundColor: 'rgba(5,9,20,0.28)', justifyContent: 'flex-end' }, detailModal: { maxHeight: '97%', borderTopLeftRadius: 27, borderTopRightRadius: 27, borderWidth: 1, paddingTop: 8, overflow: 'hidden' }, detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 5, paddingBottom: 14 }, detailHeaderIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, detailTitle: { fontSize: 21, fontWeight: '900' }, detailScroll: { paddingHorizontal: 17, paddingBottom: 44, gap: 14 }, detailHero: { minHeight: 142, borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, detailHeroValue: { color: '#fff', fontSize: 35, fontWeight: '900', marginTop: 8 }, detailCard: { gap: 11 }, detailSectionTitle: { fontSize: 18.5, fontWeight: '900' }, detailLine: { minHeight: 66, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11 }, detailValue: { fontSize: 15.5, lineHeight: 20, fontWeight: '850', marginTop: 4 }, detailItem: { minHeight: 68, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },",
)

replace_required(
    "src/components/PlatformFeesDashboard.tsx",
    "  periodCard: { gap: 10 }, periodIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, periodMetrics: { flexDirection: 'row', gap: 6 }, mini: { flex: 1, minWidth: 0, minHeight: 57, borderRadius: 13, padding: 8, justifyContent: 'center' }, miniValue: { fontSize: 12, fontWeight: '900' }, miniLabel: { fontSize: 9.5, fontWeight: '800', marginTop: 4 }, chargeCard: { gap: 8, borderWidth: 1, borderRadius: 18, padding: 13 }, chargeIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },",
    "  periodCard: { gap: 11 }, periodIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, periodMetrics: { flexDirection: 'row', gap: 7 }, mini: { flex: 1, minWidth: 0, minHeight: 66, borderRadius: 14, padding: 9, justifyContent: 'center' }, miniValue: { fontSize: 14.5, fontWeight: '900' }, miniLabel: { fontSize: 11.5, lineHeight: 14, fontWeight: '800', marginTop: 5 }, chargeCard: { gap: 9, borderWidth: 1, borderRadius: 18, padding: 14 }, chargeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },",
)

for file_name in ("package.json", "package-lock.json"):
    data = json.loads(read(file_name))
    data["version"] = "0.8.12"
    if file_name == "package-lock.json" and data.get("packages", {}).get(""):
        data["packages"][""]["version"] = "0.8.12"
    write(file_name, json.dumps(data, ensure_ascii=False, indent=2) + "\n")

app_data = json.loads(read("app.json"))
app_data["expo"]["version"] = "0.8.12"
write("app.json", json.dumps(app_data, ensure_ascii=False, indent=2) + "\n")

for path in ("src/screens/AuthScreen.tsx", "README.md", "docs/ROADMAP.md"):
    source = read(path).replace("v0.8.11", "v0.8.12").replace("0.8.11", "0.8.12")
    write(path, source)

write("docs/CHANGELOG_V0.8.12.md", """# DraBornGarage v0.8.12

Tarih: 13 Temmuz 2026

## Bildirim odağı
- Okunmamış yeni bildirim geldiğinde zil animasyonu kullanıcı zile dokunana kadar kısa aralıklarla devam eder.
- Zile dokunulduğunda mevcut bildirim grubu için vurgu durur; yeni bildirim gelirse yeniden başlar.
- Personel tarafında İş Emirleri ve Randevular ekranlarında bildirim zili gösterilmez.
- Müşteri tarafında Randevularım ve İş Emirleri/Servisler ekranlarında bildirim zili gösterilmez.

## İşlem başı ücret detayı
- Üstteki yoğun siyah perde azaltıldı.
- Detay penceresi ekranın daha üstüne taşındı ve kullanılabilir alan artırıldı.
- Başlıklar, satır metinleri, tutarlar, tarih ve açıklamalar büyütüldü.

## Yönetici hesabı
- `draborneagle@gmail.com` e-postasıyla oluşturulan hesap veritabanı trigger katmanında otomatik Admin ve personel görünümüne geçirilir.
""")

write("docs/PROJECT_HANDOFF_V0.8.12.md", """# DraBornGarage — v0.8.12 Devam Dosyası

**Güncel sürüm:** `v0.8.12`  
**Önceki sabit yedek:** `backup/v0.8.11-before-v0.8.12-20260713`  
**Sonraki sürüm:** `v0.9.0`

## Tamamlananlar
- Bildirim zili yeni bildirimlerde kullanıcı dokunana kadar tekrar eden kısa animasyon yapar.
- Randevu ve İş Emri ekranlarından bildirim zili kaldırıldı.
- İşlem Başı Ücret Detayı penceresi yukarı taşındı, siyah perde azaltıldı ve metinler büyütüldü.
- Birincil Admin e-postası için trigger koruması güçlendirildi.

## Veri temizliği notu
- Uygulama kodu ve Admin otomasyonu hazırdır.
- Kullanıcı/auth ve işlem verilerinin toplu silinmesi ayrı bir canlı veritabanı işlemi olarak yürütülmelidir.
""")

write("docs/TERMUX_INSTALL.md", """# Termux — v0.8.11 Yedekle, v0.8.12 Kur

```bash
cd ~
KURULAN_SURUM="v0.8.12"
YEDEK_KLASORU="$HOME/DraBornGarage-v0.8.11-local-backup"
ZIP_DOSYASI="$HOME/DraBornGarage-v0.8.12.zip"
ACILAN_KLASOR="$HOME/DraBornGarage-main"

pkg update -y
pkg install nodejs-lts curl unzip -y
rm -rf "$ACILAN_KLASOR"
rm -f "$ZIP_DOSYASI"

if [ -d "$HOME/DraBornGarage" ]; then
  rm -rf "$YEDEK_KLASORU"
  mv "$HOME/DraBornGarage" "$YEDEK_KLASORU"
fi

curl -L --retry 10 --retry-delay 3 --connect-timeout 30 --max-time 600 \
  "https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/main.zip" \
  -o "$ZIP_DOSYASI"

unzip -o "$ZIP_DOSYASI" -d "$HOME"
mv "$ACILAN_KLASOR" "$HOME/DraBornGarage"
rm -f "$ZIP_DOSYASI"

if [ -f "$YEDEK_KLASORU/.env" ]; then
  cp "$YEDEK_KLASORU/.env" "$HOME/DraBornGarage/.env"
else
  cp "$HOME/DraBornGarage/.env.example" "$HOME/DraBornGarage/.env"
fi

cd "$HOME/DraBornGarage"
npm install --no-audit --no-fund
npm run typecheck
node -p "require('./package.json').version"
npx expo start -c --go
```

Beklenen sürüm: `0.8.12`.
""")

print("v0.8.12 changes prepared")
