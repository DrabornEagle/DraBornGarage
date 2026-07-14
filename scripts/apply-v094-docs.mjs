import fs from 'node:fs';

function replace(path, from, to) {
  const current = fs.readFileSync(path, 'utf8');
  if (!current.includes(from)) throw new Error(`${path}: beklenen metin bulunamadı`);
  fs.writeFileSync(path, current.replace(from, to));
}

replace(
  'README.md',
  `**v0.9.3 — Motor Hazır IBAN ve Görsel Düzeltmeler**\n\nv0.9.3; güncel sürüm etiketlerini eşitler, Gizlilik ve Hesap kalkanını büyütür ve Motor Hazır durumunda müşteriye yalnız görüntüleme amaçlı Usta IBAN bilgisini gösterir. Uygulama ödeme işlemez, para tutmaz veya banka hesabına bağlanmaz.\n\n## v0.9.3 ile tamamlananlar\n\n- Ayarlar ekranındaki sağ üst bildirim zilinin kaldırılması\n- Gizlilik ve Hesap kalkanının yalnız Takvim ile Ayarlar/Hesabım ekranında gösterilmesi\n- Kalkan simgesinin sağ üst köşeye taşınması\n- Takvim, Randevu Ekle ve Çalışma Saatleri için modern açıklamalı kartlar\n- Garage Chime, Garage Pulse, Garage Alert ve Sessiz bildirim seçenekleri\n- Bildirim Merkezi ayarlarından ses seçimi ve test bildirimi\n- Android bildirim kanalları ve native WAV ses paketleri\n- Expo push token kaydı ve Supabase push dağıtım altyapısı\n- İşletmeden ödeme geldi bildiriminin güçlü biçimde vurgulanması\n- Bildirimden doğru işletmeye ve ilgili Admin ödeme onay kartına yönlendirme\n- Google Play Auto & Vehicles konumlandırması\n- Uygulamanın finansal hizmet veya ödeme kuruluşu olmadığının açık biçimde belgelenmesi`,
  `**v0.9.4 — IBAN Ödeme Bildirimi ve Usta Onayı**\n\nv0.9.4; Usta IBAN görünürlüğünü varsayılan aktif yapar, IBAN bilgisini Motor Hazır servislerine ek olarak açık veresiye borçlarında da gösterir ve müşterinin yaptığı transferi atanmış Ustanın onayına göndermesini sağlar. Borç yalnız Usta ödemeyi onayladıktan sonra güncellenir.\n\n## v0.9.4 ile tamamlananlar\n\n- “Motor Hazır IBAN” başlığının “IBAN Ayarları” olarak değiştirilmesi\n- Usta ve İşletme Sahibi + Usta hesaplarında müşteri görünürlüğünün varsayılan aktif olması\n- Motor Hazır veya açık veresiye kaydında atanmış Usta IBAN bilgisinin gösterilmesi\n- Müşterinin tutar ve notla “Ödemeyi Yaptım” bildirimi göndermesi\n- Bekleyen ödeme bildiriminin Ustanın Alacak ekranında gösterilmesi\n- Yalnız atanmış Ustanın onay veya ret verebilmesi\n- Usta onayı olmadan tahsilat ve borç değişikliği yapılmaması\n- Tam onaylı ödemede borcun otomatik kapanması, kısmi ödemede kalan tutarın güncellenmesi\n- Müşteriye onay veya ret sonucu bildirimi gönderilmesi\n- Çift onay, fazla tutar ve aynı anda birden fazla bekleyen bildirim koruması\n- Google Play finansal hizmet sınırının korunması: uygulama para tutmaz veya transfer başlatmaz`
);

replace('docs/TERMUX_INSTALL.md', '# Termux — DraBornGarage v0.9.3 Kurulum', '# Termux — DraBornGarage v0.9.4 Kurulum');
replace('docs/TERMUX_INSTALL.md', 'EXPECTED_VERSION="0.9.3"', 'EXPECTED_VERSION="0.9.4"');
replace(
  'docs/TERMUX_INSTALL.md',
  `## Motor Hazır IBAN testi\n\n1. Usta veya İşletme Sahibi + Usta hesabıyla giriş yap.\n2. Ayarlar → **Motor Hazır IBAN** bölümünü aç.\n3. Banka adı, hesap sahibi ve TR IBAN bilgisini gir.\n4. **Müşteriye göster** seçeneğini aç ve kaydet.\n5. Ustaya atanmış bir servisi **Motor Hazır** durumuna al.\n6. Bağlı müşteri hesabında Servisler → ilgili motor detayını aç.\n7. Motor Hazır IBAN kartında Usta, banka, hesap sahibi ve IBAN görünmelidir.\n8. Servis başka duruma alındığında kart görünmemelidir.`,
  `## IBAN ve müşteri ödeme bildirimi testi\n\n1. Usta veya İşletme Sahibi + Usta hesabıyla giriş yap.\n2. Ayarlar → **IBAN Ayarları** bölümünü aç.\n3. **Müşteriye göster** seçeneğinin varsayılan aktif olduğunu doğrula.\n4. Banka adı, hesap sahibi ve TR IBAN bilgisini girip kaydet.\n5. Ustaya atanmış bir servisi **Motor Hazır** durumuna al veya teslim edilmiş servis için açık veresiye kaydı oluştur.\n6. Bağlı müşteri hesabında Servisler → ilgili motor detayını aç.\n7. Usta, banka, hesap sahibi, IBAN ve kalan borç görünmelidir.\n8. Müşteri tutarı girip **Ödemeyi Yaptım • Ustaya Bildir** düğmesine dokunur.\n9. Borcun henüz değişmediğini ve Usta onayı beklendiğini doğrula.\n10. Usta hesabında Alacak ekranını aç ve bekleyen bildirimi onayla.\n11. Kısmi ödemede kalan tutarın azaldığını; tam ödemede borcun kapandığını doğrula.\n12. Ret senaryosunda müşterinin borcunun değişmediğini doğrula.`
);
replace('docs/TERMUX_INSTALL.md', "## v0.9.2'ye kod geri dönüşü", "## v0.9.3'e kod geri dönüşü");
replace('docs/TERMUX_INSTALL.md', 'TARGET_SHA="8f2a5155bc5374f35dcbd098f3b46544bbcad852"', 'TARGET_SHA="e4f1018ad5edac6a9dd00847fb785ae287f1cd8a"');

console.log('v0.9.4 belgeleri güncellendi.');
