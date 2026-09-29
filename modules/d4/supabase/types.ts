import type { CompetencyAssessment } from "../competency/types";
import type { DevelopmentNeedVersion } from "../development/types";
import type { PerformanceEvaluation } from "../performance/types";
import type { ReferenceDataSnapshot } from "../shared/types";
import type { TrainingVersion } from "../training/types";

export type D4AppRole = "EMPLOYEE" | "HR" | "MANAGER";

export interface D3KpiRecord {
  readonly id: string;
  readonly employeeId: string;
  readonly period: string;
  readonly score: number;
  readonly notes: string;
  readonly createdAt: string;
}

export interface KpiAssessmentLine {
  readonly indicator_order: number;
  readonly kpi_name: string;
  readonly weight_percent: number;
  readonly target: string;
  readonly actual: string;
  readonly raw_score: number | null;
  readonly comment: string;
}

/** Catalog version used for new KPI assessments (sheet "KPI LIST PER POSISI" of the workbook). */
export const ACTIVE_KPI_VERSION = "V5.1";

export interface KpiAssessmentInput {
  readonly definitionVersion: string;
  readonly employeeId: string;
  readonly roleOrder: number;
  readonly roleName: string;
  readonly period: string;
  readonly evaluationDate: string;
  /** Ignored on save: the repository uses the signed-in account's name. */
  readonly evaluatorName?: string;
  readonly status: "draft" | "completed";
  readonly lines: readonly KpiAssessmentLine[];
  readonly generalNotes: string;
}

export interface KpiAssessment extends KpiAssessmentInput {
  readonly id: string;
  readonly overallScore: number | null;
  readonly createdAt: string;
  readonly actor: string;
}

export interface D4LiveSnapshot {
  readonly reference: ReferenceDataSnapshot;
  readonly role: D4AppRole;
  readonly actorEmployeeId: string;
  /** Display name of the signed-in account, used as the evaluator on new assessments. */
  readonly actorName: string;
  readonly kpi: readonly D3KpiRecord[];
  readonly kpiAssessments?: readonly KpiAssessment[];
  readonly performance: readonly PerformanceEvaluation[];
  readonly competency: readonly CompetencyAssessment[];
  readonly developmentVersions: readonly DevelopmentNeedVersion[];
  readonly trainingVersions: readonly TrainingVersion[];
}

/** KPI score in the scale of its source: assessments show x.xx / 5 like the scorecard, D3 records show / 100. */
export function kpiScore(snapshot: D4LiveSnapshot, record: D3KpiRecord): { value: string; suffix: string } {
  const assessment = snapshot.kpiAssessments?.find((item) => item.id === record.id);
  return assessment?.overallScore != null
    ? { value: assessment.overallScore.toFixed(2), suffix: "/ 5" }
    : { value: String(record.score), suffix: "/ 100" };
}

export function kpiScoreLabel(snapshot: D4LiveSnapshot, record: D3KpiRecord | undefined): string {
  if (!record) return "-";
  const score = kpiScore(snapshot, record);
  return `${score.value} ${score.suffix}`;
}

export function latestDevelopment(snapshot: D4LiveSnapshot): DevelopmentNeedVersion[] {
  const latest = new Map<string, DevelopmentNeedVersion>();
  for (const item of snapshot.developmentVersions) {
    if ((latest.get(item.needId)?.revision ?? 0) < item.revision) latest.set(item.needId, item);
  }
  return [...latest.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function latestTraining(snapshot: D4LiveSnapshot): TrainingVersion[] {
  const latest = new Map<string, TrainingVersion>();
  for (const item of snapshot.trainingVersions) {
    if ((latest.get(item.trainingId)?.revision ?? 0) < item.revision) latest.set(item.trainingId, item);
  }
  return [...latest.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
