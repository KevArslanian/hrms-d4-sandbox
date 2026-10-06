import { compareCompetencies } from "../../competency/service";
import type { CompetencyFinding, CompetencyOverallStatus } from "../../competency/types";
import type { DevelopmentNeedVersion, DevelopmentSourceType } from "../../development/types";
import type { PerformanceEvaluation } from "../../performance/types";
import type { EmployeeReference } from "../../shared/types";
import { localMonth, localToday, revisionNumber } from "../../shared/rules";
import { latestDevelopment, latestTraining, type D4LiveSnapshot, type KpiAssessment } from "../../supabase/types";
import type { TrainingVersion } from "../../training/types";

export type Snapshot = D4LiveSnapshot;

export const canWrite = (snapshot: Snapshot) => snapshot.role === "HR" || snapshot.role === "MANAGER";

/** Employees see only their own records; HR and managers see everyone RLS allows. */
export function visibleEmployees(snapshot: Snapshot): readonly EmployeeReference[] {
  return snapshot.role === "EMPLOYEE" ? snapshot.reference.employees.filter((item) => item.id === snapshot.actorEmployeeId) : snapshot.reference.employees;
}

/** Employees the signed-in evaluator may assess: never themselves. */
/** Writer acting on someone else's record: nobody adds a scorecard or evaluation for themselves. */
export const canAssess = (snapshot: Snapshot, employeeId: string) => canWrite(snapshot) && employeeId !== snapshot.actorEmployeeId;
export const assessableEmployees = (snapshot: Snapshot) => visibleEmployees(snapshot).filter((item) => item.id !== snapshot.actorEmployeeId);

export const employeeById = (snapshot: Snapshot, id: string) => snapshot.reference.employees.find((item) => item.id === id);
export const positionOf = (snapshot: Snapshot, employee?: EmployeeReference) => snapshot.reference.positions.find((item) => item.id === employee?.positionId);
export const positionById = (snapshot: Snapshot, id?: string | null) => snapshot.reference.positions.find((item) => item.id === id);
export const departmentOf = (snapshot: Snapshot, employee?: EmployeeReference) => snapshot.reference.departments.find((item) => item.id === employee?.departmentId);
/** Header line shared by every detail/history page: position · employee ID · department. */
export const employeeMeta = (snapshot: Snapshot, employee: EmployeeReference) => [positionOf(snapshot, employee)?.title ?? "No position yet", employee.employeeId, departmentOf(snapshot, employee)?.name ?? ""];

const newestFirst = <T extends { createdAt: string }>(items: readonly T[]) => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export function evaluationsOf(snapshot: Snapshot, employeeId: string): PerformanceEvaluation[] {
  return newestFirst(snapshot.performance.filter((item) => item.employeeId === employeeId)).sort((a, b) => b.period.localeCompare(a.period));
}
export const latestEvaluation = (snapshot: Snapshot, employeeId: string) => evaluationsOf(snapshot, employeeId)[0];

export function scorecardsOf(snapshot: Snapshot, employeeId: string): KpiAssessment[] {
  return newestFirst((snapshot.kpiAssessments ?? []).filter((item) => item.employeeId === employeeId)).sort((a, b) => b.period.localeCompare(a.period));
}
/** " · Revision n" for the second and later record of the same period; empty for the first. */
export function revisionTag<T extends { id: string; employeeId: string; period: string; createdAt: string }>(records: readonly T[], record: T) {
  const n = revisionNumber(records, record);
  return n > 1 ? ` · Revision ${n}` : "";
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

/** Resolves a development need's source reference to a readable label and a link to the source record (FR-D4-005). */
export function describeSource(snapshot: Snapshot, need: Pick<DevelopmentNeedVersion, "sourceType" | "sourceRef" | "employeeId">): { label: string; href: string | null } {
  if (need.sourceType === "competency_gap") {
    const requirement = snapshot.reference.positionRequirements.find((item) => item.id === need.sourceRef);
    const competency = snapshot.reference.competencies.find((item) => item.id === requirement?.competencyId);
    return { label: competency ? `${competency.name} (min. level ${requirement?.minProficiencyLevel})` : "Competency requirement", href: `/competency/${need.employeeId}` };
  }
  if (need.sourceType === "role_change") {
    const assessment = snapshot.competency.find((item) => item.id === need.sourceRef);
    return { label: assessment ? `Position change assessment · ${formatDate(assessment.effectiveDate)}` : "Position change assessment", href: `/competency/${need.employeeId}/history` };
  }
  const evaluation = snapshot.performance.find((item) => item.id === need.sourceRef);
  return { label: evaluation ? `Performance evaluation ${formatPeriod(evaluation.period)}` : "Performance evaluation", href: evaluation ? `/performance/${evaluation.id}` : null };
}

export function trainingSource(snapshot: Snapshot, record: TrainingVersion) {
  return developmentById(snapshot, record.developmentNeedId);
}

// en-US month names ("Sep", not en-GB "Sept"), in day-month-year order: "12 Oct 2026", "Sep 2026".
const MONTH_UTC = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const MONTH_LOCAL = new Intl.DateTimeFormat("en-US", { month: "short" });

export function formatPeriod(period: string | undefined): string {
  if (!period) return "—";
  const date = new Date(`${period.slice(0, 7)}-01T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? period : `${MONTH_UTC.format(date)} ${date.getUTCFullYear()}`;
}

export function formatDate(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : `${date.getDate()} ${MONTH_LOCAL.format(date)} ${date.getFullYear()}`;
}

export function formatScore(value: number | null | undefined, scale = 5): string {
  return value === null || value === undefined ? "—" : `${value.toFixed(2)} / ${scale}`;
}

/** Raw-score criteria from KPI Scorecard V3.1/V5.1 sheet "KPI Scoring Card"; shared by KPI and evaluation results. */
export const SCORE_LABELS: Record<number, string> = { 1: "Very Poor", 2: "Poor", 3: "Fair", 4: "Good", 5: "Very Good" };

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

// Dates follow WIB, not UTC: a form opened before 07:00 WIB must not default to yesterday.
export const today = () => localToday();
export const thisMonth = () => localMonth();

export function includesText(haystack: string, needle: string) {
  return !needle.trim() || haystack.toLocaleLowerCase().includes(needle.trim().toLocaleLowerCase());
}
