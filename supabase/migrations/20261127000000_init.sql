-- Node — initial schema
-- One `items` table for Bookmarks and Notes (see HANDOFF.md §7), plus Collections and Tags.
-- Every table is private to its User through RLS.

-- ─── Collections ────────────────────────────────────────────────────────────
create table public.collections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 100),
  created_at  timestamptz not null default now(),
  -- lets items reference (collection, owner) so an Item can never point at another User's Collection
  unique (id, user_id)
);
create index collections_user_idx on public.collections (user_id, name);

-- ─── Tags ───────────────────────────────────────────────────────────────────
create table public.tags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- normalized: lowercase + trimmed
  name        text not null check (name = lower(btrim(name)) and char_length(name) between 1 and 50),
  created_at  timestamptz not null default now(),
  unique (user_id, name),
  unique (id, user_id)
);

-- ─── Items (Bookmark | Note) ────────────────────────────────────────────────
create table public.items (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind           text not null check (kind in ('bookmark', 'note')),
  title          text check (title is null or char_length(title) <= 500),
  url            text,
  url_key        text,            -- lightly normalized URL, used for the "Already saved" check
  description    text check (description is null or char_length(description) <= 1000),
  body           jsonb,           -- Tiptap document (notes only)
  body_text      text,            -- plain text of body, for search and the title fallback
  excerpt        text generated always as (left(body_text, 280)) stored,
  collection_id  uuid,
  pinned         boolean not null default false,
  search         tsvector generated always as (
                   to_tsvector('simple',
                     coalesce(title, '') || ' ' || coalesce(url, '') || ' ' ||
                     coalesce(description, '') || ' ' || coalesce(body_text, ''))
                 ) stored,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint items_bookmark_shape check (
    kind <> 'bookmark' or (url is not null and char_length(btrim(url)) > 0 and body is null and body_text is null)
  ),
  constraint items_note_shape check (
    kind <> 'note' or (url is null and url_key is null and description is null)
  ),
  constraint items_collection_fk foreign key (collection_id, user_id)
    references public.collections (id, user_id) on delete set null (collection_id)
);

create index items_list_idx      on public.items (user_id, kind, pinned desc, created_at desc);
create index items_collection_idx on public.items (collection_id) where collection_id is not null;
create index items_url_key_idx   on public.items (user_id, url_key) where kind = 'bookmark';
create index items_search_idx    on public.items using gin (search);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger items_touch_updated_at
  before update on public.items
  for each row execute function public.touch_updated_at();

-- ─── Item ↔ Tag ─────────────────────────────────────────────────────────────
create table public.item_tags (
  item_id  uuid not null references public.items (id) on delete cascade,
  tag_id   uuid not null references public.tags (id) on delete cascade,
  primary key (item_id, tag_id)
);
create index item_tags_tag_idx on public.item_tags (tag_id);

-- ─── Row Level Security ─────────────────────────────────────────────────────
alter table public.collections enable row level security;
alter table public.tags        enable row level security;
alter table public.items       enable row level security;
alter table public.item_tags   enable row level security;

create policy "own collections" on public.collections for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own tags" on public.tags for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own items" on public.items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own item_tags" on public.item_tags for all to authenticated
  using (exists (select 1 from public.items i where i.id = item_id and i.user_id = (select auth.uid())))
  with check (
    exists (select 1 from public.items i where i.id = item_id and i.user_id = (select auth.uid()))
    and exists (select 1 from public.tags t where t.id = tag_id and t.user_id = (select auth.uid()))
  );

revoke all on public.collections, public.tags, public.items, public.item_tags from anon;
grant select, insert, update, delete on public.collections, public.tags, public.items, public.item_tags to authenticated;

-- ─── RPC: replace an Item's Tags (create-on-type, normalized) ───────────────
create function public.set_item_tags(p_item_id uuid, p_names text[])
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_uid   uuid := auth.uid();
  v_names text[];
begin
  if not exists (select 1 from public.items where id = p_item_id and user_id = v_uid) then
    raise exception 'Item not found' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(distinct n), '{}')
    into v_names
    from (select left(lower(btrim(x)), 50) as n from unnest(coalesce(p_names, '{}')) as x) s
   where n <> '';

  insert into public.tags (user_id, name)
  select v_uid, n from unnest(v_names) as n
  on conflict (user_id, name) do nothing;

  delete from public.item_tags it
   where it.item_id = p_item_id
     and it.tag_id not in (select t.id from public.tags t where t.user_id = v_uid and t.name = any (v_names));

  insert into public.item_tags (item_id, tag_id)
  select p_item_id, t.id from public.tags t where t.user_id = v_uid and t.name = any (v_names)
  on conflict do nothing;
end $$;

revoke execute on function public.set_item_tags(uuid, text[]) from public, anon;
grant execute on function public.set_item_tags(uuid, text[]) to authenticated;

-- ─── RPC: search (⌘K) over title, URL, description and note text ────────────
create function public.search_items(q text)
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
   where i.user_id = auth.uid()
     and p.raw <> ''
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

revoke execute on function public.search_items(text) from public, anon;
grant execute on function public.search_items(text) to authenticated;

-- ─── RPC: delete the signed-in User and all their data ──────────────────────
-- SECURITY DEFINER so it may delete from auth.users; everything else goes via ON DELETE CASCADE.
create function public.delete_my_account()
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  delete from auth.users where id = v_uid;
end $$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
