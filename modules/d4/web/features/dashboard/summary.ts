import { performanceBand, type PerformanceBand } from "../../../kpi/scale";
import { localToday } from "../../../shared/rules";
import type { EmployeeReference } from "../../../shared/types";
import type { KpiAssessment } from "../../../supabase/types";
import { currentGap, developmentHistory, formatDate, formatPeriod, formatScorecard, needsOf, positionById, reassessmentFor, revisionChanges, scorecardsOf, trainingHistory, trainingsOf, type Snapshot } from "../../data/selectors";
import type { TimelineEntry } from "../../ui/layout";
import { slug, statusLabel } from "../../ui/primitives";

/** What the People Dashboard charts need from one listed row: the employee, the period's scorecard, the competency status. */
export type DashboardRow = { employee: EmployeeReference; scorecard?: KpiAssessment; gap: string };
export type Slice = { key: string; label: string; count: number };

const bandOf = (row: DashboardRow) => row.scorecard ? performanceBand(row.scorecard.overallScore, row.scorecard.definitionVersion) : null;

const BANDS: readonly PerformanceBand[] = ["Under Performance", "Average Performance", "High Performance"];

/**
 * Performance category of the listed rows (interview D4, 14 Oct 2026). Only 1–100 scorecards have a category;
 * 1–5 scorecards (V3.1/V5.1) and employees without a scorecard stay unrated instead of being mapped onto a band.
 */
export function performanceSlices(rows: readonly DashboardRow[]) {
  const bands = rows.map(bandOf);
  return {
    slices: BANDS.map((band): Slice => ({ key: slug(band), label: band, count: bands.filter((item) => item === band).length })),
    rated: bands.filter(Boolean).length,
    total: rows.length,
  };
}

const COMPETENCY_ORDER = ["Met", "Insufficient Data", "Gap", "Not Evaluated"];

/** Competency status by display label, so two stored statuses that read "Insufficient Data" are one slice. */
export function competencySlices(rows: readonly DashboardRow[]): Slice[] {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(statusLabel(row.gap), (counts.get(statusLabel(row.gap)) ?? 0) + 1);
  const rank = (label: string) => COMPETENCY_ORDER.includes(label) ? COMPETENCY_ORDER.indexOf(label) : COMPETENCY_ORDER.length;
  return [...counts].map(([label, count]) => ({ key: slug(label), label, count })).sort((a, b) => rank(a.label) - rank(b.label));
}

/** Open gap findings of assessed rows; "Not Evaluated" rows are skipped so the bars match the competency donut. */
function gapFindings(snapshot: Snapshot, row: DashboardRow) {
  if (row.gap === "Not Evaluated") return [];
  return (currentGap(snapshot, row.employee)?.findings ?? []).filter((finding) => finding.status === "Gap");
}

/** Competencies ranked by how many listed employees have an open gap in them ("kompetensi gap apa"). */
export function gapRanking(snapshot: Snapshot, rows: readonly DashboardRow[]) {
  const counts = new Map<string, { id: string; name: string; count: number }>();
  for (const row of rows) {
    for (const finding of gapFindings(snapshot, row)) {
      const item = counts.get(finding.competencyId) ?? { id: finding.competencyId, name: finding.competencyName, count: 0 };
      item.count += 1;
      counts.set(finding.competencyId, item);
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * Requirements still to finish for one employee, behind the "Need training" tile (UAT-19): the latest revision of
 * each need that is not Completed. Retraining reopens a need as Planned, so it counts again; a Completed need still
 * awaiting reassessment does not, because its training is done.
 */
export const openNeedCount = (snapshot: Snapshot, employeeId: string) => needsOf(snapshot, employeeId).filter((need) => need.status !== "Completed").length;

export type DashboardAlert = { key: string; title: string; detail: string; href: string; count: number; people: string[] };

/**
 * Follow-ups HR should act on, computed from D4 data only (interview D4, 14 Oct 2026). Alerts that need data D4
 * does not hold (field agent vacancy, maternity leave, the 3-day daily KPI trigger) are not computed here.
 */
export function dashboardAlerts(snapshot: Snapshot, rows: readonly DashboardRow[]): DashboardAlert[] {
  const found = { under: [] as string[], completedGap: [] as string[], notPassed: [] as string[], noPlan: [] as string[], noPic: [] as string[] };
  for (const row of rows) {
    const name = row.employee.fullName;
    if (bandOf(row) === "Under Performance") found.under.push(name);
    const needs = needsOf(snapshot, row.employee.id);
    for (const finding of gapFindings(snapshot, row)) {
      // A need answers this gap only when it was raised from the same position requirement.
      const linked = needs.filter((need) => need.sourceType === "competency_gap" && need.sourceRef === finding.requirementId);
      if (!linked.length) found.noPlan.push(name);
      // Cleared once HR records the reassessment decision for every completed need of this gap.
      else if (linked.every((need) => need.status === "Completed") && linked.some((need) => reassessmentFor(snapshot, need.needId) === "pending")) found.completedGap.push(name);
    }
    const trainings = trainingsOf(snapshot, row.employee.id);
    for (const need of needs) {
      if (need.status === "Completed") continue;
      if (!need.pic?.trim()) found.noPic.push(name);
      const last = trainings.filter((item) => item.developmentNeedId === need.needId && item.status !== "Cancelled")
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0];
      if (last?.status === "Completed" && last.result === "Not Passed") found.notPassed.push(name);
    }
  }
  const alerts: (Omit<DashboardAlert, "count" | "people"> & { list: string[] })[] = [
    { key: "under-performance", list: found.under, title: "Under Performance", href: "/performance", detail: "pegawai di bawah 80 pada periode ini. KPI bisa menjadi pemicu pemanggilan HR." },
    { key: "completed-gap-open", list: found.completedGap, title: "Completed, gap masih terbuka", href: "/development", detail: "gap kompetensi masih terbuka padahal development requirement-nya Completed. Lakukan reassess." },
    { key: "training-not-passed", list: found.notPassed, title: "Training Not Passed", href: "/training", detail: "development requirement dengan training terakhir Not Passed. Jadwalkan training ulang." },
    { key: "gap-no-requirement", list: found.noPlan, title: "Gap tanpa development requirement", href: "/competency", detail: "gap kompetensi belum dibuatkan development requirement." },
    { key: "requirement-no-pic", list: found.noPic, title: "Tanpa PIC", href: "/development", detail: "development requirement terbuka belum punya PIC." },
  ];
  return alerts.filter((item) => item.list.length).map(({ list, ...item }) => ({ ...item, count: list.length, people: [...new Set(list)] }));
}

export type HistoryEntry = TimelineEntry & { kind: "competency" | "performance" | "development" | "training"; day: string; createdAt: string };

/** Day an entry happened (YYYY-MM-DD, WIB): a timestamp saved before 07:00 WIB belongs to that WIB day, not the UTC one. */
const dayOf = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : localToday(new Date(value));

/**
 * One employee's history across D4 modules, newest first (profile card "Riwayat"): competency assessments
 * (a position change shows its effective date), Performance Review per period with total and category, and every
 * development and training revision. Each entry links to its source page. D4 keeps no position history table, so
 * past positions appear only through position change assessments.
 */
export function employeeHistory(snapshot: Snapshot, employeeId: string): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  for (const item of snapshot.competency) {
    if (item.employeeId !== employeeId) continue;
    const position = positionById(snapshot, item.positionId)?.title ?? "Position";
    const roleChange = item.context === "role-change";
    entries.push({ id: `competency-${item.id}`, kind: "competency", day: item.effectiveDate, createdAt: item.createdAt, actor: item.actor,
      date: `${roleChange ? "Efektif " : ""}${formatDate(item.effectiveDate)}`, status: item.overallStatus, href: `/competency/${employeeId}/history`,
      title: roleChange ? `Position change assessment · ${position}` : `Competency assessment · ${position}`,
      body: [`${item.findings.length} requirement · ${item.findings.filter((finding) => finding.status === "Gap").length} gap`, item.assessedWith?.trim() && `Dinilai bersama ${item.assessedWith.trim()}`].filter(Boolean).join(" · ") });
  }
  for (const item of scorecardsOf(snapshot, employeeId)) {
    const on = item.evaluationDate || item.createdAt;
    entries.push({ id: `performance-${item.id}`, kind: "performance", day: dayOf(on), createdAt: item.createdAt, actor: item.actor,
      date: `${formatPeriod(item.period)} · ${formatDate(on)}`, status: performanceBand(item.overallScore, item.definitionVersion) ?? undefined,
      title: `Performance Review ${formatPeriod(item.period)} · ${formatScorecard(item)}`, body: `Penilai ${item.evaluatorName || "—"}`, href: `/performance/scorecard/${item.id}` });
  }
  for (const need of needsOf(snapshot, employeeId)) {
    const versions = developmentHistory(snapshot, need.needId);
    versions.forEach((version, index) => entries.push({ id: `development-${version.id}`, kind: "development", day: dayOf(version.createdAt), createdAt: version.createdAt,
      actor: version.actor, date: formatDate(version.createdAt), status: version.status, href: `/development/${need.needId}`,
      title: `Development Requirement rev. ${version.revision}: ${version.objective}`,
      body: [...revisionChanges(version, versions[index + 1]), version.notes].filter(Boolean).join(" · ") || undefined }));
  }
  for (const training of trainingsOf(snapshot, employeeId)) {
    for (const version of trainingHistory(snapshot, training.trainingId)) {
      entries.push({ id: `training-${version.id}`, kind: "training", day: dayOf(version.createdAt), createdAt: version.createdAt, actor: version.actor,
        date: formatDate(version.createdAt), status: version.status, href: `/training/${training.trainingId}`,
        title: `Training v${version.revision}: ${version.activity}`,
        body: [version.result && `Result: ${version.result}`, version.notes].filter(Boolean).join(" · ") || undefined });
    }
  }
  return entries.sort((a, b) => b.day.localeCompare(a.day) || b.createdAt.localeCompare(a.createdAt));
}
