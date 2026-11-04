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
- [x] Biome, 217 tes (unit dan feature); plugin yang dibuild tes ada di `packages/tests/fixtures/plugin`.
- [x] Repo di GitHub (`njinlabs/njin-admin`, public), `LICENSE`, dan CI (biome, typecheck, tes, build admin).

## Belum terbukti

- [x] Admin di browser sungguhan: halaman plugin tampil, tombolnya bereaksi (hook dari React bersama), `Link`
      berpindah halaman, tombol berwarna dari token. Sudah dicoba pemilik repo.
- [ ] Dark mode untuk plugin: set gelap token sudah ada di `theme.css`; plugin seharusnya ikut tanpa dibuild ulang,
      tapi belum dilihat di browser (dilaporkan pemilik repo sudah dicoba semua; konfirmasi bagian ini).

## 1. Lapisan data admin

Murni logika, tidak butuh UI, dan dipakai semua halaman nanti.

- [x] **Satu schema zod, 1:1 dengan backend** (`sdk/schema/schema.ts`): `lib/schema.ts` lama dipindah tanpa perubahan logika
      (`transformSchema`, `toForm`, `getDefaultValues`). `getSchema` membuat `z.fromJSONSchema` lalu `transformSchema` dan
      `toForm` untuk tiap model dan grup vars, persis seperti `app-sidebar.tsx` lama. Aturan (panjang, pola, email,
      rentang) ikut dari JSON schema tanpa ditulis ulang.
- [x] **Dua celah di `schema.ts` lama ditutup**: kolom `nullable` (union tanpa meta dari `anyOf [X, null]`) dan
      `minItems`/`maxItems` (array dibangun ulang tanpa aturan panjangnya). Perbaikan kecil di `unwrap` dan `transformType`,
      dengan tes terhadap schema asli server.
- [x] **Sambungkan ke form**: `getDefaultValues(model.schema)` untuk nilai awal, `model.schema` (dipilih ke field yang punya
      input) sebagai validator form, `toApiError(...).fields` untuk error server per field.
- [x] **Field per bahasa (`localized`)**: server mengirimnya sebagai peta bahasa ke nilai; `toForm` membacanya sebagai
      field satu bahasa (`localized: true`) dan `transformSchema` membangun ulang peta itu, jadi file yang dipilih di satu
      bahasa diluruskan ke id. Dengan tes terhadap schema Article (`tests/fixtures/article-schema.json`).
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
      header Shell lewat `HeaderActions` (portal ke `HeaderSlot`). Lebar kolom per tipe field (`columnSize`) dengan satu baris dan
      "…" bila terlalu panjang, kolom teks pertama menyerap sisa ruang, kolom bisa diseret dan dipilih (menu "Columns"),
      keduanya disimpan per model di browser; thumbnail di sel file; model i18n dibaca dengan bahasa default; skeleton yang
      mengikuti bentuk daftar.
- [x] **Content, form Buat/Ubah** (`pages/content-form.tsx`, `RenderForm`): semua 13 tipe field punya input. Model i18n:
      tab bahasa (default, yang sudah terisi, dan "+ Add language"), semua bahasa disimpan sekaligus. Model `draftable`:
      status sebagai lencana di samping judul; tombol Cancel/Discard, Save, Unpublish, Publish (hanya ikon di mobile); Publish
      menyimpan dulu lalu menerbitkan semua bahasa. Layout dua kolom yang mengikuti lebar kotaknya.
- [x] **Content, filter dan status**: tombol filter (ikon corong, lencana jumlah aturan) di samping Columns membuka dialog;
      tiap baris: field, operator sesuai tipe (`lib/filters.ts`), nilai (teks, angka, tanggal, pilihan, ya/tidak, relasi);
      aturan pada satu field digabung jadi satu objek operator di `filters`. Model draftable punya kolom Status (lencana) dan
      field filter Status; semua model punya filter Created. Tombol di header daftar kini hanya ikon.
- [x] **Content, form**: tombol hapus satu bahasa (ikon sampah di ujung tab bahasa, dengan konfirmasi), umpan balik setelah Save
      (ikon dan label berubah jadi "Saved" sebentar; record baru membawanya ke halaman edit lewat state router), dan
      peringatan perubahan yang belum disimpan (`useBlocker` untuk tautan/kembali, `beforeunload` untuk tab).
- [x] **Content, sisanya**: `Form.required`/`nullable`/`minItems`/`maxItems` dibaca dari schema (bintang pada input yang wajib;
      teks wajib tidak boleh kosong); `toInput` (`sdk/schema`) tidak mengirim teks kosong `""` (null bila field boleh null),
      relation/file tunggal yang dikosongkan jadi `null`; elemen array bisa dipindah naik/turun; `Add`/`Remove` mengikuti
      `min`/`max`; label `select` adalah nilainya (server memang tidak punya label).
- [ ] Pembatasan jenis file per field (butuh info dari server).
- [x] **Settings** (`pages/settings.tsx`, `/settings/$prefix`): form grup vars dengan `RenderForm`, dibaca/ditulis sekaligus
      (`varsQuery`, `updateVarsMutation`). Grup draftable: lencana status, Discard/Save/Unpublish/Publish (`draftVarsMutation`);
      grup i18n: satu tab per bahasa, semua disimpan bersama. Izin `vars.<prefix>` read/write: tanpa write formnya hanya baca.
      Umpan balik "Saved" dan peringatan perubahan belum disimpan sama seperti form konten. Bagian bersama form konten diekstrak
      (`ActionButton`, `LocaleTabs`, `withoutEmpty`).
- [x] **Files** (`pages/files.tsx`, `components/file-manager.tsx`, `file-picker-dialog.tsx`): grid dengan cari dan infinite
      scroll, unggah banyak berkas dengan panel progres, unduh, salin link, hapus (`ConfirmDialog`), semua mengikuti izin
      `file`. Halaman Files dan pemilih adalah komponen yang sama (`FileManager`); `picker` menambah pilihan satu/banyak,
      dan `FilePickerDialog` menahan pilihan sampai tombol Select. Kit bertambah: `Dialog`. `uploadFile` diperbaiki
      (server membalas array satu elemen) dan melaporkan progres. Pemilih sudah dipasang di form (`file`/`multi_file`) dan di
      editor richtext (hanya gambar); dalam pemilih grid-nya paling banyak 4 kolom.
- [x] **Users** (`pages/users/`): daftar user dan daftar access group dalam satu bagian (tab di `/users` dan
      `/users/groups`), form buat/ubah keduanya. Daftar memakai `RecordList` (diekstrak dari daftar konten). Form user:
      field group hanya muncul bila boleh `access_group:update` (server menolak bila tidak). Form group: `GrantsEditor`
      menggambar tabel resource x aksi dari `GET /api/access/catalog` (sel Tidak/Own/All, kotak centang untuk settings
      dan analytics, sakelar Full access); nilainya tetap daftar string grant, wildcard yang tak punya sel ditampilkan
      sebagai badge dan ikut tersimpan (`splitGrants`/`joinGrants` di `sdk/api/grants.ts`). Kit bertambah: `Badge`,
      `Checkbox`, `MultiSelect`.
- [x] **Dashboard** (`pages/dashboard.tsx`, `lib/dashboard.ts`): kosong secara default. Tombol Edit di kanan header membuka mode
      ubah: seret untuk menukar posisi (`@dnd-kit/react`), hapus, dan Add widget (dialog berisi widget yang boleh dilihat user,
      dari bawaan dan plugin). Ukuran ditentukan widget (`size`), grid 1/2/6 kolom mengikuti lebar halaman, baris
      selebar tile tertinggi. Disimpan di `localStorage` per user (`njin-admin.dashboard.<id>`) sampai server punya tempatnya.
      Kunci widget `"<plugin>:<id>"`.
- [x] **Widget bawaan** (`app/src/widgets/`, daftar `widgets.main` di `registry.tsx` seperti `navs.main`/`routes.main`, kunci
      `admin:<id>`), gaya dari admin lama (recharts): Total pageviews dan Unique visitors (tren terhadap periode sebelumnya),
      Traffic (grafik area 7/30/90 hari), By page / By referrer / By country (daftar dengan bar proporsional), Recent content,
      Waiting to be published (model draftable yang boleh dipublish) dan Quick actions. Sudah dicoba di browser. Urut `updatedAt`
      dan filter `status $in` perlu dicek ke server. Belum: jumlah konten, file terbaru, akun saya.
- [ ] **Analytics** (halaman sendiri).
- [x] Editor richtext (TipTap, konfigurasi dari admin lama, gambar lewat pemilih file dengan alt dan sumber teroptimasi
      lewat `/img`) dan pemilih relasi/file di form.

## 3. Kontrak plugin

Yang sudah ada hanya `navs` dan `routes`. Perlu diputuskan sebelum ada plugin pihak ketiga:

- [x] **Apa yang boleh disumbang plugin**: menu (`navs`, `order`, `requires`), halaman (`routes`, `requires`), widget dashboard
      (`widgets`: `size`, `order`, `requires`; `pages/dashboard.tsx`, tiap widget dalam `ErrorBoundary`) dan renderer field
      (`fields`, dipilih server lewat `plugin(text(), ["nama-plugin:renderer", options])`, disimpan sebagai
      `"<name>:<renderer>"`). `name` plugin wajib. Izin plugin dideklarasikan di `definePlugin({ permissions })` server.
- [x] Renderer field dan i18n: `FieldProps.locale` adalah bahasa yang sedang diedit, dan `values` sudah berisi nilai bahasa itu
      untuk field `localized` tingkat atas (bukan peta), jadi renderer seperti `slugify` tidak perlu tahu bentuk peta.
      Field `localized` di dalam object/array belum diselesaikan.
- [ ] Yang belum: halaman di bawah `/content/<prefix>`, aksi tambahan di daftar record, renderer untuk sel daftar,
      widget bawaan (analytics), section menu bebas.
- [x] **Versi kontrak**: `contract.version` (`shared.ts`) naik pada perubahan yang memecah apa yang diimpor plugin. Build plugin
      menulis `contract.json` di sebelah `index.js`; manifest membawa angkanya (`ManifestPlugin.contract`, diisi tooling core,
      lihat bagian 6). `loadPlugins` menolak plugin yang berbeda atau tidak menyebut kontrak (`contractProblem`), dengan
      `console.error` dan tanpa memuat style-nya.
- [x] **Versi modul bersama**: aturannya, major React, react-dom, Query dan Router bagian dari kontrak (`contract.shared`); tes
      memastikannya sama dengan peer dependency dan versi terpasang, jadi mengganti major tanpa menaikkan kontrak gagal di tes.
      Plugin yang ditolak juga muncul sebagai toast ("Plugin not loaded") lewat nilai balik `loadPlugins`.
- [ ] **Panduan CSS untuk plugin**: wajib `@source` ke folder plugin sendiri (lihat `plugin.css`), kelas buatan sendiri
      diberi awalan, hanya memakai token yang ada,
      daftar token yang stabil (nama token adalah kontrak).
- [ ] Mem-bundle tipe untuk penulis plugin (apa yang diimpor dari `@njinlabs/njin-admin/sdk`).

## 4. Tampilan dan kit UI

Dikerjakan satu komponen per langkah; urutan di atas tidak bergantung padanya.

- [x] **Warna utama diputuskan**: `#186049` jadi langkah 700 skala `primary` 50-950 (OKLCH, hue tetap). `primary` =
      700 di mode terang, 300 di mode gelap. Kontras mode gelap dinaikkan (teks, teks redup, border). Token lain
      (abu-abu, `danger`) masih nilai pertama.
- [x] **Kit di `packages/src/ui/`, export `./ui`** (Base UI, hanya token, dibagi ke plugin lewat `sharedModules`):
      `Button`, `Field`/`FieldLabel`/`FieldDescription`/`FieldError`, `Input`, `Switch`, `Select`, `Popover`,
      `Calendar` (react-day-picker), `DatePicker`, `Skeleton`, `Dialog`, `ConfirmDialog` (AlertDialog Base UI, versi sempit dari
      `Dialog`, dengan animasi), `Badge`, `Checkbox`, `MultiSelect`, `Toaster`/`toast` (Base UI Toast), dan varian `danger-ghost` pada `Button`. Halaman `/components` di admin untuk melihatnya.
- [x] Item menu aktif di sidebar memakai warna `primary` (bukan abu-abu) supaya jelas terlihat.
- [x] Sudah dicoba di browser: klik, popup `Select`/`DatePicker`, navigasi bulan, `ConfirmDialog`, popover menu user, mode gelap kit.
- [x] **`RenderForm`** (semua tipe: text, email, numeric, boolean, select, datepicker, object, array, relation,
      multi_relation, file, multi_file, richtext; `react-hook-form` dan `react-number-format`) dan **`RichTextEditor`** (TipTap).
      Kit bertambah: `NumberInput`, `Combobox`, `MultiCombobox`, `RelationInput`, `FileInput`, `RichTextEditor`. Relation
      dicari di server (`loadRelated`, jeda 250 ms), pemilih file dan alamat gambar diberikan app (`filePicker`, `imageSrc`).
      `FieldError` bisa berdiri di luar `Field`. Popup `Select`/`MultiSelect` tidak lagi bergeser ke item terpilih.
- [x] **Komponen halaman**: tabel data (kolom lebar tetap, seret, pilih kolom), skeleton form dan tabel, lencana status di
      judul (`TitleSlot`). Paginasi lewat infinite scroll; toast ada (`toast.success/error/info`, `Toaster` dipasang di `main.tsx`).
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
      `["schema"]`/`["model"]` (cache per sesi harus dibersihkan di sini juga bila bertambah).
- [x] 401 di tengah sesi: `Protected` memasang interseptor (`watchExpiry`, `lib/session.ts`) pada client; 401 untuk request yang
      membawa token yang sedang dipakai membersihkan cache sesi (`clearSession`), menghapus cookie, dan router mengarahkan ke
      `/login` dengan pesan "Your session has ended" (state router `expired`, juga untuk token yang ditolak `check-token`). 401 tanpa token (salah password) atau untuk token yang sudah diganti diabaikan.
- [ ] Cookie `HttpOnly` dari server: login mengirim `Set-Cookie`, server membaca cookie, ada perlindungan CSRF. Pekerjaan
      di core. Cookie sekarang ditulis script (server mengirim token di JSON), jadi bisa dibaca script lain di halaman,
      sama seperti localStorage.
- [ ] Plugin dimuat sebelum login. Bila `GET /api/admin/manifest` nanti butuh token, plugin tidak termuat setelah login
      lewat router; cari cara memuatnya setelah sesi diperiksa.
- [x] Izin: `GET /api/auth/permissions` (sudah dihitung server: wildcard, scope own/all, scope token, level `ref`) dimuat
      `Protected` bersama user sebelum halaman mana pun tampil, lalu dibaca lewat `useSession()`. `can`, `canList` dan
      `canOn` (untuk satu baris, baris sendiri pada level `own`) ada di `sdk/api/permissions.ts`.
- [x] Menu dan tombol mengikuti izin: menu (Content, Settings, Files, Users), daftar konten (New, Edit, Hapus, empty state), halaman
      Users dan access group (juga lewat URL), form konten (publish, Unpublish dan Discard ikut `publish`, seperti di server),
      Settings, Files, widget. Pemilih relation tidak bertanya ke model yang tidak boleh dibaca, dan pemilih file hanya ada bila
      `file` boleh dibaca.
- [x] Hook izin untuk plugin: `useSession`, `useClient`, `useCan`, `useCanOn` di `sdk/session.tsx` (konteks dipasang
      `Protected`, sdk dibagi ke plugin). `requires` pada menu, halaman, dan widget mengikutinya.

## 6. Integrasi di core njin

Pekerjaan di repo `njin`. Auth di core sudah masuk; tanyakan kolega dulu sebelum menyentuh bagian yang sama.

- [x] `definePlugin({ admin: [plugin], permissions })` di core: `admin` berisi lokasi file admin plugin (`import.meta.resolve(...)`), dilayani Vite dev server core lewat `GET /api/admin/manifest` (`adminPluginDev` mengalihkan modul bersama ke `globalThis.__njin`; paket yang bergantung pada React tidak di-pre-bundle),
      `permissions` ditambahkan ke katalog izin (`buildCatalog`, `GET /api/access/catalog`, `/api/auth/permissions`),
      `plugin(type, [name, options])` di data type. Tes di `tests/core` dan `tests/modules/plugin_permissions.test.ts`.
- [ ] Tooling build plugin admin yang mengisi lokasi build ke objek `admin` (entry/styles) supaya manifest bisa dibuat.
- [ ] Plugin lokal tanpa paket npm (`admin.plugins` di config).
- [ ] `GET /api/admin/manifest`, termasuk `styles` per plugin.
- [ ] Layani `/_admin/plugins/*` (pakai `resolveSafePath`).
- [ ] `njin build`/`njin dev` membuild plugin lokal dengan `adminPluginConfig`
      (`vite` sebagai peer/optional dependency, hanya wajib bila `admin.plugins` terisi).
- [ ] Tes di core untuk semuanya.
- [ ] Distribusi admin: aset rilis GitHub dan `adminVersion`, menggantikan `template/_admin` yang sudah usang.
- [ ] Catat perubahan breaking `GET /api/schema` (`data` jadi `models`) di CHANGELOG bila ada.

## 7. Tooling dan rilis

- [x] `.gitattributes` (`* text=auto eol=lf`).
- [x] CI: biome, typecheck, tes, dan build admin (`.github/workflows/ci.yml`), lulus di `main`.
- [x] `LICENSE` (MIT, sama dengan core).
- [x] Alur rilis otomatis (`.github/workflows/release.yml`, GitHub Release `published`): cek (biome, typecheck, tes, tag sama
      dengan `packages/package.json`), lalu publish `@njinlabs/njin-admin` ke npm (provenance, prerelease di dist-tag sendiri)
      dan build `app/` jadi `njin-admin-<tag>.tar.gz` (isi `dist/` langsung, plus `.sha256`) yang dilampirkan ke rilis.
      CodeQL di `codeql.yml`. Belum dicoba sungguhan: butuh secret `NPM_TOKEN` dan rilis pertama.
- [ ] Dokumentasi untuk penulis plugin (cara membuat, membuild, CSS, API yang tersedia).
- [x] Remote git dan push (`github.com/njinlabs/njin-admin`).

## Urutan yang disarankan

1. ~~Cek di browser~~ dan ~~lapisan data (1)~~: selesai.
2. ~~Sidebar dari `useQuery(schemaQuery)`~~ dan ~~Content: daftar, form, draft/publish, i18n~~: selesai (sisanya di
   "Content, sisanya"). Settings selesai; lanjut Analytics/Dashboard.
4. Kontrak plugin (3) sebelum plugin pihak ketiga pertama.
5. Integrasi core (6) dan sisa auth (5): 401, izin.
6. Settings, Files, Users, Analytics.
7. Kit UI (4) berjalan paralel; `RenderForm` dan `RichTextEditor` sudah selesai.

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
