| Field | Value |
| --- | --- |
| **Document ID** | GUIDE-D4-001 |
| **Squad** | D4 – Performance & Training Development |
| **Type** | Panduan belajar: bukti kerja, cara membuka, alur program, akun, hasil smoke test |
| **Version** | 1.0 |
| **Date** | 6 Okt 2026 |
| **Baseline kode** | `main` @ `2249d99` (PR #10), sama dengan deployment production Vercel `hrms-d4-sandbox` |
| **Related** | PLANKA-D4; API-D4-001; TEST-ACCOUNTS-D4; TEST-PLAN-D4; QA-STABILITY-D4; RN-D4-001; DEMO-SCRIPT-D4 |

Dokumen ini merangkum semua pekerjaan D4 dalam satu tempat, supaya bisa dipelajari berurutan. Isinya: apa saja yang sudah dikerjakan dan buktinya, langkah membuka setiap bukti, cara kerja program dari login sampai database, akun yang bisa dipakai, hasil smoke test, dan pemeriksaan kesesuaian dengan dokumen Andima.

Urutan belajar yang disarankan: §1 (gambaran), §3 (akun), §6 (alur program), §7 (API), §5 (bukti per kartu Planka), lalu §8 (kesesuaian dokumen).

---

## 1. Gambaran singkat

D4 adalah modul **Performance & Training Development** di HRMS PT Andima Transportindo. Isinya enam halaman dan satu aturan keterhubungan:

| Menu di sidebar | Fungsi | FR lama (dokumen repo) | FR Docmost V2 (subtitle halaman) |
| --- | --- | --- | --- |
| Performance Evaluation | Evaluasi kinerja per karyawan per periode, hasil 1–5 | FR-D4-001 | FR-D4-001 |
| KPI Scorecard | 5 Core KPI sesuai posisi (KPI Scorecard V5.1), bobot 100%, skor 1–5 | FR-D4-002 | FR-D4-001 (digabung) |
| Competency Gap | Membandingkan skill karyawan dengan requirement posisi | FR-D4-003 | FR-D4-002 |
| Development Requirement | Kebutuhan pengembangan yang wajib punya sumber | FR-D4-004 | FR-D4-003 |
| Training Tracking | Training yang terhubung ke development requirement | FR-D4-005 | FR-D4-003 (digabung) |
| Dashboard (People Dashboard) | Ringkasan per karyawan dari lima fitur di atas | FR-D4-006 | FR-D4-004 |
| (bukan menu) Source chip / blok Source | Setiap record bisa ditelusuri ke sumbernya | FR-D4-007 | FR-D4-005 |

> Penomoran FR berubah. Dokumen di `docs/d4/` memakai penomoran lama (7 FR). Halaman aplikasi sejak commit `b732504` (PR #6) memakai penomoran Docmost V2 (5 FR). Saat membaca TEST-PLAN atau PLANKA, gunakan tabel di atas untuk menerjemahkan.

Komponen yang terlibat:

| Komponen | Lokasi | Keterangan |
| --- | --- | --- |
| Repository | GitHub `KevArslanian/hrms-d4-sandbox` | Branch `main` = production |
| Aplikasi | Next.js 16 (App Router) + React 19 + Tailwind 4 | `app/`, `modules/d4/` |
| Database | Supabase project **"PISD x Andima Transportindo"** (`ufjbbwqaztgkqmpdmcyv`, region ap-northeast-2) | Dipakai bersama squad lain |
| Hosting | Vercel project `hrms-d4-sandbox` | https://hrms-d4-sandbox.vercel.app |
| Desain | Figma D4 V2 `blDVBM6m8VC02A7PvouX4F` | Lihat `docs/d4/README.md` |
| Board | Planka "Squad D4" | Konvensi di PLANKA-D4 |

---

## 2. Semua yang ada di Vercel

Akun Vercel: `deltaoga` (team `team_1HZrMkDzZq9KDyvM6T4B9KJJ`). Lima project berkaitan dengan D4/Andima:

| Project | Sumber deploy | Production / deployment terakhir | Isi |
| --- | --- | --- | --- |
| **hrms-d4-sandbox** | Git (GitHub `KevArslanian/hrms-d4-sandbox`), Next.js, Node 24.x | Production `main` @ `2249d99`, 6 Okt 2026 07:35 WIB. Domain: `hrms-d4-sandbox.vercel.app`, `hrms-d4-sandbox-deltaoga.vercel.app`, `hrms-d4-sandbox-git-main-deltaoga.vercel.app` | Aplikasi D4 utama. Inilah yang dijelaskan di §6–§7 |
| andima-hrms | Upload CLI (tanpa metadata Git) | 2 deployment preview, 5 Okt 2026 20:31 WIB | Tidak bisa diverifikasi dari sesi ini (lihat catatan) |
| hrms-d4-demo | Upload CLI | 2 deployment production, 3 Okt 2026 22:46 WIB | Tidak bisa diverifikasi dari sesi ini |
| pegangan-d4 | Upload CLI | 3 deployment production, 3 Okt 2026 19:52 WIB | Tidak bisa diverifikasi dari sesi ini |
| d4-pilihan-tugas | Upload CLI | Project dibuat 2 Okt 2026 13:19 WIB; tidak ada deployment di 30 deployment terakhir | Tidak bisa diverifikasi dari sesi ini |

> Catatan: dari container sesi ini, domain `*.vercel.app` dan `*.supabase.co` diblokir oleh kebijakan jaringan, dan Vercel menolak membuat link bypass (403). Karena itu isi keempat project CLI belum bisa dibaca, dan smoke test live di URL Vercel belum bisa dijalankan dari sini. Daftar di atas berasal dari API Vercel (metadata deployment), bukan dari membuka halamannya.

### 2.1 Riwayat production `hrms-d4-sandbox`

Setiap merge ke `main` otomatis menjadi deployment production. Setiap branch juga mendapat deployment preview sendiri.

| Waktu (WIB) | Commit | PR | Isi |
| --- | --- | --- | --- |
| 3 Okt 18:37 | `360eb15` | – (preview) | Modul D4 lengkap untuk demo minggu 5: 6 halaman, 14 route API / 19 endpoint |
| 3 Okt 19:57 | (CLI) | – | Deployment production manual pertama |
| 5 Okt 23:12 | `71fd84d` | #4 | Sidebar mengikuti Figma PISD D3 frame 2025:217 |
| 6 Okt 04:22 | `2047b63` | #5 | Sidebar gaya D2 + login/register B2 dengan logo Andima dan selector Katalon |
| 6 Okt 06:49 | `3ad347b` | #6 | Subtitle halaman mengikuti penomoran FR Docmost V2 |
| 6 Okt 07:00 | `b3a2ed4` | #7 | `data-testid` di semua menu untuk XPath Katalon |
| 6 Okt 07:19 | `031c1f6` | #8 | Perbaikan dari bug report ronde 1 (lihat §5.4) |
| 6 Okt 07:24 | `af7105d` | #9 | Bahasa form modal seragam Indonesia (bug 21) |
| 6 Okt 07:35 | `2249d99` | #10 | Bahasa halaman seragam Indonesia |

### 2.2 Konfigurasi yang dibutuhkan di Vercel

| Env var | Nilai | Wajib |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ufjbbwqaztgkqmpdmcyv.supabase.co` | Ya. Tanpa ini build gagal di `/login` dan API menjawab 503 `CONFIGURATION_ERROR` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key project (bukan service role) | Ya |
| `NEXT_PUBLIC_D4_DATA_MODE` | `supabase` | Opsional. Mode `fixture` diabaikan di production |
| `NEXT_PUBLIC_D4_DEMO_EMAIL` / `_PASSWORD` | Akun demo | Opsional, menampilkan kotak "Kredensial Pengujian" di `/login`. Nilainya publik di bundle browser |

**Deployment Protection (SSO) aktif** dengan mode `all_except_custom_domains`. Artinya pengunjung URL `*.vercel.app` harus login Vercel dan punya akses ke team `deltaoga`. Untuk demo ke orang luar, tambahkan custom domain atau matikan protection di Vercel → Project → Settings → Deployment Protection.

### 2.3 Cara membuka

1. Login Vercel → https://vercel.com/deltaoga/hrms-d4-sandbox → tab **Deployments**. Setiap baris menampilkan commit dan PR.
2. Klik deployment → **Visit** untuk membuka aplikasi, atau **Build Logs** untuk bukti build berhasil.
3. Buka https://hrms-d4-sandbox.vercel.app → diarahkan ke `/login` → login dengan akun di §3.

---

## 3. Akun yang bisa dipakai

### 3.1 Mode live (Supabase)

Peran dibaca dari tabel `d3_user_access`. Daftar di bawah dibaca langsung dari database pada 6 Okt 2026. **Password tidak disimpan di repo** (aturan TEST-ACCOUNTS-D4). Mintalah ke PO atau pemilik akun.

| Peran | Email | Employee tertaut | Posisi | Data D4 milik akun ini | Login terakhir |
| --- | --- | --- | --- | --- | --- |
| HR | `deltaogaputra@gmail.com` (akun Anda) | Demo HR D4 (Delta) | HR Administrator | Tidak ada (bisa menilai semua orang) | 6 Okt |
| HR | `demo.d3.hr.001@example.invalid` | Alya Demo HR | Demo HR Administrator | 3 scorecard KPI | 6 Okt |
| HR | `demo.staff@andima.test` | Demo Staff Admin | Freight Forwarding Specialist | 1 evaluasi, 1 scorecard | 5 Okt |
| MANAGER | `demo.manager@andima.test` | Demo Manager Supervisor | Freight Forwarding Specialist | 1 evaluasi, 1 scorecard | 5 Okt |
| MANAGER | `demo.d3.manager.001@example.invalid` | Bima Demo Manager | Demo HR Manager | Tidak ada | Belum pernah |
| EMPLOYEE | `demo.d3.employee.001@example.invalid` | Citra Demo Satu | Demo Employee | 2 evaluasi, 1 development, 1 training. Tanpa KPI (posisi tanpa KPI) | 5 Okt |

Ada 5 akun lain milik anggota tim pribadi (3 EMPLOYEE, 2 HR) yang sengaja tidak dicantumkan. Semua 11 akun sudah punya `employee_id`, jadi syarat "akun HR/MANAGER harus terhubung ke employee" di TEST-ACCOUNTS-D4 sudah terpenuhi.

Apa yang dilihat tiap peran (dari kode, sama dengan TEST-ACCOUNTS-D4 §3–§4):

| Peran | Halaman | Tombol tulis | API POST |
| --- | --- | --- | --- |
| HR | Semua karyawan | Ada (Tambah Evaluasi, Tambah Scorecard, Simpan Assessment, Tambah Requirement, Ubah Status, Buat/Tambah Training, Ubah Progres) | 201 / 422 |
| MANAGER | Semua karyawan (belum dibatasi per tim, risiko O7) | Sama dengan HR | 201 / 422 |
| EMPLOYEE | Hanya data sendiri. Detail milik orang lain tampil "tidak ditemukan" | Tidak ada | 403 |
| Tanpa baris `d3_user_access` | Login ditolak "Akun ini belum dipetakan ke akses HRMS" | – | 403 |

### 3.2 Mode demo (tanpa Supabase)

Tidak perlu akun. Peran dipilih lewat env saat server dev dijalankan:

| `NEXT_PUBLIC_D4_FIXTURE_ROLE` | Aktor | Posisi (struktur Andima) |
| --- | --- | --- |
| `HR` (default) | Mercury | HR Associate Officer (HCC-HRA-002, Learning, Development & Performance) |
| `MANAGER` | Romeo | Sales Executive (COM-SLS-002, atasan Sales Administration Team 2) |
| `EMPLOYEE` | Alfa | Sales Administration Associate (COM-SA-02-01), read-only |

```bash
npm ci --legacy-peer-deps
NEXT_PUBLIC_D4_DATA_MODE=fixture NEXT_PUBLIC_D4_FIXTURE_ROLE=HR npm run dev
# buka http://localhost:3000/dashboard  (badge "Preview · data fiktif" di topbar)
```

Isi data demo dijelaskan di §4.

---

## 4. Data demo dari file Andima

Data Supabase bersama belum lengkap untuk demo D4:

- Dari 22 employee, hanya posisi "Freight Forwarding Specialist" yang punya `position_requirements` (2 baris). Posisi lain (HR Administrator, Demo Employee, Tim IT) tidak punya requirement, sehingga Competency Gap berstatus "Belum Ada Persyaratan".
- Hanya 3 employee yang punya `d3_employee_skills`.
- Posisi "Demo Employee" dan "Tim IT" tidak punya KPI di V5.1. "HR Administrator" terpetakan ke KPI Finance & Administration karena kata kunci *administrator* (lihat §8.3).
- 10 dari 13 evaluasi live bernilai desimal (data seed `[seed-d4]`), padahal form hanya menerima 1–5 bulat.

Karena itu mode demo (`fixture`) diisi ulang dari file Andima agar setiap halaman terisi jelas:

| Sumber | Dipakai untuk |
| --- | --- |
| `OrganizationalStructureData_PTANDIMATRANSPORTINDO_UAJY_APPROVED_V1.xlsx`, sheet `01_ORG_MASTER` | Departemen, judul posisi, Employee ID, atasan langsung |
| Sheet `02_ROLE_RESP` | Kode posisi (`ROLE-xxx`) dan kompetensi (diturunkan dari *Core Responsibilities*) |
| `KPI_Scorecard_-_PT_Andima_Transportindo_V5.1.xlsx`, sheet `KPI LIST PER POSISI` | 5 Core KPI dan bobot per jabatan (sudah identik dengan `modules/d4/kpi/catalog.ts` dan tabel `d4_kpi_role_catalog`) |
| Sheet `SAMPEL EVALUATION CARD` V5.1 | Target dan realisasi scorecard Finance (Lima, total 4,10 sama dengan sampel) |
| `worksheet_Example_AENAT.pdf` | Bukti kompetensi dan evaluasi Sales Admin (Job AENAT/2609/0354, TRX-0926-00627) |
| `reimbursement_Example_AENAT.pdf` | Bukti kompetensi Finance (invoice reimbursement 26 28597A) |

Nama orang: file organisasi berisi nama placeholder (Alfa … Oscar di Sales Administration Team 2, Sun dan Mercury di HCC). Nama itu dipakai apa adanya. Baris yang di file berisi nama staf asli diberi nama placeholder (Romeo, Quebec, Lima, Kilo, Tango), sesuai aturan RN-D4-001 bahwa data contoh tidak memuat nama staf asli.

| Nama demo | Employee ID | Posisi | Departemen | KPI V5.1 | Status competency | Data D4 |
| --- | --- | --- | --- | --- | --- | --- |
| Alfa | COM-SA-02-01 | Sales Administration Associate | Commercial & Customer Success | Sales & Marketing (9) | Gap (Akurasi Dokumen 2/4) | Evaluasi Sep + Jun, scorecard Sep + Jun, DEV-001 Identified, TRN-001 Planned |
| Bravo | COM-SA-02-02 | Sales Administration Associate | Commercial | 9 | Terpenuhi; Assess Position Change ke Sales Executive | Evaluasi Sep + Jun, scorecard, DEV-004 (sumber role change) |
| Charlie | COM-SA-02-03 | Sales Administration Associate | Commercial | 9 | Gap (Data Siap Tagih 2/3) | Evaluasi, scorecard, DEV-002 Planned, TRN-002 In Progress |
| Delta | COM-SA-02-04 | Sales Administration Associate | Commercial | 9 | Terpenuhi | Evaluasi 5, scorecard 4,60, DEV-006 (sumber evaluasi), TRN-005 |
| Echo | COM-SA-02-05 | Sales Administration Associate | Commercial | 9 | Gap (Akurasi Dokumen 3/4) | Evaluasi dengan revisi (2 → 3), scorecard, DEV-003 In Progress, TRN-003 |
| Fanta | COM-SA-02-06 | Sales Administration Associate | Commercial | 9 | Data Belum Cukup (skill tanpa bukti) | Evaluasi, scorecard |
| Holly | COM-SA-02-07 | Sales Administration Associate | Commercial | 9 | Data Belum Cukup | **Sengaja belum dievaluasi** untuk input live saat demo |
| Oscar | COM-SA-02-12 | Sales Administration Associate | Commercial | 9 | Terpenuhi | Evaluasi, scorecard |
| Romeo | COM-SLS-002 | Sales Executive | Commercial | 9 | Terpenuhi | Evaluasi, scorecard (aktor MANAGER) |
| Mercury | HCC-HRA-002 | HR Associate Officer | Human Capital & Culture | – (tidak ada di V5.1) | Terpenuhi | Evaluasi oleh Quebec (aktor HR) |
| Sun | HCC-HRA-001 | HR Associate Officer | HCC | – | Gap (Administrasi KPI 2/3) | Evaluasi, DEV-007, TRN-006 Cancelled, TRN-007 In Progress |
| Quebec | HCC-HR-MGR-001 | HR Manager | HCC | – | Terpenuhi | Evaluasi |
| Lima | FAT-BIL-001 | Accounting Associate (Billing) | Finance, Accounting & Tax | Finance & Administration (10) | Terpenuhi | Evaluasi Sep + Jun, scorecard 4,10 |
| Kilo | FAT-BIL-002 | Accounting Associate (Billing) | Finance | 10 | Gap (Invoice 2/3) **tetap Gap** setelah training Completed | Evaluasi, scorecard, DEV-005 Completed, TRN-004 Completed |
| Tango | FAT-TAX-ASC-001 | Tax Associate | Finance | – | Terpenuhi | Evaluasi |

Skenario TEST-PLAN yang langsung bisa diperagakan dengan data ini:

| Skenario | Cara melihat |
| --- | --- |
| TS-D4-001 KPI berbeda menurut posisi | `/kpi`: Alfa (Sales & Marketing, bobot 35/25/15/15/10) vs Lima (Finance & Administration, 25/25/20/15/15); Mercury tidak punya KPI |
| TS-D4-002 Skill gap dan role change | `/competency/<Bravo>/history`: snapshot posisi sekarang + Assess Position Change ke Sales Executive |
| TS-D4-003 Gap → training → completion | Kilo: DEV-005 Completed, TRN-004 Completed, tetapi Competency Gap tetap Gap |
| Gap vs Data Belum Cukup | Alfa (Gap) vs Fanta (Data Belum Cukup) |
| Revisi tanpa menimpa | `/performance/history/<Echo>`: dua record September |
| Rollback butuh alasan | Training Sun: Cancelled → dibuka lagi wajib isi catatan |

---

## 5. Bukti per kartu Planka dan cara membukanya

Daftar kartu dan label diambil dari PLANKA-D4 §4 (board diterapkan 30 Sep 2026). Board Planka sendiri tidak bisa diakses dari sesi ini, jadi status list di bawah adalah status menurut dokumen. Setiap kartu memuat bukti dan langkah membukanya secara berurutan. "Demo" artinya dijalankan dengan perintah di §3.2.

Singkatan langkah yang dipakai berulang:

- **[Repo]**: buka https://github.com/KevArslanian/hrms-d4-sandbox → branch `main` → path file.
- **[Live]**: https://hrms-d4-sandbox.vercel.app → login akun HR (§3.1) → route.
- **[Demo]**: `NEXT_PUBLIC_D4_DATA_MODE=fixture npm run dev` → http://localhost:3000 + route.
- **[Tes]**: `npm test` di root repo (Vitest, 217 tes).

### 5.1 Kartu PO

| Kartu | Bukti | Cara membuka (urut) |
| --- | --- | --- |
| [PO] Finalisasi Scope, Requirement & Prioritas MVP D4 (Done) | Docmost "Finalisasi Scope Kerja D4"; RN-D4-001 §2 | 1. Docmost → "Finalisasi Scope Kerja D4". 2. [Repo] `docs/d4/RN-D4-001.md` §2 tabel fitur |
| [PO] Finalisasi Requirement Phase 1 (Doing) | RN-D4-001 §2, §7; AUDIT-UX-D4 §2.6 (O1–O4) | 1. [Repo] `docs/d4/RN-D4-001.md` §7 known issues. 2. `docs/d4/AUDIT-UX-D4.md` §2.6 |
| [PO] Finalisasi Requirement Phase 2 | AUDIT §3 (relasi FR-003↔004); `drafts/docmost/02` | 1. `docs/d4/AUDIT-UX-D4.md` §3. 2. `docs/d4/drafts/docmost/02-fr-d4-004-relasi-fr-d4-003.md` |
| [PO] Finalisasi Requirement Phase 3 | RN-D4-001 §2 | `docs/d4/RN-D4-001.md` baris Training dan People Dashboard |
| [PO] Validasi Dependency, Integration, Security & Cross-Cutting | TEST-PLAN §5; API-D4-001 | 1. `docs/d4/TEST-PLAN-D4.md` §5. 2. `docs/d4/API-D4-001.md` §2–§3 |
| [PO] Review MVP, Acceptance & Final Readiness D4 | TEST-PLAN §7; RN-D4-001 §7; dokumen ini §9 | 1. `docs/d4/TEST-PLAN-D4.md` §7. 2. §9 di bawah (hasil smoke test) |

### 5.2 Kartu WebDev (Fullstack / Front End / Back End)

| Kartu | Bukti | Cara membuka (urut) |
| --- | --- | --- |
| [Back End] Setup Foundation, Data Model & Integration D4 | Migrasi `supabase/migrations/*`; repository `modules/d4/supabase/repository.ts`; envelope `modules/d4/server/_lib/http.ts`; badge Preview di `AppShell.tsx` | 1. [Repo] `supabase/migrations/20260928052350_d4_performance_development.sql` (tabel, RLS). 2. Supabase dashboard → Table editor → tabel `d4_*` (10 tabel). 3. [Repo] `modules/d4/server/_lib/session.ts` (sesi + peran). 4. [Demo] → badge "Preview · data fiktif" di topbar |
| [Fullstack] Implementasi Performance Evaluation | Route `/performance`, `/performance/[id]`, `/performance/history/[employeeId]`; API `performance-evaluations` | 1. [Live]/[Demo] `/performance` → tabel. 2. Klik baris → detail. 3. Menu ⋮ → Lihat Riwayat. 4. **Tambah Evaluasi** → kosongkan → Simpan → pesan wajib. 5. Isi Holly, hasil 4, catatan → Simpan → toast + baris Selesai. 6. [Repo] `modules/d4/server/performance-evaluations/index.ts`. 7. [Tes] `tests/d4/api.test.ts` |
| [Fullstack] Implementasi KPI Scorecard Employee | Route `/kpi*`; API `kpi-assessments`, `kpi-catalog`; katalog V5.1 | 1. `/kpi` → buka scorecard Alfa → tabel Core KPI (bobot, target, realisasi, skor, terbobot). 2. **Tambah Scorecard** → pilih karyawan → KPI jabatan terisi otomatis → isi 5 skor → total terhitung. 3. [Repo] `modules/d4/kpi/catalog.ts` (50 baris V5.1). 4. [Tes] `tests/d4/kpi-scoring.test.ts` |
| [Fullstack] Implementasi Competency Gap & Development Requirement | Route `/competency*`, `/development*`; AUDIT §3 | 1. `/competency` → status Terpenuhi / Gap / Data Belum Cukup. 2. Buka Alfa → tabel requirement vs capability → **Simpan Assessment**. 3. Dari baris Gap → **Buat Development Requirement**. 4. `/development/FIX-D4-DEV-001` (demo) → blok Source tertaut ke gap. 5. [Repo] `modules/d4/competency/service.ts` |
| [Fullstack] Implementasi Training Completion Tracking | Route `/training*`; API `training-records` | 1. `/training` → daftar. 2. Buka training → **Ubah Progres** → pilih Completed tanpa hasil → ditolak. 3. Isi hasil → tersimpan, riwayat bertambah. 4. Notice kuning "Training Completed tidak otomatis mengubah competency gap" |
| [Front End] Implementasi Dashboard KPI Orang | Route `/dashboard`, `/dashboard/employee/[id]`; API `snapshot` | 1. `/dashboard` → satu baris per karyawan pada periode yang sama. 2. Filter posisi / periode / cari. 3. Klik karyawan → profil (KPI, evaluasi, competency, development & training) |
| [Fullstack] Security, Validation, Integration Fix & Final Staging Readiness | `http.ts` (error generik, log `[d4-api]`); `session.ts` (`requireWriter`); 217 tes | 1. [Repo] `modules/d4/server/_lib/http.ts` fungsi `handle`. 2. `modules/d4/server/_lib/session.ts` fungsi `requireWriter`. 3. [Tes] blok "account without employee_id" dan "unknown or malformed ids" di `tests/d4/api.test.ts`. 4. Vercel → Deployments (production ada, lihat §2.1) |

### 5.3 Kartu UI/UX

| Kartu | Bukti | Cara membuka (urut) |
| --- | --- | --- |
| [UI/UX] Setup User Flow, IA & UI Component D4 | Figma frame 00; UI-D4-001 | 1. Figma `blDVBM6m8VC02A7PvouX4F` → page D4 → board "00 Foundations & Components". 2. [Repo] `docs/d4/UI-D4-001.md` |
| [UI/UX] Design Performance Evaluation & KPI Scorecard (Done) | Figma 01–12 (node 19:4133) | https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=19-4133 |
| [UI/UX] Design Competency Gap & Development Requirement | Figma 13–20 (node 21:4152) | …?node-id=21-4152. Kurang frame validation Development |
| [UI/UX] Design Training Completion Tracking | Figma 21–25 (node 24:4152) | …?node-id=24-4152. Kurang frame validation Training |
| [UI/UX] Design Dashboard KPI Orang (Done) | Figma 26–29, 35, 36 (node 25:4116) | …?node-id=25-4116 |
| [UI/UX] UI Consistency Review, Handoff & Final Design Validation | Figma 00, 30–34 (node 2:2); AUDIT-UX-D4; UI-D4-001 | 1. …?node-id=2-2. 2. `docs/d4/AUDIT-UX-D4.md` |

### 5.4 Kartu QA dan Bug

| Kartu | Bukti | Cara membuka (urut) |
| --- | --- | --- |
| [QA] Penyusunan Test Plan & Requirement Traceability D4 | TEST-PLAN-D4 (117 TC/TS) | `docs/d4/TEST-PLAN-D4.md` §6 |
| [QA] Pengujian Phase 1 / 2 / 3 | TC-D4-001 … 006; smoke demo §9 | 1. `docs/d4/TEST-PLAN-D4.md` §6 per FR. 2. Hasil smoke §9 (mode demo). Status TC di TEST-PLAN masih "Not Run" karena butuh staging live |
| [QA] Pengujian Integration, Security, Validation & UI Quality | TC-D4-007, SEC, UIQ; `tests/d4/*.test.ts` | 1. [Tes]. 2. `docs/d4/QA-STABILITY-D4.md` §2 |
| [QA] Test Execution, Defect Reporting & Retest | QA-STABILITY bug log BUG-D4-001…005; commit `fff3a5c` (PR #8) | 1. `docs/d4/QA-STABILITY-D4.md` §3. 2. GitHub PR #8 "code fixes from bug report (round 1)" |
| [QA] Regression Testing & Final QA Evidence | `npm test` 217 PASS; smoke §9 | [Tes] + §9 |
| [QA] TS-D4-001 / 002 / 003 | TEST-PLAN §6 TS; data demo §4 | Ikuti tabel skenario di §4 |
| [QA] UC-D4-002 / UC-D4-003 | TEST-PLAN §6 UC | `docs/d4/TEST-PLAN-D4.md` §6 bagian UC |
| [Bug] BUG-D4-002 Dashboard (V1) | Perlu retest di V2 | [Live]/[Demo] `/dashboard` + profil karyawan |
| [Bug] BUG-D4-003 Data Competency Gap tertukar antar employee (V1) | Perlu retest di V2; tes `competency-gap.test.ts` | [Demo] buka `/competency/<Alfa>` lalu `/competency/<Charlie>`: requirement dan skill berbeda per orang |

Perbaikan bug report ronde 1 (PR #8, `fff3a5c`):

- Development: update ke status yang sama ditolak; status mundur wajib alasan (UI, API, demo).
- Training progress: tombol Simpan nonaktif bila tidak ada perubahan.
- KPI/Performance: tanggal evaluasi tidak boleh di masa depan.
- KPI: kolom Departemen, Draft di filter status, komentar per KPI.
- KPI/Performance: tidak ada tombol Tambah pada record milik sendiri.
- Menu baris: View Detail dihapus (klik baris sudah membuka detail).
- Training: filter "All source requirements" dihapus. Ini berbeda dengan `drafts/planka/02` yang merekomendasikan centang item filter tersebut; checklist Planka perlu disesuaikan.
- Dashboard: semua baris memakai periode yang sama.
- FormModal: konfirmasi sebelum menutup form yang sudah diisi.

---

## 6. Alur program

### 6.1 Arsitektur

```text
Browser (React, modules/d4/web)
   │  fetch /api/d4/*  (cookie sesi Supabase, timeout 20 s)
   ▼
proxy.ts (Next middleware)          ── halaman tanpa sesi → redirect /login
   ▼
app/api/d4/**/route.ts              ── tipis: GET/POST → handle(...)
   ▼
modules/d4/server/<resource>/index.ts
   │  1. d4Session(): baca cookie → supabase.auth.getUser() → 401 bila tidak ada
   │  2. requireWriter() (POST saja): d3_user_access.app_role ∈ {HR, MANAGER} → selain itu 403
   │  3. validasi field.* → 400/422
   │  4. aturan bisnis shared/rules.ts → 422
   ▼
modules/d4/supabase/repository.ts   ── query/insert/RPC dengan sesi pengguna (bukan service role)
   ▼
Supabase Postgres                   ── RLS: EMPLOYEE hanya baris miliknya; INSERT hanya HR/MANAGER
                                       trigger d4_calculate_kpi_assessment; RPC d4_create_*
```

Tiga lapis keamanan: login Supabase, cek peran di setiap POST (`requireWriter`), dan Row Level Security di database. Tidak ada UPDATE/DELETE: setiap perubahan disimpan sebagai record atau revisi baru.

### 6.2 Login (`app/login/page.tsx`)

1. User isi email + password → `supabase.auth.signInWithPassword`.
2. Bila gagal: hitung percobaan. Percobaan ke-3 → kunci 30 detik; ke-4 → peringatan; ke-5 → diblokir (pesan hubungi IT).
3. Bila berhasil: cek baris `d3_user_access`. Tidak ada → logout dan tampilkan "Akun ini belum dipetakan ke akses HRMS".
4. Ada → redirect ke `/dashboard` setelah 1,2 detik.
5. `/register` (alur B2 tim): `supabase.auth.signUp` lalu simpan ke `b2_register` dengan Employee ID `AND-0001`, `AND-0002`, dan seterusnya. Akun baru tetap butuh baris `d3_user_access` dari admin sebelum bisa memakai D4.

### 6.3 Memuat halaman

1. `proxy.ts` memeriksa sesi untuk setiap halaman. Tanpa sesi → `/login`. Sudah login dan membuka `/login` → `/dashboard`. Route `/api/*` tidak di-redirect; ia menjawab 401 JSON sendiri.
2. `app/(d4)/layout.tsx` membungkus halaman dengan `D4DataProvider`.
3. Provider memilih sumber data: `apiSource` (live) atau `createFixtureSource()` (demo, hanya `next dev` + `NEXT_PUBLIC_D4_DATA_MODE=fixture`).
4. Provider memanggil `GET /api/d4/snapshot` sekali → seluruh data yang boleh dilihat akun (sudah difilter RLS) → semua halaman membaca dari snapshot yang sama. Karena itu angka di Dashboard selalu sama dengan halaman sumbernya.
5. `selectors.ts` menentukan `canWrite` (HR/MANAGER) untuk menampilkan atau menyembunyikan tombol tulis.

### 6.4 Menyimpan data

1. Form modal memvalidasi di browser (field wajib, skor 1–5, tanggal ≤ hari ini).
2. Klik Simpan → `POST /api/d4/<resource>`.
3. Server mengulang semua validasi (klien tidak dipercaya), lalu insert.
4. Sukses → 201 `{ data: { id } }` → toast hijau → snapshot dimuat ulang.
5. Gagal → `{ error: { code, message } }` → pesan ditampilkan di form/toast. Error database tidak pernah dikirim mentah ke browser; detailnya hanya di log server `[d4-api]`.
6. Bila simpan berhasil tetapi muat ulang gagal, UI tetap menyatakan berhasil supaya user tidak menyimpan dua kali.

### 6.5 Logika per fitur

**Performance Evaluation** (`server/performance-evaluations`)

- Field: karyawan, periode `YYYY-MM`, tanggal evaluasi, hasil 1–5 (bulat), catatan (wajib), bukti (opsional).
- Penilai diambil dari employee akun yang login, bukan dari form. Akun HR/MANAGER tanpa `employee_id` → 403.
- Tidak boleh menilai diri sendiri → 422.
- Satu record aktif per karyawan per periode. Record kedua harus menyebut `revisionOf` = id record terbaru periode itu; di UI muncul centang "simpan sebagai revisi". Periode lama tidak pernah ditimpa.

**KPI Scorecard** (`server/kpi-assessments`, `kpi/catalog.ts`)

- Katalog dibaca dari `d4_kpi_role_catalog`; versi V5.1 dipakai bila ada.
- Jabatan KPI ditentukan otomatis dari judul posisi (`roleForPositionTitle`): kecocokan nama persis, lalu kata kunci utuh (sales/marketing → 9, finance/accounting/admin → 10, customs/ppjk → 5, warehouse/logistics → 7, freight → 6, implant/edi/manifest → 8, branch → 4, operations director → 3, ceo/vice president → 1, director → 2). Tidak cocok → 0 = "KPI belum tersedia untuk posisi ini".
- Server menolak bila `roleOrder` berbeda dari hasil pemetaan, bila jumlah indikator bukan 5, bila total bobot bukan 100, atau bila nama/urutan KPI berbeda dari katalog.
- Skor mentah 1–5 diisi penilai. Skor terbobot = bobot × skor / 100; total = jumlah skor terbobot, dibulatkan 2 desimal oleh trigger `d4_calculate_kpi_assessment`. Realisasi tidak pernah dikonversi otomatis menjadi skor, dan tidak ada label tercapai.
- Contoh: bobot Finance 25/25/20/15/15 dengan skor 4,5,4,3,4 → 1,00 + 1,25 + 0,80 + 0,45 + 0,60 = **4,10** (sama dengan sampel V5.1).

**Competency Gap** (`competency/service.ts`)

Untuk setiap requirement posisi (`position_requirements`), cari skill karyawan (`d3_employee_skills`):

| Kondisi | Status |
| --- | --- |
| Tidak ada skill, atau skill tanpa catatan bukti | Data Belum Cukup (disimpan `Bukti Belum Cukup`) |
| Level skill < level minimum | Gap |
| Level skill ≥ minimum | Terpenuhi |

Status keseluruhan: ada Gap → Gap; selain itu ada Data Belum Cukup → Data Belum Cukup; semua terpenuhi → Terpenuhi; tidak ada requirement → Belum Ada Persyaratan. Gap dihitung ulang di server, tidak diterima dari klien. **Simpan Assessment** menyimpan snapshot; klik ganda dengan isi identik di hari yang sama tidak membuat baris kedua. **Nilai Perubahan Posisi** membandingkan dengan posisi lain (context `role-change`) tanpa mengubah posisi karyawan.

**Development Requirement** (`server/development-needs`)

- Sumber wajib salah satu: `competency_gap` (requirement yang berstatus Gap), `role_change` (assessment role-change), atau `performance_context` (evaluasi completed). Sumber harus milik karyawan yang sama.
- Satu requirement terbuka per gap.
- Dibuat lewat RPC `d4_create_development_need` (need + revisi 1 dalam satu transaksi).
- Status: Identified → Planned → In Progress → Completed. Update ke status yang sama ditolak; status mundur wajib alasan. Setiap perubahan = revisi baru.

**Training Tracking** (`server/training-records`)

- Wajib mengacu ke development requirement milik karyawan yang sama dan belum Completed.
- Status: Planned, In Progress, Completed (hasil wajib), Cancelled. Mundur atau membuka lagi Cancelled wajib alasan.
- Training Completed **tidak** menutup gap. Gap hanya tertutup lewat bukti skill baru + reassessment.

**People Dashboard**

Tidak punya tabel atau endpoint sendiri. Lapisan tampilan di atas snapshot: satu baris per karyawan pada satu periode (dipilih atau terbaru), berisi total KPI, hasil evaluasi, status competency, jumlah development terbuka, dan training. Profil karyawan menolak meringkas scorecard yang bobotnya bukan 100%.

### 6.6 Tabel database D4

| Tabel | Isi | Cara tulis |
| --- | --- | --- |
| `d4_performance_evaluations` | Evaluasi per periode | INSERT (HR/MANAGER) |
| `d4_kpi_role_catalog` | Katalog KPI V3.1 (50) + V5.1 (50) | Migrasi |
| `d4_kpi_assessments` | Scorecard + `lines` (JSON 5 baris) + `definition_version` | INSERT; trigger menghitung total |
| `d4_competency_assessments` | Snapshot gap (`findings` JSON) | INSERT |
| `d4_development_needs` + `d4_development_need_versions` | Need + revisi status | RPC `d4_create_development_need`, lalu INSERT revisi |
| `d4_training_records` + `d4_training_versions` | Training + revisi status | RPC `d4_create_training_record`, lalu INSERT revisi |
| `d4_figma_demo_people`, `d4_figma_demo_trend` | Sisa demo Figma lama, baca publik | Tidak dipakai aplikasi |

Data D3 yang dibaca (tidak pernah ditulis D4): `d3_employee`, `d3_positions`, `d3_departments`, `d3_competencies`, `d3_employee_skills`, `position_requirements`, `d3_user_access`, `employee_kpi`. Kolom aktor (`actor_auth_user_id`, `actor_employee_id`) dan `created_at` diisi default database dari sesi, bukan dari body request.

---

## 7. API endpoint

Format: sukses `{ "data": … }`, gagal `{ "error": { "code", "message" } }`. Semua daftar menerima `?employee_id=<uuid>`. API membaca sesi dari **cookie**, bukan header `Authorization`.

| # | Method | Path | Logika | Kode yang mungkin |
| --- | --- | --- | --- | --- |
| 1 | GET | `/api/d4/me` | Peran + employee akun yang login | 200, 401, 403 |
| 2 | GET | `/api/d4/snapshot` | Semua data D4 yang boleh dilihat (dipakai UI) | 200, 401, 403 |
| 3 | GET | `/api/d4/kpi-catalog?role_order=` | Katalog aktif (V5.1), opsional satu jabatan | 200, 401 |
| 4 | GET | `/api/d4/performance-evaluations` | Riwayat evaluasi, terbaru dulu | 200, 401, 403 |
| 5 | POST | `/api/d4/performance-evaluations` | Buat evaluasi (§6.5) | 201, 400, 401, 403, 404, 409, 422 |
| 6 | GET | `/api/d4/performance-evaluations/{id}` | Detail evaluasi | 200, 404 |
| 7 | GET | `/api/d4/kpi-assessments` | Daftar scorecard | 200 |
| 8 | POST | `/api/d4/kpi-assessments` | Buat scorecard (§6.5) | 201, 403, 404, 422 |
| 9 | GET | `/api/d4/kpi-assessments/{id}` | Detail scorecard | 200, 404 |
| 10 | GET | `/api/d4/competency-assessments` | Snapshot gap (tidak ada endpoint detail) | 200 |
| 11 | POST | `/api/d4/competency-assessments` | Hitung ulang gap di server dan simpan snapshot | 201, 403, 404, 422 |
| 12 | GET | `/api/d4/development-needs` | Revisi terbaru setiap need | 200 |
| 13 | POST | `/api/d4/development-needs` | Buat need dengan sumber valid | 201, 403, 422 |
| 14 | GET | `/api/d4/development-needs/{id}` | `{ latest, versions }` | 200, 404 |
| 15 | POST | `/api/d4/development-needs/{id}/versions` | Ubah status (revisi baru) | 201, 404, 422 |
| 16 | GET | `/api/d4/training-records` | Versi terbaru setiap training | 200 |
| 17 | POST | `/api/d4/training-records` | Buat training untuk need terbuka | 201, 403, 422 |
| 18 | GET | `/api/d4/training-records/{id}` | `{ latest, versions }` | 200, 404 |
| 19 | POST | `/api/d4/training-records/{id}/versions` | Ubah status/hasil (revisi baru) | 201, 404, 422 |

Method lain (PUT/PATCH/DELETE) → 405 dengan header `Allow`.

### 7.1 Cara mencoba endpoint

Cara paling mudah (tanpa alat tambahan):

1. Buka [Live] dan login.
2. Tekan F12 → tab **Network** → filter `api/d4`.
3. Muat ulang halaman → klik request `snapshot` → tab **Response** berisi seluruh data.
4. Simpan satu form → request `POST` muncul dengan status 201 dan body-nya.

Dengan terminal (salin header `Cookie` dari request di langkah 3; jangan dibagikan atau di-commit):

```bash
curl -s https://hrms-d4-sandbox.vercel.app/api/d4/me --cookie "<cookie sesi>"
# tanpa cookie → {"error":{"code":"UNAUTHENTICATED",...}} dengan status 401
```

Smoke test otomatis dari repo:

```bash
# isi D4_SMOKE_BASE_URL dan D4_SMOKE_COOKIE_HR / _MANAGER / _EMPLOYEE di .env.local
npm run smoke:d4             # semua GET per peran
npm run smoke:d4 -- --probe  # + POST "{}": EMPLOYEE 403, HR/MANAGER 422, tanpa menulis data
```

Contoh body POST ada di API-D4-001 §5–§6 dan di `scripts/smoke-d4.mjs` fungsi `writeAll`.

---

## 8. Kesesuaian dengan dokumen

### 8.1 KPI Scorecard V5.1 vs aplikasi vs database

| Pemeriksaan | Hasil |
| --- | --- |
| 50 baris `KPI LIST PER POSISI` (posisi, urutan, nama KPI, bobot) vs `modules/d4/kpi/catalog.ts` | **Cocok 50/50** (dibandingkan otomatis per sel) |
| Sama vs tabel `d4_kpi_role_catalog` versi V5.1 di Supabase | **Cocok 50/50** |
| Total bobot per jabatan | 100% untuk 10 jabatan |
| Skala skor 1–5 dan label (1 Sangat Kurang … 5 Sangat Baik) | Sama dengan form |
| Rumus skor terbobot dan total | Sama dengan sheet scoring card; sampel Finance menghasilkan 4,10 di aplikasi |
| Kolom Target dan Realisasi | Ada di form, diisi bebas, tidak dikonversi menjadi skor (sesuai template) |
| "Rekomendasi / Rencana Pelatihan" di template | Tercakup oleh Catatan/rekomendasi atasan + Development Requirement |

V3.1 vs V5.1: nama jabatan dan sebagian nama KPI berbeda (contoh "Customs Clearance Expert / PPJK" → "Customs Clearance & PPJK"; "Implant Staff (PEB, PIB, BC 1.1 Manifest Input)" → "Implant Staff (EDI & Manifest Input)"). Bobot tidak berubah. Di database masih ada 2 scorecard lama berversi V3.1 (Vice President, Customs) dan 5 scorecard V5.1.

### 8.2 Status migrasi

README dan RN-D4-001 menyatakan migrasi `20260929150000_d4_kpi_catalog_v51.sql` **belum** diterapkan. Pemeriksaan database 6 Okt 2026 menunjukkan isinya **sudah ada** (50 baris V5.1 dan kolom `definition_version`), tetapi tidak tercatat di riwayat migrasi Supabase. Kemungkinan diterapkan lewat SQL editor. README perlu diperbarui, dan migrasinya sebaiknya dicatat agar riwayat konsisten.

### 8.3 Struktur organisasi Andima vs data live

| Temuan | Dampak | Usulan |
| --- | --- | --- |
| Posisi di file organisasi (Sales Administration Associate, Accounting Associate, HR Associate Officer, …) sebagian besar belum dipakai employee live; employee live memakai "Freight Forwarding Specialist", "HR Administrator", "Demo Employee", "Tim IT" | Demo live tidak mencerminkan struktur Andima | Tautkan employee demo ke posisi dari file organisasi |
| "HR Administrator" terpetakan ke KPI Finance & Administration (kata kunci *administrator*) | Akun HR bisa mendapat KPI keuangan | Tambahkan pengecualian HR di `roleForPositionTitle`, atau putuskan KPI HR bersama PO (V5.1 tidak punya KPI HR) |
| "Freight Forwarding Specialist" → Airfreight / Seafreight Ops Staff | Masuk akal, tetapi perlu konfirmasi PO | Konfirmasi PO |
| HR, Tax, Cash Manager tidak punya KPI di V5.1 | Form KPI menampilkan "belum tersedia" | Sudah tercatat di RN-D4-001 §7 |
| Sales Administration Associate memakai KPI Sales & Marketing | Pemetaan sementara | Sudah tercatat di RN-D4-001 §7 |

### 8.4 Dua PDF contoh (worksheet dan reimbursement AENAT)

Kedua PDF adalah dokumen transaksi forwarding (worksheet job dan invoice reimbursement). Isinya domain modul keuangan/operasional, bukan D4. Di D4, keduanya hanya relevan sebagai **bukti kinerja**: worksheet adalah output utama Sales Administration Associate ("prepare worksheet & Job Number"), dan invoice adalah output Accounting Associate ("create invoices; invoice revision"). Karena itu nomor dokumennya dipakai sebagai referensi bukti di data demo (§4).

### 8.5 Dokumen repo yang sudah tidak sinkron

| Dokumen | Isi lama | Kondisi sekarang |
| --- | --- | --- |
| README, RN-D4-001 §7 | Migrasi V5.1 belum diterapkan | Sudah ada di database (§8.2) |
| RN, DEMO-SCRIPT, CODE-FREEZE | Baseline `bcb92d8` di `feature/d4-v2-d2-style` | Production sekarang `main` @ `2249d99` (PR #10) |
| RN-D4-001 §7 | Belum ada deployment staging | Vercel production aktif (dengan SSO protection) |
| TEST-ACCOUNTS-D4 §2 | Email `<diisi PO>` | Akun sudah ada (§3.1) |
| `drafts/planka/02` | Filter "All source requirements" di Training → centang | Filter dihapus di PR #8 |
| Semua dokumen | Penomoran FR-D4-001…007 | Halaman memakai FR Docmost V2 (§1) |
| QA-STABILITY-D4 | 90 tes | 217 tes (8 file) |
| DEMO-SCRIPT §4 (fixture) | Alfa = Finance Staff, Holly Finance Staff, Charlie Operations | Data demo baru mengikuti struktur Andima (§4) |

---

## 9. Hasil smoke test (6 Okt 2026)

### 9.1 Yang diuji dan caranya

| Lapis | Cara | Hasil |
| --- | --- | --- |
| Tes otomatis | `npm test` (Vitest, 8 file) | **217/217 PASS** |
| Type check | `npm run typecheck` | PASS, 0 error |
| Lint | `npm run lint` | 0 error, 4 warning (`<img>` di login/register) |
| Build production | `npm run build` (dengan env Supabase) | PASS, 37 route |
| API tanpa sesi (build production lokal) | `curl` ke `next start` | `/api/d4/me`, `/snapshot`, `/kpi-catalog`, POST evaluasi → **401** `UNAUTHENTICATED`; PUT/DELETE → **405** `METHOD_NOT_ALLOWED`; `/dashboard` → **307** ke `/login`; `/login` → 200 |
| Browser, mode demo, 3 peran | Chromium (Playwright) membuka 21 URL per peran + 6 halaman di lebar 375 px | Lihat §9.2 |
| Browser, alur simpan HR | 9 langkah create/update di mode demo | Lihat §9.3 |
| Data live Supabase | Query baca-saja lewat Supabase MCP | Lihat §3.1, §4, §8 |

Tidak bisa dijalankan dari sesi ini: smoke di URL Vercel dan `npm run smoke:d4` terhadap data live. Domain `*.vercel.app` dan `*.supabase.co` diblokir jaringan container, dan smoke live juga butuh cookie sesi akun asli. Cara menjalankannya sendiri ada di §7.1.

### 9.2 Crawl halaman per peran (mode demo, data Andima)

URL yang dibuka untuk setiap peran: 6 halaman daftar, 11 halaman detail/riwayat milik Alfa, 2 halaman milik orang lain (development Charlie, profil Bravo), dan 2 id yang tidak ada.

| Pemeriksaan | HR (Mercury) | MANAGER (Romeo) | EMPLOYEE (Alfa) |
| --- | --- | --- | --- |
| 21 URL terbuka tanpa error konsol/JS | 21/21 PASS | 21/21 PASS | 21/21 PASS |
| Baris di halaman daftar | 8 per halaman (15 karyawan, 2 halaman); development 7, training 7 | Sama dengan HR | **1** (hanya Alfa) |
| Tombol tulis | Tambah Evaluasi, Tambah Scorecard, Simpan Assessment, Nilai Perubahan Posisi, Tambah Requirement, Ubah Status, Buat Training, Tambah Training, Ubah Progres | Sama dengan HR | **Tidak ada** di semua halaman |
| Data milik orang lain | Terbuka | Terbuka (MANAGER belum dibatasi per tim, O7) | **"Tidak ditemukan"** (meniru RLS) |
| Id tidak dikenal | "Tidak ditemukan" | "Tidak ditemukan" | "Tidak ditemukan" |
| Label peran di topbar | Mercury · HR | Romeo · Manager | Alfa · Karyawan |
| Lebar 375 px, 6 halaman daftar | Tanpa scroll horizontal | Tanpa scroll horizontal | Tanpa scroll horizontal |

### 9.3 Alur simpan HR (mode demo)

| # | Langkah | Hasil | Pesan di layar |
| --- | --- | --- | --- |
| 1 | Tambah Evaluasi → Simpan dengan form kosong | PASS | "Karyawan wajib dipilih. / Hasil evaluasi wajib dipilih. / Catatan evaluasi wajib diisi." |
| 2 | Isi Holly, hasil 4, catatan → Simpan | PASS | Toast "Evaluasi kinerja tersimpan."; baris Holly menjadi Selesai 4.00 / 5, penilai Mercury |
| 3 | Tambah Evaluasi lagi untuk Holly periode yang sama | PASS | Muncul konfirmasi "simpan sebagai revisi" |
| 4 | Tambah Scorecard Holly, skor 4,5,4,3,4 | PASS | KPI jabatan otomatis Sales & Marketing; total bobot 100%; total 4.10 / 5; toast "KPI scorecard tersimpan." |
| 5 | Competency Alfa → Simpan Assessment | PASS | "Assessment kompetensi tersimpan ke riwayat." |
| 6 | Development DEV-001 → Ubah Status ke Planned | PASS | "Status development diperbarui sebagai revisi baru." (Identified → Planned) |
| 7 | Training TRN-001 → Ubah Progres ke Completed tanpa hasil | PASS (ditolak) | "Hasil wajib diisi saat training Completed." |
| 8 | Ubah Progres ke In Progress | PASS | "Progress training disimpan sebagai versi baru." |
| 9 | Dashboard setelah reload | PASS | Data demo kembali ke awal (Holly belum dievaluasi). Normal: data demo hanya di memori |

Screenshot bukti ada di folder [`smoke-2026-10-06/`](smoke-2026-10-06/):

| File | Isi |
| --- | --- |
| `01-hr-dashboard.png` | People Dashboard HR, 15 karyawan Andima |
| `02-hr-performance.png` | Daftar evaluasi dengan penilai atasan langsung (Romeo, Quebec) |
| `03-hr-kpi-detail.png` | Scorecard Alfa: 5 KPI Sales & Marketing, target, realisasi, total 3.60 |
| `04-hr-competency-detail.png` | Requirement vs capability Alfa (Gap Akurasi Dokumen) |
| `05-hr-development-detail.png` | Development DEV-001 dengan Source ke gap |
| `06-hr-training-detail.png` | Training TRN-001 dan notice "tidak menutup gap" |
| `07-hr-profil-karyawan.png` | Profil Alfa di dashboard |
| `08-manager-performance.png` | Tampilan MANAGER (Romeo) |
| `09-employee-dashboard.png` | Tampilan EMPLOYEE: satu baris, tanpa tombol tulis |
| `10-employee-data-orang-lain-tidak-ditemukan.png` | EMPLOYEE membuka data Charlie → tidak ditemukan |
| `11-flow-validasi-evaluasi.png` | Validasi form evaluasi kosong |
| `12-flow-kpi-tersimpan.png` | Scorecard Holly tersimpan (4.10) |
| `13-flow-training-hasil-wajib.png` | Training Completed tanpa hasil ditolak |

### 9.4 Temuan dari smoke test

| # | Temuan | Dampak | Usulan |
| --- | --- | --- | --- |
| S1 | Tabel Core KPI di detail scorecard (1440 px) memotong kolom Terbobot dan Komentar; perlu scroll horizontal di dalam kartu | Total per baris tidak langsung terlihat saat demo | Kurangi lebar kolom atau pindahkan Komentar ke baris kedua |
| S2 | Form evaluasi dan scorecard memakai periode default bulan berjalan (Okt 2026), sedangkan data demo di Sept 2026. Dashboard memakai satu periode untuk semua baris (periode terbaru), jadi setelah input Okt, baris lain tampil "—" | Membingungkan saat demo | Saat demo pilih periode Sept 2026 di form, atau pilih filter periode di dashboard |
| S3 | Kolom "Terakhir disimpan" Competency Gap memakai snapshot terbaru, termasuk snapshot Assess Position Change (Bravo, 25 Sep) | Tanggal bisa tertukar dengan konteks role change | Tampilkan hanya snapshot posisi sekarang, atau beri label |
| S4 | Data live: 10 dari 13 evaluasi bernilai desimal (seed), posisi live tidak sesuai struktur Andima | Tampilan live kurang rapi | Lihat §4 dan §8.3 |

---

## 10. Istilah

| Istilah | Arti |
| --- | --- |
| Snapshot | Satu respons `/api/d4/snapshot` yang berisi semua data yang boleh dilihat akun |
| Revisi | Record baru yang menggantikan tampilan record lama tanpa menghapusnya |
| RLS | Row Level Security, aturan baris di Postgres; EMPLOYEE hanya membaca barisnya |
| Fixture / mode demo | Data fiktif di memori browser, hanya `next dev`, tanpa login |
| Source chip | Tautan di detail record ke record sumbernya (FR traceability) |
| `requireWriter` | Fungsi server yang menolak POST dari peran selain HR/MANAGER |
| Envelope | Bentuk respons `{data}` / `{error:{code,message}}` |
