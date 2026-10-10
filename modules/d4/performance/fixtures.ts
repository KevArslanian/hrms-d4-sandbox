import { indicatorsFor, KPI_V51_CATALOG, kpiTotal, roleForPositionTitle, selectCatalog } from "../kpi/catalog";
import { d4ReferenceFixture } from "../shared/fixtures";
import type { KpiAssessmentLine } from "../supabase/types";
import type { PerformanceEvaluation } from "./types";

const catalog = selectCatalog(KPI_V51_CATALOG);
const ACTUAL = ["98% SLA", "100% accurate", "D+1", "Receivables 6%", "Zero penalties"];

/** Five KPI of the employee's position with the given scores; empty when the position has no KPI in the catalog. */
export function fixtureLines(employeeId: string, scores: readonly number[]): KpiAssessmentLine[] {
  const employee = d4ReferenceFixture.employees.find((item) => item.id === employeeId);
  const title = d4ReferenceFixture.positions.find((item) => item.id === employee?.positionId)?.title;
  return indicatorsFor(catalog, roleForPositionTitle(catalog, title)).map((row, index) => ({
    indicator_order: row.indicator_order, kpi_name: row.kpi_name, weight_percent: row.weight_percent,
    target: row.target ?? "Meets period target", actual: ACTUAL[index] ?? "", raw_score: scores[index] ?? 4, comment: "",
  }));
}

function sample(id: number, employee: number, scores: number[], notes: string, evaluator = "Mercury", period = "2026-09"): PerformanceEvaluation {
  const employeeId = `d4000000-0000-4000-8000-${String(employee).padStart(12, "0")}`;
  const lines = fixtureLines(employeeId, scores);
  return {
    id: `FIX-D4-PERF-00${id}`,
    source: "fixture",
    employeeId,
    period,
    evaluationDate: `${period}-20`,
    evaluator,
    status: "completed",
    lines,
    overallScore: kpiTotal(lines),
    generalNotes: notes,
    evidenceReference: null,
    createdAt: `${period}-${String(20 + id).padStart(2, "0")}T09:00:00.000Z`,
    actor: "Fixture D4",
  };
}

export const performanceFixtureRecords: readonly PerformanceEvaluation[] = [
  sample(1, 9, [4, 5, 4, 3, 4], "Consistent and accurate work. Recommendation: advanced administrative accuracy training."),
  sample(2, 10, [4, 4, 3, 4, 5], "Period target met. No training recommendation yet."),
  sample(3, 11, [4, 4, 4, 4, 4], "Good teamwork. Recommendation: operational safety refresher."),
  // Mercury (HR) is evaluated by someone else; nobody evaluates themselves.
  sample(4, 12, [4, 4, 4, 4, 4], "HR documentation on time.", "Oscar"),
  sample(5, 13, [5, 5, 4, 5, 5], "Very tidy sales administration."),
  sample(6, 14, [3, 3, 2, 3, 4], "Needs coaching on reconciliation. Recommendation: administrative accuracy training."),
  sample(7, 15, [4, 4, 4, 4, 4], "Operations checklist complete."),
  sample(8, 9, [3, 4, 4, 3, 3], "Earlier period: invoice SLA still below target.", "Mercury", "2026-06"),
];
