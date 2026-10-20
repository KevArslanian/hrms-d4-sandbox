import { afterEach, describe, expect, it, vi } from "vitest";
import { localToday } from "@/modules/d4/shared/rules";
import { inTrainingOrPositionChange, visibleEmployees } from "@/modules/d4/web/data/selectors";
import { competencyRows } from "@/modules/d4/web/features/competency/rows";

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
