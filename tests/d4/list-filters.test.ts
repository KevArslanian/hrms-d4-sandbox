import { afterEach, describe, expect, it, vi } from "vitest";
import type { DevelopmentNeedVersion, DevelopmentStatus } from "@/modules/d4/development/types";
import { localToday } from "@/modules/d4/shared/rules";
import { inTrainingOrPositionChange, visibleEmployees } from "@/modules/d4/web/data/selectors";
import { competencyRows } from "@/modules/d4/web/features/competency/rows";
import { openNeedCount } from "@/modules/d4/web/features/dashboard/summary";

// Employees are picked by id or by rule, never by name: the fixture names are being replaced with real ones.
async function fixtureAs(role: "HR" | "EMPLOYEE") {
  vi.stubEnv("NEXT_PUBLIC_D4_FIXTURE_ROLE", role);
  vi.resetModules();
  const { createFixtureSource } = await import("@/modules/d4/web/data/fixture-source");
  return createFixtureSource();
}
afterEach(() => { vi.unstubAllEnvs(); });

const NO_FILTER = { search: "", position: "", department: "", status: "" };

describe("Competency Gap list scope (UAT-11)", () => {
  it("lists only employees in scope for HR, with no way to list everyone", async () => {
    const snapshot = await (await fixtureAs("HR")).loadSnapshot();
    const listed = competencyRows(snapshot, NO_FILTER).map((row) => row.employee.id);
    expect(listed.length).toBeGreaterThan(0);
    expect(listed.every((id) => inTrainingOrPositionChange(snapshot, id))).toBe(true);
    expect(listed.length).toBeLessThan(visibleEmployees(snapshot).length);
  });

  it("Assess Position Change works for an employee outside the list and brings them into it", async () => {
    const source = await fixtureAs("HR");
    const before = await source.loadSnapshot();
    const outside = visibleEmployees(before).find((item) => item.positionId && !inTrainingOrPositionChange(before, item.id))!;
    expect(outside).toBeDefined();
    expect(competencyRows(before, NO_FILTER).map((row) => row.employee.id)).not.toContain(outside.id);
    const newPosition = before.reference.positions.find((item) => item.id !== outside.positionId && before.reference.positionRequirements.some((requirement) => requirement.positionId === item.id))!;
    await source.saveCompetency({ employeeId: outside.id, positionId: newPosition.id, effectiveDate: localToday() });
    const after = await source.loadSnapshot();
    expect(after.competency.find((item) => item.employeeId === outside.id)?.context).toBe("role-change");
    expect(competencyRows(after, NO_FILTER).map((row) => row.employee.id)).toContain(outside.id);
  });

  it("an employee always sees their own row, in scope or not", async () => {
    const snapshot = await (await fixtureAs("EMPLOYEE")).loadSnapshot();
    expect(competencyRows(snapshot, NO_FILTER).map((row) => row.employee.id)).toEqual([snapshot.actorEmployeeId]);
  });
});

describe("Need training tile (UAT-19)", () => {
  it("counts requirements whose latest revision is not Completed, including one reopened by Retraining", async () => {
    const base = await (await fixtureAs("HR")).loadSnapshot();
    const id = base.reference.employees[0].id;
    const version = (needId: string, revision: number, status: DevelopmentStatus) => ({ id: `${needId}-${revision}`, needId, revision, source: "fixture", employeeId: id,
      sourceType: "competency_gap", sourceRef: needId, objective: "x", priority: "Medium", status, notes: "", createdAt: `2026-10-0${revision}T00:00:00Z`, actor: "HR" }) as DevelopmentNeedVersion;
    const finished = [version("done", 1, "Identified"), version("done", 2, "Completed")];
    const snapshot = { ...base, developmentVersions: [...finished, version("again", 1, "Completed"), version("again", 2, "Planned"), version("open", 1, "In Progress")] };
    expect(openNeedCount(snapshot, id)).toBe(2);
    expect(openNeedCount({ ...base, developmentVersions: finished }, id)).toBe(0);
  });
});
