import { afterEach, describe, expect, it, vi } from "vitest";
import { assertDevelopmentChange, assertNotFutureDate, isTrainingRollback, localMonth, localToday, revisionNumber } from "@/modules/d4/shared/rules";
import { assessableEmployees, canWrite, revisionTag, visibleEmployees } from "@/modules/d4/web/data/selectors";
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
