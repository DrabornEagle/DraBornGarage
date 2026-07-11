# DraBornGarage — v0.8.3 Devam Dosyası

**Son güncelleme:** 11 Temmuz 2026  
**Güncel sürüm:** `v0.8.3`  
**GitHub:** `DrabornEagle/DraBornGarage`  
**Supabase:** `xpdiwyxnnrmyvpcqwuyb`  
**Sonraki ana sürüm:** `v0.9.0`

## Bu sürümde tamamlananlar
- Müşteri kaydında zorunlu plaka, motosiklet markası ve modeli.
- Kayıtlı motor bilgilerinin profil tetikleyicisiyle Supabase'e yazılması.
- Müşterinin plakayla Usta onayı istemesi ve talebin Usta paneline düşmesi.
- Ustanın talebi onaylayıp motoru/işletmeyi müşteri hesabına bağlaması.
- Ustanın plakayla kayıtlı hesabı arayıp doğrudan eşleştirmesi.
- İşletme oluştururken Vergi Dairesi ve Vergi Numarası zorunluluğu.
- Admin işletme oluşturma/düzenleme desteği.

## Güvenlik kararı
Plaka tek başına müşteri hesabını otomatik açmaz. Son bağlantı Usta/İşletme yetkisiyle onaylanır. RPC'ler işletme sahibi veya aktif Usta rolü kontrolü yapar.

## Sürüm ve geri alma
- Güncel sürüm: `v0.8.3`
- Sabit kod yedeği: `backup/v0.8.2-before-v0.8.3`
- Migration: `supabase/migrations/20260711220000_v0_8_3_customer_motor_tax_linking.sql`
- Rollback: `supabase/rollbacks/20260711220000_v0_8_3_customer_motor_tax_linking_rollback.sql`

## Sonraki adım
Kod, Supabase migration, TypeScript ve Android bundle kontrolleri tamamlandıktan sonra `v0.9.0 — Google Play Uyum, Test ve Pilot` aşamasına geçilir.
