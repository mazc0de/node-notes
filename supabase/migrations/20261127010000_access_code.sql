-- Node — drop per-User auth, switch to one shared library behind an access code.
-- The app no longer signs in to Supabase Auth: every request runs as the `anon` role.
-- Existing data from all Users is merged into the single library.

-- ─── Old per-User policies and RPC ──────────────────────────────────────────
drop policy if exists "own collections" on public.collections;
drop policy if exists "own tags"        on public.tags;
drop policy if exists "own items"       on public.items;
drop policy if exists "own item_tags"   on public.item_tags;

drop function if exists public.delete_my_account();

-- ─── Merge Tags with the same name (they were unique per User only) ─────────
create temporary table tag_keep as
select t.id, first_value(t.id) over (partition by t.name order by t.created_at, t.id) as keep_id
  from public.tags t;

insert into public.item_tags (item_id, tag_id)
select it.item_id, k.keep_id
  from public.item_tags it
  join tag_keep k on k.id = it.tag_id
 where k.id <> k.keep_id
on conflict do nothing;

delete from public.tags t using tag_keep k where t.id = k.id and k.id <> k.keep_id;

drop table tag_keep;

-- ─── Drop user_id (cascades to the indexes / constraints that used it) ──────
alter table public.items       drop column user_id cascade;
alter table public.collections drop column user_id cascade;
alter table public.tags        drop column user_id cascade;

alter table public.items
  add constraint items_collection_fk foreign key (collection_id)
  references public.collections (id) on delete set null;

alter table public.tags add constraint tags_name_key unique (name);

create index items_list_idx       on public.items (kind, pinned desc, created_at desc);
create index items_url_key_idx    on public.items (url_key) where kind = 'bookmark';
create index collections_name_idx on public.collections (name);

-- ─── Open access for anon (gated only by the access code in the UI) ─────────
create policy "shared collections" on public.collections for all to anon, authenticated using (true) with check (true);
create policy "shared tags"        on public.tags        for all to anon, authenticated using (true) with check (true);
create policy "shared items"       on public.items       for all to anon, authenticated using (true) with check (true);
create policy "shared item_tags"   on public.item_tags   for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.collections, public.tags, public.items, public.item_tags to anon;

-- ─── RPC: replace an Item's Tags (create-on-type, normalized) ───────────────
create or replace function public.set_item_tags(p_item_id uuid, p_names text[])
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_names text[];
begin
  if not exists (select 1 from public.items where id = p_item_id) then
    raise exception 'Item not found' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(distinct n), '{}')
    into v_names
    from (select left(lower(btrim(x)), 50) as n from unnest(coalesce(p_names, '{}')) as x) s
   where n <> '';

  insert into public.tags (name)
  select n from unnest(v_names) as n
  on conflict (name) do nothing;

  delete from public.item_tags it
   where it.item_id = p_item_id
     and it.tag_id not in (select t.id from public.tags t where t.name = any (v_names));

  insert into public.item_tags (item_id, tag_id)
  select p_item_id, t.id from public.tags t where t.name = any (v_names)
  on conflict do nothing;
end $$;

grant execute on function public.set_item_tags(uuid, text[]) to anon;

-- ─── RPC: search (⌘K) over title, URL, description and note text ────────────
create or replace function public.search_items(q text)
returns table (
  id uuid, kind text, title text, url text, description text, excerpt text, pinned boolean, updated_at timestamptz
)
language sql stable security invoker set search_path = '' as $$
  with input as (
    select btrim(coalesce(q, '')) as raw
  ),
  prepared as (
    select
      raw,
      '%' || replace(replace(replace(raw, '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern,
      array_to_string(array(
        select w || ':*'
          from (select regexp_replace(lower(t), '[^[:alnum:]]+', '', 'g') as w
                  from regexp_split_to_table(raw, '\s+') as t) words
         where w <> ''
      ), ' & ') as tsq
    from input
  )
  select i.id, i.kind, i.title, i.url, i.description, i.excerpt, i.pinned, i.updated_at
    from public.items i, prepared p
   where p.raw <> ''
     and (
       (p.tsq <> '' and i.search @@ to_tsquery('simple', p.tsq))
       or i.title       ilike p.pattern
       or i.url         ilike p.pattern
       or i.description ilike p.pattern
       or i.body_text   ilike p.pattern
     )
   order by
     (i.title ilike p.pattern) desc,
     case when p.tsq <> '' then ts_rank(i.search, to_tsquery('simple', p.tsq)) else 0 end desc,
     i.updated_at desc
   limit 30
$$;

grant execute on function public.search_items(text) to anon;
