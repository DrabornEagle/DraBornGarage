update public.platform_global_settings
set payment_note = null,
    updated_at = now()
where payment_note = 'Açıklamaya işletme adı ve dönem bilgisini yazın.';
