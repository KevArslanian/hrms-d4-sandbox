# HRMS D4 Sandbox

Repository private untuk pengembangan modul D4 sebelum integrasi per fitur ke Andima-HRMS.

Scaffold ini mengikuti konfigurasi dan dependensi `PISD-X-ANDIMA/Andima-HRMS` pada commit `0d4486f1ecf349781462ca3556c668901face4d9` (`main`). Fondasi bersama D4 sudah tersedia. Belum ada fitur D4 atau koneksi database yang dijalankan.

## Fondasi D4

```text
components/                 Salinan enam komponen bersama dari repo resmi
modules/d4/shared/ui/       Satu pintu ekspor komponen UI bersama
modules/d4/shared/types/    Model referensi employee, position, competency
modules/d4/shared/services/ Kontrak repository dan pembacaan konteks employee
modules/d4/shared/fixtures/ Data fiktif yang dipilih eksplisit saat pengembangan
```

`employees.id` adalah UUID relasi yang stabil. `employees.employee_id` hanya kode tampilan. Tipe di folder `types` adalah model untuk D4, bukan tipe database yang digenerate. Adapter ke tabel Supabase dibuat pada STEP 6, tanpa menduplikasi master employee atau position.

Fixture memakai kode `FIX-D4-*`, nama fiktif, dan `source: "fixture"`. Layanan tidak mengimpor fixture otomatis. Modul fitur harus memilih repository yang sesuai secara eksplisit sehingga data demo tidak muncul sebagai data produksi tanpa sengaja.

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
