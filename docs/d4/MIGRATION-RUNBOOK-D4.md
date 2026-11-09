# Runbook migrasi D4 (8 Nov 2026)

Database D4 adalah project Supabase bersama (`ufjbbwqaztgkqmpdmcyv`), dipakai juga oleh squad lain. Semua langkah di bawah **hanya dijalankan setelah PO D4 memberi izin**.

## Status: diterapkan 10 Nov 2026

- **Izin:** PO D4 (Gabriella), disampaikan lewat WebDev. Syaratnya: hanya yang sesuai permintaan Mas Bram. Ketujuh langkah cocok dengan sumbernya, yaitu wawancara 14 Okt (B5, B6, B17, target 85 dan skala 1–100) dan jawaban mitra (Q10–Q16).
- **Cara:** Supabase SQL Editor. Setiap file dibungkus `begin`/`commit` sehingga gagal di tengah berarti batal semua. Sebelum Run, isi editor dicocokkan dengan file lewat hash, dengan spasi awal baris diabaikan.
- **Backup:** `d4_backup.*_20261110` untuk `d4_kpi_assessments` (71 baris), `d4_development_need_versions` (67), `d4_training_versions` (32), `d4_kpi_catalog_versions` (1), `d4_kpi_role_catalog` (100), dan `d4_position_kpi_roles` (13). RLS aktif, jadi tidak terbaca lewat API.
- **Cek sesudah (read-only), semuanya sesuai tabel di bawah:**
  - Langkah 1: V6 berlaku dari 2026-11, 50 baris katalog V6 dengan target 85, 8 posisi V6, `overall_score` menjadi `numeric(5,2)`, dan 0 dari 71 skor lama berubah.
  - Langkah 2–4: kolom baru ada; constraint Reference berstatus NOT VALID.
  - Langkah 5–7: 5 policy baca menerima MANAGEMENT; `d4_kpi_daily_entries` punya RLS, 2 policy, dan 2 trigger, dengan hak `authenticated` hanya SELECT dan INSERT dan tanpa akses `anon`; DIR-FAT dan DIR-GEN mendapat peran 2 untuk V5.1 dan V6.
- **Riwayat:** 9 baris di `supabase_migrations.schema_migrations` (`created_by = 'd4-runbook'`), yaitu tujuh langkah ini ditambah `d4_kpi_catalog_v51` dan `d4_development_method_pic`.
- **Di aplikasi:** akun Manager membuka Daily KPI dengan katalog V6 skala 1–100, tabel tim tampil, dan pengingat serta lonceng aktif.
- **Belum dicek dengan akun-nya sendiri:**
  - akun Director: tidak ada tombol simpan, POST ditolak 403 kecuali Daily KPI miliknya;
  - akun Employee: Daily KPI menolak tanggal besok.
- **Belum diputuskan:** scorecard periode 2026-12 di V5.1 (lihat "Temuan") tidak diubah.

Tabel "Kondisi live" di bawah adalah kondisi sebelum penerapan.

## Kondisi live (dicek read-only, 8 Nov 2026)

| Migrasi (file) | Status live | Catatan |
|---|---|---|
| s.d. `20261017120000_d4_employee_employment_status` | Diterapkan | Tercatat di `supabase_migrations.schema_migrations`, dengan versi timestamp yang berbeda dari nama file. |
| `20260929150000_d4_kpi_catalog_v51` | Diterapkan, **tidak tercatat** | Katalog V5.1 ada di live, tetapi tidak ada di riwayat migrasi. |
| `20261015120000_d4_development_method_pic` | Diterapkan, **tidak tercatat** | Kolom `method` dan `pic` ada di live. |
| `20261006130000_d4_kpi_editable_core_name` | Belum | Sudah dilebur ke V6. Jangan diterapkan sendiri. |
| `20261017130000_d4_kpi_scale_100_v6` | **Belum** | Katalog live hanya V5.1. |
| `20261019120000_d4_development_edit_reassessment` | **Belum** | Kolom `priority` dan `reassessment` belum ada. |
| `20261020120000_d4_kpi_reference_required` | **Belum** | |
| `20261020130000_d4_training_follow_up` | **Belum** | Kolom `follow_up` belum ada. |
| `20261108120000_d4_management_read_only` | **Belum** (baru) | Director menjadi MANAGEMENT, read-only. |
| `20261108130000_d4_kpi_daily_entries` | **Belum** (baru) | Tabel Daily KPI. |
| `20261109120000_d4_director_kpi_role` | **Belum** (baru) | DIR-FAT dan DIR-GEN dipetakan ke peran KPI 2 "Director" (V5.1 dan V6). Cek live 9 Nov: keduanya belum punya peran KPI. |

**Jangan pakai `supabase db push`.** Dua migrasi yang tidak tercatat akan dicoba diterapkan ulang dan gagal (katalog dan kolom sudah ada). Terapkan file satu per satu, sesuai urutan di bawah, lewat SQL editor atau `apply_migration` dengan nama file yang sama.

## Prasyarat

1. Aplikasi dari cabang ini (atau main yang sudah memuatnya) sudah di-deploy. Aplikasi ini aman sebelum dan sesudah migrasi:
   - snapshot membaca `select("*")`;
   - Daily KPI menampilkan "belum tersedia" selama tabelnya belum ada;
   - follow-up training memberi pesan jelas sebelum kolomnya ada.
2. Backup logis tabel D4. Contoh: `create table d4_backup.<tabel>_20261108 as table public.<tabel>;` untuk `d4_kpi_assessments`, `d4_development_need_versions`, dan `d4_training_versions`.
3. PO menyetujui keputusan scorecard 2026-12 (lihat "Temuan").

## Urutan penerapan

| # | File | Cek sebelum | Cek sesudah |
|---|---|---|---|
| 1 | `20261017130000_d4_kpi_scale_100_v6.sql` | `select * from d4_kpi_catalog_versions;` → hanya V5.1 | Ada V6 dengan `effective_from = '2026-11'`; `select count(*) from d4_kpi_role_catalog where source_version='V6'` = jumlah baris V5.1 |
| 2 | `20261019120000_d4_development_edit_reassessment.sql` | Kolom `priority` belum ada di `d4_development_need_versions` | Kolom ada; tes Development edit berjalan |
| 3 | `20261020120000_d4_kpi_reference_required.sql` | `select count(*) from d4_kpi_assessments where evidence_reference is null or btrim(evidence_reference)=''` (3 baris lama boleh) | Constraint `d4_kpi_assessments_evidence_reference_required` ada (NOT VALID) |
| 4 | `20261020130000_d4_training_follow_up.sql` | Kolom `follow_up` belum ada | Kolom ada; follow-up training bisa disimpan |
| 5 | `20261108120000_d4_management_read_only.sql` | `select d4_current_role()` sebagai akun DIR-* → `MANAGER` | Sebagai DIR-* → `MANAGEMENT`; snapshot tetap terbaca; POST apa pun → 403, kecuali Daily KPI miliknya sendiri setelah langkah 6 |
| 6 | `20261108130000_d4_kpi_daily_entries.sql` | Tabel belum ada; langkah 1 dan 5 sudah selesai | Tabel ada; RLS aktif; grant `authenticated` hanya SELECT dan INSERT; menu Daily KPI bisa dipakai |
| 7 | `20261109120000_d4_director_kpi_role.sql` | `select p.code, k.source_version, k.role_order from d4_position_kpi_roles k join d3_positions p on p.id = k.position_id where p.code like 'DIR-%'` → kosong | 4 baris: DIR-FAT dan DIR-GEN × V5.1/V6, `role_order = 2`. Director melihat "My KPI today" dengan KPI Director. |

Langkah 7 butuh langkah 1 untuk baris V6. Bila dijalankan lebih dulu, baris V6 dilewati, jadi jalankan ulang setelah langkah 1; isinya tidak akan dobel.

Langkah 6 bergantung pada langkah 1, karena trigger skor harus mengenal skala 1–100, dan pada langkah 5, karena policy insert merujuk ke `MANAGEMENT`.

## Uji setelah penerapan (akun uji dari PO, jangan akun pribadi)

- **Employee:** buka Daily KPI dan simpan skor hari ini. Uji:
  - mengisi untuk tanggal besok ditolak;
  - mengisi untuk tanggal bulan lalu ditolak;
  - mengirim POST dengan `employeeId` orang lain tetap tersimpan atas nama diri sendiri.
- **HR:** buka Add Performance Review untuk pegawai yang sudah mengisi Daily KPI. Actual harus terisi otomatis, dan Gap tampil.
- **Director (DIR-GEN/DIR-FAT):** semua halaman bisa dibaca, label peran "Management", dan tidak ada tombol simpan untuk data orang lain. POST ke endpoint apa pun ditolak dengan 403, kecuali `POST /api/d4/kpi-daily` untuk Daily KPI miliknya sendiri (bila posisinya punya KPI).

Perilaku RLS langkah 5 dan 6 sudah diuji di Postgres 16 lokal dengan stub auth, B2, dan D3 (8 Nov 2026).
- Diterima: entri sendiri untuk hari ini, dan koreksi.
- Ditolak:
  - entri untuk orang lain, besok, periode lalu, atau periode yang tidak cocok dengan tanggal;
  - peran KPI lain dan skor 101;
  - UPDATE dan DELETE;
  - posisi tanpa KPI dan anon.
- Diuji ulang 9 Nov setelah Director diizinkan mengisi Daily KPI sendiri: entri Director untuk dirinya diterima, entri Director untuk pegawai lain dan entri pegawai untuk Director ditolak.

## Rollback

| # | Langkah |
|---|---|
| 7 | `delete from public.d4_position_kpi_roles where position_id in (select id from public.d3_positions where code in ('DIR-FAT', 'DIR-GEN')) and role_order = 2;` Lakukan sebelum ada scorecard atau entri harian Director. |
| 6 | `drop table public.d4_kpi_daily_entries; drop function public.d4_current_kpi_role(text);` Entri harian ikut hilang; backup dulu bila sudah dipakai. |
| 5 | Jalankan ulang definisi lama: `d4_current_role()` dari `20261013120000`, view `d4_employee` dari `20261017120000`, view `d4_employee_skills` dari `20261014120000`, dan lima policy baca dengan `array['HR','MANAGER']`. |
| 4, 2 | Kolom baru bisa dibiarkan; aplikasi tetap jalan tanpa memakainya. Hapus hanya bila belum ada data di dalamnya. |
| 3 | `alter table public.d4_kpi_assessments drop constraint d4_kpi_assessments_evidence_reference_required;` |
| 1 | Hanya selama belum ada scorecard V6: hapus baris V6 dari `d4_position_kpi_roles`, `d4_kpi_role_catalog`, dan `d4_kpi_catalog_versions`. |

## Temuan yang perlu keputusan PO

- **Scorecard periode 2026-12 di V5.1:** 1 baris live untuk periode yang belum mulai, disimpan sebelum aturan D4-FN-01. Setelah V6 berlaku, baris itu tetap berskala 1–5 di periode V6. Aplikasi menampilkannya apa adanya: skala 1–5, tanpa band dan tanpa gap. Revisi atas baris itu harus memakai V6. Saran: HR menghapus atau merevisinya. Agen tidak mengubah data live.
- **Riwayat migrasi:** setelah langkah di atas selesai, catat juga dua migrasi yang tidak tercatat (`d4_kpi_catalog_v51`, `d4_development_method_pic`) di `schema_migrations`, supaya `db push` kelak tidak mencoba menerapkannya lagi.
