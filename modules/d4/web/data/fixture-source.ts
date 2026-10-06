import { compareCompetencies } from "../../competency/service";
import { developmentFixtureVersions } from "../../development/fixtures";
import { indicatorsFor, KPI_V51_CATALOG, roleForPositionTitle, selectCatalog } from "../../kpi/catalog";
import { performanceFixtureRecords } from "../../performance/fixtures";
import { validatePerformanceInput } from "../../performance/validation";
import { d4ReferenceFixture } from "../../shared/fixtures";
import { assertDevelopmentChange, assertGapAssessed, assertTrainingDate, assertNeedOpen, assertNoOpenNeed, openTrainingCount, assertNotFutureDate, assertNotSelf, assertPeriodRevision, assertTrainingChange } from "../../shared/rules";
import type { D4LiveSnapshot, KpiAssessment, KpiAssessmentLine } from "../../supabase/types";
import { latestDevelopment, latestTraining } from "../../supabase/types";
import { trainingFixtureVersions } from "../../training/fixtures";
import type { D4DataSource } from "./source";

// Local preview only (NEXT_PUBLIC_D4_DATA_MODE=fixture in development). All people and
// records are fictional; writes live in memory and disappear on reload. The rules below
// mirror the server so the UI behaves the same as in live mode.
const HR_ACTOR = "d4000000-0000-4000-8000-000000000012";
const ALFA = "d4000000-0000-4000-8000-000000000009";
// NEXT_PUBLIC_D4_FIXTURE_ROLE=EMPLOYEE previews the self-service view as Alfa (read-only).
const FIXTURE_ROLE = process.env.NEXT_PUBLIC_D4_FIXTURE_ROLE === "EMPLOYEE" ? "EMPLOYEE" : process.env.NEXT_PUBLIC_D4_FIXTURE_ROLE === "MANAGER" ? "MANAGER" : "HR";
const catalog = selectCatalog(KPI_V51_CATALOG);

function kpiLines(roleOrder: number, scores: (number | null)[], actual: string[]): KpiAssessmentLine[] {
  return indicatorsFor(catalog, roleOrder).map((row, index) => ({
    indicator_order: row.indicator_order, kpi_name: row.kpi_name, weight_percent: row.weight_percent,
    target: "Meets period target", actual: actual[index] ?? "", raw_score: scores[index] ?? null, comment: "",
  }));
}

function total(lines: readonly KpiAssessmentLine[]): number | null {
  if (lines.some((line) => line.raw_score === null)) return null;
  return Math.round(lines.reduce((sum, line) => sum + line.weight_percent * (line.raw_score ?? 0) / 100, 0) * 100) / 100;
}

function assessment(id: string, employeeId: string, roleOrder: number, period: string, scores: (number | null)[], status: "draft" | "completed"): KpiAssessment {
  const lines = kpiLines(roleOrder, scores, ["98% SLA", "100% accurate", "D+1", "Receivables 6%", "Zero penalties"]);
  return {
    id, definitionVersion: catalog.version, employeeId, roleOrder, roleName: indicatorsFor(catalog, roleOrder)[0].role_name,
    period, evaluationDate: `${period}-25`, evaluatorName: "Mercury", status, lines, overallScore: total(lines),
    generalNotes: status === "completed" ? "Sample fixture scorecard for local preview." : "", createdAt: `${period}-25T08:00:00.000Z`, actor: "Mercury",
  };
}


// Load test (lecturer request): NEXT_PUBLIC_D4_FIXTURE_ROWS=1000 adds that many departments, positions,
// employees and records of every kind, so list pages, filters and forms can be checked at volume.
const BULK_ROWS = Math.min(5000, Math.max(0, Number(process.env.NEXT_PUBLIC_D4_FIXTURE_ROWS) || 0));

function withBulk(snapshot: D4LiveSnapshot, n: number): D4LiveSnapshot {
  const id = (kind: number, i: number) => `b${kind}000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
  const competencyId = snapshot.reference.competencies[0].id;
  const range = Array.from({ length: n }, (_, i) => i + 1);
  const label = (i: number) => String(i).padStart(4, "0");
  const reference = {
    ...snapshot.reference,
    departments: [...snapshot.reference.departments, ...range.map((i) => ({ id: id(1, i), code: `BULK-DEPT-${label(i)}`, name: `Bulk Department ${label(i)}` }))],
    positions: [...snapshot.reference.positions, ...range.map((i) => ({ id: id(2, i), code: `BULK-POS-${label(i)}`, title: `Bulk Position ${label(i)}`, departmentId: id(1, i) }))],
    employees: [...snapshot.reference.employees, ...range.map((i) => ({ id: id(3, i), employeeId: `BULK-EMP-${label(i)}`, fullName: `Bulk Employee ${label(i)}`, positionId: id(2, i), departmentId: id(1, i) }))],
    positionRequirements: [...snapshot.reference.positionRequirements, ...range.map((i) => ({ id: id(4, i), positionId: id(2, i), competencyId, minProficiencyLevel: 3, isMandatory: true }))],
    employeeSkills: [...snapshot.reference.employeeSkills, ...range.map((i) => ({ id: id(5, i), employeeId: id(3, i), competencyId, proficiencyLevel: i % 5 + 1, evidenceNotes: "Bulk load-test record." }))],
  };
  const period = (i: number) => `2026-${String(i % 9 + 1).padStart(2, "0")}`;
  return {
    ...snapshot, reference,
    competency: [...snapshot.competency, ...range.map((i) => {
      const comparison = compareCompetencies(id(3, i), id(2, i), reference);
      return { id: id(6, i), source: "local-demo" as const, employeeId: id(3, i), positionId: id(2, i), effectiveDate: "2026-09-01", context: "current-position" as const,
        findings: comparison.findings, overallStatus: comparison.overallStatus, createdAt: "2026-09-01T08:00:00.000Z", actor: "Bulk" };
    })],
    performance: [...snapshot.performance, ...range.map((i) => ({ ...snapshot.performance[0], id: id(7, i), employeeId: id(3, i), period: period(i), evaluationDate: `${period(i)}-20`, generalNotes: `Bulk evaluation ${label(i)}.` }))],
    kpiAssessments: [...(snapshot.kpiAssessments ?? []), ...range.map((i) => ({ ...assessment(id(8, i), id(3, i), 10, period(i), [i % 5 + 1, 4, 3, 4, 5], "completed") }))],
    developmentVersions: [...snapshot.developmentVersions, ...range.map((i) => ({ ...snapshot.developmentVersions[0], id: id(9, i), needId: `BULK-DEV-${label(i)}`, employeeId: id(3, i), sourceRef: id(4, i), objective: `Bulk development objective ${label(i)}`, status: "Planned" as const, createdAt: `${period(i)}-21T08:00:00.000Z` }))],
    trainingVersions: [...snapshot.trainingVersions, ...range.map((i) => ({ ...snapshot.trainingVersions[0], id: `BULK-TRN-V-${label(i)}`, trainingId: `BULK-TRN-${label(i)}`, employeeId: id(3, i), developmentNeedId: `BULK-DEV-${label(i)}`, activity: `Bulk training ${label(i)}`, date: `${period(i)}-25`, status: "Planned" as const, createdAt: `${period(i)}-22T08:00:00.000Z` }))],
  };
}

function initialSnapshot(): D4LiveSnapshot {
  const alfa = ALFA;
  const finance = "d4000000-0000-4000-8000-000000000008";
  const comparison = compareCompetencies(alfa, finance, d4ReferenceFixture);
  // Charlie's development need (FIX-D4-DEV-002) comes from a saved gap, so the assessment exists too.
  const charlie = "d4000000-0000-4000-8000-000000000011", operations = "d4000000-0000-4000-8000-000000000018";
  const charlieGap = compareCompetencies(charlie, operations, d4ReferenceFixture);
  return {
    reference: d4ReferenceFixture,
    role: FIXTURE_ROLE,
    actorEmployeeId: FIXTURE_ROLE === "EMPLOYEE" ? ALFA : HR_ACTOR,
    kpi: [],
    kpiAssessments: [
      assessment("FIX-D4-KPI-001", alfa, 10, "2026-09", [4, 5, 4, 3, 4], "completed"),
      assessment("FIX-D4-KPI-002", alfa, 10, "2026-06", [3, 4, 4, 3, 3], "completed"),
    ],
    performance: performanceFixtureRecords,
    competency: [{
      id: "FIX-D4-COMP-ASSESS-001", source: "local-demo", employeeId: alfa, positionId: finance, effectiveDate: "2026-09-21",
      context: "current-position", findings: comparison.findings, overallStatus: comparison.overallStatus,
      createdAt: "2026-09-21T09:00:00.000Z", actor: "Mercury",
    }, {
      id: "FIX-D4-COMP-ASSESS-002", source: "local-demo", employeeId: charlie, positionId: operations, effectiveDate: "2026-09-22",
      context: "current-position", findings: charlieGap.findings, overallStatus: charlieGap.overallStatus,
      createdAt: "2026-09-22T09:00:00.000Z", actor: "Mercury",
    }],
    developmentVersions: developmentFixtureVersions,
    trainingVersions: trainingFixtureVersions,
  };
}

/** What RLS returns to an employee: only their own records, so detail URLs of others show NotFound. */
function ownRecords(snapshot: D4LiveSnapshot): D4LiveSnapshot {
  const own = <T extends { employeeId: string }>(items: readonly T[]) => items.filter((item) => item.employeeId === snapshot.actorEmployeeId);
  return {
    ...snapshot, performance: own(snapshot.performance), kpiAssessments: own(snapshot.kpiAssessments ?? []), competency: own(snapshot.competency),
    developmentVersions: own(snapshot.developmentVersions), trainingVersions: own(snapshot.trainingVersions),
  };
}

const now = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
const delay = () => new Promise((resolve) => setTimeout(resolve, 250));

export function createFixtureSource(): D4DataSource {
  let state = BULK_ROWS ? withBulk(initialSnapshot(), BULK_ROWS) : initialSnapshot();
  const update = (patch: Partial<D4LiveSnapshot>) => { state = { ...state, ...patch }; };
  const assertWriter = () => { if (state.role === "EMPLOYEE") throw new Error("Only HR or a manager can save changes."); };
  // The evaluator is always the signed-in actor, never a free-text value from the form.
  const actorName = () => state.reference.employees.find((item) => item.id === state.actorEmployeeId)?.fullName ?? "HR";
  return {
    mode: "fixture",
    async loadSnapshot() { await delay(); return state.role === "EMPLOYEE" ? ownRecords(state) : state; },
    async loadKpiCatalog() { return catalog; },
    async createEvaluation({ revisionOf, ...draft }) {
      assertWriter();
      const input = { ...draft, evaluator: actorName() };
      validatePerformanceInput(input);
      assertNotSelf(state.actorEmployeeId, input.employeeId);
      assertNotFutureDate(input.evaluationDate);
      assertPeriodRevision(state.performance, input.employeeId, input.period, revisionOf, "Evaluation");
      const id = newId("FIX-D4-PERF");
      update({ performance: [{ ...input, id, source: "local-demo", createdAt: now(), actor: actorName() }, ...state.performance] });
      return id;
    },
    async createKpiAssessment({ revisionOf, ...draft }) {
      assertWriter();
      const input = { ...draft, evaluatorName: actorName() };
      assertNotSelf(state.actorEmployeeId, input.employeeId);
      assertNotFutureDate(input.evaluationDate);
      assertPeriodRevision(state.kpiAssessments ?? [], input.employeeId, input.period, revisionOf, "Scorecard");
      const indicators = indicatorsFor(catalog, input.roleOrder);
      if (indicators.length !== 5) throw new Error("The KPI role was not found in the catalog.");
      const employee = state.reference.employees.find((item) => item.id === input.employeeId);
      const positionTitle = state.reference.positions.find((item) => item.id === employee?.positionId)?.title;
      if (roleForPositionTitle(catalog, positionTitle) !== input.roleOrder) throw new Error("The selected KPI set does not belong to this employee's position.");
      if (input.status === "completed" && input.lines.some((line) => line.raw_score === null)) throw new Error("All five KPI indicators must be scored before completing.");
      const id = newId("FIX-D4-KPI");
      update({ kpiAssessments: [{ ...input, id, definitionVersion: catalog.version, roleName: indicators[0].role_name, overallScore: total(input.lines), createdAt: now(), actor: actorName() }, ...(state.kpiAssessments ?? [])] });
      return id;
    },
    async saveCompetency(input) {
      assertWriter();
      const employee = state.reference.employees.find((item) => item.id === input.employeeId);
      if (!employee) throw new Error("Employee not found.");
      const comparison = compareCompetencies(input.employeeId, input.positionId, state.reference);
      if (!comparison.findings.length) throw new Error("The position has no competency requirements yet.");
      const id = newId("FIX-D4-COMP");
      update({ competency: [{ id, source: "local-demo", employeeId: input.employeeId, positionId: input.positionId, effectiveDate: input.effectiveDate, context: employee.positionId === input.positionId ? "current-position" : "role-change", findings: comparison.findings, overallStatus: comparison.overallStatus, createdAt: now(), actor: actorName() }, ...state.competency] });
      return id;
    },
    async createDevelopment(input) {
      assertWriter();
      if (!input.objective.trim()) throw new Error("Development objective is required.");
      if (!input.sourceRef) throw new Error("Source reference is required.");
      assertNoOpenNeed(latestDevelopment(state), input.employeeId, input.sourceType, input.sourceRef);
      assertGapAssessed(state.competency, state.reference.employees.find((item) => item.id === input.employeeId), input.sourceType);
      const needId = newId("FIX-D4-DEV");
      update({ developmentVersions: [{ ...input, id: newId("FIX-D4-DEV-V"), needId, revision: 1, source: "local-demo", status: "Identified", createdAt: now(), actor: actorName() }, ...state.developmentVersions] });
      return needId;
    },
    async updateDevelopment(needId, status, notes) {
      assertWriter();
      const current = latestDevelopment(state).find((item) => item.needId === needId);
      if (!current) throw new Error("Development need not found.");
      assertDevelopmentChange(current.status, status, notes, openTrainingCount(latestTraining(state), needId));
      update({ developmentVersions: [{ ...current, id: newId("FIX-D4-DEV-V"), revision: current.revision + 1, status, notes, createdAt: now(), actor: actorName() }, ...state.developmentVersions] });
    },
    async createTraining(input) {
      assertWriter();
      const need = latestDevelopment(state).find((item) => item.needId === input.developmentNeedId);
      if (!need || need.employeeId !== input.employeeId) throw new Error("Training must refer to a development need of the same employee.");
      assertNeedOpen(need);
      assertTrainingDate(input.status, input.date);
      if (input.status === "Completed" && !input.result.trim()) throw new Error("Result is required when the training is completed.");
      const trainingId = newId("FIX-D4-TRN");
      update({ trainingVersions: [{ ...input, id: newId("FIX-D4-TRN-V"), trainingId, revision: 1, source: "local-demo", createdAt: now(), actor: actorName() }, ...state.trainingVersions] });
      return trainingId;
    },
    async updateTraining(trainingId, status, result, notes) {
      assertWriter();
      const current = latestTraining(state).find((item) => item.trainingId === trainingId);
      if (!current) throw new Error("Training not found.");
      if (status === "Completed" && !result.trim()) throw new Error("Result is required when the training is completed.");
      assertTrainingChange(current.status, status, notes);
      update({ trainingVersions: [{ ...current, id: newId("FIX-D4-TRN-V"), revision: current.revision + 1, status, result, notes, createdAt: now(), actor: actorName() }, ...state.trainingVersions] });
    },
  };
}
