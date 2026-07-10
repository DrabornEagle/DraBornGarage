# DraBornGarage — Geçici Tam v0.1 Demo Testi

Demo sistemi gerçek verilerden ayrı çalışır. Demo işletmeleri, müşterileri ve iş emirleri aynı `demo_batch_id` üzerinden izlenir. Temizleme işlemi yalnızca bu geçici kayıtları kaldırır.

## Şu anda yüklü demo paketi

- Gerçek ana işletme dahil 3 işletme görünümü
- 2 geçici demo işletme:
  - Lara Moto Garage • Demo
  - Konyaaltı Scooter Servis • Demo
- 7 demo müşteri
- 7 demo motosiklet
- 7 demo iş emri
- Hızlı Servis, Bırakılan Motor ve Randevulu Servis örnekleri
- Atölye sıra numaraları
- Sıraya Alındı
- Ön Kontrol
- Tamire Başlandı
- Parça Bekleniyor
- Test Ediliyor
- Motor Hazır
- Net fiyat ve tahmini fiyat aralığı
- Nakit tam ödeme
- IBAN kısmi ödeme
- IBAN tam ödeme
- Servis işlemleri ve kullanılan parçalar

## Önerilen test sırası

### 1. Çok işletmeli platform

1. Ana Paneli aç.
2. Üstteki işletme kartlarından üç işletme arasında geçiş yap.
3. Her işletmede müşteri, plaka, sıra ve iş emri içeriklerinin farklı olduğunu doğrula.
4. **Admin** sekmesine gir.
5. Bir demo işletmeyi pasif yap, sonra tekrar aktif yap.
6. Seçili işletmenin adı, telefonu ve adresini düzenleme formunu kontrol et.

### 2. Hızlı servis

1. Ana Panelde **+ Hızlı Servis** butonuna bas.
2. `06 DMO 101` veya başka kayıtlı demo plakayı ara.
3. Kayıtlı müşteri ve motorun otomatik geldiğini doğrula.
4. Müşteri durumunu seç.
5. Net fiyat veya tahmini fiyat gir.
6. **Hemen Başla** ya da **Sıraya Al** seçeneğini test et.
7. Nakit veya IBAN ilk tahsilatı ekle.

### 3. Ücret zorunluluğu

1. Yeni servis kaydında fiyat alanlarını boş bırak.
2. **Hemen Başla** seçeneğini seç.
3. Sistem şu uyarıyı vermelidir:
   - “Tamire başlamadan önce ücret veya tahmini ücret girmeniz gerekiyor.”
4. Fiyatı girdikten sonra kaydın açıldığını doğrula.

### 4. Atölye sırası ve durumlar

1. İş Emirleri ekranını aç.
2. Sırada, İşlemde, Parça Bekliyor, Hazır ve Teslim filtrelerini dene.
3. Bir iş emrini aç.
4. Servis durumlarını sırayla değiştir.
5. İşlem ve parça ekle.
6. Nakit/IBAN tahsilatı ekle.
7. Toplam, alınan ve kalan tutarın güncellendiğini doğrula.

### 5. Rol testleri

Admin sekmesinden ayrı ayrı davet kodu oluştur:

- Usta
- Çırak
- İşletme Sahibi + Usta

İkinci hesaplarla giriş yaparak:

- Ustanın yalnız kendi işlerini gördüğünü,
- Çırağın finansal verileri göremediğini,
- İşletme Sahibi + Ustanın İşletme Paneli ve Kendi Usta Paneli arasında geçebildiğini doğrula.

## Uygulamadan demo temizleme

1. **Ayarlar** sekmesini aç.
2. **Geçici v0.1 Demo Modu** kartını bul.
3. **Demo Verilerini Temizle** butonuna bas.
4. Temizleme onayını ver.

Demo işletmelerden biri seçiliyken de temizleme çalışır; sistem önce ana demo kök işletmesini bulur.

## Güvenlik

`clear_demo_data` yalnız demo batch’e bağlı kayıtları siler:

- Demo işletmeler
- Demo iş emirleri
- Demo müşteriler
- Bunlara bağlı servis işlemleri, parçalar ve tahsilatlar

Gerçek ana işletme ve `demo_batch_id` taşımayan gerçek kayıtlar silinmez.
