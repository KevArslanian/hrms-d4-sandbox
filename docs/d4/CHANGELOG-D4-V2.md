# CHANGELOG · D4 V2

Tanggal: 29 Sep 2026 · Branch: `feature/d4-v2-d2-style`

## Ringkasan per kritik asistensi

| # | Kritik | Kondisi V1 | Perubahan V2 | Bukti |
|---|---|---|---|---|
| K1 | Pop-up terlalu besar | Modal KPI `max-w-[1485px]`, Evaluation `max-w-[1480px]` | Satu `FormModal`: 640 px, KPI 880 px, tinggi maks 88vh, body scroll, footer sticky | `modules/d4/web/ui/forms.tsx`, semua `*Modal*.tsx` |
| K2 | Menu ⋮ "kerja dua kali" | ⋮ membuka panel Employee Quick View | ⋮ langsung membuka menu 2–4 aksi di portal, dengan navigasi keyboard | `modules/d4/web/ui/RowActionMenu.tsx` |
| K3 | Detail beda-beda per fitur | Modal (Competency), popover (Training), dropdown → page (Performance) | Detail dan History selalu route sendiri dengan breadcrumb dan tombol Back | 17 route di `app/(d4)/` |
| K4 | Blank space, dashboard tidak responsif | `max-w-[1048px]` di People Dashboard | Konten `max-w-[1600px]`, tabel dashboard penuh lebar dengan kolom sekunder yang disembunyikan di bawah 1400 px, sidebar jadi drawer di bawah 1024 px | Diuji 1440, 1280, 768 px tanpa scroll horizontal halaman |
| K5 | Font kebesaran | Ukuran px acak | Type scale tetap di `@theme` dan text style Figma `D4/*` | `app/globals.css`, UI-D4-001 §2 |
| K6 | Tidak ada API sendiri | UI memanggil Supabase langsung | `app/api/d4/**` → `modules/d4/server/<resource>/index.ts`, envelope error dengan kode, seeder | API-D4-001 |
| K7 | Checklist Planka dan label WebDev | Banyak item belum dicentang | Draft sinkron checklist berbasis bukti + label Front End/Back End | `drafts/planka/` |
| K8 | FR-D4-004 digabung tanpa alasan | — | Paragraf relasi FR-D4-003 ↔ FR-D4-004 + tabel traceability | `drafts/docmost/02-…` |
| K9 | Jumlah fitur membingungkan | 4 vs 6 vs 7 | Sidebar tepat 6 menu; FR-D4-007 dijelaskan sebagai source chip, bukan menu | `modules/d4/web/ui/AppShell.tsx`, UI-D4-001 §5 |

## Ditambahkan

- **Shell D2**: sidebar navy 260 px dengan sub-menu Performance & Training, topbar 64 px dengan breadcrumb, badge peran, dan badge "Preview · data fiktif" di mode preview.
- **Komponen bersama** (`modules/d4/web/ui/`): `PageHeader`, `FilterBar`, `SearchInput`, `SelectFilter`, `DataTable` (pagination 8 baris, baris dapat diklik, empty state), `PersonCell`, `RowActionMenu`, `DetailHeader`, `Timeline`, `Card`, `InfoGrid`, `StatusBadge`, `SourceChip`, `FormModal`, field form, `Toasts`, `StateView`, `NotFound`.
- **Halaman**: list, detail, dan history untuk kelima fitur data; People Dashboard + Employee Performance Profile.
- **API**: 14 route handler dengan `requireWriter` (HR/MANAGER), validator `field.*`, kode error `BAD_REQUEST` · `UNAUTHENTICATED` · `FORBIDDEN` · `NOT_FOUND` · `VALIDATION_FAILED` · `SERVER_ERROR`, dan `POST` 201.
- **Katalog KPI V5.1** (10 role × 5 KPI) di `modules/d4/kpi/catalog.ts` dan migrasi `20260929150000_d4_kpi_catalog_v51.sql` (belum diterapkan).
- **Mode preview** (`NEXT_PUBLIC_D4_DATA_MODE=fixture`, hanya `next dev`) dengan pilihan peran `NEXT_PUBLIC_D4_FIXTURE_ROLE`. Peran EMPLOYEE hanya melihat datanya sendiri dan tidak bisa menulis.
- **Seeder** `npm run seed:d4` (dry run default, `--apply` untuk menulis, penanda `[seed-d4]`).
- **Filter source requirement** di Training Tracking (dihapus lagi pada perbaikan bug 6 Okt 2026; diganti filter departemen).
- **Periode sumber** di bawah skor KPI dan Performance pada tabel People Dashboard.
- **Figma**: 36 frame D4 V2 dan 8 prototype link di https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F (page `D4`). Source chip yang lebih lebar dari kolomnya memotong referensinya dengan elipsis.
- **Dokumentasi**: UI-D4-001, API-D4-001, brief redesign, draft Docmost/Planka.

## Diubah

- Aksen hijau mengikuti D3: avatar inisial employee hijau `#16A37A` dengan teks putih, avatar user login di topbar mint `#B4F9CA` dengan teks `#0B6B4F`. D3 memakai `#2EAA68` 71% dan `#94F7B3` 70%; nilai D4 digelapkan agar inisial tetap terbaca.
- Status database `Bukti Belum Cukup` ditampilkan sebagai **Data Belum Cukup** dengan warna netral.
- Training Completed menampilkan catatan bahwa gap tidak otomatis tertutup.
- Semua perubahan status Development dan Training disimpan sebagai revisi (`POST …/versions`), bukan menimpa record.
- Format error API dari `{ "error": "…" }` menjadi `{ "error": { "code", "message" } }`. Error 500 tidak lagi membawa detail SQL.

## Dihapus

- Route lama `/live`, `/demo`, `/qa-preview`, `/employee/[id]`, dan layar V1 di `modules/d4/{performance,kpi,competency,development,training,dashboard}/*Screen.tsx`.
- Quick-view panel, popover detail, dan modal detail.
- Salinan komponen `components/Custom*.tsx`, `Pagination.tsx`, `StatusBadge.tsx`, `UserInput.tsx` yang tidak lagi dipakai. `components/auth/*` dan `public/auth`, `public/fonts` dihapus saat login diganti versi B2 GitHub (1 Okt).
- Aset SVG hasil ekspor Figma lama di `public/figma/`.
- Penyimpanan `localStorage` untuk data fitur.

## Revisi audit · 30 Sep 2026

Audit ulang terhadap FR-D4-001..006 (Docmost), checklist Planka, dan catatan VN asistensi. Detail dan dasar teorinya di [AUDIT-UX-D4.md](AUDIT-UX-D4.md).

- **Performance Evaluation**: form hanya berisi field FR-D4-001 — Employee, Period, Evaluation date, Evaluator, **Hasil evaluasi 1–5** (dengan label 1 Sangat Kurang … 5 Sangat Baik), Catatan evaluasi (wajib), Evidence. Tujuh aspek, review status manual, dan `Save Draft` dihapus karena tidak ada di FR.
- **KPI Scorecard**: KPI jabatan diturunkan otomatis dari position employee dan read-only; server menolak `roleOrder` yang tidak cocok. Satu tombol `Save Scorecard`. Halaman katalog `/kpi/catalog` dihapus (bukan fitur di FR), endpoint `kpi-catalog` tetap dipakai form.
- **People Dashboard**: satu baris = satu employee pada satu periode (FR-06.1); metric card agregat dihapus (di luar lingkup #12); profil punya pemilih periode dan peringatan bila scorecard tidak valid. Di bawah 1400 px kolom Position dan Open dev. disembunyikan.
- **Data fiktif**: nama staf asli diganti placeholder (Alfa … Holly, Mercury sebagai HR). Label peran "HR Manager" menjadi "HR".
- **Kode mati**: komponen `MetricCard` dihapus.
- **Figma**: 36 frame dibangun ulang dari builder (`figma-plugin/d4-v2-builder/code.js`), teks kolom lebar dipotong dua baris, lebar kolom dashboard dan Development Requirement disesuaikan, link prototype 14 → 18 dipulihkan.
- **Dokumen**: API-D4-001 §5 disesuaikan dengan kontrak evaluasi dan KPI yang baru; UI-D4-001 §2–§7 disesuaikan.

## Integritas logika · 30 Sep 2026 (malam)

Perbaikan dari audit ulang terhadap dokumen dan flow bisnis; detail di [AUDIT-UX-D4.md](AUDIT-UX-D4.md) §2.4–2.6. Aturan bersama ada di `modules/d4/shared/rules.ts` dan dipakai UI, fixture, serta API.

- **Tanggal WIB**: default tanggal dan periode form memakai `Asia/Jakarta`, bukan UTC (L1).
- **Revisi per periode**: evaluasi/scorecard kedua untuk employee + periode yang sama harus dikonfirmasi sebagai revisi (`revisionOf`); riwayat menampilkan "Revisi n" (L2).
- **Evaluator = user login**: field read-only; API mengambil nama dari akun dan menolak penilaian diri sendiri (L3, L4).
- **Training ↔ requirement**: requirement Completed tidak bisa diberi training baru; peringatan saat menyelesaikan requirement yang training-nya masih berjalan (L5).
- **Satu requirement terbuka per gap**: gap yang sudah tertangani tidak bisa dibuatkan requirement lagi; notes menyimpan nilai gap saat dibuat (L6).
- **Label**: "Evaluator", "Evaluation date", "Add Scorecard", "Add Evaluation" di semua layar (U1). Sempat diganti ke bahasa Indonesia (PR #9, #10), lalu kembali ke bahasa Inggris pada 6 Okt 2026.
- **Sidebar**: modul squad lain diredupkan dan ditandai belum terhubung (U2).
- **Training rollback**: status mundur wajib disertai alasan (U4).

## Uji stabilitas · 1 Okt 2026

Detail di [QA-STABILITY-D4.md](QA-STABILITY-D4.md). `npm test` (Vitest) menjalankan 90 tes tanpa menyentuh Supabase.

- **BUG-D4-001 (tinggi)**: update status development need dengan id tidak dikenal kini 404, bukan error database.
- **BUG-D4-002 (tinggi)**: referensi employee/posisi yang tidak ada kini 422, bukan 500.
- **BUG-D4-003 (sedang)**: pratinjau EMPLOYEE hanya memuat record milik sendiri, seperti RLS.

## Login B2 (GitHub) · 1 Okt 2026

- `/login` memakai kode login tim B2 dari `PISD-X-ANDIMA/Andima-HRMS` branch `feature/D3-005-employee-report-ticket`: tampilan kartu kaca, `signInWithPassword`, cek `d3_user_access`, `signOut` bila akun belum punya role.
- Penyesuaian D4: tujuan setelah login `/dashboard`; tidak ada register mandiri ("Belum punya akun? Hubungi HR Admin."); kotak "Kredensial Pengujian (Demo)" dari Figma B2 hanya tampil bila `NEXT_PUBLIC_D4_DEMO_EMAIL` dan `NEXT_PUBLIC_D4_DEMO_PASSWORD` diisi.

## Bahasa Indonesia dan perbaikan bug · 6 Okt 2026

- **Bahasa**: semua label, tombol, menu ⋮, header tabel, placeholder, empty state, dan form modal berbahasa Indonesia (PR #9, #10). `data-testid` lama dipertahankan agar XPath Katalon tidak berubah.
- **Perbaikan bug ronde 1**: kolom Departemen dan status Draf di KPI Scorecard, tanggal evaluasi tidak boleh di masa depan, tidak ada tombol Tambah untuk data diri sendiri, menu ⋮ tanpa "Lihat Detail" (klik baris), konfirmasi sebelum menutup modal yang sudah diisi, kode FR dihapus dari subjudul.

## Penyeragaman antar halaman · 6 Okt 2026

| Area | Sebelum | Sesudah | Bukti |
|---|---|---|---|
| Departemen | Filter dan kolom hanya di KPI Scorecard | Filter **Semua departemen** di keenam halaman daftar; kolom Departemen di Performance, KPI, Competency; Dashboard memakai kolom **Posisi / Departemen** | `modules/d4/web/features/*/…Pages.tsx` |
| Header detail/riwayat | Isi meta berbeda per fitur | Selalu posisi · ID · departemen, lalu konteks halaman | `employeeMeta` di `modules/d4/web/data/selectors.ts` |
| Riwayat Performance | Tanpa tombol tambah | Tombol **Tambah Evaluasi**, sama dengan riwayat KPI | `PerformancePages.tsx` |
| Tabel Dashboard 1440 px | Melebar 90 px, kolom Aksi terpotong | Muat tanpa scroll | `DashboardPages.tsx` |
| Profil karyawan Dashboard | Kolom Terbobot dan angka Total di luar layar | Terlihat tanpa menggeser tabel | `DashboardPages.tsx` |
| Filter | "Semua departemen" terpotong | Search min. 160 px, dropdown min. 180 px; muat satu baris di 1440 px | `modules/d4/web/ui/forms.tsx` |
| Tanggal | `en-GB`: "Sept 2026", "12 Oct 2026" | `id-ID`: "Sep 2026", "12 Okt 2026" | `formatDate`, `formatPeriod` |
| Copy | Back, Evaluator, capability/evidence/employee/position | Kembali, Penilai, kemampuan/bukti/karyawan/posisi | `ui/layout.tsx`, fitur terkait |
| Form Training | Error "Lengkapi field wajib… Completed" walau status lain; requirement sumber "belum memiliki requirement" sebelum karyawan dipilih | "Lengkapi <field> sebelum menyimpan." seperti form Evaluasi; "Pilih karyawan terlebih dahulu"; status berlabel Indonesia | `TrainingModals.tsx` |
| Data fixture | Requirement Alfa Teridentifikasi padahal training Direncanakan; Charlie Direncanakan padahal training Sedang Berjalan bertanggal 12 Okt | Requirement Alfa Direncanakan, Charlie Sedang Berjalan; training Charlie 1 Okt 2026 | `modules/d4/development/fixtures.ts`, `modules/d4/training/fixtures.ts` |

Belum diputuskan: status requirement tidak otomatis mengikuti status training, dan training Sedang Berjalan masih boleh bertanggal di masa depan. Keduanya aturan bisnis yang perlu keputusan PO.

## UI bahasa Inggris dan font Poppins · 6 Okt 2026

Keputusan pemilik produk: tampilan D4 di Vercel memakai bahasa Inggris dan font Poppins. Ini membalik arah PR #9/#10 (Bahasa Indonesia).

| Area | Perubahan | Bukti |
|---|---|---|
| Font | Inter + Montserrat diganti **Poppins** (400–800) untuk teks dan judul; judul tetap SemiBold lewat `font-semibold` | `app/layout.tsx`, `app/globals.css` |
| Teks UI | Semua label, tombol, menu ⋮, header tabel, placeholder, empty state, modal, toast, dan halaman login/register berbahasa Inggris; `<html lang="en">` | `modules/d4/web/**`, `app/login`, `app/register` |
| Pesan error API | Pesan validasi dan error server dalam bahasa Inggris (status kode tidak berubah) | `modules/d4/shared/rules.ts`, `shared/errors.ts`, `server/**`, `supabase/repository.ts` |
| Status | Status workflow tampil sesuai nilai database (Completed, Planned, …); status kompetensi D3 ditampilkan sebagai Met / Insufficient Data / No Requirement | `statusLabel` di `ui/primitives.tsx` |
| Tanggal | "12 Oct 2026", "Sep 2026" | `formatDate`, `formatPeriod` |
| Katalon | Semua `data-testid` sama persis dengan sebelum terjemahan (diverifikasi di 39 tampilan mode preview) | slug lama dipasang sebagai `testId` eksplisit |
| Data fixture | Data contoh mode preview diterjemahkan | `*/fixtures.ts`, `shared/fixtures/reference-data.ts` |
| Layout | Placeholder search dipersingkat; kartu KPI di profil karyawan selebar penuh di ≥1280 px agar kolom Weighted dan Total tetap terlihat dengan Poppins | `DashboardPages.tsx` |

Tidak diterjemahkan: nama KPI katalog V5.1, data D3 (karyawan, posisi, kompetensi), isi data seed live, dan pesan error yang dibangkitkan fungsi database (`raise exception` di migrasi Supabase).

## Konsistensi filter dan tombol · 6 Okt 2026

- **Filter**: label seragam `All …` dan urutan Position → Department → Source → Period → Status. "Latest period" di Performance/KPI menjadi **All periods**; "All gap status" di Competency menjadi **All status**. Filter periode People Dashboard (daftar dan profil) tidak lagi punya pilihan kosong dan langsung menampilkan periode terbaru (mis. "Sep 2026"). `data-testid` tetap.
- **Training Tracking**: tombol **Add Training** di header dihapus; training dibuat dari Development Requirement → **Create Training**.
- **Tombol detail**: Assess Position Change (Competency) dan Update Status (Development) menjadi primer biru seperti Add Evaluation / Add Scorecard / Update Progress. View History dan link navigasi tetap putih.

## Evaluasi kinerja tanpa skor · 6 Okt 2026

Keputusan pemilik produk: Performance Evaluation hanya berisi catatan; skor hanya di KPI Scorecard.

- Form Add Evaluation tidak lagi punya field **Evaluation result**; API mengabaikan `overallScore` dan menyimpan `null`.
- Tabel Performance: kolom Result diganti **Notes**. Detail: Evaluation result dan Criteria dihapus. Riwayat: judul tanpa skor.
- People Dashboard: kolom Performance (skor) menjadi **Evaluation** (Completed / Not Evaluated); kartu profil menampilkan catatan evaluasi.
- Database: migrasi `20261006120000_d4_evaluation_score_optional.sql` melonggarkan check `d4_performance_evaluations_check` (skor tidak wajib untuk status completed). Kolom `overall_score` tetap ada untuk evaluasi lama. **Belum diterapkan**; sampai diterapkan, simpan evaluasi di mode live ditolak database.

## Perbaikan total D4 · 8 Nov 2026

Cabang `feat/D4-perbaikan-total`, dibangun di atas PR #37. Dua migrasi baru disiapkan tetapi **belum diterapkan**. Urutan, cek, dan rollback ada di [MIGRATION-RUNBOOK-D4.md](MIGRATION-RUNBOOK-D4.md).

**Bug**
- **UI-005:** logo Andima di `/login` dan `/register` baru tampil mulai lebar 1024 px, jadi tidak menimpa form di 768–1023 px.
- **UI-006:** sapaan memakai jam browser setelah hydrasi, bukan jam server (UTC).
- **UI-008:** riwayat Competency Gap memakai fallback "posisi tidak ada di master", sama dengan People Dashboard.
- `POST /api/d4/performance-evaluations` kini mewajibkan Reference, sama dengan endpoint KPI (Q12).

**Director read-only (B17)**
- Migrasi `20261108120000`: `DIR-*` dipetakan ke `MANAGEMENT`.
- Semua policy baca dan view D4 menerima `MANAGEMENT`. Policy insert tetap HR/MANAGER.
- Aplikasi menampilkan peran "Management" tanpa tombol simpan. Pengecualian (koreksi 9 Nov): Director mengisi Daily KPI miliknya sendiri, lihat bagian 9 Nov.

**Daily KPI** (asumsi kerja, menunggu konfirmasi klien)
- Menu baru `/daily-kpi`. Pegawai mengisi skor lima Core KPI miliknya per hari. Koreksi berarti entri baru di tanggal yang sama, dan entri terbaru yang dipakai.
- HR, Manager, dan Management melihat tabel tim: jumlah hari terisi, skor kompilasi, dan gap terhadap 85.
- Migrasi `20261108130000` membuat tabel `d4_kpi_daily_entries`. Database menegakkan:
  - pemilik entri adalah akun yang login;
  - peran KPI sesuai posisi sendiri;
  - tanggal di periode WIB berjalan dan tidak lewat hari ini.
- Diuji di Postgres lokal.
- Add Performance Review mengisi Actual dari rata-rata harian (dibulatkan, karena trigger menyimpan skor bulat). HR tetap meninjau dan menyimpan.
- Alert People Dashboard baru:
  - "Daily KPI di bawah target": tiga entri terakhir berturut-turut di bawah 85;
  - "Belum mengisi Daily KPI".

**KPI gap**
- Gap = skor − 85, ditampilkan per Core KPI (form dan detail) dan untuk Total KPI (list Performance Review, Ringkasan detail, profil Dashboard).
- Skala 1–5 tidak dikonversi; tampil `n/a (skala 1–5)`.

**Verifikasi**
- `typecheck` dan `eslint` (0 error).
- 448 tes Vitest.
- Render di mode fixture untuk HR, Employee, dan Management:
  - Daily KPI di 1440 px dan 375 px;
  - prefill Performance Review;
  - alert dashboard;
  - login/register di 900 px dan 1440 px.

## Skor periode otomatis dari Daily KPI · 8 Nov 2026

Keputusan: skor periode dikompilasi otomatis, dan HR melakukan finalisasi. Daily KPI diisi pegawai saja. Integrasi definisi KPI D1 ditunda. Ini menjawab B6: klien menyebut input manual per periode sebagai langkah mundur.

- **Performance Review:**
  - Pegawai yang punya entri Daily KPI tetapi belum punya scorecard untuk periode itu tampil dengan status **Compiled**, total kompilasi, jumlah entri, dan gap terhadap 85.
  - Tanpa filter periode, kompilasi periode berjalan menggantikan scorecard yang lebih lama.
  - Filter status mendapat pilihan Compiled.
- **Aksi baru "Finalize from Daily KPI"** (HR/Manager, bukan untuk diri sendiri):
  - Skor kompilasi tampil read-only. HR menambahkan Notes dan Reference (Q12), lalu menyimpannya sebagai scorecard periode lewat `POST /api/d4/kpi-assessments` yang sudah ada.
  - Tanggal evaluasi adalah hari ini untuk periode berjalan, atau hari terakhir periode untuk periode lalu.
  - Mengubah skor tetap bisa lewat Add Performance Review.
- **People Dashboard:**
  - Pilihan periode ikut memuat periode Daily KPI.
  - Kolom Total KPI menampilkan skor kompilasi dengan badge Compiled sampai difinalisasi.
  - Grafik, ringkasan, dan alert Under Performance tetap hanya memakai scorecard yang sudah final.
  - Efek samping: begitu ada entri Daily KPI, periode default dashboard bergeser ke bulan berjalan, karena itu periode terbaru yang sudah mulai.
- **Server dan database:** tidak ada perubahan.

**Syarat integrasi definisi KPI dari D1 (ditunda).** Kondisi live per 9 Nov 2026 (read-only). D1 memperbarui KPI-nya pada 8 Nov: kini 21 posisi D1 punya bobot 100% dengan target 85, dan sebagian besar berisi 4 KPI.
- **Masih memblokir:**
  - `d1_kpi_definitions` merujuk ke `d1_job_positions`, bukan ke `d3_positions` yang dipakai pegawai (B2) dan D4.
  - Tabel pemetaan `d3_d1_position_mappings` masih 0 baris.
  - 0 dari 14 posisi yang dipegang pegawai punya pasangan D1 Active dengan 5 KPI.
- **Syarat sebelum D4 membaca KPI dari D1:**
  1. Pemetaan posisi D3 ke D1 terisi untuk setiap posisi yang dipegang pegawai.
  2. Hanya posisi `Active`.
  3. Tepat 5 KPI per posisi dengan bobot 100%. FR-D4-002, constraint DB, dan trigger scorecard mensyaratkan 5 Core KPI.
  4. Skala skor 1–100 dengan target 85. Sudah terpenuhi di data D1.
  5. Ada versi atau tanggal berlaku, supaya scorecard lama tetap memakai definisi saat disimpan.
- **Permintaan data ke D1** (pemetaan, KPI ke-5, requirement kompetensi, dan data D3/B2 terkait): `docs/d4/drafts/PROMPT-VALENT-DATA-D1-UNTUK-D4.md`.

## Permintaan wawancara 14 Okt yang bisa dipastikan · 9 Nov 2026

Hanya permintaan yang jelas di transkrip Show & Tell (Mas Bram) dan sepenuhnya milik D4:

- **B13 (01:48:13–01:49:03):** PIC "harus ada" agar bisa ditelusuri.
  - PIC wajib di form Add Requirement, `POST /api/d4/development-needs`, dan fixture.
  - Edit Requirement tidak bisa mengosongkan PIC. Requirement lama tanpa PIC tetap bisa diubah statusnya, dan alert "Tanpa PIC" tetap menandainya.
  - Kolom `pic` sudah ada di live, jadi tidak perlu migrasi.
- **B14 (01:46:09–01:47:34):** objective menyebut kompetensi yang kurang, level tujuan, dan cara menutup gap. Saran objective dari gap kini menambahkan "melalui <Method>" saat Method dipilih. Teks yang sudah diubah user tidak ditimpa.
- **B12 (01:47:48–01:48:08):** saran Method mengikuti contoh klien: Internal training, External training, Certification, Coaching. Method tetap opsional dan boleh teks lain.
- **B5 (00:32:52–00:33:46):** pegawai menilai KPI-nya setiap hari sebelum pulang.
  - Halaman Daily KPI menampilkan pengingat selama hari ini belum diisi.
  - Lonceng notifikasi di header mendapat badge. Panelnya terbuka sendiri sekali per hari di halaman mana pun selain Daily KPI, dan "Isi sekarang" membawa ke `/daily-kpi`.
  - Masuk Simulasi Employee langsung membuka `/daily-kpi`, sehingga "My KPI today" tampil pertama.

- **Pencocokan ulang Daily KPI dengan transkrip 14 Okt:**
  - **Director juga mengisi Daily KPI miliknya sendiri.** Contoh Mas Bram di 00:33:23 adalah seorang direktur yang menilai KPI direkturnya ("pencapaian target pendapatan operasional"). Penolakan untuk MANAGEMENT dihapus dari API, fixture, dan policy insert migrasi `20261108130000` (belum diterapkan, jadi diubah di tempat). Untuk data orang lain, Director tetap read-only (B17). Diuji ulang di Postgres lokal: entri sendiri diterima, entri untuk pegawai lain ditolak.
  - **Peran KPI untuk posisi direktur.** Di live, DIR-FAT dan DIR-GEN belum punya peran KPI, jadi Director tetap tidak bisa mengisi Daily KPI. Migrasi `20261109120000` memetakan keduanya ke peran 2 "Director" di V5.1 dan V6, sama dengan KPI pada contoh Mas Bram. Ini sementara, sampai KPI direktur dari D1 bisa dipetakan. Diuji di Postgres lokal: bisa dijalankan ulang tanpa duplikat, dan Director menyimpan entri dengan KPI Director (total 84.50, sesuai rumus).
  - **Kategori performa per hari (00:58:05, "nilainya ternyata high performance"):** tabel entri harian mendapat kolom Category untuk skala 1–100.
  - **Masih terbuka:** notulen 14 Okt menulis "KPI harian ada di tim Raka (D1)" dan "pembagian KPI harian antara D4 dan D1 perlu didiskusikan lagi". Keputusan PO bersama D1 tetap dibutuhkan.

- **Urutan daftar dinamis (permintaan 9 Nov):** di setiap halaman daftar, baris yang masih perlu ditindaklanjuti tampil di atas dan yang sudah selesai di bawah. Dalam kelompok yang sama, urutan tetap per nama.

| Halaman | Urutan (atas ke bawah) |
|---|---|
| Performance Review | Compiled (siap Finalize), belum dinilai, sudah dinilai, posisi tanpa KPI |
| Daily KPI (tim) | Periode berjalan: belum mengisi hari ini, lalu sudah. Periode lalu: tanpa entri, lalu ada entri. |
| Competency Gap | Belum dinilai, Gap, Insufficient Data, Met, tanpa persyaratan |
| Development Requirement | Identified, Planned, In Progress, Completed yang menunggu reassessment, Completed |
| Training Tracking | Not Passed tanpa tindak lanjut, Planned, In Progress, Completed, Cancelled |
| People Dashboard | Compiled, tanpa Performance Review, sudah dinilai |

Tidak dikerjakan karena belum pasti atau bukan milik D4:
- **B2:** UI target dan standar KPI. Menunggu kesepakatan definisi KPI dengan D1.
- **B20:** dashboard per level HR. Isi tiap level tidak dijelaskan klien. (Sebagian dikerjakan 10 Nov, lihat bawah.)
- **B9 / A1:** durasi trainee 3 atau 6 bulan. Tidak ada tanggal mulai kerja di data D4, dan statusnya milik B2.
- **A2:** wajibnya "dinilai bersama". Kolom `assessed_with` butuh migrasi `20261019120000`.
- **A4:** promosi otomatis. Butuh riwayat posisi dari D3.
- **B19:** alert ke MID beserta contoh dari klien. Butuh kontrak MID dan data D3.
- **B21, B22, B23, B24:** milik B2, D3, atau proses persetujuan.

## Persiapan presentasi · 10 Nov 2026

- **Kolom Status Performance Review (PR #39):** Penilai menjadi baris kecil di bawah Notes ("Notes / Penilai"), sehingga badge Status tidak lagi tertutup kolom aksi pada 1400–1500 px.
- **B20, filter level di People Dashboard (asumsi):**
  - Klien (00:59:37–00:59:47): semua halaman harus memberi informasi kepada HR staff, HR manager, dan HR director.
  - Filter baru "All levels" (Staff, Manager, Director) menyaring tabel, ringkasan, dan grafik.
  - Tabel posisi tidak punya kolom level. Level diambil dari kode posisi dengan aturan yang sama seperti pemetaan peran (`DIR-*` Director, `*-MGR` Manager), lalu judul posisi sebagai cadangan, dan sisanya Staff.
  - Tanpa migrasi. Perlu dikonfirmasi ke klien.
- **B9 tetap menunggu.**
  - `join_date` ada di `d3_employee` (130 pegawai), tetapi view `d4_employee` belum membukanya.
  - Menampilkan masa trainee 3 atau 6 bulan butuh migrasi view dan keputusan HR per pegawai.
  - Per 10 Nov hanya 1 pegawai berstatus probation di data B2.
- **TC-D4-008-18 lulus di produksi** (sebelum migrasi, Simulasi Employee): Daily KPI menampilkan pesan "belum tersedia", menu lain tetap berjalan.
- **Tujuh migrasi D4 diterapkan** dengan izin PO, setelah dicocokkan dengan permintaan Mas Bram. Akibatnya Daily KPI, skala 1–100 (V6), Gap vs 85, kategori, Management read-only, edit requirement, reassessment, dan tindak lanjut training kini aktif di production. Detail, backup, dan hasil cek ada di MIGRATION-RUNBOOK-D4, bagian "Status".
- **Integrasi data D1 (dijalankan D1):**
  - D1 memetakan 9 posisi D3 ke posisi D1. Sebanyak 7 dari 14 posisi pegawai kini lengkap: 5 KPI, bobot 100, dan target 85.
  - KPI untuk 6 posisi sama persis dengan katalog V6 D4. HR Manager memakai 5 KPI HR milik D1, yang bukan berasal dari scorecard klien.
  - D4 belum membaca `d1_kpi_definitions`, jadi perilaku KPI D4 tidak berubah.
  - D1 juga menambah 17 requirement kompetensi untuk 6 posisi. Requirement ini langsung terbaca di Competency Gap, sehingga status kompetensi 13 pegawai berubah.
- **20 requirement uji dihapus dari `position_requirements`** dengan izin PO, menindaklanjuti temuan D1: 18 requirement "Demo D4:" dan 2 kompetensi IT di COM-SA. Detail, backup, dan rollback ada di MIGRATION-RUNBOOK-D4, bagian "Pembersihan requirement uji".

## Belum selesai

| Item | Alasan | Langkah berikut |
|---|---|---|
| KPI berdasarkan position **pada periode** | Butuh riwayat position per periode dari D3 | Open decision di FR-D4-002 |
| QA di data asli | Mode live butuh akun HR/Manager dan data seed | `npm run seed:d4 -- --apply`, lalu skenario QA di `drafts/planka/03-…` |
| Docmost dan Planka tim | Keputusan: draft dulu | Terapkan isi `drafts/` setelah disetujui PO |
| Sales Admin memakai KPI Sales & Marketing | V5.1 tidak punya role Sales Admin; pemetaan sementara | Keputusan PO (lihat `drafts/docmost/03-…`) |
| Cakupan Manager (O7) | Manager masih melihat semua employee; butuh data atasan dari D3 | Keputusan PO + `supervisor_id` dari D3 |
| Sisa setelah migrasi D4 | Ketujuh migrasi dan katalog V5.1 sudah diterapkan 10 Nov (lihat [MIGRATION-RUNBOOK-D4.md](MIGRATION-RUNBOOK-D4.md), bagian "Status"). Yang belum: uji dengan akun Director dan Employee, dan 1 scorecard periode 2026-12 yang masih berskala 1–5 | Uji dengan akun dari PO; PO memutuskan nasib scorecard 2026-12 |
| Konfirmasi alur Daily KPI | Dibangun dengan asumsi: pegawai isi sendiri, HR memvalidasi rata-rata periode | Konfirmasi klien; bila skor periode harus otomatis tanpa HR, ubah Performance Review |
| Definisi KPI dari D1 | Sejak 10 Nov, 7 dari 14 posisi pegawai lengkap di D1. Sisanya (Sales Executive, Tax Associate, Cash Associate, Billing, General Director, IT, Field Agent) menunggu keputusan PO. | Keputusan PO atas daftar dari D1, persetujuan Pak Gema (B24), lalu sepakati apakah D4 membaca KPI dari D1 |
| Volume Daily KPI di snapshot | Snapshot memuat semua entri harian (sekitar 20 per pegawai per bulan) di setiap halaman; cukup untuk sandbox, tetapi tumbuh tanpa batas | Batasi ke periode berjalan + filter periode di API sebelum produksi |
| Alert ke MID, input level kompetensi, Employee ID di `/register` | Milik squad lain (MID, D3, B2) atau kontraknya belum ada | Koordinasi lintas squad |
| Kolom `review_status` (O8) dan unique index per periode/gap (O9) | Butuh migrasi Supabase bersama | Persetujuan PO/Back End |
| HR Associate tanpa KPI | V5.1 tidak mendefinisikan KPI untuk HR Associate | Form menampilkan "Belum tersedia untuk position ini" dan menolak simpan; tunggu KPI dari PO |
