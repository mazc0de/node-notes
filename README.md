# Node

Perpustakaan pribadi untuk **Bookmark** dan **Note**, dikelompokkan dengan **Collection** dan **Tag**.
Desain & keputusan produk: [`HANDOFF.md`](./HANDOFF.md) · Kosakata: [`GLOSSARY.md`](./GLOSSARY.md).

Stack: React 19 + Vite 8 + TypeScript · Tailwind 4 · React Router 8 · TanStack Query · Tiptap 3 · Supabase (Auth + Postgres + RLS) · vite-plugin-pwa · Vercel.

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
2. **SQL Editor** → jalankan isi `supabase/migrations/20261127000000_init.sql`
   (atau `supabase db push` bila memakai Supabase CLI).
3. **Authentication → URL Configuration**
   - Site URL: `https://node.vercel.app` (atau domain final)
   - Redirect URLs: `http://localhost:5173/auth/callback`, `https://<domain>/auth/callback`
4. **Authentication → Providers → Google**: aktifkan, isi Client ID/Secret dari Google Cloud Console
   (Authorized redirect URI di Google: `https://<project-ref>.supabase.co/auth/v1/callback`).
5. **Email** (magic link) aktif secara default. Untuk produksi, pasang SMTP sendiri — SMTP bawaan Supabase dibatasi rate-nya.
6. **Project Settings → API**: salin Project URL dan publishable key ke `.env.local`.

## Deploy ke Vercel

1. Import repo di Vercel (framework terdeteksi: Vite).
2. Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. `vercel.json` sudah me-rewrite semua path ke `index.html` (SPA).
4. Tambahkan domain produksi ke Redirect URLs Supabase (langkah 3 di atas).

## Struktur

```
supabase/migrations/   skema, RLS, RPC (set_item_tags, search_items, delete_my_account)
src/lib/               api.ts (akses data), queries.ts (hook TanStack Query), url.ts, display.ts
src/auth/              AuthProvider, RequireAuth
src/components/        AppLayout (sidebar, drawer, FAB, shortcut), BookmarkPanel, CommandPalette, ItemsView, …
src/pages/             Landing, AuthCallback, ListPages (Bookmarks/Notes/Collection/Tag), NotePage, Settings, Share
```

### Catatan implementasi

- **Satu tabel `items`** (`kind = bookmark | note`) sesuai rekomendasi HANDOFF §7. FK komposit `(collection_id, user_id)` mencegah Item menunjuk Collection milik User lain.
- **Library dimuat sekali** (ringkasan tanpa body Note) lalu difilter/di-sort di klien — halaman Bookmarks, Notes, Collection, Tag, hitungan sidebar, dan cek "Already saved" semuanya instan. Body Note hanya diambil di editor. Pencarian ⌘K memakai RPC server (mencakup isi Note).
- **Panel Bookmark** hidup di URL (`?b=new` / `?b=<id>`, prefill `bu`, `bt`), jadi bisa dibuka dari halaman mana pun dan dari share target.
- **Hapus** langsung menghapus baris; Undo memasukkan ulang snapshot (id, created_at, tag) yang sama.
- **Autosave Note**: debounce 1 dtk, Note kosong tidak dibuat; `/notes/new` berganti ke `/notes/:id` setelah simpan pertama tanpa me-remount editor.
- **Magic link** memakai PKCE: link harus dibuka di browser yang sama dengan tempat meminta.
