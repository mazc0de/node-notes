# Handoff — Node

> Status: **v1 terimplementasi (2026-11-27)** — kode lengkap, belum terhubung ke project Supabase & belum di-deploy. Lihat [`README.md`](./README.md) untuk setup. Dokumen ini hasil sesi tanya-jawab (grilling) dan menjadi titik awal implementasi.
> Kosakata domain mengikuti [`GLOSSARY.md`](./GLOSSARY.md); pakai istilah di sana secara konsisten di UI dan kode (Item, Bookmark, Note, Description, Pin, Collection, Tag).

## 1. Ringkasan produk

**Node** adalah aplikasi web publik untuk menyimpan **Bookmark** (link) dan **Note** (tulisan bebas) dalam satu perpustakaan pribadi per User, dikelompokkan dengan **Collection** dan **Tag**.

- Siapa pun bisa daftar; setiap User hanya bisa melihat datanya sendiri.
- Bahasa UI: **Inggris**.
- Deploy: **Vercel**, target `node.vercel.app` (dicek 2026-11-27: 404 dari Vercel, kemungkinan kosong; kepastian saat membuat project).

## 2. Stack

| Bagian | Pilihan |
|---|---|
| Frontend | React + **Vite** + React Router (SPA) |
| Styling | Tailwind CSS |
| Backend | **Supabase**: Auth + Postgres + RLS. **Tidak ada** Edge/Serverless Function |
| Editor Note | **Tiptap** (rich text + markdown shortcuts) |
| PWA | Manifest + service worker (mis. `vite-plugin-pwa`) |
| Hosting | Vercel (SPA rewrite semua path ke `index.html`) |

## 3. Aturan domain (sudah diputuskan)

### Bookmark
- **URL wajib**, tepat satu. Sesuatu tanpa URL = Note, bukan Bookmark.
- **Title opsional** — jika kosong, tampilkan domain dari URL (mis. `github.com`).
- **Description opsional** — teks polos pendek.
- **Tidak ada Link Preview**: tidak fetch judul/favicon/gambar dari situs luar. Tidak ada ikon/favicon; cukup teks domain kecil.
- Menyimpan URL yang sudah ada → peringatan **"Already saved"** + link ke Bookmark lama, tapi tetap boleh disimpan.

### Note
- Body rich text (Tiptap). **Title opsional** — jika kosong, pakai baris pertama body.
- **Autosave** (debounce ±1 dtk) dengan indikator "Saved". Tidak ada tombol Save.
- Tidak bisa embed/mereferensikan Bookmark (v2).

### Item (Bookmark & Note)
- **Pin**: Item ter-pin selalu di atas list-nya.
- Urutan default: pinned dulu, lalu **terbaru**. Opsi sort **Title A–Z**. Tidak ada drag-and-drop.
- **Hapus = langsung**, dengan toast **Undo** ±5 detik. Tidak ada Trash.

### Collection
- Flat (**tidak bersarang**), opsional; satu Item di **maksimal satu** Collection atau tidak di mana pun.
- Bisa berisi Bookmark **dan** Note sekaligus.
- Hapus Collection → Item **tetap ada**, jadi tanpa Collection. Konfirmasi: *"Delete 'X'? 12 items will be kept."*

### Tag
- Dipakai bersama Bookmark & Note; satu Item bisa banyak Tag.
- Dibuat inline saat mengetik (create-on-type), dinormalisasi **lowercase + trim**, unik per User.
- Hapus Tag → hanya melepas label dari Item.

## 4. Halaman & navigasi

| Route | Isi |
|---|---|
| `/` | Belum login: **landing page** satu layar (nama, tagline, "Continue with Google", magic link). Sudah login: redirect ke `/bookmarks` |
| `/bookmarks` | List Bookmark (halaman default) |
| `/notes` , `/notes/:id` | List Note & editor Note |
| `/collections/:id` | Bookmark + Note campur, filter `All / Bookmarks / Notes` |
| `/tags/:name` | Sama seperti halaman Collection |
| `/settings` | Nama, tema (Light/Dark/System), logout, **delete account + semua data** |
| `/share` | Target PWA share (lihat §6) |
| `/auth/callback` | Callback OAuth / magic link |

- **Sidebar**: Bookmarks, Notes, daftar Collections, daftar Tags. Di HP → drawer + **FAB "+"**.
- **List Bookmark** (list saja, tanpa grid): title (atau domain), domain kecil, description singkat, tag. **Klik baris → panel detail/edit**; tombol **↗ "Open"** (selalu terlihat, termasuk di HP) membuka URL di tab baru (`target="_blank" rel="noopener noreferrer"`). Menu `⋯`: Edit, Pin, Delete.
- **Pencarian ⌘K**: satu palet mencari title, URL, description, dan isi Note.
- **Shortcut**: `⌘K` cari, `B` Bookmark baru, `N` Note baru, `Esc` tutup, `?` daftar shortcut. Abaikan saat fokus di input/editor.

## 5. Auth

- **Google OAuth + Magic link** (tanpa password) via Supabase Auth.
- **Delete account** tanpa server function: buat RPC Postgres `SECURITY DEFINER` (mis. `delete_my_account()`) yang menghapus baris `auth.users` untuk `auth.uid()`; data User ikut terhapus lewat `ON DELETE CASCADE`.

## 6. PWA

- Online-only; service worker hanya cache app shell. Tampilkan banner "You're offline" saat tidak ada koneksi.
- **Share target** (`manifest.share_target`, `action: "/share"`, `method: "GET"`, params `title`, `text`, `url`):
  - Ada URL (cek `url`, lalu cari URL di dalam `text` — Android sering menaruhnya di sana) → buka form **Bookmark baru**, URL terisi, title diisi dari `title` yang dikirim browser bila ada.
  - Hanya teks → buka **Note baru** berisi teks tersebut.
  - Jika belum login → arahkan login dulu, lalu kembali ke `/share` dengan parameter yang sama.

## 7. Model data (rekomendasi — belum final)

Disarankan **satu tabel `items`** dengan kolom `kind`, karena Collection/Tag, Pin, sorting, halaman campur, dan pencarian berlaku sama untuk kedua jenis.

```sql
collections (id uuid pk, user_id uuid → auth.users on delete cascade, name text, created_at)
tags        (id uuid pk, user_id uuid → auth.users on delete cascade, name text, unique(user_id, name))
items (
  id uuid pk,
  user_id uuid → auth.users on delete cascade,
  kind text check (kind in ('bookmark','note')),
  title text null,
  url text null,              -- wajib bila kind='bookmark', null bila 'note' (CHECK constraint)
  description text null,      -- hanya bookmark
  body jsonb null,            -- dokumen Tiptap, hanya note
  body_text text null,        -- versi plain text untuk search & judul fallback
  collection_id uuid null → collections on delete set null,
  pinned boolean default false,
  search tsvector generated (title, url, description, body_text),
  created_at, updated_at
)
item_tags (item_id → items on delete cascade, tag_id → tags on delete cascade, pk(item_id, tag_id))
```

- **RLS di semua tabel**: `user_id = auth.uid()` (untuk `item_tags`, lewat kepemilikan item).
- Index: `(user_id, kind, pinned desc, created_at desc)`, GIN pada `search`, index untuk cek duplikat URL per User.
- Normalisasi URL ringan untuk cek duplikat (lowercase host, buang trailing slash).

## 8. Arah visual

- **Warm paper**: latar krem/putih hangat, judul **serif**, body sans yang tenang; terasa seperti buku catatan, bukan dashboard.
- **Dark mode** ikut sistem + toggle manual; palet gelap tetap hangat (hitam kecokelatan, bukan abu-abu dingin).
- Responsif penuh (HP first-class), fokus keyboard terlihat, kontras memadai.

## 9. Di luar scope v1 (v2)

Impor bookmark dari browser (HTML Netscape) · Ekspor data JSON · Note yang embed Bookmark · Trash · Status read/unread · Ekstensi browser · Offline penuh · Collection bersarang · Link Preview.

## 10. Catatan terbuka

1. **Skill `frontend-design`, `impeccable`, `web-design-guidelines` belum terpasang** di sesi desain. Pasang dulu bila ingin dipakai saat implementasi UI.
2. Folder masih bernama `bookmark-app` (sementara) — rencananya di-rename ke `node`.
3. Model data §7 adalah rekomendasi; konfirmasi sebelum membuat migrasi.

## 11. Langkah berikutnya

1. Rename folder → `node`; `git init`.
2. Scaffold Vite + React + TS + Tailwind + React Router.
3. Buat project Supabase; tulis migrasi skema + RLS + RPC `delete_my_account`.
4. Auth (Google + magic link) & landing page.
5. Bookmarks (CRUD, Pin, Undo delete, cek duplikat) → Notes (Tiptap + autosave) → Collections & Tags → halaman campur.
6. Pencarian ⌘K, shortcut keyboard, dark mode.
7. PWA (manifest, share target, offline banner) → deploy Vercel.
