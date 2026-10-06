import type { EvaluationInput } from "./types";

/** FR-01.3: mandatory fields of a completed evaluation (mirrors the DB check on d4_performance_evaluations). */
export function validatePerformanceInput(input: EvaluationInput): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.period)) throw new Error("Periode evaluasi wajib dipilih.");
  if (input.status === "completed") {
    if (!input.evaluationDate || !input.evaluator.trim()) throw new Error("Tanggal dan evaluator wajib diisi.");
    // The stored result is the KPI scorecard total of the period (decimal), never a number typed by the evaluator.
    if (input.overallScore === null || input.overallScore < 1 || input.overallScore > 5) throw new Error("Hasil KPI periode ini belum tersedia.");
    if (!input.generalNotes.trim()) throw new Error("Catatan evaluasi wajib diisi.");
  }
}
