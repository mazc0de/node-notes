# Node

Perpustakaan pribadi untuk **Bookmark** dan **Note**, dikelompokkan dengan **Collection** dan **Tag**.
Desain & keputusan produk: [`HANDOFF.md`](./HANDOFF.md) · Kosakata: [`GLOSSARY.md`](./GLOSSARY.md).

Stack: React 19 + Vite 8 + TypeScript · Tailwind 4 · React Router 8 · TanStack Query · Tiptap 3 · Supabase (Postgres + RLS) · vite-plugin-pwa · Vercel.

## Menjalankan lokal

```sh
pnpm install
cp .env.example .env.local   # isi URL & publishable key Supabase
pnpm dev
```

Tanpa `.env.local`, landing page menampilkan petunjuk setup (app tidak crash).

| Script | Fungsi |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` | Type-check + build produksi (termasuk service worker) |
| `pnpm lint` | oxlint |

## Setup Supabase (sekali)

1. Buat project di supabase.com.
2. **SQL Editor** → jalankan berurutan semua file di `supabase/migrations/`
   (atau `supabase db push` bila memakai Supabase CLI).
3. **Project Settings → API**: salin Project URL dan publishable key ke `.env.local`.

## Deploy ke Vercel

1. Import repo di Vercel (framework terdeteksi: Vite).
2. Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. `vercel.json` sudah me-rewrite semua path ke `index.html` (SPA).

## Struktur

```
supabase/migrations/   skema, RLS, RPC (set_item_tags, search_items)
src/lib/               api.ts (akses data), queries.ts (hook TanStack Query), url.ts, display.ts
src/auth/              AccessProvider, RequireAccess (gate access code)
src/components/        AppLayout (sidebar, drawer, FAB, shortcut), BookmarkPanel, CommandPalette, ItemsView, …
src/pages/             Landing (input access code), ListPages (Bookmarks/Notes/Collection/Tag), NotePage, Settings, Share
```

### Catatan implementasi

- **Tanpa login**: akses dibuka dengan access code yang di-hardcode di `src/auth/AccessProvider.tsx` (`3105`), disimpan di `localStorage`. Supabase diakses sebagai role `anon` dengan satu library bersama (migrasi `20261127010000_access_code.sql`). Ini hanya gate di UI — siapa pun yang punya publishable key tetap bisa membaca/menulis data.
- **Satu tabel `items`** (`kind = bookmark | note`) sesuai rekomendasi HANDOFF §7.
- **Library dimuat sekali** (ringkasan tanpa body Note) lalu difilter/di-sort di klien — halaman Bookmarks, Notes, Collection, Tag, hitungan sidebar, dan cek "Already saved" semuanya instan. Body Note hanya diambil di editor. Pencarian ⌘K memakai RPC server (mencakup isi Note).
- **Panel Bookmark** hidup di URL (`?b=new` / `?b=<id>`, prefill `bu`, `bt`), jadi bisa dibuka dari halaman mana pun dan dari share target.
- **Hapus** langsung menghapus baris; Undo memasukkan ulang snapshot (id, created_at, tag) yang sama.
- **Autosave Note**: debounce 1 dtk, Note kosong tidak dibuat; `/notes/new` berganti ke `/notes/:id` setelah simpan pertama tanpa me-remount editor.
