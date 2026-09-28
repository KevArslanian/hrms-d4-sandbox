# HRMS D4 Sandbox

Repository private untuk pengembangan modul D4 sebelum integrasi per fitur ke Andima-HRMS.

Scaffold ini mengikuti konfigurasi dan dependensi `PISD-X-ANDIMA/Andima-HRMS` pada commit `0d4486f1ecf349781462ca3556c668901face4d9` (`main`). Fondasi bersama dan enam fitur D4 untuk STEP 5 sudah tersedia. Koneksi database belum dijalankan.

## Fitur STEP 5

| Tiket | Halaman | Isi |
| --- | --- | --- |
| FR-D4-001 | `/performance`, `/performance/[id]` | Daftar, evaluasi, detail, riwayat |
| FR-D4-002 | `/kpi` | Lima KPI V5.1 per posisi yang terpetakan, skor manual, total terbobot |
| FR-D4-003 | `/competency` | Perbandingan persyaratan posisi dan bukti employee |
| FR-D4-004 | `/development` | Kebutuhan dengan referensi sumber dan riwayat revisi |
| FR-D4-005 | `/training` | Aktivitas terkait development need dan riwayat revisi |
| FR-D4-006 | `/dashboard`, `/employee/[id]` | Ringkasan dari layanan fitur dan drilldown |

Setiap fitur dikerjakan pada branch `feature/FR-D4-*` sendiri dan digabungkan ke `main` sandbox. Definisi KPI V5.1 baru terpetakan untuk posisi fixture Finance & Administration dan Sales & Marketing karena nama posisi lain pada fixture tidak sama dengan workbook. Target Finance berasal dari contoh workbook; target Sales harus diisi untuk periode yang dinilai. Tidak ada ambang pencapaian atau keputusan HR otomatis.

## Fondasi D4

```text
components/                 Salinan enam komponen bersama dari repo resmi
modules/d4/shared/ui/       Satu pintu ekspor komponen UI bersama
modules/d4/shared/types/    Model referensi employee, position, competency
modules/d4/shared/services/ Kontrak repository dan pembacaan konteks employee
modules/d4/shared/fixtures/ Data fiktif yang dipilih eksplisit saat pengembangan
```

`employees.id` adalah UUID relasi yang stabil. `employees.employee_id` hanya kode tampilan. Tipe di folder `types` adalah model untuk D4, bukan tipe database yang digenerate. Adapter ke tabel Supabase dibuat pada STEP 6, tanpa menduplikasi master employee atau position.

Fixture memakai kode `FIX-D4-*` dan `source: "fixture"`. Layanan fitur pada STEP 5 memakai fixture serta `localStorage` browser untuk demo. Data ini belum terhubung ke Supabase dan tidak mewakili data HR produksi. Adapter Supabase akan mengganti sumber data pada STEP 6.

Komponen di `components/` disalin dari repo resmi agar kode fitur dapat memakai API komponen yang sama. Perubahan lokal terbatas pada tipe `CustomTable` untuk menghapus `any` dan dua variabel tidak terpakai agar lint bersih. Saat integrasi ke repo resmi, gunakan komponen resmi yang masih berlaku dan evaluasi penyesuaian tersebut.

## Menjalankan lokal

Gunakan Node.js 20 dan npm seperti workflow CI repo resmi.

```bash
npm ci --legacy-peer-deps
cp .env.example .env.local
npm run dev
```

Isi `.env.local` hanya di lingkungan lokal saat integrasi Supabase dikerjakan. File tersebut diabaikan Git.

Opsi `--legacy-peer-deps` diperlukan karena lockfile repo resmi mengunci `@supabase/supabase-js` 2.109.0, sedangkan `@supabase/ssr` 0.12.7 meminta peer `@supabase/supabase-js` minimal 2.114.0. Versi paket tetap mengikuti lockfile resmi; konflik ini perlu diselesaikan bersama saat integrasi.

## Pemeriksaan

```bash
npm run lint
npm run typecheck
npm run build
```

Jika lingkungan lokal melarang Turbopack membuka port untuk proses CSS, jalankan `npm run build -- --webpack`. Ini hanya opsi pemeriksaan lokal; skrip dan versi build tetap mengikuti repo resmi.
