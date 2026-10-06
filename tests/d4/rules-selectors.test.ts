import { afterEach, describe, expect, it, vi } from "vitest";
import type { CompetencyAssessment } from "@/modules/d4/competency/types";
import { assertDevelopmentChange, assertGapAssessed, assertNotFutureDate, assertTrainingDate, openTrainingCount, isTrainingRollback, localMonth, localToday, revisionNumber } from "@/modules/d4/shared/rules";
import type { EmployeeReference } from "@/modules/d4/shared/types";
import { assessableEmployees, canWrite, currentCompetencyStatus, currentGap, latestCurrentPositionAssessment, revisionTag, visibleEmployees, type Snapshot } from "@/modules/d4/web/data/selectors";
import type { TrainingStatus } from "@/modules/d4/training/types";

const ALFA = "d4000000-0000-4000-8000-000000000009";
const MERCURY = "d4000000-0000-4000-8000-000000000012";

async function fixtureAs(role: "HR" | "MANAGER" | "EMPLOYEE") {
  vi.stubEnv("NEXT_PUBLIC_D4_FIXTURE_ROLE", role);
  vi.resetModules();
  const { createFixtureSource } = await import("@/modules/d4/web/data/fixture-source");
  return createFixtureSource();
}
afterEach(() => { vi.unstubAllEnvs(); });

describe("WIB dates", () => {
  it("uses the Jakarta date before 07:00 WIB, when UTC is still yesterday", () => {
    const earlyMorning = new Date("2026-09-30T17:30:00Z"); // 00:30 WIB on 1 Oct
    expect(localToday(earlyMorning)).toBe("2026-10-01");
    expect(localMonth(new Date("2026-09-30T18:00:00Z"))).toBe("2026-10");
  });
});

describe("training rollback", () => {
  const statuses: TrainingStatus[] = ["Planned", "In Progress", "Completed", "Cancelled"];
  const rollbacks = new Set(["In Progress>Planned", "Completed>Planned", "Completed>In Progress", "Completed>Cancelled", "Cancelled>Planned", "Cancelled>In Progress", "Cancelled>Completed"]);
  it.each(statuses.flatMap((from) => statuses.map((to) => [from, to] as const)))("%s → %s", (from, to) => {
    expect(isTrainingRollback(from, to)).toBe(rollbacks.has(`${from}>${to}`));
  });
});

describe("revision numbering", () => {
  const records = [
    { id: "a", employeeId: ALFA, period: "2026-09", createdAt: "2026-09-01T00:00:00Z" },
    { id: "b", employeeId: ALFA, period: "2026-09", createdAt: "2026-09-02T00:00:00Z" },
    { id: "c", employeeId: ALFA, period: "2026-08", createdAt: "2026-09-03T00:00:00Z" },
  ];
  it("counts only the same employee and period", () => {
    expect(records.map((item) => revisionNumber(records, item))).toEqual([1, 2, 1]);
    expect(records.map((item) => revisionTag(records, item))).toEqual(["", " · Revision 2", ""]);
  });
});

describe("current competency display status", () => {
  const currentPosition = "position-current";
  const otherPosition = "position-other";
  const employee: EmployeeReference = { id: ALFA, employeeId: "EMP-001", fullName: "Alfa", positionId: currentPosition, departmentId: null };
  const snapshotWithSkill = (level: number | null = 5, evidence: string | null = "Recorded evidence"): Snapshot => ({
    role: "HR", actorEmployeeId: MERCURY, kpi: [], performance: [], competency: [], developmentVersions: [], trainingVersions: [],
    reference: {
      source: "fixture", departments: [], employees: [employee, { ...employee, id: MERCURY, employeeId: "EMP-002" }],
      positions: [currentPosition, otherPosition].map((id) => ({ id, code: id, title: id, departmentId: null })),
      competencies: [{ id: "competency", code: "COMP-001", name: "Accuracy", category: null }],
      positionRequirements: [currentPosition, otherPosition].map((positionId) => ({ id: `requirement-${positionId}`, positionId, competencyId: "competency", minProficiencyLevel: 4, isMandatory: true })),
      employeeSkills: level === null ? [] : [{ id: "skill", employeeId: ALFA, competencyId: "competency", proficiencyLevel: level, evidenceNotes: evidence }],
    },
  });
  const assessment = (overrides: Partial<CompetencyAssessment> = {}): CompetencyAssessment => ({
    id: "assessment", source: "local-demo", employeeId: ALFA, positionId: currentPosition, effectiveDate: "2026-10-01", context: "current-position",
    findings: [{ requirementId: `requirement-${currentPosition}`, competencyId: "competency", competencyName: "Accuracy", requiredLevel: 4, actualLevel: 2, evidenceNotes: "Earlier evidence", sourceReference: "skill", status: "Gap" }],
    overallStatus: "Gap", createdAt: "2026-10-01T08:00:00.000Z", actor: "Mercury", ...overrides,
  });

  it.each([
    { level: 5, evidence: "Recorded evidence", comparison: "Terpenuhi" },
    { level: 2, evidence: "Recorded evidence", comparison: "Gap" },
    { level: 5, evidence: null, comparison: "Bukti Belum Cukup" },
    { level: null, evidence: null, comparison: "Bukti Belum Cukup" },
  ])("shows Not Evaluated without an assessment, even when live comparison is $comparison (level $level)", ({ level, evidence, comparison }) => {
    const snapshot = snapshotWithSkill(level, evidence);
    expect(currentGap(snapshot, employee)?.overallStatus).toBe(comparison);
    expect(latestCurrentPositionAssessment(snapshot, employee)).toBeUndefined();
    expect(currentCompetencyStatus(snapshot, employee)).toBe("Not Evaluated");
  });

  it("ignores assessments for another employee or another position", () => {
    const snapshot = { ...snapshotWithSkill(), competency: [assessment({ employeeId: MERCURY }), assessment({ id: "old-position", positionId: otherPosition })] };
    expect(latestCurrentPositionAssessment(snapshot, employee)).toBeUndefined();
    expect(currentCompetencyStatus(snapshot, employee)).toBe("Not Evaluated");
  });

  it("uses a position-change snapshot when that position becomes the active master position", () => {
    const saved = assessment({ positionId: otherPosition, context: "role-change" });
    const snapshot = { ...snapshotWithSkill(), competency: [saved] };
    expect(currentCompetencyStatus(snapshot, employee)).toBe("Not Evaluated");

    const reassigned = { ...employee, positionId: otherPosition };
    const changed: Snapshot = { ...snapshot, reference: { ...snapshot.reference, employees: [reassigned] } };
    expect(latestCurrentPositionAssessment(changed, reassigned)).toBe(saved);
    expect(currentCompetencyStatus(changed, reassigned)).toBe("Terpenuhi");
  });

  it("selects the newest created assessment for the active position from unsorted records", () => {
    const middle = assessment({ id: "middle", createdAt: "2026-10-02T08:00:00.000Z" });
    const newest = assessment({ id: "newest", effectiveDate: "2026-09-01", createdAt: "2026-10-03T08:00:00.000Z" });
    const records = [middle, assessment({ id: "oldest" }), assessment({ id: "other-position", positionId: otherPosition, createdAt: "2026-10-04T08:00:00.000Z" }), newest];
    const snapshot = { ...snapshotWithSkill(), competency: records };
    expect(latestCurrentPositionAssessment(snapshot, employee)).toBe(newest);
    expect(latestCurrentPositionAssessment(snapshot, employee)?.effectiveDate).toBe("2026-09-01");
    expect(snapshot.competency.map((item) => item.id)).toEqual(["middle", "oldest", "other-position", "newest"]);
  });

  it.each([
    { level: 5, evidence: "Recorded evidence", status: "Terpenuhi" },
    { level: 2, evidence: "Recorded evidence", status: "Gap" },
    { level: 5, evidence: null, status: "Bukti Belum Cukup" },
  ])("preserves the assessed live comparison status $status", ({ level, evidence, status }) => {
    // The saved snapshot remains Gap; presentation follows current evidence once assessment exists.
    const snapshot = { ...snapshotWithSkill(level, evidence), competency: [assessment()] };
    expect(currentCompetencyStatus(snapshot, employee)).toBe(status);
    expect(snapshot.competency[0].overallStatus).toBe("Gap");
  });

  it.each([null, "unknown-position"])("shows Not Evaluated for a missing or invalid active position (%s)", (positionId) => {
    const unassigned = { ...employee, positionId };
    const base = snapshotWithSkill();
    const snapshot: Snapshot = {
      ...base, reference: { ...base.reference, employees: [unassigned] },
      competency: [assessment(), assessment({ id: "invalid-position", positionId: "unknown-position" })],
    };
    expect(currentGap(snapshot, unassigned)).toBeNull();
    expect(latestCurrentPositionAssessment(snapshot, unassigned)).toBeUndefined();
    expect(currentCompetencyStatus(snapshot, unassigned)).toBe("Not Evaluated");
  });

  it("keeps the no-requirements comparison status when an active-position assessment exists", () => {
    const base = snapshotWithSkill();
    const snapshot: Snapshot = { ...base, reference: { ...base.reference, positionRequirements: [] }, competency: [assessment()] };
    expect(currentCompetencyStatus(snapshot, employee)).toBe("Belum Ada Persyaratan");
  });
});

describe("role views (fixture)", () => {
  it("HR writes, sees everyone, and cannot pick themselves", async () => {
    const snapshot = await (await fixtureAs("HR")).loadSnapshot();
    expect(canWrite(snapshot)).toBe(true);
    expect(visibleEmployees(snapshot).length).toBe(snapshot.reference.employees.length);
    expect(assessableEmployees(snapshot).some((item) => item.id === MERCURY)).toBe(false);
  });

  it("MANAGER writes", async () => {
    expect(canWrite(await (await fixtureAs("MANAGER")).loadSnapshot())).toBe(true);
  });

  it("EMPLOYEE is read-only and receives only their own records", async () => {
    const source = await fixtureAs("EMPLOYEE");
    const snapshot = await source.loadSnapshot();
    expect(canWrite(snapshot)).toBe(false);
    expect(visibleEmployees(snapshot).map((item) => item.id)).toEqual([ALFA]);
    expect(assessableEmployees(snapshot)).toEqual([]);
    const records = [...snapshot.performance, ...(snapshot.kpiAssessments ?? []), ...snapshot.competency, ...snapshot.developmentVersions, ...snapshot.trainingVersions];
    expect(records.length).toBeGreaterThan(0);
    expect(records.every((item) => item.employeeId === ALFA)).toBe(true);
    await expect(source.createEvaluation({ employeeId: MERCURY, period: "2026-10", evaluationDate: "2026-10-01", evaluator: "x", status: "completed", reviewStatus: "Needs Review", overallScore: 4, aspects: [], generalNotes: "", evidenceReference: null })).rejects.toThrow(/Only HR/);
  });
});

describe("development status change", () => {
  it("rejects the same status and a rollback without a reason", () => {
    expect(() => assertDevelopmentChange("Planned", "Planned", "")).toThrow(/already Planned/);
    expect(() => assertDevelopmentChange("In Progress", "Planned", " ")).toThrow(/reason is required/);
    expect(() => assertDevelopmentChange("In Progress", "Planned", "Jadwal mundur")).not.toThrow();
    expect(() => assertDevelopmentChange("Planned", "In Progress", "")).not.toThrow();
    expect(() => assertDevelopmentChange("In Progress", "Completed", "", 1)).toThrow(/still Planned or In Progress/);
    expect(() => assertDevelopmentChange("In Progress", "Completed", "Training diganti coaching", 1)).not.toThrow();
    expect(() => assertDevelopmentChange("In Progress", "Completed", "", 0)).not.toThrow();
  });

  it("counts only Planned/In Progress training of the need", () => {
    const list = [{ developmentNeedId: "N1", status: "Planned" as const }, { developmentNeedId: "N1", status: "Completed" as const }, { developmentNeedId: "N2", status: "In Progress" as const }];
    expect(openTrainingCount(list, "N1")).toBe(1);
  });

  it("raises a gap-based need only after the active position assessment is saved", () => {
    const employee = { id: "E1", positionId: "P1" };
    expect(() => assertGapAssessed([], employee, "competency_gap")).toThrow(/Save the competency assessment/);
    expect(() => assertGapAssessed([{ employeeId: "E1", positionId: "P0" }], employee, "competency_gap")).toThrow();
    expect(() => assertGapAssessed([{ employeeId: "E1", positionId: "P1" }], employee, "competency_gap")).not.toThrow();
    expect(() => assertGapAssessed([], employee, "performance_context")).not.toThrow();
  });

  it("allows a future date only for training that has not been completed", () => {
    expect(() => assertTrainingDate("Completed", "2999-01-01")).toThrow(/later than today/);
    expect(() => assertTrainingDate("Planned", "2999-01-01")).not.toThrow();
    expect(() => assertTrainingDate("Completed", localToday())).not.toThrow();
  });
});

describe("future evaluation date", () => {
  it("allows today and earlier, rejects tomorrow", () => {
    const today = localToday();
    const tomorrow = new Date(`${today}T12:00:00Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    expect(() => assertNotFutureDate(today)).not.toThrow();
    expect(() => assertNotFutureDate("2020-01-01")).not.toThrow();
    expect(() => assertNotFutureDate(tomorrow.toISOString().slice(0, 10))).toThrow(/later than today/);
  });
});
