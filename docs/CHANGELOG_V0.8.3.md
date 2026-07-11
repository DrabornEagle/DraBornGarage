# DraBornGarage v0.8.3 Değişiklikleri

Tarih: 11 Temmuz 2026

## Müşteri kaydı
- Plaka, motosiklet markası ve modeli müşteri hesabında zorunlu hale getirildi.
- Bilgiler Supabase profilinde saklanıyor ve motor eşleştirme ekranına otomatik taşınıyor.

## Motor ve işletme eşleştirme
- Müşteri, plakayı yazarak Usta onayı talebi gönderebilir.
- Usta, mevcut Eşleşme Talepleri sekmesinden talebi onaylayabilir veya reddedebilir.
- Usta ayrıca plakayı yazarak kayıtlı müşteri hesabını arayabilir ve doğrudan eşleştirebilir.
- İşletmede motor kaydı yoksa onay sırasında müşteri ve motosiklet kaydı kayıtlı profil bilgileriyle oluşturulur.
- Eşleştirme sonucunda müşteri bağlantısı, claim geçmişi ve v0.8 bildirimleri birlikte çalışır.

## İşletme kaydı
- Vergi Dairesi ve 10/11 haneli Vergi Numarası işletme oluştururken zorunludur.
- Admin işletme oluşturma ve düzenleme ekranları aynı bilgileri destekler.

## Teknik
- Sürüm: v0.8.3
- Önceki sabit yedek: backup/v0.8.2-before-v0.8.3
- Migration: 20260711220000_v0_8_3_customer_motor_tax_linking.sql
- Rollback: 20260711220000_v0_8_3_customer_motor_tax_linking_rollback.sql
