import type { KpiAssessmentLine } from "../supabase/types";

export type EvaluationStatus = "draft" | "completed";

/**
 * Penilaian Kinerja (FR-D4-001 v3.0): one record per employee and period holding the five Core KPI of the
 * employee's position and the evaluation notes. The result is the Total KPI; there is no separate
 * evaluation score (FR-01.12) and no automatic HR decision is inferred from it (FR-01.18).
 */
export interface PerformanceEvaluation {
  readonly id: string;
  readonly source: "fixture" | "local-demo" | "supabase";
  readonly employeeId: string;
  readonly period: string;
  readonly evaluationDate: string;
  readonly evaluator: string;
  readonly status: EvaluationStatus;
  /** Five Core KPI with weight, target, actual, raw score 1–5 and comment (FR-01.7). */
  readonly lines: readonly KpiAssessmentLine[];
  /** Total KPI = Σ weight × raw score, 2 decimals (FR-01.9). Null for older records without KPI lines. */
  readonly overallScore: number | null;
  readonly generalNotes: string;
  readonly evidenceReference: string | null;
  readonly createdAt: string;
  readonly actor: string;
}

export type EvaluationInput = Omit<PerformanceEvaluation, "id" | "source" | "createdAt" | "actor">;
