import type { EvaluationInput } from "./types";

export function validatePerformanceInput(input: EvaluationInput): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.period)) throw new Error("Periode evaluasi wajib dipilih.");
  if (input.status === "completed") {
    if (!input.evaluationDate || !input.evaluator.trim()) throw new Error("Tanggal dan evaluator wajib diisi.");
    if (input.overallScore === null || !Number.isFinite(input.overallScore) || input.overallScore < 1 || input.overallScore > 5) throw new Error("Skor keseluruhan harus antara 1 dan 5.");
    if (!input.generalNotes.trim()) throw new Error("Catatan umum wajib diisi.");
    if (input.aspects.length === 0 || input.aspects.some((item) => !item.name.trim() || item.score === null || !Number.isInteger(item.score) || item.score < 1 || item.score > 5)) throw new Error("Setiap aspek harus memiliki nama dan skor bulat 1 sampai 5.");
  }
}
