# Penilaian Kinerja, FR-D4-001 v3.0

Sumber kebutuhan: Docmost `FR-D4-001` (`zuilMLBo7c`, v3.0 Draft). Pola UI: `docs/d4/UI-D4-001.md`.

| Bagian | Lokasi |
|---|---|
| Tipe domain dan validasi | `types.ts`, `validation.ts` |
| Data preview (fiktif) | `fixtures.ts` |
| Halaman list, detail, history, tabel KPI | `modules/d4/web/features/performance/PerformancePages.tsx` |
| Modal Add Evaluation (satu form, satu Save) | `modules/d4/web/features/performance/EvaluationFormModal.tsx` |
| API | `modules/d4/server/performance-evaluations/index.ts` → `/api/d4/performance-evaluations` |

Satu penilaian per employee dan periode berisi lima Core KPI sesuai posisi dan catatan evaluasi (wajib). Hasilnya Total KPI; tidak ada skor evaluasi terpisah. Penilaian kedua di periode yang sama hanya tersimpan sebagai revisi eksplisit, jadi riwayat tidak tertimpa. Tidak ada keputusan HR otomatis dari Total KPI.
