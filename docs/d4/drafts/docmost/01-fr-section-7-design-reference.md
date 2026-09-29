# Draft · Section "7. Design Reference & UI Requirements" untuk FR-D4-001 s.d. FR-D4-006

**Target:** tambahkan sebagai section terakhir di tiap halaman FR (setelah section Acceptance/Business Rule yang sudah ada).
**Sumber pola:** UI-D4-001 (draft di `docs/d4/UI-D4-001.md`).
**Figma:** file PISD – D4 V2 `https://www.figma.com/design/bpUIPDcmpjGbYzg0JuZnPH`, page `D4`. Kolom *Node* diisi setelah frame dibangun.

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
| 01 | Performance Evaluation List (HR/Manager) | `/performance` | _diisi_ |
| 02 | List – Action Menu Open | `/performance` | _diisi_ |
| 03 | Add Evaluation Modal | modal di `/performance` | _diisi_ |
| 04 | Add Evaluation – Validation Error | modal | _diisi_ |
| 05 | Evaluation Detail | `/performance/[id]` | _diisi_ |
| 06 | Evaluation History | `/performance/history/[employeeId]` | _diisi_ |
| 07 | New Evaluation (revisi periode) | modal dari Detail | _diisi_ |

- Filter: search nama/ID, Position, Period (default periode terbaru), Status (Completed · Draft · Not Evaluated).
- Menu ⋮: View Detail · View History · Open KPI Scorecard · Add Evaluation*.
- Form: Employee, Period, Evaluation date, Evaluator, 7 aspek (bobot tetap, skor 1–5, catatan), Review status dipilih manual, catatan umum, referensi evidence. `Save Draft` tidak mewajibkan skor; `Save` mewajibkan semua skor dan tanggal.
- Detail menampilkan KPI Scorecard periode yang sama dan Development Requirement yang bersumber dari evaluasi ini (konteks, bukan keputusan otomatis).

## FR-D4-002 · KPI Scorecard

| No | Layar | Route | Node Figma |
|---|---|---|---|
| 08 | KPI Scorecard List | `/kpi` | _diisi_ |
| 09 | KPI Scorecard Form Modal (880 px) | modal di `/kpi` | _diisi_ |
| 10 | KPI Form – Validation | modal | _diisi_ |
| 11 | KPI Scorecard Detail | `/kpi/[id]` | _diisi_ |
| 12 | KPI Scorecard History | `/kpi/history/[employeeId]` | _diisi_ |
| — | KPI Catalog (referensi 10 role × 5 KPI) | `/kpi/catalog` | _diisi_ |

- Form mengambil **5 KPI sesuai position employee** dari katalog aktif. KPI role lain tidak ditampilkan.
- Kolom: KPI, Bobot (read-only), Target, Realisasi (teks bebas), Skor mentah 1–5 (dipilih evaluator), Skor terbobot (otomatis = bobot × skor), Komentar. Baris total menampilkan Σ bobot = 100% dan total skor.
- Contoh uji: bobot 35/25/15/15/10 dengan skor 4/3/5/4/4 → total **3.90**.
- **Tidak ada** label tercapai/tidak tercapai, ambang batas, atau konversi realisasi → skor.
- Menu ⋮: View Detail · View History · Open Evaluation · New Scorecard*.

## FR-D4-003 · Competency Gap

| No | Layar | Route | Node Figma |
|---|---|---|---|
| 13 | Competency Gap List | `/competency` | _diisi_ |
| 14 | List – Action Menu Open | `/competency` | _diisi_ |
| 15 | Competency Gap Detail | `/competency/[employeeId]` | _diisi_ |
| 16 | Competency Gap History (termasuk perubahan position) | `/competency/[employeeId]/history` | _diisi_ |

- Status per requirement: **Terpenuhi** (hijau), **Gap** (merah), **Data Belum Cukup** (abu, nilai database `Bukti Belum Cukup`).
- Skill tanpa evidence = Data Belum Cukup, **bukan** Gap.
- Menu ⋮: View Detail · View History · Create Development Requirement* (hanya bila ada Gap).
- History tetap utuh saat employee pindah position (snapshot per assessment + penanda role change).

## FR-D4-004 · Development Requirement

| No | Layar | Route | Node Figma |
|---|---|---|---|
| 17 | Development Requirement List | `/development` | _diisi_ |
| 18 | Add Development Requirement Modal | modal di `/development` | _diisi_ |
| 19 | Development Requirement Detail (blok Source) | `/development/[id]` | _diisi_ |
| 20 | Development Requirement History | `/development/[id]/history` | _diisi_ |

- Setiap requirement wajib punya **Source type** (Competency Gap · Role Change · Performance Context) dan **Source reference** yang dapat diklik.
- Tidak dibuat otomatis karena pergantian periode.
- Status: Identified → Planned → In Progress → Completed, disimpan sebagai revisi (Update Status*).
- Menu ⋮: View Detail · View History · Create Training* · Update Status*.

## FR-D4-005 · Training Tracking

| No | Layar | Route | Node Figma |
|---|---|---|---|
| 21 | Training Tracking List | `/training` | _diisi_ |
| 22 | Add Training Modal (dari requirement) | modal | _diisi_ |
| 23 | Update Progress Modal | modal | _diisi_ |
| 24 | Training Detail | `/training/[id]` | _diisi_ |
| 25 | Training History | `/training/[id]/history` | _diisi_ |

- Filter: search, Status, **Source requirement**.
- Status: Planned · In Progress · Completed · Cancelled. `Result` wajib saat Completed.
- Training Completed menampilkan catatan bahwa **gap tidak otomatis tertutup**; penutupan gap tetap lewat assessment kompetensi baru.
- Menu ⋮: View Detail · View History · Update Progress* · Open Source Requirement.

## FR-D4-006 · People Dashboard

| No | Layar | Route | Node Figma |
|---|---|---|---|
| 26 | People Dashboard (1440) | `/dashboard` | _diisi_ |
| 27 | Employee Performance Profile | `/dashboard/employee/[id]` | _diisi_ |
| 28 | People Dashboard – 1280 | `/dashboard` | _diisi_ |
| 29 | People Dashboard – 768 | `/dashboard` | _diisi_ |

- Metric card memakai grid fluid (`auto-fit`), tanpa lebar maksimum sempit, sehingga tidak ada ruang kosong besar di layar lebar.
- Filter: search, Position, Period. Tabel employee menampilkan total KPI dan skor performance beserta periodenya, status competency, jumlah development requirement yang belum selesai, dan status training terakhir.
- Profile menampilkan total KPI + 5 Core KPI, ringkasan evaluasi, gap aktif, development requirement, dan training; setiap blok punya tautan **View source** ke halaman asalnya.
- Dashboard adalah **lapisan presentasi**. Tidak ada tabel bisnis sendiri, angka selalu sama dengan halaman sumber, dan tidak ada keputusan HR otomatis.
- Menu ⋮: Open Employee Profile · View KPI · View Trainings.

## State sistem (berlaku untuk semua FR)

| No | Layar | Node Figma |
|---|---|---|
| 30 | Loading (skeleton tabel) | _diisi_ |
| 31 | Empty | _diisi_ |
| 32 | Error + Retry | _diisi_ |
| 33 | No Permission / Not Found | _diisi_ |
| 34 | Success Toast | _diisi_ |
