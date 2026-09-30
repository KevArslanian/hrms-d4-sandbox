import { beforeEach, describe, expect, it, vi } from "vitest";
import { KPI_V51_CATALOG } from "@/modules/d4/kpi/catalog";
import { ApiError } from "@/modules/d4/server/_lib/http";
import { createFixtureSource } from "@/modules/d4/web/data/fixture-source";
import type { D4LiveSnapshot } from "@/modules/d4/supabase/types";

// Route handlers run against an in-memory repository; nothing reaches Supabase.
const MERCURY = "d4000000-0000-4000-8000-000000000012";
const ALFA = "d4000000-0000-4000-8000-000000000009";
const HOLLY = "d4000000-0000-4000-8000-000000000016";
const ALFA_GAP = "d4000000-0000-4000-8000-000000000028";
const uuid = (n: number) => `e4000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const NEED = uuid(1), TRAINING = uuid(2), PERF_ALFA = uuid(3), KPI_ALFA = uuid(4);

type Access = { role: "HR" | "MANAGER" | "EMPLOYEE"; employeeId: string } | "unauthenticated";
let access: Access;
let snapshot: D4LiveSnapshot;
const writes: { method: string; args: unknown[] }[] = [];

function record(method: string, result: unknown = uuid(99)) {
  return async (...args: unknown[]) => { writes.push({ method, args }); return result; };
}
const repository = {
  loadSnapshot: async () => snapshot,
  loadReferenceData: async () => snapshot.reference,
  savePerformance: record("savePerformance"),
  saveKpiAssessment: record("saveKpiAssessment"),
  saveCompetency: record("saveCompetency"),
  createDevelopment: record("createDevelopment"),
  updateDevelopment: record("updateDevelopment", undefined),
  createTraining: record("createTraining"),
  updateTraining: record("updateTraining", undefined),
};
const client = { from: () => ({ select: async () => ({ data: KPI_V51_CATALOG, error: null }) }) };

vi.mock("@/modules/d4/server/_lib/session", () => {
  const session = async () => {
    if (access === "unauthenticated") throw new ApiError("UNAUTHENTICATED", "Sesi login tidak tersedia. Silakan masuk kembali.");
    return { client, user: { id: "user" }, repository };
  };
  return {
    d4Session: session,
    d4Access: async () => access,
    requireWriter: async () => {
      const base = await session();
      if (access === "unauthenticated" || access.role === "EMPLOYEE") throw new ApiError("FORBIDDEN", "Hanya HR atau manager yang dapat mengubah data ini.");
      return { ...base, access };
    },
  };
});

const perf = await import("@/app/api/d4/performance-evaluations/route");
const kpi = await import("@/app/api/d4/kpi-assessments/route");
const dev = await import("@/app/api/d4/development-needs/route");
const devVersions = await import("@/app/api/d4/development-needs/[id]/versions/route");
const training = await import("@/app/api/d4/training-records/route");
const trainingVersions = await import("@/app/api/d4/training-records/[id]/versions/route");
const snapshotRoute = await import("@/app/api/d4/snapshot/route");

const post = (body: unknown) => new Request("http://test/api", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
async function call(response: Promise<Response>) {
  const res = await response;
  return { status: res.status, body: await res.json() as { data?: unknown; error?: { code: string; message: string } } };
}

beforeEach(async () => {
  access = { role: "HR", employeeId: MERCURY };
  writes.length = 0;
  const base = await createFixtureSource().loadSnapshot();
  // Live ids are UUIDs; remap the fixture records the tests touch.
  snapshot = {
    ...base,
    performance: base.performance.map((item) => item.id === "FIX-D4-PERF-001" ? { ...item, id: PERF_ALFA } : item),
    kpiAssessments: base.kpiAssessments!.map((item) => item.id === "FIX-D4-KPI-001" ? { ...item, id: KPI_ALFA } : item),
    developmentVersions: base.developmentVersions.map((item) => item.needId === "FIX-D4-DEV-001" ? { ...item, needId: NEED } : item),
    trainingVersions: base.trainingVersions.map((item) => item.trainingId === "FIX-D4-TRN-001" ? { ...item, trainingId: TRAINING, developmentNeedId: NEED } : item),
  };
});

const evaluationBody = (patch: Record<string, unknown> = {}) => ({
  employeeId: HOLLY, period: "2026-09", evaluationDate: "2026-09-30", status: "completed", overallScore: 4, generalNotes: "Uji", ...patch,
});
const kpiBody = (patch: Record<string, unknown> = {}) => {
  const current = snapshot.kpiAssessments!.find((item) => item.id === KPI_ALFA)!;
  return { employeeId: ALFA, roleOrder: current.roleOrder, period: "2026-10", evaluationDate: "2026-10-28", status: "completed",
    lines: current.lines.map((line) => ({ ...line, raw_score: 4 })), ...patch };
};

describe("auth and envelope", () => {
  it("returns 401 without a session", async () => {
    access = "unauthenticated";
    const res = await call(snapshotRoute.GET());
    expect(res).toMatchObject({ status: 401, body: { error: { code: "UNAUTHENTICATED" } } });
  });

  it("returns 403 when an employee writes", async () => {
    access = { role: "EMPLOYEE", employeeId: ALFA };
    const res = await call(perf.POST(post(evaluationBody())));
    expect(res).toMatchObject({ status: 403, body: { error: { code: "FORBIDDEN" } } });
    expect(writes).toHaveLength(0);
  });

  it.each([["malformed JSON", "{"], ["array body", "[]"], ["null body", "null"]])("returns 400 for %s", async (_name, body) => {
    const res = await call(perf.POST(post(body)));
    expect(res).toMatchObject({ status: 400, body: { error: { code: "BAD_REQUEST" } } });
  });
});

describe("POST /performance-evaluations", () => {
  it("creates with the account's name as evaluator, ignoring the body", async () => {
    const res = await call(perf.POST(post(evaluationBody({ evaluator: "Nama Palsu" }))));
    expect(res.status).toBe(201);
    expect((writes[0].args[0] as { evaluator: string }).evaluator).toBe("Mercury");
  });

  it.each([
    ["self-evaluation", { employeeId: MERCURY }, /diri sendiri/],
    ["duplicate period without revisionOf", { employeeId: ALFA }, /sudah ada/],
    ["revisionOf not a UUID", { employeeId: ALFA, revisionOf: "abc" }, /UUID/],
    ["score as string", { overallScore: "4" }, /./],
    ["score 0", { overallScore: 0 }, /./],
    ["period 2026-13", { period: "2026-13" }, /YYYY-MM/],
    ["status draft", { status: "draft" }, /status/],
    ["employeeId not UUID", { employeeId: "x" }, /UUID/],
    ["notes over 4000 chars", { generalNotes: "a".repeat(4001) }, /4000/],
  ])("rejects %s with 422", async (_name, patch, message) => {
    const res = await call(perf.POST(post(evaluationBody(patch))));
    expect(res.status).toBe(422);
    expect(res.body.error?.code).toBe("VALIDATION_FAILED");
    expect(res.body.error?.message).toMatch(message);
    expect(writes).toHaveLength(0);
  });

  it("accepts a revision of the current record", async () => {
    const res = await call(perf.POST(post(evaluationBody({ employeeId: ALFA, revisionOf: PERF_ALFA }))));
    expect(res.status).toBe(201);
  });
});

describe("POST /kpi-assessments", () => {
  it("creates a scorecard for a new period", async () => {
    const res = await call(kpi.POST(post(kpiBody())));
    expect(res.status).toBe(201);
    expect((writes[0].args[0] as { evaluatorName: string }).evaluatorName).toBe("Mercury");
  });

  it.each([
    ["duplicate period", { period: "2026-09" }, /sudah ada/],
    ["wrong KPI role", { roleOrder: 99 }, /./],
    ["four lines", { lines: [] }, /./],
    ["fractional score", { fractional: true }, /bilangan bulat/],
    ["unknown employee", { employeeId: uuid(500) }, /tidak ditemukan/],
  ])("rejects %s", async (_name, patch: Record<string, unknown>, message) => {
    const { fractional, ...rest } = patch;
    const body = kpiBody(rest);
    if (fractional) body.lines = body.lines.map((line) => ({ ...line, raw_score: 3.5 }));
    const res = await call(kpi.POST(post(body)));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(res.body.error?.message).toMatch(message);
    expect(writes).toHaveLength(0);
  });

  it("accepts a revision of the current scorecard", async () => {
    const res = await call(kpi.POST(post(kpiBody({ period: "2026-09", revisionOf: KPI_ALFA }))));
    expect(res.status).toBe(201);
  });

  it("rejects a self scorecard", async () => {
    access = { role: "MANAGER", employeeId: ALFA };
    const res = await call(kpi.POST(post(kpiBody())));
    expect(res).toMatchObject({ status: 422, body: { error: { code: "VALIDATION_FAILED" } } });
  });
});

describe("development needs and training", () => {
  const devBody = { employeeId: ALFA, sourceType: "competency_gap", sourceRef: ALFA_GAP, objective: "Uji", priority: "High" };
  const trainingBody = { employeeId: ALFA, developmentNeedId: NEED, activity: "Uji", date: "2026-10-01", status: "Planned" };

  it("rejects a second open need for the same gap", async () => {
    const res = await call(dev.POST(post(devBody)));
    expect(res).toMatchObject({ status: 422, body: { error: { code: "VALIDATION_FAILED" } } });
  });

  it("rejects training for a completed need", async () => {
    snapshot = { ...snapshot, developmentVersions: [...snapshot.developmentVersions, { ...snapshot.developmentVersions.find((item) => item.needId === NEED)!, id: uuid(10), revision: 2, status: "Completed" }] };
    const res = await call(training.POST(post(trainingBody)));
    expect(res).toMatchObject({ status: 422 });
  });

  it("creates training for an open need", async () => {
    const res = await call(training.POST(post(trainingBody)));
    expect(res.status).toBe(201);
  });

  it("requires a reason when training moves back", async () => {
    snapshot = { ...snapshot, trainingVersions: [...snapshot.trainingVersions, { ...snapshot.trainingVersions.find((item) => item.trainingId === TRAINING)!, id: uuid(11), revision: 2, status: "Completed", result: "Lulus" }] };
    const bad = await call(trainingVersions.POST(post({ status: "Planned" }), params(TRAINING)));
    expect(bad).toMatchObject({ status: 422 });
    const ok = await call(trainingVersions.POST(post({ status: "Planned", notes: "Jadwal ulang" }), params(TRAINING)));
    expect(ok.status).toBe(201);
  });

  it("returns 404 for a status update of an unknown training", async () => {
    const res = await call(trainingVersions.POST(post({ status: "Planned" }), params(uuid(404))));
    expect(res).toMatchObject({ status: 404, body: { error: { code: "NOT_FOUND" } } });
  });

  it("returns 404 for a status update of an unknown development need", async () => {
    const res = await call(devVersions.POST(post({ status: "Planned" }), params(uuid(404))));
    expect(res).toMatchObject({ status: 404, body: { error: { code: "NOT_FOUND" } } });
    expect(writes).toHaveLength(0);
  });
});

describe("unknown or malformed ids", () => {
  it.each([["unknown uuid", uuid(404)], ["non-uuid", "not-a-uuid"]])("returns 404 on version endpoints for %s", async (_name, id) => {
    const devRes = await call(devVersions.POST(post({ status: "Planned" }), params(id)));
    const trnRes = await call(trainingVersions.POST(post({ status: "Planned" }), params(id)));
    expect(devRes.status).toBe(404);
    expect(trnRes.status).toBe(404);
    expect(writes).toHaveLength(0);
  });

  it("returns 201 for a status update of an existing development need", async () => {
    const res = await call(devVersions.POST(post({ status: "Planned", notes: "Dijadwalkan" }), params(NEED)));
    expect(res.status).toBe(201);
    expect(writes[0]).toMatchObject({ method: "updateDevelopment", args: [NEED, "Planned", "Dijadwalkan"] });
  });
});
