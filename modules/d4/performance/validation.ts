import type { EvaluationInput } from "./types";

/** FR-01.3: mandatory fields of a completed evaluation (mirrors the DB check on d4_performance_evaluations). */
export function validatePerformanceInput(input: EvaluationInput): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.period)) throw new Error("The evaluation period is required.");
  if (input.status === "completed") {
    if (!input.evaluationDate || !input.evaluator.trim()) throw new Error("Date and evaluator are required.");
    if (input.overallScore === null || !Number.isInteger(input.overallScore) || input.overallScore < 1 || input.overallScore > 5) throw new Error("The evaluation result must be a whole number from 1 to 5.");
    if (!input.generalNotes.trim()) throw new Error("Evaluation notes are required.");
  }
}
