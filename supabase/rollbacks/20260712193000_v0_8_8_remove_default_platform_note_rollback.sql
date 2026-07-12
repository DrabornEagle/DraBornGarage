update public.platform_global_settings
set payment_note = 'Açıklamaya işletme adı ve dönem bilgisini yazın.',
    updated_at = now()
where id = 1 and payment_note is null;
