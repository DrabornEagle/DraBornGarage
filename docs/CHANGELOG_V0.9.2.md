# DraBornGarage v0.9.2 — Expo Go Bildirim Uyumluluk Düzeltmesi

**Tarih:** 14 Temmuz 2026

## Düzeltilen hata

Expo Go Android üzerinde uygulama açılırken aşağıdaki hata oluşuyordu:

```text
Notifications.getLastNotificationResponseAsync is not a function (it is undefined)
```

Expo Go içinde yüklü native `expo-notifications` modülü bazı sürümlerde asenkron son bildirim metodunu sunmadığı için `NotificationProvider` ilk render sonrasında çöküyordu.

## Çözüm

- Uygulama kök bileşeni yüklenmeden önce Expo bildirim uyumluluk katmanı çalıştırılır.
- `getLastNotificationResponseAsync` varsa olduğu gibi kullanılır.
- Metot yoksa Expo'nun senkron `getLastNotificationResponse()` metodu güvenli asenkron sarmalayıcı olarak kullanılır.
- Her iki metot da yoksa son bildirim sorgusu `null` döndürür; canlı bildirim dokunma dinleyicisi çalışmaya devam eder.
- Expo Go açılışı artık eksik native metot nedeniyle çökmez.
- Native APK/AAB push ve bildirim yönlendirme altyapısı korunur.

## Sürüm

- Uygulama: `0.9.2`
- Android `versionCode`: `11`
- iOS `buildNumber`: `11`
- Önceki sürüm yedeği: `backup/v0.9.1-before-v0.9.2-20260714`

Bu hotfix Supabase migration veya veri değişikliği içermez.
