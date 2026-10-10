import { beforeEach, describe, expect, it } from "vitest";
import { createFixtureSource } from "@/modules/d4/web/data/fixture-source";
import type { D4DataSource, EvaluationDraft } from "@/modules/d4/web/data/source";
import { latestDevelopment, latestTraining } from "@/modules/d4/supabase/types";

// Fixture people (fictional): Mercury is the HR actor, Alfa/Echo/Holly are Finance Staff.
const MERCURY = "d4000000-0000-4000-8000-000000000012";
const ALFA = "d4000000-0000-4000-8000-000000000009";
const HOLLY = "d4000000-0000-4000-8000-000000000016";
const ALFA_GAP = "d4000000-0000-4000-8000-000000000028"; // Administrative Accuracy, level 2 of min. 4

// Only the editable part of each KPI line; names and weights come from the catalog.
const scored = (scores: (number | null)[]) => scores.map((raw_score) => ({ indicator_order: 0, kpi_name: "", weight_percent: 0, target: "", actual: "", raw_score, comment: "" }));
const evaluation = (patch: Partial<EvaluationDraft> = {}): EvaluationDraft => ({
  employeeId: HOLLY, period: "2026-09", evaluationDate: "2026-09-30", status: "completed",
  lines: scored([4, 4, 4, 4, 4]), generalNotes: "Catatan uji.", evidenceReference: null, ...patch,
});

let source: D4DataSource;
beforeEach(() => { source = createFixtureSource(); });

describe("penilaian kinerja (fixture)", () => {
  it("saves a first evaluation and stores the signed-in actor as evaluator", async () => {
    const id = await source.createEvaluation(evaluation({ lines: scored([4, 5, 4, 3, 4]).map((line) => ({ ...line, kpi_name: "Nama Palsu", weight_percent: 90 })) }));
    const saved = (await source.loadSnapshot()).performance.find((item) => item.id === id)!;
    expect(saved.evaluator).toBe("Mercury");
    // Names and weights come from the Finance catalog role, not from the form; Total KPI = Σ weight × score.
    expect(saved.lines.map((line) => line.weight_percent)).toEqual([25, 25, 20, 15, 15]);
    expect(saved.lines[0].kpi_name).not.toBe("Nama Palsu");
    expect(saved.overallScore).toBe(4.1);
  });

  it("rejects a second record for the same period unless it names the current one", async () => {
    const first = await source.createEvaluation(evaluation());
    await expect(source.createEvaluation(evaluation())).rejects.toThrow(/sudah ada/);
    await expect(source.createEvaluation(evaluation({ revisionOf: "FIX-OTHER" }))).rejects.toThrow(/sudah ada/);
    const second = await source.createEvaluation(evaluation({ revisionOf: first, lines: scored([3, 3, 3, 3, 3]) }));
    await expect(source.createEvaluation(evaluation({ revisionOf: first }))).rejects.toThrow(/sudah ada/); // stale revision
    await source.createEvaluation(evaluation({ revisionOf: second }));
    expect((await source.loadSnapshot()).performance.filter((item) => item.employeeId === HOLLY)).toHaveLength(3);
  });

  it("rejects revisionOf when nothing exists for the period", async () => {
    await expect(source.createEvaluation(evaluation({ period: "2026-11", revisionOf: "FIX-D4-PERF-001" }))).rejects.toThrow(/tidak cocok/);
  });

  it("rejects self-evaluation", async () => {
    await expect(source.createEvaluation(evaluation({ employeeId: MERCURY, period: "2026-12" }))).rejects.toThrow(/diri sendiri/);
  });

  it.each([
    ["empty notes", { generalNotes: "  " }],
    ["bad period", { period: "2026-13" }],
    ["missing date", { evaluationDate: "" }],
  ])("rejects invalid input: %s", async (_name, patch) => {
    await expect(source.createEvaluation(evaluation(patch as Partial<EvaluationDraft>))).rejects.toThrow();
  });

  it("rejects an assessment with an unscored or non-integer KPI", async () => {
    await expect(source.createEvaluation(evaluation({ period: "2026-12", lines: scored([4, 4, null, 4, 4]) }))).rejects.toThrow(/wajib bilangan bulat 1–5/);
    await expect(source.createEvaluation(evaluation({ period: "2026-12", lines: scored([4, 4, 3.5, 4, 4]) }))).rejects.toThrow(/wajib bilangan bulat 1–5/);
    await expect(source.createEvaluation(evaluation({ period: "2026-12", lines: scored([4, 4, 4, 4]) }))).rejects.toThrow(/lima Core KPI/);
  });

  it("rejects an employee whose position has no KPI in the catalog", async () => {
    const charlie = "d4000000-0000-4000-8000-000000000011"; // Operations Staff
    await expect(source.createEvaluation(evaluation({ employeeId: charlie, period: "2026-12" }))).rejects.toThrow(/belum memiliki KPI/);
  });
});

describe("development and training (fixture)", () => {
  it("allows one open requirement per competency gap and a new one after completion", async () => {
    const draft = { employeeId: ALFA, sourceType: "competency_gap" as const, sourceRef: ALFA_GAP, objective: "Uji", priority: "High" as const, notes: "" };
    await expect(source.createDevelopment(draft)).rejects.toThrow(/belum selesai/);
    await source.updateDevelopment("FIX-D4-DEV-001", "Completed", "Selesai");
    const needId = await source.createDevelopment(draft);
    expect(latestDevelopment(await source.loadSnapshot()).find((item) => item.needId === needId)?.status).toBe("Identified");
  });

  it("rejects new training for a completed requirement", async () => {
    // DEV-001 still has a Planned training, so completing it needs a reason.
    await expect(source.updateDevelopment("FIX-D4-DEV-001", "Completed", "")).rejects.toThrow(/masih Planned atau In Progress/);
    await source.updateDevelopment("FIX-D4-DEV-001", "Completed", "Workshop dibatalkan, diganti coaching");
    await expect(source.createTraining({ employeeId: ALFA, developmentNeedId: "FIX-D4-DEV-001", activity: "X", date: "2026-10-01", status: "Planned", result: "", notes: "" }))
      .rejects.toThrow(/Completed/);
  });

  it("rejects training that points to another employee's requirement", async () => {
    await expect(source.createTraining({ employeeId: HOLLY, developmentNeedId: "FIX-D4-DEV-001", activity: "X", date: "2026-10-01", status: "Planned", result: "", notes: "" }))
      .rejects.toThrow(/pegawai yang sama/);
  });

  it("requires a result on completion and a reason on rollback", async () => {
    await expect(source.updateTraining("FIX-D4-TRN-001", "Completed", "", "")).rejects.toThrow(/Result wajib diisi/);
    await source.updateTraining("FIX-D4-TRN-001", "Completed", "Lulus", "");
    await expect(source.updateTraining("FIX-D4-TRN-001", "In Progress", "Lulus", "")).rejects.toThrow(/Alasan wajib diisi/);
    await source.updateTraining("FIX-D4-TRN-001", "In Progress", "Lulus", "Perlu sesi ulang");
    const versions = (await source.loadSnapshot()).trainingVersions.filter((item) => item.trainingId === "FIX-D4-TRN-001");
    expect(versions.map((item) => item.revision).sort()).toEqual([1, 2, 3]);
    expect(latestTraining(await source.loadSnapshot()).find((item) => item.trainingId === "FIX-D4-TRN-001")?.notes).toBe("Perlu sesi ulang");
  });

  it("keeps history append-only across status changes", async () => {
    await source.updateDevelopment("FIX-D4-DEV-001", "In Progress", "a");
    await source.updateDevelopment("FIX-D4-DEV-001", "Completed", "b");
    const versions = (await source.loadSnapshot()).developmentVersions.filter((item) => item.needId === "FIX-D4-DEV-001");
    expect(versions.map((item) => item.status)).toEqual(expect.arrayContaining(["Planned", "In Progress", "Completed"]));
  });

  it("rejects an unknown training or requirement", async () => {
    await expect(source.updateTraining("NOPE", "Planned", "", "")).rejects.toThrow(/tidak ditemukan/);
    await expect(source.updateDevelopment("NOPE", "Planned", "")).rejects.toThrow(/tidak ditemukan/);
  });
});
