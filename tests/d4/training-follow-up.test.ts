import { afterEach, describe, expect, it, vi } from "vitest";
import { trainingFixtureVersions } from "@/modules/d4/training/fixtures";
import type { D4DataSource } from "@/modules/d4/web/data/source";

// Q16 (20 Oct 2026): every training ends Passed or Not Passed; a Not Passed one needs HR's follow-up, Retraining or
// Other follow-up with a note, recorded insert-only. People are picked by id (Prompt 5 rule 3).
const ALFA = "d4000000-0000-4000-8000-000000000009";

async function hrSource(): Promise<D4DataSource> {
  vi.stubEnv("NEXT_PUBLIC_D4_FIXTURE_ROLE", "HR");
  vi.resetModules();
  const { createFixtureSource } = await import("@/modules/d4/web/data/fixture-source");
  return createFixtureSource();
}
afterEach(() => { vi.unstubAllEnvs(); });

describe("a completed training always has Passed or Not Passed (fixture)", () => {
  it("ships no completed fixture training without one", () => {
    const completed = trainingFixtureVersions.filter((item) => item.status === "Completed");
    expect(completed.length).toBeGreaterThan(0);
    expect(completed.every((item) => item.result === "Passed" || item.result === "Not Passed")).toBe(true);
  });

  it.each([["no result", ""], ["a free-text result", "Lulus"]])("rejects a new Completed training with %s", async (_name, result) => {
    const source = await hrSource();
    await expect(source.createTraining({ employeeId: ALFA, developmentNeedId: "FIX-D4-DEV-001", activity: "X", date: "2026-10-01", status: "Completed", result, notes: "" }))
      .rejects.toThrow(/Passed atau Not Passed/);
  });
});
