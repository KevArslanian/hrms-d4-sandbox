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

export interface D4LiveSnapshot {
  readonly isFigmaDemo?: boolean;
  readonly demoCompetencyEvidence?: Readonly<Record<string, string>>;
  readonly demoTrend?: readonly { quarter: string; performance: number; kpi: number }[];
  readonly demoScorecards?: Readonly<Record<string, readonly {
    aspect: string; weight: number; target: string; actual: string;
    rawScore: number; weighted: number; result: string;
  }[]>>;
  readonly reference: ReferenceDataSnapshot;
  readonly role: D4AppRole;
  readonly actorEmployeeId: string;
  readonly kpi: readonly D3KpiRecord[];
  readonly performance: readonly PerformanceEvaluation[];
  readonly competency: readonly CompetencyAssessment[];
  readonly developmentVersions: readonly DevelopmentNeedVersion[];
  readonly trainingVersions: readonly TrainingVersion[];
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
