import { afterEach, describe, expect, it, vi } from "vitest";
import { pendingDecision, planTrainingCompletion } from "@/modules/d4/shared/rules";
import { latestDevelopment, latestTraining } from "@/modules/d4/supabase/types";
import type { D4DataSource } from "@/modules/d4/web/data/source";
import { reassessmentFor, sourceFinding, trainingById, trainingDecision, type Snapshot } from "@/modules/d4/web/data/selectors";

// One menu (10 Nov 2026): a training is finished in Training Tracking only. Update Progress → Completed saves the
// result and HR's decision together; there is no separate Record Reassessment in Development Requirement any more.
const DIAN = "d4000000-0000-4000-8000-000000000011"; // FIX-D4-DEV-002 (gap on requirement …031, level 3 of 4), FIX-D4-TRN-002 In Progress
const TRAINING = "FIX-D4-TRN-002";
const NEED = "FIX-D4-DEV-002";

async function hrSource(): Promise<D4DataSource> {
  vi.stubEnv("NEXT_PUBLIC_D4_FIXTURE_ROLE", "HR");
  vi.resetModules();
  const { createFixtureSource } = await import("@/modules/d4/web/data/fixture-source");
  return createFixtureSource();
}
afterEach(() => { vi.unstubAllEnvs(); });

const need = (snapshot: Snapshot) => latestDevelopment(snapshot).find((item) => item.needId === NEED)!;
const training = (snapshot: Snapshot) => trainingById(snapshot, TRAINING)!;

describe("Passed: the reassessment is recorded with the result", () => {
  it("keeps Meets requirement closed while the skill data (D3) still shows the gap", async () => {
    const source = await hrSource();
    const before = await source.loadSnapshot();
    expect(sourceFinding(before, need(before))).toMatchObject({ status: "Gap", requiredLevel: 4, actualLevel: 3 });
    await expect(source.completeTraining(TRAINING, { result: "Passed", decision: "Meets requirement", notes: "" })).rejects.toThrow(/level saat ini 3, required 4/);
    // Nothing was written: the check runs before the first write.
    expect(training(await source.loadSnapshot()).status).toBe("In Progress");
  });

  it("Retraining: training Completed, requirement reopened as Planned, the next training created, one save", async () => {
    const source = await hrSource();
    const assessed = (snapshot: Snapshot) => snapshot.competency.filter((item) => item.employeeId === DIAN).length;
    const start = assessed(await source.loadSnapshot());
    const id = await source.completeTraining(TRAINING, { result: "Passed", decision: "Retraining", notes: "Level belum naik", activity: "Coretax Reporting Clinic", date: "2026-11-24" });
    const after = await source.loadSnapshot();
    expect(training(after)).toMatchObject({ status: "Completed", result: "Passed" });
    expect(need(after)).toMatchObject({ status: "Planned", reassessment: "Retraining", notes: "Level belum naik" });
    expect(latestTraining(after).find((item) => item.trainingId === id)).toMatchObject({ developmentNeedId: NEED, status: "Planned", activity: "Coretax Reporting Clinic", date: "2026-11-24" });
    expect(latestTraining(after).find((item) => item.trainingId === id)?.notes).toMatch(/^Retraining setelah "Coretax Reporting Briefing" \(2026-10-01\) Passed, tetapi gap belum tertutup\.\nLevel belum naik$/);
    // The reassessment also saved a competency snapshot of the current position.
    expect(assessed(after)).toBe(start + 1);
    expect(trainingDecision(after, training(after))).toBeNull();
    expect(reassessmentFor(after, NEED)).toBe("Retraining");
    await expect(source.completeTraining(TRAINING, { result: "Passed", decision: "Retraining", notes: "", activity: "X", date: "2026-11-25" })).rejects.toThrow(/sudah dicatat/);
  });

  it("Decide later: the result is saved and the Next step stays until the decision", async () => {
    const source = await hrSource();
    await source.updateTraining(TRAINING, "Completed", "Passed", "");
    const later = await source.loadSnapshot();
    expect(trainingDecision(later, training(later))).toBe("reassessment");
    expect(need(later).status).toBe("In Progress");
    await source.completeTraining(TRAINING, { result: "Passed", decision: "Retraining", notes: "", activity: "Coretax Reporting Clinic", date: "2026-11-24" });
    const after = await source.loadSnapshot();
    // The saved result is not written again.
    expect(after.trainingVersions.filter((item) => item.trainingId === TRAINING).map((item) => item.revision).sort()).toEqual([1, 2]);
    expect(trainingDecision(after, training(after))).toBeNull();
  });
});

describe("planTrainingCompletion", () => {
  it("Meets requirement completes an open requirement in one revision once the level is met", async () => {
    const snapshot = await (await hrSource()).loadSnapshot();
    const plan = planTrainingCompletion({ result: "Passed", decision: "Meets requirement", notes: "" }, {
      trainingId: TRAINING, history: snapshot.trainingVersions.filter((item) => item.trainingId === TRAINING), need: need(snapshot),
      needHistory: snapshot.developmentVersions.filter((item) => item.needId === NEED), latestNeeds: latestDevelopment(snapshot), latestTrainings: latestTraining(snapshot),
      finding: { competencyName: "Tax", requiredLevel: 4, actualLevel: 4, status: "Terpenuhi" }, at: "2026-11-10T03:00:00.000Z",
    });
    // The training being completed no longer counts as running, and counts as the passed one.
    expect(plan).toMatchObject({ training: "version", retraining: false, snapshot: true, development: { status: "Completed", reassessment: "Meets requirement" } });
  });

  it("finds what is still open: a follow-up, a reassessment, or nothing", () => {
    const version = (patch: object) => ({ revision: 1, status: "Completed" as const, result: "Passed", followUp: null, createdAt: "2026-11-02T00:00:00.000Z", ...patch });
    const open = { status: "In Progress" as const };
    expect(pendingDecision([version({ result: "Not Passed" })], open, [])).toBe("follow-up");
    expect(pendingDecision([version({})], open, [])).toBe("reassessment");
    // A Retraining recorded after the pass decided it.
    expect(pendingDecision([version({})], { status: "Planned" }, [{ revision: 2, status: "Planned", reassessment: "Retraining", createdAt: "2026-11-03T00:00:00.000Z" }])).toBeNull();
    expect(pendingDecision([version({})], { status: "Completed" }, [{ revision: 2, status: "Completed", reassessment: "Meets requirement", createdAt: "2026-11-03T00:00:00.000Z" }])).toBeNull();
    expect(pendingDecision([version({ status: "In Progress", result: "" })], open, [])).toBeNull();
  });
});

describe("a requirement closed without a passed training waits for nothing", () => {
  it("shows no Needs reassessment after a manual close", async () => {
    const source = await hrSource();
    await source.updateDevelopment("FIX-D4-DEV-001", "Completed", "Ditutup lewat coaching langsung oleh atasan");
    expect(reassessmentFor(await source.loadSnapshot(), "FIX-D4-DEV-001")).toBeNull();
  });
});
