# HRMS D4 Sandbox

Repository private untuk pengembangan modul D4 sebelum integrasi per fitur ke Andima-HRMS.

Scaffold ini mengikuti konfigurasi dan dependensi `PISD-X-ANDIMA/Andima-HRMS` pada commit `0d4486f1ecf349781462ca3556c668901face4d9` (`main`). Fondasi bersama dan enam fitur D4 untuk STEP 5 tersedia. Integrasi Supabase STEP 6 berada pada branch `integration/D4-supabase` sandbox.

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

Fixture memakai kode `FIX-D4-*` dan `source: "fixture"`. Layanan fitur pada STEP 5 memakai fixture serta `localStorage` browser untuk demo. Data ini tidak mewakili data HR produksi. Mode Supabase pada `/live` memakai repository tersendiri dan tidak menyisipkan fixture ke hasil database.

## Integrasi Supabase STEP 6

Migrasi [`supabase/migrations/20260928052350_d4_performance_development.sql`](supabase/migrations/20260928052350_d4_performance_development.sql) sudah diterapkan pada proyek `PISD x Andima Transportindo` sebagai migrasi remote `20260928052350`. Migrasi menambah tujuh tabel D4, RLS, relasi ke master bersama, catatan aktor dan waktu, serta riwayat yang hanya ditambah. Tabel master yang sudah ada tidak diubah. Tabel `employee_kpi` lama berskala 0-100 tidak dipakai untuk KPI D4 yang berskala 1-5.

Untuk mode data langsung, isi `.env.local` dengan URL proyek dan **publishable key**, lalu set `NEXT_PUBLIC_D4_DATA_MODE=supabase`. Buka `/live`, masuk menggunakan akun proyek yang memiliki pemetaan `d3_user_access`. Jangan masukkan service role key ke browser atau Git. Peran HR/MANAGER dapat menambah catatan; employee dapat membaca catatan miliknya sesuai RLS. Halaman demo tetap tersedia untuk pengembangan visual.

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
