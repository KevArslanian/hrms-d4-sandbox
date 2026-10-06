# HRMS D4 Sandbox · Performance & Training Development

Repository private untuk pengembangan modul **Squad D4** sebelum integrasi ke `PISD-X-ANDIMA/Andima-HRMS`. Versi saat ini adalah **D4 V2**: warna dan identitas mengikuti D2, struktur layar mengikuti D3, dan semua data lewat API D4 sendiri.

Dokumen lengkap ada di [`docs/d4/`](docs/d4/README.md).

## Fitur

Sidebar HRMS → **Performance & Training** berisi enam menu. FR-D4-007 (traceability) bukan menu; ia hadir sebagai source chip dan blok Source di setiap halaman detail.

| FR | Menu | Route |
|---|---|---|
| FR-D4-001 | Performance Evaluation | `/performance`, `/performance/[id]`, `/performance/history/[employeeId]` |
| FR-D4-002 | KPI Scorecard | `/kpi`, `/kpi/[id]`, `/kpi/history/[employeeId]` (katalog KPI hanya lewat API `GET /api/d4/kpi-catalog`, dipakai form) |
| FR-D4-003 | Competency Gap | `/competency`, `/competency/[employeeId]`, `/competency/[employeeId]/history` |
| FR-D4-004 | Development Requirement | `/development`, `/development/[id]`, `/development/[id]/history` |
| FR-D4-005 | Training Tracking | `/training`, `/training/[id]`, `/training/[id]/history` |
| FR-D4-006 | People Dashboard | `/dashboard`, `/dashboard/employee/[id]` |

Semua fitur memakai pola yang sama ([UI-D4-001](docs/d4/UI-D4-001.md)): menu ⋮ langsung berisi aksi, Detail dan History sebagai halaman tersendiri, form modal 640 px (KPI 880 px), dan state loading/empty/error/validation/success.

## Struktur

```text
app/(d4)/<fitur>/**/page.tsx          Route halaman (tipis, merender fitur dari modules/d4/web)
app/api/d4/**/route.ts                Route handler API (tipis, memanggil modules/d4/server)
app/login/page.tsx                    Login Supabase
proxy.ts                              Redirect ke /login bila belum ada sesi
modules/d4/web/ui/                    Komponen bersama: AppShell, DataTable, RowActionMenu, FormModal, dll.
modules/d4/web/features/<fitur>/      Halaman dan modal per fitur
modules/d4/web/data/                  Sumber data: api-source (live) dan fixture-source (preview)
modules/d4/server/<resource>/         Handler API: validasi, izin, logika
modules/d4/server/_lib/               Envelope respons, validator field.*, sesi dan requireWriter
modules/d4/supabase/                  Repository Supabase (dipakai server dan seeder)
modules/d4/<domain>/                  Tipe domain, katalog KPI, perbandingan kompetensi, data fiktif
supabase/migrations/                  Skema D4
scripts/seed-d4.mjs                   Seeder data demo
figma-plugin/d4-v2-builder/           Plugin lokal untuk membangun frame Figma D4 V2
```

## Menjalankan lokal

Node.js 20 atau lebih baru.

```bash
npm ci --legacy-peer-deps
cp .env.example .env.local
npm run dev
```

Isi `.env.local` dengan URL dan **publishable key** project Supabase. Jangan pernah memasukkan service role key ke browser atau Git. `.env*` selain `.env.example` diabaikan Git.

`--legacy-peer-deps` diperlukan karena lockfile repo resmi mengunci `@supabase/supabase-js` 2.109.0, sedangkan `@supabase/ssr` 0.12.7 meminta minimal 2.114.0. Konflik ini perlu diselesaikan bersama saat integrasi.

### Mode preview tanpa login

Untuk melihat UI dengan data fiktif (hanya di `next dev`, tidak aktif di build produksi):

```bash
echo "NEXT_PUBLIC_D4_DATA_MODE=fixture" > .env.development.local
npm run dev
```

Tambahkan `NEXT_PUBLIC_D4_FIXTURE_ROLE=EMPLOYEE` atau `MANAGER` untuk melihat tampilan per peran. Topbar selalu menampilkan badge "Preview · data fiktif" di mode ini.

## API

Semua baca dan tulis lewat `/api/d4/*` dengan sesi Supabase pengguna. RLS D4 tetap berlaku; hanya HR dan MANAGER yang boleh menulis. Respons `{ "data": … }` atau `{ "error": { "code", "message" } }`. Kontrak lengkap: [API-D4-001](docs/d4/API-D4-001.md).

## Data demo

```bash
npm run seed:d4              # dry run
npm run seed:d4 -- --apply   # tulis
```

Butuh `D4_SEED_EMAIL` dan `D4_SEED_PASSWORD` akun HR/MANAGER di `.env.local`. Seeder menulis lewat tabel dan RPC yang sama dengan API, menandai setiap baris dengan `[seed-d4]`, dan tidak mengubah atau menghapus data yang sudah ada.

## Database

| Migrasi | Status di Supabase bersama |
|---|---|
| `20260928052350_d4_performance_development.sql` | Diterapkan |
| `20260929120000_d4_kpi_role_catalog_v31.sql` | Diterapkan |
| `20260929130000_retire_d4_figma_demo_access.sql` | Diterapkan |
| `20260929140000_d4_kpi_assessments_v31.sql` | Diterapkan |
| `20260929150000_d4_kpi_catalog_v51.sql` | **Belum**. Menambah katalog V5.1 dan `definition_version`; perlu persetujuan sebelum diterapkan |
| `20261006120000_d4_evaluation_score_optional.sql` | **Belum**. Evaluasi completed tidak lagi wajib punya `overall_score`; tanpa migrasi ini simpan evaluasi di mode live ditolak database |

Status dicek dengan `list_migrations` pada 29 Sep 2026. Nama migrasi di database sama, tetapi timestamp versinya berbeda dari nama file (misalnya `d4_kpi_role_catalog_v31` tercatat sebagai `20260929043134`).

## Pemeriksaan

```bash
npm run lint
npm run typecheck
npm run build
```

Jika lingkungan lokal melarang Turbopack membuka port untuk proses CSS, jalankan `npm run build -- --webpack`.

## Aturan bisnis yang dijaga

1. KPI position-specific: hanya 5 KPI role employee yang tampil.
2. Tidak ada label tercapai/tidak tercapai dan tidak ada konversi realisasi → skor.
3. Tanpa evidence = Data Belum Cukup, bukan Gap.
4. Training Completed tidak menutup gap.
5. Development Requirement selalu punya source type dan source reference.
6. Dashboard hanya lapisan presentasi, tanpa keputusan HR otomatis.
