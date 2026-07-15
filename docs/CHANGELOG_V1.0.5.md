# DraBornGarage v1.0.5 RC

- v1.0.4 kaynakları `backup/v1.0.4-before-v1.0.5-20260715` dalına yedeklendi.
- İlk açılış için modern bildirim izin açıklama ekranı eklendi.
- Android bildirimleri yeni `draborngarage-system-loud-v3` kanalına taşındı.
- Ses, özel düşük seviyeli WAV yerine telefonun varsayılan bildirim sesini kullanır.
- Kanal önemi MAX, güçlü titreşim, kilit ekranı görünürlüğü ve rozet etkin.
- Sessiz kanal ayrı `draborngarage-silent-v3` olarak korundu.
- Eski ses tercihleri Supabase üzerinde `system_loud` seçeneğine geçirilir.
- Uygulama sürümü 1.0.5, Android versionCode 23, iOS buildNumber 23.
- Uygulama kapalıyken dinamik push için istemci ve Supabase gönderim hattı hazırdır; Firebase/FCM V1 ve EAS projectId kimlik bilgileri ayrıca bağlanmalıdır.
