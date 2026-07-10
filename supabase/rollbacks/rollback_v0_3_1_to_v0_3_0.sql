-- DraBornGarage v0.3.1 -> v0.3.0 rollback
--
-- v0.3.1 yalnız sürümleme, yedekleme, kurulum ve geri alma standardını günceller.
-- Bu sürümde Supabase tablo, kolon, trigger, policy, index veya RPC değişikliği yoktur.
-- Bu nedenle veritabanı için uygulanacak bir DDL geri alma işlemi bulunmaz.
-- Uygulama kodunu geri almak için:
-- backup/v0.3.0-before-v0.3.1

begin;

-- No-op rollback: veritabanı yapısı v0.3.0 ile aynıdır.
select 'DraBornGarage veritabanı zaten v0.3.0 uyumlu; değişiklik yapılmadı.' as rollback_status;

commit;
