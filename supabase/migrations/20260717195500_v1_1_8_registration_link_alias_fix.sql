-- DraBornGarage v1.1.8
-- Qualify table columns that share names with RETURNS TABLE output variables.

create or replace function public.staff_create_customer_registration_link(p_motorcycle_id uuid)
returns table(
  registration_code text,
  registration_token uuid,
  qr_payload text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_motorcycle public.motorcycles%rowtype;
  v_link public.customer_registration_links%rowtype;
  v_code text;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;

  select m.* into v_motorcycle
  from public.motorcycles as m
  where m.id = p_motorcycle_id;

  if v_motorcycle.id is null then raise exception 'Motosiklet bulunamadı'; end if;
  if not public.is_workshop_owner(v_motorcycle.workshop_id)
     and not public.is_workshop_worker(v_motorcycle.workshop_id) then
    raise exception 'Bu müşteri için kayıt kodu oluşturma yetkiniz yok';
  end if;

  update public.customer_registration_links as l
  set revoked_at = now(), updated_at = now()
  where l.motorcycle_id = p_motorcycle_id
    and l.used_at is null
    and l.revoked_at is null
    and l.expires_at <= now();

  select l.* into v_link
  from public.customer_registration_links as l
  where l.motorcycle_id = p_motorcycle_id
    and l.used_at is null
    and l.revoked_at is null
    and l.expires_at > now()
  order by l.created_at desc
  limit 1;

  if v_link.id is null then
    loop
      v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
      exit when not exists (
        select 1
        from public.customer_registration_links as existing_link
        where existing_link.registration_code = v_code
      );
    end loop;

    insert into public.customer_registration_links(
      workshop_id, customer_id, motorcycle_id, created_by, registration_code
    ) values (
      v_motorcycle.workshop_id, v_motorcycle.customer_id, v_motorcycle.id, auth.uid(), v_code
    ) returning * into v_link;
  end if;

  return query select
    v_link.registration_code,
    v_link.registration_token,
    'draborngarage://register?token=' || v_link.registration_token::text,
    v_link.expires_at;
end;
$$;

revoke all on function public.staff_create_customer_registration_link(uuid) from public, anon, authenticated;
grant execute on function public.staff_create_customer_registration_link(uuid) to authenticated;
