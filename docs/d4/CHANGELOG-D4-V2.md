# CHANGELOG · D4 V2

Tanggal: 29 Sep 2026 · Branch: `feature/d4-v2-d2-style`

## Ringkasan per kritik asistensi

| # | Kritik | Kondisi V1 | Perubahan V2 | Bukti |
|---|---|---|---|---|
| K1 | Pop-up terlalu besar | Modal KPI `max-w-[1485px]`, Evaluation `max-w-[1480px]` | Satu `FormModal`: 640 px, KPI 880 px, tinggi maks 88vh, body scroll, footer sticky | `modules/d4/web/ui/forms.tsx`, semua `*Modal*.tsx` |
| K2 | Menu ⋮ "kerja dua kali" | ⋮ membuka panel Employee Quick View | ⋮ langsung membuka menu 2–4 aksi di portal, dengan navigasi keyboard | `modules/d4/web/ui/RowActionMenu.tsx` |
| K3 | Detail beda-beda per fitur | Modal (Competency), popover (Training), dropdown → page (Performance) | Detail dan History selalu route sendiri dengan breadcrumb dan tombol Back | 18 route di `app/(d4)/` |
| K4 | Blank space, dashboard tidak responsif | `max-w-[1048px]` di People Dashboard | Konten `max-w-[1600px]`, metric card `auto-fit`, sidebar jadi drawer di bawah 1024 px | Diuji 1440, 1280, 768 px tanpa scroll horizontal halaman |
| K5 | Font kebesaran | Ukuran px acak | Type scale tetap di `@theme` dan text style Figma `D4/*` | `app/globals.css`, UI-D4-001 §2 |
| K6 | Tidak ada API sendiri | UI memanggil Supabase langsung | `app/api/d4/**` → `modules/d4/server/<resource>/index.ts`, envelope error dengan kode, seeder | API-D4-001 |
| K7 | Checklist Planka dan label WebDev | Banyak item belum dicentang | Draft sinkron checklist berbasis bukti + label Front End/Back End | `drafts/planka/` |
| K8 | FR-D4-004 digabung tanpa alasan | — | Paragraf relasi FR-D4-003 ↔ FR-D4-004 + tabel traceability | `drafts/docmost/02-…` |
| K9 | Jumlah fitur membingungkan | 4 vs 6 vs 7 | Sidebar tepat 6 menu; FR-D4-007 dijelaskan sebagai source chip, bukan menu | `modules/d4/web/ui/AppShell.tsx`, UI-D4-001 §5 |

## Ditambahkan

- **Shell D2**: sidebar navy 260 px dengan sub-menu Performance & Training, topbar 64 px dengan breadcrumb, badge peran, dan badge "Preview · data fiktif" di mode preview.
- **Komponen bersama** (`modules/d4/web/ui/`): `PageHeader`, `FilterBar`, `SearchInput`, `SelectFilter`, `DataTable` (pagination 8 baris, baris dapat diklik, empty state), `PersonCell`, `RowActionMenu`, `DetailHeader`, `Timeline`, `Card`, `InfoGrid`, `StatusBadge`, `SourceChip`, `MetricCard`, `FormModal`, field form, `Toasts`, `StateView`, `NotFound`.
- **Halaman**: list, detail, dan history untuk kelima fitur data; People Dashboard + Employee Performance Profile; katalog KPI `/kpi/catalog`.
- **API**: 14 route handler dengan `requireWriter` (HR/MANAGER), validator `field.*`, kode error `BAD_REQUEST` · `UNAUTHENTICATED` · `FORBIDDEN` · `NOT_FOUND` · `VALIDATION_FAILED` · `SERVER_ERROR`, dan `POST` 201.
- **Katalog KPI V5.1** (10 role × 5 KPI) di `modules/d4/kpi/catalog.ts` dan migrasi `20260929150000_d4_kpi_catalog_v51.sql` (belum diterapkan).
- **Mode preview** (`NEXT_PUBLIC_D4_DATA_MODE=fixture`, hanya `next dev`) dengan pilihan peran `NEXT_PUBLIC_D4_FIXTURE_ROLE`. Peran EMPLOYEE hanya melihat datanya sendiri dan tidak bisa menulis.
- **Seeder** `npm run seed:d4` (dry run default, `--apply` untuk menulis, penanda `[seed-d4]`).
- **Filter source requirement** di Training Tracking.
- **Periode sumber** di bawah skor KPI dan Performance pada tabel People Dashboard.
- **Figma**: 34 frame D4 V2 dan 9 prototype link di https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F (page `D4`). Metric card dibagi rata per baris (6 kartu: 6 kolom di 1440, 3 + 3 di 1280/768), source chip yang lebih lebar dari kolomnya memotong referensinya dengan elipsis.
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
- Salinan komponen `components/Custom*.tsx`, `Pagination.tsx`, `StatusBadge.tsx`, `UserInput.tsx` yang tidak lagi dipakai. `components/auth/*` tetap dipakai halaman login.
- Aset SVG hasil ekspor Figma lama di `public/figma/`.
- Penyimpanan `localStorage` untuk data fitur.

## Belum selesai

| Item | Alasan | Langkah berikut |
|---|---|---|
| Migrasi KPI V5.1 di Supabase bersama | Memengaruhi project bersama, perlu persetujuan | PO/Back End menyetujui, lalu terapkan migrasi |
| KPI berdasarkan position **pada periode** | Butuh riwayat position per periode dari D3 | Open decision di FR-D4-002 |
| QA di data asli | Mode live butuh akun HR/Manager dan data seed | `npm run seed:d4 -- --apply`, lalu skenario QA di `drafts/planka/03-…` |
| Docmost dan Planka tim | Keputusan: draft dulu | Terapkan isi `drafts/` setelah disetujui PO |
