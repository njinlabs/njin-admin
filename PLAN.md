# Rencana admin panel

Dokumen kerja: apa yang sudah ada, apa yang tersisa, dan urutannya. Ceklis diperbarui seiring jalan.

## Sudah ada

- [x] Monorepo bun: `app/` (admin), `packages/` (`@njinlabs/njin-admin`), `playground/` (lokal, tidak dilacak git, seperti di core njin).
- [x] Plugin runtime: `defineAdminPlugin({ navs, routes })`, dibuild jadi satu modul ES, dimuat lewat manifest.
- [x] React, TanStack Query, dan TanStack Router dibagi dari admin ke plugin lewat `globalThis.__njin`
      (`exposeShared`, daftar di `sharedModules`).
- [x] CSS plugin: Tailwind terpisah per plugin, token dibaca sebagai variabel CSS dari admin
      (`theme.css` dengan `@theme static`, `plugin.css` untuk plugin).
- [x] API bertipe dengan axios: model (CRUD, draft, i18n), vars, `queryOptions`.
- [x] `/api/schema` jadi satu schema zod per model dan grup vars (`getSchema`, `schemaQuery`); core njin sudah mengirim
      `{ models, vars, i18n }`.
- [x] Router dari registry (`createAdminRouter`), pemuat manifest dari `/api/admin/manifest`.
- [x] Shell: layout dengan sidebar dari `navs`, judul halaman, token desain pertama dan mode gelap lewat
      `prefers-color-scheme` (`app/src/components/shell.tsx`, `theme.css`).
- [x] Biome, 98 tes (unit dan feature); plugin yang dibuild tes ada di `packages/tests/fixtures/plugin`.
- [x] Repo di GitHub (`njinlabs/njin-admin`, public), `LICENSE`, dan CI (biome, typecheck, tes, build admin).

## Belum terbukti

- [x] Admin di browser sungguhan: halaman plugin tampil, tombolnya bereaksi (hook dari React bersama), `Link`
      berpindah halaman, tombol berwarna dari token. Sudah dicoba pemilik repo.
- [ ] Dark mode untuk plugin: set gelap token sudah ada di `theme.css`; plugin seharusnya ikut tanpa dibuild ulang,
      tapi belum dilihat di browser.

## 1. Lapisan data admin

Murni logika, tidak butuh UI, dan dipakai semua halaman nanti.

- [x] **Satu schema zod, 1:1 dengan backend** (`sdk/schema/schema.ts`): `lib/schema.ts` lama dipindah tanpa perubahan logika
      (`transformSchema`, `toForm`, `getDefaultValues`). `getSchema` membuat `z.fromJSONSchema` lalu `transformSchema` dan
      `toForm` untuk tiap model dan grup vars, persis seperti `app-sidebar.tsx` lama. Aturan (panjang, pola, email,
      rentang) ikut dari JSON schema tanpa ditulis ulang.
- [x] **Dua celah di `schema.ts` lama ditutup**: kolom `nullable` (union tanpa meta dari `anyOf [X, null]`) dan
      `minItems`/`maxItems` (array dibangun ulang tanpa aturan panjangnya). Perbaikan kecil di `unwrap` dan `transformType`,
      dengan tes terhadap schema asli server.
- [ ] **Sambungkan ke form** (dikerjakan bersama halaman form): `getDefaultValues(model.schema)` untuk nilai awal,
      `model.schema` sebagai validator form, `toApiError(...).fields` untuk menampilkan error server per field.
- [x] **Normalisasi error API**: `toApiError` (pesan, status, error per field dari 422 dan 409).
- [x] **Endpoint yang belum dibungkus**: file (`uploadFile`), analytics (`getAnalytics`), setup. Users dan daftar/hapus file
      memakai `modelApi(client, "user")` / `modelApi(client, "file")`.
- [x] **Mutation options** (create, update, destroy, draft, removeLocale, vars, upload) yang meng-invalidate
      `["model", prefix]`, pasangan dari `queryOptions`.

## 2. Shell dan fitur bawaan

Fitur bawaan ditulis sebagai plugin internal dengan kontrak yang sama dengan plugin pihak ketiga, supaya kontraknya
teruji sendiri.

- [x] **Shell**: layout dengan sidebar dari `navs` (via `Link`) dan judul halaman.
- [x] **Sidebar dari query**: `Shell` memakai `useQuery(schemaQuery)`, menu Content dan Settings dibangun `schemaNavs`.
      Loading tampil sebagai `Skeleton`, gagal tampil pesan dengan tombol coba lagi. `loadSchema` dan array global
      `navs.models`/`navs.vars` sudah dihapus. Route placeholder `/content/$prefix` dan `/settings/$prefix` ada sampai
      halamannya dikerjakan.
- [x] **Menu user** di kaki sidebar: nama dan email dari `check-token`, klik membuka menu (sementara hanya "Sign out").
- [x] **Content, daftar** (`pages/content-list.tsx`, `components/data-table.tsx`, `lib/cell.tsx`): TanStack Table v8 dengan
      urut dan cari dari server (`manualSorting`, `recordsInfiniteQuery`), infinite scroll di dalam tabel yang memenuhi
      area konten, kolom dari `model.form` (tipe skalar), hapus lewat `ConfirmDialog`. Search dan tombol New ada di
      header Shell lewat `HeaderActions` (portal ke `HeaderSlot`). Belum dicoba di browser.
- [ ] **Content, sisanya**: filter di daftar, tombol Buat/Ubah dan form dari `model.form` dan `model.schema`,
      draft/publish, i18n per bahasa.
- [ ] **Settings**: halaman grup vars (baca, ubah, draft/publish, i18n).
- [ ] **Files**: pustaka berkas dan unggah.
- [x] **Users** (`pages/users/`): daftar user dan daftar access group dalam satu bagian (tab di `/users` dan
      `/users/groups`), form buat/ubah keduanya. Daftar memakai `RecordList` (diekstrak dari daftar konten). Form user:
      field group hanya muncul bila boleh `access_group:update` (server menolak bila tidak). Form group: `GrantsEditor`
      menggambar tabel resource x aksi dari `GET /api/access/catalog` (sel Tidak/Own/All, kotak centang untuk settings
      dan analytics, sakelar Full access); nilainya tetap daftar string grant, wildcard yang tak punya sel ditampilkan
      sebagai badge dan ikut tersimpan (`splitGrants`/`joinGrants` di `sdk/api/grants.ts`). Kit bertambah: `Badge`,
      `Checkbox`, `MultiSelect`. Belum dicoba di browser.
- [ ] **Analytics** dan **Dashboard**.
- [ ] Editor richtext (TipTap, konfigurasi dari admin lama) dan pemilih relasi/file.

## 3. Kontrak plugin

Yang sudah ada hanya `navs` dan `routes`. Perlu diputuskan sebelum ada plugin pihak ketiga:

- [ ] **Apa yang boleh disumbang plugin**: renderer field kustom (`renderAs` baru), widget dashboard,
      halaman di bawah `/content/<prefix>`, aksi tambahan di daftar record.
- [ ] **Versi kontrak**: manifest membawa versi sdk, loader menolak plugin yang tidak cocok dengan pesan jelas.
- [ ] **Versi modul bersama**: plugin dibuild terhadap React/Router versi tertentu; tentukan aturan dan cek.
- [ ] **Panduan CSS untuk plugin**: wajib `@source` ke folder plugin sendiri (lihat `plugin.css`), kelas buatan sendiri
      diberi awalan, hanya memakai token yang ada,
      daftar token yang stabil (nama token adalah kontrak).
- [ ] Mem-bundle tipe untuk penulis plugin (apa yang diimpor dari `@njinlabs/njin-admin/sdk`).

## 4. Tampilan dan kit UI

Dikerjakan satu komponen per langkah; urutan di atas tidak bergantung padanya.

- [x] **Warna utama diputuskan**: `#186049` jadi langkah 700 skala `primary` 50-950 (OKLCH, hue tetap). `primary` =
      700 di mode terang, 400 di mode gelap. Token lain (abu-abu, `danger`) masih nilai pertama.
- [x] **Kit di `packages/src/ui/`, export `./ui`** (Base UI, hanya token, dibagi ke plugin lewat `sharedModules`):
      `Button`, `Field`/`FieldLabel`/`FieldDescription`/`FieldError`, `Input`, `Switch`, `Select`, `Popover`,
      `Calendar` (react-day-picker), `DatePicker`, `Skeleton`, `ConfirmDialog` (AlertDialog Base UI, versi sempit dari
      `Dialog`), dan varian `danger-ghost` pada `Button`. Halaman `/components` di admin untuk melihatnya.
- [ ] Belum dicoba di browser: klik, popup `Select`/`DatePicker`, navigasi bulan, `ConfirmDialog`, popover menu user,
      mode gelap kit.
- [ ] **Yang tidak butuh API**, urutan: `RenderForm` (text, email, numeric, boolean, select, datepicker, object, array;
      butuh `react-hook-form` dan `react-number-format`), lalu `RichTextEditor` (TipTap).
- [ ] **Yang butuh API (ditunda)**: `Combobox` untuk relation/multi_relation, `Dialog` umum dan pemilih file
      (`file`/`multi_file`), lalu bagian relation dan file di `RenderForm`.
- [ ] Komponen halaman (tabel data, paginasi, toast) saat halaman yang memakainya dikerjakan.
- [ ] Token final dan dokumentasi kit untuk penulis plugin.

## 5. Auth dan sesi

Sisi server (`/api/auth/login`, `check-token`, `logout`, `/api/setup`) dikerjakan kolega di core dan sudah ada di
`main`; sisi admin ada di sini.

- [x] Halaman login dan setup (`app/src/pages/`), dua kolom (`AuthLayout`), `react-hook-form` + zod, kit UI. Error
      per field dari server ditempel lewat `setError`.
- [x] Token di cookie `token` (`react-cookie`, path `/`, 30 hari seperti sesi server). `Protected` memeriksanya lewat
      `check-token`, memasang header `Authorization`, memuat schema, dan membuang token yang ditolak. `Root` mengarahkan
      semua halaman ke `/setup` sampai admin pertama ada.
- [x] Schema dimuat setelah sesi diperiksa: `Shell` baru dirender setelah `Protected` memasang header `Authorization`.
- [x] Login sudah dicoba di browser. Setup sampai dashboard belum.
- [x] Logout: menu user di sidebar, dengan `ConfirmDialog`. Memanggil `logout`, menghapus cookie, header, dan cache
      `["schema"]`/`["model"]` (cache per sesi harus dibersihkan di sini juga bila bertambah). Belum dicoba di browser.
- [ ] 401 di tengah sesi: sekarang baru ketahuan saat halaman dibuka ulang; tangani secara global.
- [ ] Cookie `HttpOnly` dari server: login mengirim `Set-Cookie`, server membaca cookie, ada perlindungan CSRF. Pekerjaan
      di core. Cookie sekarang ditulis script (server mengirim token di JSON), jadi bisa dibaca script lain di halaman,
      sama seperti localStorage.
- [ ] Plugin dimuat sebelum login. Bila `GET /api/admin/manifest` nanti butuh token, plugin tidak termuat setelah login
      lewat router; cari cara memuatnya setelah sesi diperiksa.
- [x] Izin: `GET /api/auth/permissions` (sudah dihitung server: wildcard, scope own/all, scope token, level `ref`) dimuat
      `Protected` bersama user sebelum halaman mana pun tampil, lalu dibaca lewat `useSession()`. `can`, `canList` dan
      `canOn` (untuk satu baris, baris sendiri pada level `own`) ada di `sdk/api/permissions.ts`.
- [ ] Menu dan tombol mengikuti izin: sudah di menu (Content, Settings, Files, Users) dan daftar konten (New, Edit, Hapus,
      empty state). Halaman Users dan access group sudah, termasuk akses lewat URL. Tinggal form konten, publish, halaman Settings/Files.
- [ ] Hook izin untuk plugin (sdk hanya
      punya fungsi murni; `useSession` ada di admin dan belum dibagi).

## 6. Integrasi di core njin

Pekerjaan di repo `njin`. Auth di core sudah masuk; tanyakan kolega dulu sebelum menyentuh bagian yang sama.

- [ ] `Plugin.admin.entry` dan `admin.plugins` di config (plugin lokal tanpa paket npm).
- [ ] `GET /api/admin/manifest`, termasuk `styles` per plugin.
- [ ] Layani `/_admin/plugins/*` (pakai `resolveSafePath`).
- [ ] `njin build`/`njin dev` membuild plugin lokal dengan `adminPluginConfig`
      (`vite` sebagai peer/optional dependency, hanya wajib bila `admin.plugins` terisi).
- [ ] Tes di core untuk semuanya.
- [ ] Distribusi admin: aset rilis GitHub dan `adminVersion`, menggantikan `template/_admin` yang sudah usang.
- [ ] Catat perubahan breaking `GET /api/schema` (`data` jadi `models`) di CHANGELOG bila ada.

## 7. Tooling dan rilis

- [ ] `.gitattributes` (`* text=auto eol=lf`).
- [x] CI: biome, typecheck, tes, dan build admin (`.github/workflows/ci.yml`), lulus di `main`.
- [x] `LICENSE` (MIT, sama dengan core).
- [ ] Rilis `@njinlabs/njin-admin` ke npm (alur seperti njin: GitHub Release lalu npm, dist-tag beta dulu).
- [ ] Dokumentasi untuk penulis plugin (cara membuat, membuild, CSS, API yang tersedia).
- [x] Remote git dan push (`github.com/njinlabs/njin-admin`).

## Urutan yang disarankan

1. ~~Cek di browser~~ dan ~~lapisan data (1)~~: selesai.
2. ~~Sidebar dari `useQuery(schemaQuery)`~~: selesai. Lanjut Content (2): daftar record dan form dari
   `model.form`/`model.schema`.
4. Kontrak plugin (3) sebelum plugin pihak ketiga pertama.
5. Integrasi core (6) dan sisa auth (5): 401, izin.
6. Settings, Files, Users, Analytics.
7. Kit UI (4) berjalan paralel: `RenderForm` dan `RichTextEditor` dulu; komponen yang butuh API menyusul.

## Catatan teknis yang perlu diingat

- Config Vite plugin dijalankan dengan `bunx --bun vite build` karena Node tidak bisa me-resolve impor TypeScript
  tanpa ekstensi dari workspace. `njin build` memanggilnya lewat API Vite di dalam Bun.
- Plugin dibuild mode produksi dengan runtime JSX produksi, karena admin hanya membagi `react/jsx-runtime` produksi.
- `@theme static` di `theme.css` wajib: tanpanya Tailwind hanya menulis token yang dipakai halaman admin sendiri,
  dan token yang hanya dipakai plugin tidak akan ada.
- Rute dan tautan ke halaman plugin/model tidak diperiksa tipenya, karena path-nya baru diketahui saat runtime.
- `schema.ts` adalah `lib/schema.ts` lama (inti admin), kini dengan perbaikan untuk kolom `nullable`, `minItems`/`maxItems`,
  dan id yang mengandung `:`. Perubahan lain pada berkas itu harus kecil, dijelaskan, dan diuji dengan schema asli server
  (`tests/fixtures/*-schema.json`).
