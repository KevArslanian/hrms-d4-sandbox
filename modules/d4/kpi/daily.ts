import { localToday } from "../shared/rules";
import type { KpiAssessmentLine, KpiDailyEntry } from "../supabase/types";
import { indicatorsFor, targetOf, type KpiCatalog } from "./catalog";
import { performanceBand, scaleMaxOf, type PerformanceBand } from "./scale";

/** Newest entry of each day for one employee and period, oldest day first. A correction is a new row for the same day. */
export function dailyEntriesOf(entries: readonly KpiDailyEntry[], employeeId: string, period: string): KpiDailyEntry[] {
  const byDay = new Map<string, KpiDailyEntry>();
  for (const entry of entries) {
    if (entry.employeeId !== employeeId || entry.period !== period) continue;
    const kept = byDay.get(entry.entryDate);
    if (!kept || kept.createdAt < entry.createdAt) byDay.set(entry.entryDate, entry);
  }
  return [...byDay.values()].sort((a, b) => a.entryDate.localeCompare(b.entryDate));
}

export interface DailyCompilation {
  readonly definitionVersion: string;
  readonly roleOrder: number;
  /** Days that count: the latest day's KPI role only, so a mid-period position change does not mix two KPI sets. */
  readonly days: readonly KpiDailyEntry[];
  /** Average raw score per indicator (order 1–5), rounded to a whole number: the scorecard stores integer scores. */
  readonly scores: readonly number[];
  /** Weighted total of the rounded scores, the same number HR's scorecard will show when saved from them. */
  readonly total: number;
}

/** Compiles an employee's daily entries of a period into the five scores HR's Performance Review starts from. */
export function compileDaily(entries: readonly KpiDailyEntry[], employeeId: string, period: string): DailyCompilation | null {
  const all = dailyEntriesOf(entries, employeeId, period);
  const latest = all.at(-1);
  if (!latest) return null;
  const days = all.filter((entry) => entry.roleOrder === latest.roleOrder && entry.definitionVersion === latest.definitionVersion);
  const scores = latest.lines.map((_, index) => Math.round(days.reduce((sum, entry) => sum + (entry.lines[index]?.raw_score ?? 0), 0) / days.length));
  const total = Math.round(latest.lines.reduce((sum, line, index) => sum + line.weight_percent * scores[index] / 100, 0) * 100) / 100;
  return { definitionVersion: latest.definitionVersion, roleOrder: latest.roleOrder, days, scores, total };
}

/**
 * Run of the most recent entries in one band. Interview D4 (14 Oct 2026): three Under or three High Performance days
 * in a row make HR call the employee. Only 1–100 entries have a band.
 */
export function bandRun(days: readonly KpiDailyEntry[], band: PerformanceBand): number {
  let run = 0;
  for (const entry of [...days].reverse()) {
    if (performanceBand(entry.overallScore, entry.definitionVersion) !== band) break;
    run += 1;
  }
  return run;
}

/** Interview D4 (14 Oct 2026): 100 on every KPI is a trigger of its own for HR to check the entry. */
export const allTopScores = (entry: KpiDailyEntry) =>
  scaleMaxOf(entry.definitionVersion) === 100 && entry.lines.length > 0 && entry.lines.every((line) => line.raw_score === 100);

/** Scorecard lines from a compilation: the catalog's indicators with the compiled scores as Actual (Q4). */
export function scorecardLinesFromDaily(catalog: KpiCatalog, compiled: DailyCompilation): KpiAssessmentLine[] {
  return indicatorsFor(catalog, compiled.roleOrder).map((row, index) => ({
    indicator_order: row.indicator_order, kpi_name: row.kpi_name, weight_percent: row.weight_percent, target: targetOf(row),
    actual: String(compiled.scores[index]), raw_score: compiled.scores[index], comment: "",
  }));
}

/** Evaluation date of a finalized period: today in the running period, else its last day (never in the future). */
export function finalizeDate(period: string, today = localToday()): string {
  if (period === today.slice(0, 7)) return today;
  const [year, month] = period.split("-").map(Number);
  return `${period}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0")}`;
}
