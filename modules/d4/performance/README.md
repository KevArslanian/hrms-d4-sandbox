# Performance Evaluation, FR-D4-001

Sumber kebutuhan: Docmost `FR-D4-001` (`zuilMLBo7c`) dan Figma D4 node `1320:513` (daftar), `1186:714` (formulir), `1432:4114` (detail).

Setiap evaluasi terhubung ke UUID `employees.id` dan satu periode. Submit memvalidasi employee, tanggal, evaluator, skor keseluruhan, aspek, dan catatan. Save Draft memvalidasi employee dan periode. Setiap simpan menambah record baru agar riwayat tidak tertimpa.

Skor keseluruhan dan status review diisi manual oleh evaluator demo. Tidak ada keputusan HR otomatis atau rumus penilaian resmi yang diasumsikan. Skor KPI pada daftar/detail dibaca dari layanan KPI pada employee dan periode yang sama. Data saat ini adalah fixture dan `localStorage`; integrasi Supabase dan aktor sesungguhnya dilakukan pada STEP 6.
