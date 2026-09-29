import { compareCompetencies } from "../../competency/service";
import type { CompetencyFinding, CompetencyOverallStatus } from "../../competency/types";
import type { DevelopmentNeedVersion, DevelopmentSourceType } from "../../development/types";
import type { PerformanceEvaluation } from "../../performance/types";
import type { EmployeeReference } from "../../shared/types";
import { latestDevelopment, latestTraining, type D4LiveSnapshot, type KpiAssessment } from "../../supabase/types";
import type { TrainingVersion } from "../../training/types";

export type Snapshot = D4LiveSnapshot;

export const canWrite = (snapshot: Snapshot) => snapshot.role === "HR" || snapshot.role === "MANAGER";

/** Employees see only their own records; HR and managers see everyone RLS allows. */
export function visibleEmployees(snapshot: Snapshot): readonly EmployeeReference[] {
  return snapshot.role === "EMPLOYEE" ? snapshot.reference.employees.filter((item) => item.id === snapshot.actorEmployeeId) : snapshot.reference.employees;
}

export const employeeById = (snapshot: Snapshot, id: string) => snapshot.reference.employees.find((item) => item.id === id);
export const positionOf = (snapshot: Snapshot, employee?: EmployeeReference) => snapshot.reference.positions.find((item) => item.id === employee?.positionId);
export const positionById = (snapshot: Snapshot, id?: string | null) => snapshot.reference.positions.find((item) => item.id === id);
export const departmentOf = (snapshot: Snapshot, employee?: EmployeeReference) => snapshot.reference.departments.find((item) => item.id === employee?.departmentId);

const newestFirst = <T extends { createdAt: string }>(items: readonly T[]) => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export function evaluationsOf(snapshot: Snapshot, employeeId: string): PerformanceEvaluation[] {
  return newestFirst(snapshot.performance.filter((item) => item.employeeId === employeeId)).sort((a, b) => b.period.localeCompare(a.period));
}
export const latestEvaluation = (snapshot: Snapshot, employeeId: string) => evaluationsOf(snapshot, employeeId)[0];

export function scorecardsOf(snapshot: Snapshot, employeeId: string): KpiAssessment[] {
  return newestFirst((snapshot.kpiAssessments ?? []).filter((item) => item.employeeId === employeeId)).sort((a, b) => b.period.localeCompare(a.period));
}
export const latestScorecard = (snapshot: Snapshot, employeeId: string) => scorecardsOf(snapshot, employeeId)[0];

/** Live comparison of the employee's current position requirements against recorded evidence. */
export function currentGap(snapshot: Snapshot, employee: EmployeeReference): { findings: CompetencyFinding[]; overallStatus: CompetencyOverallStatus } | null {
  if (!employee.positionId || !snapshot.reference.positions.some((item) => item.id === employee.positionId)) return null;
  return compareCompetencies(employee.id, employee.positionId, snapshot.reference);
}

export const developmentNeeds = (snapshot: Snapshot) => latestDevelopment(snapshot);
export const trainings = (snapshot: Snapshot) => latestTraining(snapshot);
export const developmentById = (snapshot: Snapshot, needId: string) => latestDevelopment(snapshot).find((item) => item.needId === needId);
export const trainingById = (snapshot: Snapshot, trainingId: string) => latestTraining(snapshot).find((item) => item.trainingId === trainingId);
export const developmentHistory = (snapshot: Snapshot, needId: string) => snapshot.developmentVersions.filter((item) => item.needId === needId).sort((a, b) => b.revision - a.revision);
export const trainingHistory = (snapshot: Snapshot, trainingId: string) => snapshot.trainingVersions.filter((item) => item.trainingId === trainingId).sort((a, b) => b.revision - a.revision);

export const sourceTypeLabel: Record<DevelopmentSourceType, string> = {
  competency_gap: "Competency Gap",
  role_change: "Position Change",
  performance_context: "Performance Evaluation",
};

/** Resolves a development need's source reference to a readable label and a link to the source record (FR-D4-007). */
export function describeSource(snapshot: Snapshot, need: Pick<DevelopmentNeedVersion, "sourceType" | "sourceRef" | "employeeId">): { label: string; href: string | null } {
  if (need.sourceType === "competency_gap") {
    const requirement = snapshot.reference.positionRequirements.find((item) => item.id === need.sourceRef);
    const competency = snapshot.reference.competencies.find((item) => item.id === requirement?.competencyId);
    return { label: competency ? `${competency.name} (min. level ${requirement?.minProficiencyLevel})` : "Persyaratan kompetensi", href: `/competency/${need.employeeId}` };
  }
  if (need.sourceType === "role_change") {
    const assessment = snapshot.competency.find((item) => item.id === need.sourceRef);
    return { label: assessment ? `Assessment perubahan posisi · ${formatDate(assessment.effectiveDate)}` : "Assessment perubahan posisi", href: `/competency/${need.employeeId}/history` };
  }
  const evaluation = snapshot.performance.find((item) => item.id === need.sourceRef);
  return { label: evaluation ? `Evaluasi kinerja ${formatPeriod(evaluation.period)}` : "Evaluasi kinerja", href: evaluation ? `/performance/${evaluation.id}` : null };
}

export function trainingSource(snapshot: Snapshot, record: TrainingVersion) {
  return developmentById(snapshot, record.developmentNeedId);
}

export function formatPeriod(period: string | undefined): string {
  if (!period) return "—";
  const date = new Date(`${period.slice(0, 7)}-01T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? period : new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export function formatDate(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function formatScore(value: number | null | undefined, scale = 5): string {
  return value === null || value === undefined ? "—" : `${value.toFixed(2)} / ${scale}`;
}

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

export const today = () => new Date().toISOString().slice(0, 10);
export const thisMonth = () => new Date().toISOString().slice(0, 7);

export function includesText(haystack: string, needle: string) {
  return !needle.trim() || haystack.toLocaleLowerCase().includes(needle.trim().toLocaleLowerCase());
}
