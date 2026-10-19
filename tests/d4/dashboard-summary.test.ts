import { afterEach, describe, expect, it, vi } from "vitest";
import type { DevelopmentNeedVersion } from "@/modules/d4/development/types";
import type { KpiAssessment } from "@/modules/d4/supabase/types";
import type { TrainingVersion } from "@/modules/d4/training/types";
import { currentCompetencyStatus, currentGap, type Snapshot } from "@/modules/d4/web/data/selectors";
import { competencySlices, dashboardAlerts, gapRanking, performanceSlices, type DashboardRow } from "@/modules/d4/web/features/dashboard/summary";

async function hrSnapshot(): Promise<Snapshot> {
  vi.stubEnv("NEXT_PUBLIC_D4_FIXTURE_ROLE", "HR");
  vi.resetModules();
  const { createFixtureSource } = await import("@/modules/d4/web/data/fixture-source");
  return createFixtureSource().loadSnapshot();
}
afterEach(() => { vi.unstubAllEnvs(); });

const employee = (id: string) => ({ id, employeeId: id, fullName: `Pegawai ${id}`, positionId: null, departmentId: null });
const scorecard = (overallScore: number, definitionVersion: string) => ({ overallScore, definitionVersion }) as KpiAssessment;
const rowsOf = (snapshot: Snapshot): DashboardRow[] => snapshot.reference.employees.map((item) => ({ employee: item, gap: currentCompetencyStatus(snapshot, item) }));

describe("People Dashboard charts", () => {
  it("counts Under / Average / High only for 1–100 scorecards and leaves 1–5 scorecards unrated", () => {
    const rows: DashboardRow[] = [
      { employee: employee("a"), gap: "Gap", scorecard: scorecard(79.99, "V6") },
      { employee: employee("b"), gap: "Gap", scorecard: scorecard(80, "V6") },
      { employee: employee("c"), gap: "Gap", scorecard: scorecard(85.01, "V6") },
      { employee: employee("d"), gap: "Gap", scorecard: scorecard(4.5, "V5.1") },
      { employee: employee("e"), gap: "Gap" },
    ];
    const { slices, rated, total } = performanceSlices(rows);
    expect(slices.map((item) => [item.label, item.count])).toEqual([["Under Performance", 1], ["Average Performance", 1], ["High Performance", 1]]);
    expect([rated, total]).toEqual([3, 5]);
  });

  it("merges statuses that read the same into one competency slice, and the slices add up to every row", () => {
    const statuses = ["Bukti Belum Cukup", "Belum Ada Persyaratan", "Gap", "Terpenuhi", "Not Evaluated", "Gap"];
    const slices = competencySlices(statuses.map((gap, index) => ({ employee: employee(String(index)), gap })));
    expect(slices.map((item) => [item.label, item.count])).toEqual([["Met", 1], ["Insufficient Data", 2], ["Gap", 2], ["Not Evaluated", 1]]);
    expect(slices.reduce((sum, item) => sum + item.count, 0)).toBe(statuses.length);
  });

  it("ranks gaps of assessed employees only, and alerts follow the requirement a need was raised from", async () => {
    const base = await hrSnapshot();
    const target = base.reference.employees.find((item) => currentCompetencyStatus(base, item) !== "Not Evaluated" && currentGap(base, item)?.findings.some((finding) => finding.status === "Gap"));
    expect(target).toBeDefined();
    const finding = currentGap(base, target!)!.findings.find((item) => item.status === "Gap")!;
    const need = (status: DevelopmentNeedVersion["status"], extra: Partial<DevelopmentNeedVersion> = {}): DevelopmentNeedVersion => ({
      ...base.developmentVersions[0], id: `T-${status}`, needId: "T-NEED", revision: 1, employeeId: target!.id, sourceType: "competency_gap", sourceRef: finding.requirementId, status, pic: "Bu Maya", ...extra,
    });
    const keys = (snapshot: Snapshot) => dashboardAlerts(snapshot, rowsOf(snapshot)).filter((alert) => alert.people.includes(target!.fullName)).map((alert) => alert.key);

    const noNeeds = { ...base, developmentVersions: [], trainingVersions: [] };
    expect(gapRanking(noNeeds, rowsOf(noNeeds)).some((item) => item.id === finding.competencyId)).toBe(true);
    expect(keys(noNeeds)).toContain("gap-no-requirement");
    // The same employee marked Not Evaluated drops out of the bars, as in the competency donut.
    const notEvaluated = rowsOf(noNeeds).map((row) => row.employee.id === target!.id ? { ...row, gap: "Not Evaluated" } : row);
    expect(gapRanking(noNeeds, notEvaluated).reduce((sum, item) => sum + item.count, 0)).toBeLessThan(gapRanking(noNeeds, rowsOf(noNeeds)).reduce((sum, item) => sum + item.count, 0));

    // A need for another requirement does not answer this gap.
    const otherRequirement = { ...noNeeds, developmentVersions: [need("Planned", { sourceRef: "another-requirement" })] };
    expect(keys(otherRequirement)).toContain("gap-no-requirement");

    const completed = { ...noNeeds, developmentVersions: [need("Completed")] };
    expect(keys(completed)).toContain("completed-gap-open");
    expect(keys(completed)).not.toContain("gap-no-requirement");

    const noPic = { ...noNeeds, developmentVersions: [need("In Progress", { pic: "" })] };
    expect(keys(noPic)).toContain("requirement-no-pic");

    const training = (id: string, date: string, status: TrainingVersion["status"], result: string): TrainingVersion => ({
      ...(base.trainingVersions[0] as TrainingVersion), id, trainingId: id, revision: 1, employeeId: target!.id, developmentNeedId: "T-NEED", date, status, result, createdAt: `${date}T08:00:00.000Z`,
    });
    const notPassed = { ...noNeeds, developmentVersions: [need("In Progress")], trainingVersions: [training("T1", "2026-10-01", "Completed", "Not Passed")] };
    expect(keys(notPassed)).toContain("training-not-passed");
    const retrained = { ...notPassed, trainingVersions: [...notPassed.trainingVersions, training("T2", "2026-10-20", "Planned", "")] };
    expect(keys(retrained)).not.toContain("training-not-passed");
  });
});
