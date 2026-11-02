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
- [x] `/api/schema` diparse jadi `Field[]` (`getSchema`, `schemaQuery`); core njin sudah mengirim `{ models, vars, i18n }`.
- [x] Router dari registry (`createAdminRouter`), pemuat manifest dari `/api/admin/manifest`.
- [x] Biome, git, 50 tes (unit dan feature); plugin yang dibuild tes ada di `packages/tests/fixtures/plugin`.

## Belum terbukti

- [ ] Menjalankan admin di browser sungguhan: "Reports" tampil, tombolnya bereaksi (hook dari React bersama),
      `Link` berpindah halaman, tombol berwarna dari token. Tes baru membuktikannya di bun.
- [ ] Dark mode lewat penggantian variabel token tanpa membuild ulang plugin.

## 1. Lapisan data admin

Murni logika, tidak butuh UI, dan dipakai semua halaman nanti.

- [x] **Satu schema zod, 1:1 dengan backend** (`sdk/schema/schema.ts`): `lib/schema.ts` lama dipindah tanpa perubahan logika
      (`transformSchema`, `toForm`, `getDefaultValues`). `getSchema` membuat `z.fromJSONSchema` lalu `transformSchema` dan
      `toForm` untuk tiap model dan grup vars, persis seperti `app-sidebar.tsx` lama. Aturan (panjang, pola, email,
      rentang) ikut dari JSON schema tanpa ditulis ulang.
- [x] **Dua celah di `schema.ts` lama ditutup**: kolom `nullable` (union tanpa meta dari `anyOf [X, null]`) dan
      `minItems`/`maxItems` (array dibangun ulang tanpa aturan panjangnya). Perbaikan kecil di `unwrap` dan `transformType`,
      dengan tes terhadap schema asli server.
- [x] **Normalisasi error API**: `toApiError` (pesan, status, error per field dari 422 dan 409).
- [x] **Endpoint yang belum dibungkus**: file (`uploadFile`), analytics (`getAnalytics`), setup. Users dan daftar/hapus file
      memakai `modelApi(client, "user")` / `modelApi(client, "file")`.
- [x] **Mutation options** (create, update, destroy, draft, removeLocale, vars, upload) yang meng-invalidate
      `["model", prefix]`, pasangan dari `queryOptions`.

## 2. Shell dan fitur bawaan

Fitur bawaan ditulis sebagai plugin internal dengan kontrak yang sama dengan plugin pihak ketiga, supaya kontraknya
teruji sendiri.

- [ ] **Shell**: layout dengan sidebar dari `navs` (via `Link`), `loadSchema` diganti `useQuery(schemaQuery)`
      dan sidebar membaca hasilnya. Loading dan error jadi state.
- [ ] **Content** (dikerjakan pertama): daftar record per model (TanStack Table, cari, urut, filter, paginasi),
      form buat/ubah dari `Field[]`, hapus, draft/publish, i18n per bahasa.
- [ ] **Settings**: halaman grup vars (baca, ubah, draft/publish, i18n).
- [ ] **Files**: pustaka berkas dan unggah.
- [ ] **Users**.
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

Menunggu keputusan arah visual; urutan di atas tidak bergantung padanya.

- [ ] **Putuskan arah visual**. Nilai token di `theme.css` sekarang placeholder.
- [ ] Isi `packages/src/ui/` dan tambah export `./ui`: komponen headless (Base UI) dengan gaya sendiri.
- [ ] Token final, mode gelap, dan dokumentasinya.

## 5. Auth dan sesi (dikerjakan kolega, belum di-push)

Jangan disentuh sebelum kode kolega masuk. Setelah itu:

- [ ] Interceptor token di `createClient`, penanganan 401, halaman login.
- [ ] Provider sesi tipis; `can(model, action)` dari scope OAuth per model.
- [ ] Menu dan tombol mengikuti izin.
- [ ] `loadSchema`/`getSchema` hanya jalan setelah login.

## 6. Integrasi di core njin

Pekerjaan di repo `njin`. Menunggu auth kolega masuk supaya tidak bentrok.

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
- [ ] CI: typecheck, lint, tes.
- [ ] Rilis `@njinlabs/njin-admin` ke npm (alur seperti njin: GitHub Release lalu npm, dist-tag beta dulu).
- [ ] Dokumentasi untuk penulis plugin (cara membuat, membuild, CSS, API yang tersedia).
- [ ] Remote git dan push.

## Urutan yang disarankan

1. Cek di browser (bagian "Belum terbukti").
2. Lapisan data (1), karena murni dan tidak menunggu siapa pun.
3. Shell lalu Content (2), dengan UI kasar dulu.
4. Kontrak plugin (3) sebelum plugin pihak ketiga pertama.
5. Integrasi core (6) dan auth (5) begitu kode kolega masuk.
6. Settings, Files, Users, Analytics.
7. Arah visual dan kit UI (4) paralel, kapan pun diputuskan.

## Catatan teknis yang perlu diingat

- Config Vite plugin dijalankan dengan `bunx --bun vite build` karena Node tidak bisa me-resolve impor TypeScript
  tanpa ekstensi dari workspace. `njin build` memanggilnya lewat API Vite di dalam Bun.
- Plugin dibuild mode produksi dengan runtime JSX produksi, karena admin hanya membagi `react/jsx-runtime` produksi.
- `@theme static` di `theme.css` wajib: tanpanya Tailwind hanya menulis token yang dipakai halaman admin sendiri,
  dan token yang hanya dipakai plugin tidak akan ada.
- Rute dan tautan ke halaman plugin/model tidak diperiksa tipenya, karena path-nya baru diketahui saat runtime.
