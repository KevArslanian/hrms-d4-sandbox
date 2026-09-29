# HRMS D4 Sandbox

Repository private untuk pengembangan modul D4 sebelum integrasi per fitur ke Andima-HRMS.

Scaffold ini mengikuti konfigurasi dan dependensi `PISD-X-ANDIMA/Andima-HRMS` pada commit `0d4486f1ecf349781462ca3556c668901face4d9` (`main`). Halaman utama membuka mode live yang membaca data proyek Supabase `PISD x Andima Transportindo`.

## Fitur STEP 5

| Tiket | Halaman | Isi |
| --- | --- | --- |
| FR-D4-001 | `/performance`, `/performance/[id]` | Daftar, evaluasi, detail, riwayat |
| FR-D4-002 | `/kpi` | Lima KPI V5.1 per posisi yang terpetakan, skor manual, total terbobot |
| FR-D4-003 | `/competency` | Perbandingan persyaratan posisi dan bukti employee |
| FR-D4-004 | `/development` | Kebutuhan dengan referensi sumber dan riwayat revisi |
| FR-D4-005 | `/training` | Aktivitas terkait development need dan riwayat revisi |
| FR-D4-006 | `/dashboard`, `/employee/[id]` | Ringkasan dari layanan fitur dan drilldown |

Setiap fitur dikerjakan pada branch `feature/FR-D4-*` sendiri dan digabungkan ke `main` sandbox. Definisi KPI V5.1 dipetakan untuk posisi fixture Finance Staff dan Sales Staff sebagai contoh dari kategori Finance & Administration dan Sales & Marketing dalam workbook. Posisi lain belum memiliki pemetaan KPI yang disetujui. Target Finance berasal dari contoh workbook; target Sales harus diisi untuk periode yang dinilai. Tidak ada ambang pencapaian atau keputusan HR otomatis.

## Fondasi D4

```text
components/                 Salinan enam komponen bersama dari repo resmi
modules/d4/shared/ui/       Satu pintu ekspor komponen UI bersama
modules/d4/shared/types/    Model referensi employee, position, competency
modules/d4/shared/services/ Kontrak repository dan pembacaan konteks employee
modules/d4/shared/fixtures/ Data fiktif yang dipilih eksplisit saat pengembangan
```

`employees.id` adalah UUID relasi yang stabil. `employees.employee_id` hanya kode tampilan. Tipe di folder `types` adalah model untuk D4, bukan tipe database yang digenerate. Adapter Supabase membaca master bersama, tanpa menduplikasi employee atau position.

Fixture memakai kode `FIX-D4-*` dan `source: "fixture"` di modul lama untuk pengembangan visual. Semua rute aplikasi D4 sekarang mengarah ke `/live` dengan modul yang sesuai. Repository Supabase tidak menyisipkan fixture ke hasil database.

## Integrasi Supabase STEP 6

Mode live menggunakan `d3_employee` dan `d3_departments` sebagai master, serta enam tabel D4 untuk evaluasi, kompetensi, development, dan training. KPI demo memakai tabel `employee_kpi` D3 dengan skala 0-100. Skor evaluasi D4 memakai skala 1-5; keduanya ditampilkan dengan satuan masing-masing. File migrasi lama [`supabase/migrations/20260928052350_d4_performance_development.sql`](supabase/migrations/20260928052350_d4_performance_development.sql) menggambarkan skema lain dan tidak boleh dijalankan pada proyek bersama tanpa rekonsiliasi.

Untuk mode data langsung, buka `/live` dan masuk menggunakan akun Auth proyek yang memiliki pemetaan `d3_user_access`. URL dan publishable key proyek demo adalah konfigurasi publik bawaan; variabel lingkungan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` dapat menggantinya. Jangan masukkan service role key ke browser atau Git. Peran HR/MANAGER dapat menambah catatan; employee dapat membaca catatan miliknya sesuai RLS. Penulisan KPI V5.1 belum tersedia di skema bersama, sehingga bagian KPI live hanya menampilkan nilai D3.

Data master saat integrasi diperiksa berisi 4 employee, 2 posisi, tetapi `position_requirements` dan `employee_skills` masih kosong. Kedua posisi belum cocok dengan dua template KPI V5.1 yang diverifikasi. Karena itu, KPI dan assessment kompetensi menampilkan alasan data belum siap dan tidak menyimpan data fiktif. Development dari performance dapat digunakan setelah evaluasi completed dibuat oleh akun berizin; training membutuhkan development need terkait. Akun login dan operasi tulis belum dicoba dalam STEP 6 karena kredensial pengguna tidak disediakan.

Komponen di `components/` disalin dari repo resmi agar kode fitur dapat memakai API komponen yang sama. Perubahan lokal terbatas pada tipe `CustomTable` untuk menghapus `any` dan dua variabel tidak terpakai agar lint bersih. Saat integrasi ke repo resmi, gunakan komponen resmi yang masih berlaku dan evaluasi penyesuaian tersebut.

## Menjalankan lokal

Gunakan Node.js 20 dan npm seperti workflow CI repo resmi.

```bash
npm ci --legacy-peer-deps
cp .env.example .env.local
npm run dev
```

Isi `.env.local` hanya di lingkungan lokal. File tersebut diabaikan Git.

Opsi `--legacy-peer-deps` diperlukan karena lockfile repo resmi mengunci `@supabase/supabase-js` 2.109.0, sedangkan `@supabase/ssr` 0.12.7 meminta peer `@supabase/supabase-js` minimal 2.114.0. Versi paket tetap mengikuti lockfile resmi; konflik ini perlu diselesaikan bersama saat integrasi.

## Pemeriksaan

```bash
npm run lint
npm run typecheck
npm run build
```

Jika lingkungan lokal melarang Turbopack membuka port untuk proses CSS, jalankan `npm run build -- --webpack`. Ini hanya opsi pemeriksaan lokal; skrip dan versi build tetap mengikuti repo resmi.

## D4 API endpoints

Route handlers under `app/api/d4` reuse `SupabaseD4Repository`, so they apply the same validation as the `/live` screen. Every request runs with the caller's Supabase session cookie, and the D4 RLS policies still apply: HR/MANAGER can read all records and insert, EMPLOYEE can read only their own records. Responses are JSON: `{ "data": … }` on success, `{ "error": "…" }` with 400/401/403/404 on failure.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/d4/me` | Role and employee record of the signed-in account |
| GET | `/api/d4/snapshot` | All D4 data visible to the account |
| GET | `/api/d4/kpi-catalog?role_order=&version=` | KPI Scorecard catalog (5 indicators per role); defaults to the active version V5.1 |
| GET, POST | `/api/d4/kpi-assessments?employee_id=` | KPI assessments; the score is calculated by the database trigger |
| GET, POST | `/api/d4/performance-evaluations?employee_id=` | Performance evaluations |
| GET, POST | `/api/d4/competency-assessments?employee_id=` | Competency gap snapshots; POST recalculates the gap on the server |
| GET, POST | `/api/d4/development-needs?employee_id=` | Development needs; POST creates the need and revision 1 in one transaction |
| POST | `/api/d4/development-needs/:id/versions` | Append a development status revision |
| GET, POST | `/api/d4/training-records?employee_id=` | Training records; POST creates the record and version 1 in one transaction |
| POST | `/api/d4/training-records/:id/versions` | Append a training status/result version |

Example:

```bash
curl -X POST http://localhost:3000/api/d4/development-needs/<need-id>/versions \
  -H "Content-Type: application/json" \
  --cookie "<supabase session cookie>" \
  -d '{"status":"Planned","notes":"Jadwal training disetujui"}'
```
