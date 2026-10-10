import { kpiTotal } from "../kpi/catalog";
import type { EvaluationInput } from "./types";

/** FR-01.3/BR-01.9: mandatory fields of a completed assessment (mirrors the DB check on d4_performance_evaluations). */
export function validatePerformanceInput(input: EvaluationInput): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.period)) throw new Error("Periode penilaian wajib diisi.");
  if (input.status === "completed") {
    if (!input.evaluationDate || !input.evaluator.trim()) throw new Error("Tanggal dan penilai wajib diisi.");
    if (input.lines.reduce((sum, line) => sum + line.weight_percent, 0) !== 100) throw new Error("Total bobot KPI harus 100%.");
    if (kpiTotal(input.lines) === null || input.overallScore !== kpiTotal(input.lines)) throw new Error("Kelima Core KPI wajib diberi skor 1–5.");
    if (!input.generalNotes.trim()) throw new Error("Catatan evaluasi wajib diisi.");
  }
}
