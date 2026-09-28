import { compareCompetencies } from "../competency/service";
import type { CompetencyFinding } from "../competency/types";
import { listLatestDevelopmentNeeds } from "../development/service";
import type { DevelopmentNeedVersion } from "../development/types";
import { listKpiRecords } from "../kpi/service";
import type { KpiRecord } from "../kpi/types";
import { listPerformanceEvaluations } from "../performance/service";
import type { PerformanceEvaluation } from "../performance/types";
import { d4ReferenceFixture } from "../shared/fixtures";
import type { EmployeeReference, PositionReference } from "../shared/types";
import { listLatestTrainingRecords } from "../training/service";
import type { TrainingVersion } from "../training/types";

export interface DashboardRow {
  readonly employee: EmployeeReference;
  readonly position: PositionReference | null;
  readonly period: string;
  readonly kpi: KpiRecord | null;
  readonly performance: PerformanceEvaluation | null;
  readonly findings: readonly CompetencyFinding[];
  readonly gapCount: number;
  readonly insufficientEvidenceCount: number;
  readonly development: readonly DevelopmentNeedVersion[];
  readonly training: readonly TrainingVersion[];
}

export interface DashboardSnapshots {
  readonly kpi: string;
  readonly performance: string;
  readonly competency: string;
  readonly development: string;
  readonly training: string;
}

/** Read model only. It uses each feature's existing service and does not own copies of records. */
export function buildDashboardRows(period: string, snapshots: DashboardSnapshots): DashboardRow[] {
  const kpi = listKpiRecords(snapshots.kpi);
  const performance = listPerformanceEvaluations(snapshots.performance);
  const development = listLatestDevelopmentNeeds(snapshots.development);
  const training = listLatestTrainingRecords(snapshots.training);
  return d4ReferenceFixture.employees.map((employee) => {
    const position = d4ReferenceFixture.positions.find((item) => item.id === employee.positionId) ?? null;
    const findings = position ? compareCompetencies(employee.id, position.id).findings : [];
    return {
      employee, position, period,
      kpi: kpi.find((item) => item.employeeId === employee.id && item.period === period) ?? null,
      performance: performance.find((item) => item.employeeId === employee.id && item.period === period) ?? null,
      findings,
      gapCount: findings.filter((item) => item.status === "Gap").length,
      insufficientEvidenceCount: findings.filter((item) => item.status === "Bukti Belum Cukup").length,
      development: development.filter((item) => item.employeeId === employee.id),
      training: training.filter((item) => item.employeeId === employee.id),
    };
  });
}

export function dashboardPeriods(snapshots: Pick<DashboardSnapshots, "kpi" | "performance">): string[] {
  return [...new Set([...listKpiRecords(snapshots.kpi), ...listPerformanceEvaluations(snapshots.performance)].map((item) => item.period))].sort().reverse();
}
