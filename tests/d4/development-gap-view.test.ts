import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SOURCE_TYPE, employeeById, positionOf, sourceTypeLabel, visibleEmployees } from "@/modules/d4/web/data/selectors";
import { picOptions } from "@/modules/d4/web/features/development/rows";

// Employees are picked by id, never by name: the fixture names follow the organisation master.
const HR_ACTOR = "d4000000-0000-4000-8000-000000000012";

async function fixtureSnapshot() {
  vi.stubEnv("NEXT_PUBLIC_D4_FIXTURE_ROLE", "HR");
  vi.resetModules();
  const { createFixtureSource } = await import("@/modules/d4/web/data/fixture-source");
  return createFixtureSource().loadSnapshot();
}
afterEach(() => { vi.unstubAllEnvs(); });

describe("Development Requirement source (Q9)", () => {
  it("starts from a competency gap and keeps Position Change and Performance Review as other sources", () => {
    expect(DEFAULT_SOURCE_TYPE).toBe("competency_gap");
    expect(Object.keys(sourceTypeLabel)).toEqual(["competency_gap", "role_change", "performance_context"]);
  });
});

describe("PIC picked from the employee list (Q13)", () => {
  it("offers every employee once, by name, labelled with the position", async () => {
    const snapshot = await fixtureSnapshot();
    const options = picOptions(snapshot);
    const names = [...new Set(visibleEmployees(snapshot).map((item) => item.fullName))];
    expect(options.map((item) => item.value).sort()).toEqual(names.sort());
    const hr = employeeById(snapshot, HR_ACTOR)!;
    expect(options.find((item) => item.value === hr.fullName)?.label).toBe(`${hr.fullName} · ${positionOf(snapshot, hr)!.title}`);
  });

  it("keeps an older free-text PIC selectable so editing never blanks it, without duplicating an employee name", async () => {
    const snapshot = await fixtureSnapshot();
    const plain = picOptions(snapshot);
    const legacy = picOptions(snapshot, " Bu Rina (Finance) ");
    expect(legacy[0]).toEqual({ value: "Bu Rina (Finance)", label: "Bu Rina (Finance) (not in employee list)" });
    expect(legacy.slice(1)).toEqual(plain);
    expect(picOptions(snapshot, employeeById(snapshot, HR_ACTOR)!.fullName)).toEqual(plain);
    expect(picOptions(snapshot, "  ")).toEqual(plain);
  });
});
