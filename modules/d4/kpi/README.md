# Katalog KPI (bagian dari Penilaian Kinerja, FR-D4-001 v3.0)

Sumber: Docmost `FR-D4-001` (`zuilMLBo7c`) dan workbook KPI Scorecard V5.1. KPI Scorecard tidak lagi menjadi menu sendiri; lima Core KPI diisi di form Penilaian Kinerja (`modules/d4/performance`).

| Bagian | Lokasi |
|---|---|
| Katalog V5.1 (10 role × 5 KPI), pemetaan position → role, `buildKpiLines`, `weighted`, `kpiTotal` | `catalog.ts` |
| API katalog untuk form | `modules/d4/server/kpi-catalog/index.ts` |
| Migrasi V5.1 | `supabase/migrations/20260929150000_d4_kpi_catalog_v51.sql` |

Nama KPI dan bobot diambil dari katalog role posisi employee (read-only, server mengabaikan nilai dari body). Penilai mengisi target, realisasi (teks), skor 1–5, dan komentar opsional. Skor terbobot = bobot × skor; Total KPI = Σ skor terbobot. Tidak ada label tercapai, ambang batas, atau konversi realisasi → skor.
