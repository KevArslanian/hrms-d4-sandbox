# Draft · Section "7. Design Reference & UI Requirements" untuk FR-D4-001 s.d. FR-D4-006

**Target:** tambahkan sebagai section terakhir di tiap halaman FR (setelah section Acceptance/Business Rule yang sudah ada).
**Sumber pola:** UI-D4-001 (draft di `docs/d4/UI-D4-001.md`).
**Figma:** file D4 V2 `https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F`, page `D4`. Komponen ada di board `00 Foundations & Components` ([2:2](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=2-2)).

Bagian umum di bawah ditempel di **setiap** FR, lalu diikuti bagian khusus fiturnya.

---

## Bagian umum (tempel di semua FR)

### 7. Design Reference & UI Requirements

Fitur ini mengikuti **UI-D4-001 Interaction & Component Guideline**. Ringkasnya:

- **Detail** selalu dibuka sebagai halaman tersendiri (breadcrumb `HRMS / <Fitur> / Detail` + tombol Back). Tidak ada quick view, popover, atau modal detail.
- **History** selalu halaman tersendiri dengan timeline vertikal (tanggal, judul revisi, status, aktor).
- **Menu ⋮** di tabel langsung berisi 2–4 aksi. Tidak ada panel info sebelum aksi.
- **Form** berupa modal di tengah layar, lebar 640 px (KPI Scorecard 880 px), tinggi maksimal 88% layar, footer `Cancel` · `Save`.
- **State** yang wajib ada: Loading, Empty, Error (dengan Retry), Validation (inline + ringkasan), Success (toast), dan Not Found / No Permission.
- Aksi tulis (tombol `+ Add`, item menu bertanda *) hanya tampil untuk **HR** dan **Manager**. Employee hanya melihat data miliknya sendiri.
- Tidak ada "Edit" yang menimpa data. Perubahan disimpan sebagai revisi atau record baru.

---

## FR-D4-001 · Performance Evaluation

| No | Layar | Route | Node Figma |
|---|---|---|---|
| 01 | Performance Evaluation List (HR/Manager) | `/performance` | [4:3](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=4-3) |
| 02 | List – Action Menu Open | `/performance` | [4:360](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=4-360) |
| 03 | Add Evaluation Modal | modal di `/performance` | [4:738](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=4-738) |
| 04 | Add Evaluation – Validation Error | modal | [4:1222](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=4-1222) |
| 05 | Evaluation Detail | `/performance/[id]` | [4:1716](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=4-1716) |
| 06 | Evaluation History | `/performance/history/[employeeId]` | [4:1950](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=4-1950) |
| 07 | New Evaluation (revisi periode) | modal dari Detail | [4:2087](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=4-2087) |

- Filter: search nama/ID, Position, Period (default periode terbaru), Status (Completed · Draft · Not Evaluated).
- Menu ⋮: View Detail · View History · Open KPI Scorecard · Add Evaluation*.
- Form: Employee, Period, Evaluation date, Evaluator, 7 aspek (bobot tetap, skor 1–5, catatan), Review status dipilih manual, catatan umum, referensi evidence. `Save Draft` tidak mewajibkan skor; `Save` mewajibkan semua skor dan tanggal.
- Detail menampilkan KPI Scorecard periode yang sama dan Development Requirement yang bersumber dari evaluasi ini (konteks, bukan keputusan otomatis).

## FR-D4-002 · KPI Scorecard

| No | Layar | Route | Node Figma |
|---|---|---|---|
| 08 | KPI Scorecard List | `/kpi` | [6:975](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=6-975) |
| 09 | KPI Scorecard Form Modal (880 px) | modal di `/kpi` | [6:1305](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=6-1305) |
| 10 | KPI Form – Validation | modal | [6:1748](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=6-1748) |
| 11 | KPI Scorecard Detail | `/kpi/[id]` | [6:2204](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=6-2204) |
| 12 | KPI Scorecard History | `/kpi/history/[employeeId]` | [6:2458](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=6-2458) |
| — | KPI Catalog (referensi 10 role × 5 KPI) | `/kpi/catalog` | — (hanya di web) |

- Form mengambil **5 KPI sesuai position employee** dari katalog aktif. KPI role lain tidak ditampilkan.
- Kolom: KPI, Bobot (read-only), Target, Realisasi (teks bebas), Skor mentah 1–5 (dipilih evaluator), Skor terbobot (otomatis = bobot × skor), Komentar. Baris total menampilkan Σ bobot = 100% dan total skor.
- Contoh uji: bobot 35/25/15/15/10 dengan skor 4/3/5/4/4 → total **3.90**.
- **Tidak ada** label tercapai/tidak tercapai, ambang batas, atau konversi realisasi → skor.
- Menu ⋮: View Detail · View History · Open Evaluation · New Scorecard*.

## FR-D4-003 · Competency Gap

| No | Layar | Route | Node Figma |
|---|---|---|---|
| 13 | Competency Gap List | `/competency` | [7:1556](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=7-1556) |
| 14 | List – Action Menu Open | `/competency` | [7:1931](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=7-1931) |
| 15 | Competency Gap Detail | `/competency/[employeeId]` | [7:2322](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=7-2322) |
| 16 | Competency Gap History (termasuk perubahan position) | `/competency/[employeeId]/history` | [7:2540](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=7-2540) |

- Status per requirement: **Terpenuhi** (hijau), **Gap** (merah), **Data Belum Cukup** (abu, nilai database `Bukti Belum Cukup`).
- Skill tanpa evidence = Data Belum Cukup, **bukan** Gap.
- Menu ⋮: View Detail · View History · Create Development Requirement* (hanya bila ada Gap).
- History tetap utuh saat employee pindah position (snapshot per assessment + penanda role change).

## FR-D4-004 · Development Requirement

| No | Layar | Route | Node Figma |
|---|---|---|---|
| 17 | Development Requirement List | `/development` | [8:1993](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=8-1993) |
| 18 | Add Development Requirement Modal | modal di `/development` | [8:2364](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=8-2364) |
| 19 | Development Requirement Detail (blok Source) | `/development/[id]` | [8:2815](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=8-2815) |
| 20 | Development Requirement History | `/development/[id]/history` | [8:3047](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=8-3047) |

- Setiap requirement wajib punya **Source type** (Competency Gap · Role Change · Performance Context) dan **Source reference** yang dapat diklik.
- Tidak dibuat otomatis karena pergantian periode.
- Status: Identified → Planned → In Progress → Completed, disimpan sebagai revisi (Update Status*).
- Menu ⋮: View Detail · View History · Create Training* · Update Status*.

## FR-D4-005 · Training Tracking

| No | Layar | Route | Node Figma |
|---|---|---|---|
| 21 | Training Tracking List | `/training` | [9:2512](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=9-2512) |
| 22 | Add Training Modal (dari requirement) | modal | [9:2886](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=9-2886) |
| 23 | Update Progress Modal | modal | [9:3314](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=9-3314) |
| 24 | Training Detail | `/training/[id]` | [9:3732](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=9-3732) |
| 25 | Training History | `/training/[id]/history` | [9:3941](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=9-3941) |

- Filter: search, Status, **Source requirement**.
- Status: Planned · In Progress · Completed · Cancelled. `Result` wajib saat Completed.
- Training Completed menampilkan catatan bahwa **gap tidak otomatis tertutup**; penutupan gap tetap lewat assessment kompetensi baru.
- Menu ⋮: View Detail · View History · Update Progress* · Open Source Requirement.

## FR-D4-006 · People Dashboard

| No | Layar | Route | Node Figma |
|---|---|---|---|
| 26 | People Dashboard (1440) | `/dashboard` | [11:3686](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=11-3686) |
| 27 | Employee Performance Profile | `/dashboard/employee/[id]` | [11:4106](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=11-4106) |
| 28 | People Dashboard – 1280 | `/dashboard` | [11:4374](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=11-4374) |
| 29 | People Dashboard – 768 | `/dashboard` | [11:4794](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=11-4794) |

- Metric card memakai grid fluid (`auto-fit`), tanpa lebar maksimum sempit, sehingga tidak ada ruang kosong besar di layar lebar.
- Filter: search, Position, Period. Tabel employee menampilkan total KPI dan skor performance beserta periodenya, status competency, jumlah development requirement yang belum selesai, dan status training terakhir.
- Profile menampilkan total KPI + 5 Core KPI, ringkasan evaluasi, gap aktif, development requirement, dan training; setiap blok punya tautan **View source** ke halaman asalnya.
- Dashboard adalah **lapisan presentasi**. Tidak ada tabel bisnis sendiri, angka selalu sama dengan halaman sumber, dan tidak ada keputusan HR otomatis.
- Menu ⋮: Open Employee Profile · View KPI · View Trainings.

## State sistem (berlaku untuk semua FR)

| No | Layar | Node Figma |
|---|---|---|
| 30 | Loading (skeleton tabel) | [12:3686](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=12-3686) |
| 31 | Empty | [12:3829](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=12-3829) |
| 32 | Error + Retry | [12:3938](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=12-3938) |
| 33 | No Permission / Not Found | [12:4048](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=12-4048) |
| 34 | Success Toast | [12:4138](https://www.figma.com/design/blDVBM6m8VC02A7PvouX4F?node-id=12-4138) |
