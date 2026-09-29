import { d4ReferenceFixture } from "../../shared/fixtures";
import type { DevelopmentNeedVersion } from "../../development/types";
import type { TrainingStatus, TrainingVersion } from "../../training/types";
import type { EvaluationAspect, PerformanceEvaluation, ReviewStatus } from "../../performance/types";
import type { D4LiveSnapshot } from "../types";

export type DemoPerson = {
  employee_code: string;
  full_name: string;
  position_title: string;
  department_name: string;
  sort_order: number;
  performance_score: number | null;
  kpi_score: number | null;
  review_status: ReviewStatus | null;
  evaluation_comment: string;
  aspects: EvaluationAspect[];
  scorecard: { aspect: string; weight: number; target: string; actual: string; rawScore: number; weighted: number; result: string }[];
  competency: { need?: string; evidence?: string };
  training: { activity?: string; status?: TrainingStatus; progress?: number; source?: string; date?: string; period?: string };
};

export function buildDemoSnapshot(rows: readonly DemoPerson[], trendRows: readonly { quarter: string; performance_avg: number; kpi_avg: number }[]): D4LiveSnapshot {
  const people = [...rows].sort((a, b) => a.sort_order - b.sort_order);
  const baseEmployees = d4ReferenceFixture.employees.filter((person) => person.employeeId !== "FIX-D4-EMP-001");
  const departments = people.map((row, index) => ({
    id: `demo-department-${index}`, code: `FIGMA-D4-${index}`, name: row.department_name,
  }));
  const positions = people.map((row, index) => ({
    id: `demo-position-${index}`, code: `FIGMA-D4-POS-${index}`, title: row.position_title, departmentId: departments[index].id,
  }));
  const employees = people.map((row, index) => ({
    id: baseEmployees[index].id, employeeId: row.employee_code, fullName: row.full_name,
    positionId: positions[index].id, departmentId: departments[index].id,
  }));
  const competencies = people.map((row, index) => ({
    id: `demo-competency-${index}`, code: `FIGMA-D4-COMP-${index}`, name: row.competency.need ?? "Competency",
    category: "Technical",
  }));
  const positionRequirements = people.map((_, index) => ({
    id: `demo-requirement-${index}`, positionId: positions[index].id,
    competencyId: competencies[index].id, minProficiencyLevel: 4, isMandatory: true,
  }));
  const employeeSkills = people.flatMap((row, index) => row.competency.evidence === "No evidence submitted" ? [] : [{
    id: `demo-skill-${index}`, employeeId: employees[index].id, competencyId: competencies[index].id,
    proficiencyLevel: row.competency.evidence === "Evidence meets requirement" ? 4 : 2,
    evidenceNotes: row.competency.evidence === "Documented evidence pending" ? null : row.competency.evidence ?? null,
  }]);
  const performance: PerformanceEvaluation[] = people.flatMap((row, index) => row.performance_score === null ? [] : [{
    id: `FIGMA-D4-EVAL-${index + 1}`, source: "fixture" as const, employeeId: employees[index].id,
    period: "2026-09", evaluationDate: "2026-09-28", evaluator: "Jerome Polin | HR Manager",
    status: "completed" as const, reviewStatus: row.review_status ?? "Needs Review",
    overallScore: row.performance_score, aspects: row.aspects,
    generalNotes: row.evaluation_comment, evidenceReference: index === 0 ? "EV-Q3-2026-FAT-BIL-001" : null,
    createdAt: `2026-09-${String(20 + index).padStart(2, "0")}T09:00:00.000Z`, actor: "Jerome Polin",
  }]);
  const kpi = people.flatMap((row, index) => row.kpi_score === null ? [] : [{
    id: `FIGMA-D4-KPI-${index + 1}`, employeeId: employees[index].id, period: "2026-09",
    score: row.kpi_score, notes: "", createdAt: "2026-09-28T09:00:00.000Z",
  }]);
  const developmentVersions: DevelopmentNeedVersion[] = people.flatMap((row, index) => !row.training.source ? [] : [{
    id: `FIGMA-D4-DEV-V1-${index + 1}`, needId: `FIGMA-D4-DEV-${index + 1}`,
    revision: 1, source: "fixture" as const, employeeId: employees[index].id,
    sourceType: "competency_gap" as const, sourceRef: row.training.source,
    objective: row.competency.need ?? row.training.activity ?? "Training",
    priority: "Medium" as const, status: "Planned" as const, notes: row.competency.evidence ?? "",
    createdAt: "2026-09-28T09:00:00.000Z", actor: "Figma Demo",
  }]);
  const trainingVersions: TrainingVersion[] = people.flatMap((row, index) => !row.training.activity ? [] : [{
    id: `FIGMA-D4-TRN-V1-${index + 1}`, trainingId: `FIGMA-D4-TRN-${index + 1}`,
    revision: 1, source: "fixture" as const, employeeId: employees[index].id,
    developmentNeedId: `FIGMA-D4-DEV-${index + 1}`, activity: row.training.activity,
    date: row.training.date ?? "2026-10-01", status: row.training.status ?? "Planned",
    result: "", notes: row.training.progress ? `${row.training.progress}% complete` : "",
    createdAt: "2026-09-28T09:00:00.000Z", actor: "Figma Demo",
  }]);
  return {
    isFigmaDemo: true,
    demoTrend: trendRows.map((row) => ({ quarter: row.quarter, performance: Number(row.performance_avg), kpi: Number(row.kpi_avg) })),
    demoCompetencyEvidence: Object.fromEntries(people.map((row, index) => [employees[index].id, row.competency.evidence ?? ""])),
    demoScorecards: Object.fromEntries(people.map((row, index) => [employees[index].id, row.scorecard])),
    role: "HR", actorEmployeeId: employees[0]?.id ?? "",
    reference: { ...d4ReferenceFixture, departments, positions, employees, competencies, positionRequirements, employeeSkills },
    performance, kpi, competency: [], developmentVersions, trainingVersions,
  };
}
