-- DraBornGarage v1.0.2 RC
-- Ortaklık/panel erişim taleplerinin çekirdek tablosu ve kayıt ekranı işletme araması.

create table if not exists public.workshop_access_requests (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_business_panel boolean not null default true,
  request_mechanic_panel boolean not null default false,
  source text not null default 'registration' check (source in ('registration','team','profile')),
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  applicant_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text,
  updated_at timestamptz not null default now(),
  unique(workshop_id,user_id)
);

create index if not exists workshop_access_requests_owner_queue_idx
  on public.workshop_access_requests(workshop_id,status,submitted_at desc);

alter table public.workshop_access_requests enable row level security;
revoke all on table public.workshop_access_requests from public,anon,authenticated;

create or replace function public.public_search_workshops_for_registration(p_query text)
returns table(id uuid,name text,phone text,address text)
language plpgsql
stable
security definer
set search_path=public
as $$
declare v_query text := trim(coalesce(p_query,''));
begin
  if char_length(v_query)<2 then return; end if;
  return query
  select w.id,w.name,w.phone,w.address
  from public.workshops w
  where w.is_active and w.name ilike '%'||replace(replace(v_query,'%',''),'_','')||'%'
  order by case when lower(w.name)=lower(v_query) then 0 when lower(w.name) like lower(v_query)||'%' then 1 else 2 end,w.name
  limit 20;
end;
$$;

revoke all on function public.public_search_workshops_for_registration(text) from public;
grant execute on function public.public_search_workshops_for_registration(text) to anon,authenticated;
