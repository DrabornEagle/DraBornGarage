begin;

alter table public.work_order_notes
  add column if not exists author_name text;

update public.work_order_notes n
   set author_name = p.full_name
  from public.profiles p
 where n.author_id = p.id
   and n.author_name is null;

create or replace function public.work_order_note_author_snapshot()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.author_id is not null then
    select full_name into new.author_name
      from public.profiles
     where id = new.author_id;
  end if;
  return new;
end;
$function$;

drop trigger if exists work_order_note_author_snapshot_trigger on public.work_order_notes;
create trigger work_order_note_author_snapshot_trigger
before insert or update of author_id on public.work_order_notes
for each row execute function public.work_order_note_author_snapshot();

commit;
