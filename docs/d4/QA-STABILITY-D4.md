| Field | Value |
| --- | --- |
| **Document ID** | QA-D4-STAB-001 |
| **Squad** | D4 – Performance & Training Development |
| **Type** | Laporan uji stabilitas + bug log |
| **Date** | 1 Okt 2026 |
| **Branch** | `feature/d4-v2-d2-style` (repo sandbox `KevArslanian/hrms-d4-sandbox`) |
| **Related** | TEST-PLAN-D4; API-D4-001; AUDIT-UX-D4 §2.4–2.6 |

## 1. Cakupan dan batas

Uji stabilitas dijalankan **tanpa menulis ke Supabase bersama**. Ada dua lapis:

| Lapis | Cara | Yang dibuktikan |
|---|---|---|
| Otomatis (`npm test`, Vitest) | Handler API dipanggil langsung dengan session dan repository palsu di memori; fixture source; rules dan selectors | Status code dan envelope `{data}` / `{error:{code,message}}`, aturan integritas, pemetaan error, tampilan per role |
| Browser (mode fixture, `localhost`) | Crawl 17 route valid + 11 route id tidak dikenal, desktop 1280 px dan mobile 375 px | Tidak ada error runtime/konsol, NotFound untuk id tidak dikenal, tanpa scroll horizontal |

Belum tercakup: perilaku RLS dan constraint database yang sebenarnya (butuh staging/DB uji, lihat §5).

## 2. Hasil

| Pemeriksaan | Hasil |
|---|---|
| `npm test` — 4 file, 90 tes | PASS |
| `npm run typecheck` | PASS (0 error) |
| `npx eslint .` | PASS (0 temuan) |
| `npm run build` | PASS |
| Crawl desktop 28 route | PASS — 0 error konsol, 11/11 id tidak dikenal → NotFound |
| Crawl mobile 375 px, 17 route | PASS — `scrollWidth` = 375 di semua halaman |

File tes:

| File | Isi |
|---|---|
| `tests/d4/api.test.ts` | 401/403/400, 201 sukses, 422 per aturan (diri sendiri, periode ganda, `revisionOf`, skor, periode, UUID, panjang teks, KPI role/lines), 404 id tidak dikenal/non-UUID |
| `tests/d4/http.test.ts` | Setiap pesan error repository → status yang benar; detail SQL tidak bocor |
| `tests/d4/fixture-source.test.ts` | Aturan yang sama di mode pratinjau |
| `tests/d4/rules-selectors.test.ts` | Tanggal WIB, matriks rollback training 4×4, nomor revisi, tampilan HR/MANAGER/EMPLOYEE |

## 3. Bug log

| ID | Severity | Ringkasan | Reproduksi | Perbaikan | Bukti |
|---|---|---|---|---|---|
| BUG-D4-001 | Tinggi | Update status development need dengan id tidak dikenal atau bukan UUID sampai ke database; hasilnya 500 (DB asli) atau 201 palsu | `POST /api/d4/development-needs/<id-acak>/versions {"status":"Planned"}` | Handler memeriksa keberadaan need di snapshot sebelum menulis → 404 `NOT_FOUND` (sama seperti training) | `api.test.ts` › unknown or malformed ids |
| BUG-D4-002 | Tinggi | Input yang merujuk employee/posisi yang tidak ada dijawab 500 "Permintaan gagal diproses" karena frasa "tidak tersedia" tidak dikenali classifier | `POST /api/d4/competency-assessments` dengan `employeeId` UUID yang tidak ada | `classify()` memetakan "tidak tersedia" → 422 `VALIDATION_FAILED` | `http.test.ts` (14 pesan repository) |
| BUG-D4-003 | Sedang | Pratinjau role EMPLOYEE: Alfa bisa membuka detail milik employee lain lewat URL langsung (mode live aman karena RLS) | `NEXT_PUBLIC_D4_FIXTURE_ROLE=EMPLOYEE`, buka `/performance/FIX-D4-PERF-002` | Fixture mengembalikan hanya record milik aktor, meniru RLS | `rules-selectors.test.ts` › EMPLOYEE |
| BUG-D4-004 | Rendah | Data fixture: Mercury (HR) menilai dirinya sendiri | `/performance/FIX-D4-PERF-004` | Evaluator diganti Oscar (commit f913281) | `fixture-source.test.ts` |

**Bug severity tinggi terbuka: 0.**

## 4. Cara menjalankan ulang

```bash
npm test
```

Crawl browser: jalankan `npm run dev` dengan `NEXT_PUBLIC_D4_DATA_MODE=fixture`, lalu buka setiap route di tabel UI-D4-001 dan satu id tidak dikenal per modul.

## 5. Risiko terbuka (bukan bug aplikasi)

| ID | Risiko | Langkah berikut |
|---|---|---|
| O9 | Dua simpan bersamaan untuk employee + periode yang sama bisa lolos karena pengecekan duplikat ada di aplikasi, belum di index unik DB | Migrasi index unik setelah persetujuan PO |
| O7 | MANAGER masih melihat semua employee, belum dibatasi ke tim | Keputusan scope manager |
| STG | RLS dan constraint belum diuji di DB uji/staging | Supabase branch atau staging terpisah, bukan project bersama |
