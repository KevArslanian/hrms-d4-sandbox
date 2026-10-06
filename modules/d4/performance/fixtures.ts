import type { PerformanceEvaluation } from "./types";

const employee = (n: number) => `d4000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

// FR-D4-001 defines no aspects or review labels; the legacy columns keep neutral values.
// The evaluator is the direct superior from the Andima org structure (Romeo = Sales Executive 2 for
// Sales Administration Team 2, Quebec = HR Manager) or Mercury (HR) where the superior is not in the preview.
function sample(id: number, employeeNo: number, score: number, notes: string, evaluator: string, evidence: string | null, period = "2026-09", createdAt?: string): PerformanceEvaluation {
  return {
    id: `FIX-D4-PERF-${String(id).padStart(3, "0")}`,
    source: "fixture",
    employeeId: employee(employeeNo),
    period,
    evaluationDate: `${period}-20`,
    evaluator,
    status: "completed",
    reviewStatus: "Needs Review",
    overallScore: score,
    aspects: [],
    generalNotes: notes,
    evidenceReference: evidence,
    createdAt: createdAt ?? `${period}-21T${String(id).padStart(2, "0")}:00:00.000Z`,
    actor: evaluator,
  };
}

const WORKSHEET = "Worksheet AENAT/2609/0354 · Transaction Order TRX-0926-00627";
const INVOICE = "Invoice 26 28597 dan reimbursement 26 28597A";

export const performanceFixtureRecords: readonly PerformanceEvaluation[] = [
  sample(1, 9, 4, "Worksheet dan Job Number selalu terbit di hari order masuk. Rekomendasi: pelatihan akurasi dokumen worksheet (Chargeable Weight, Reference No.).", "Romeo", WORKSHEET),
  sample(2, 10, 4, "Target periode tercapai; data siap tagih lengkap. Siap mendampingi Sales Executive pada akun pelanggan.", "Romeo", "12 worksheet September tanpa revisi"),
  sample(3, 11, 3, "Input ERP rapi, tetapi 3 job tertahan billing karena dokumen reimbursement belum lengkap. Rekomendasi: penguatan penyiapan data siap tagih.", "Romeo", INVOICE),
  // Mercury (HR) is evaluated by the HR Manager; nobody evaluates themselves.
  sample(4, 12, 4, "Rekap KPI Scorecard V5.1 dan dokumen penilaian Q3 selesai tepat waktu.", "Quebec", "Rekap KPI Q3 2026"),
  sample(5, 13, 5, "Administrasi penjualan sangat rapi; seluruh job siap tagih H+1. Kualitas serah terima order ke operasional perlu dijaga.", "Romeo", "Audit worksheet Agustus–September: 0 temuan"),
  // Echo has two records in September: the later one is a revision after extra evidence arrived.
  sample(14, 14, 2, "Dua worksheet perlu revisi Gross Weight; rekonsiliasi job belum lengkap.", "Romeo", WORKSHEET, "2026-09", "2026-09-20T23:00:00.000Z"),
  sample(6, 14, 3, "Revisi: bukti rekonsiliasi job tambahan diterima. Rekomendasi: pelatihan penyusunan worksheet dan Job Number ERP.", "Romeo", WORKSHEET),
  sample(7, 15, 4, "Input ERP sesuai SOP dan komunikasi pelanggan konsisten.", "Romeo", "Laporan status job ERP September"),
  sample(8, 49, 4, "Job Number dan status ERP selalu tepat waktu.", "Romeo", "Laporan status job ERP September"),
  sample(9, 50, 4, "Akun pelanggan Sales Team 2 terkelola; eskalasi selesai tanpa komplain lanjutan.", "Mercury", "Laporan akun Sales Team 2 Q3"),
  sample(10, 51, 3, "Administrasi rekrutmen tertib; rekap KPI onboarding masih dibantu rekan.", "Quebec", "Checklist onboarding September"),
  sample(11, 53, 4, "Kalibrasi KPI semester berjalan sesuai jadwal.", "Mercury", "Notulen kalibrasi KPI"),
  sample(12, 54, 5, "Invoice terbit < 24 jam tanpa revisi; arsip billing rapi.", "Mercury", INVOICE),
  sample(13, 55, 3, "Invoice reimbursement sempat direvisi (terbilang). Rekomendasi: workshop penerbitan dan revisi invoice.", "Mercury", "Invoice 26 28597A"),
  sample(15, 56, 4, "Verifikasi PPN 11% dan faktur pajak sesuai; dukungan Coretax lancar.", "Mercury", "Faktur pajak invoice 26 28597"),
  // June history: older periods are never overwritten.
  sample(16, 9, 3, "Worksheet sering perlu dilengkapi sebelum serah terima.", "Romeo", null, "2026-06"),
  sample(17, 10, 4, "Konsisten memenuhi target administrasi penjualan.", "Romeo", null, "2026-06"),
  sample(18, 54, 4, "Penerbitan invoice sesuai SLA.", "Mercury", null, "2026-06"),
];
