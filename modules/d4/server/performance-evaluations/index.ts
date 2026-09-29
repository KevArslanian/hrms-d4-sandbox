import type { EvaluationAspect, EvaluationInput, ReviewStatus } from "../../performance/types";
import { ApiError, employeeFilter, field, readJson } from "../_lib/http";
import { d4Session, requireWriter } from "../_lib/session";

const reviewStatuses: readonly ReviewStatus[] = ["Needs Review", "On Track", "Needs Attention"];

/** GET /api/d4/performance-evaluations?employee_id= — evaluation history, newest first. */
export async function listEvaluations(request: Request) {
  const { repository } = await d4Session();
  const employeeId = employeeFilter(request);
  return (await repository.loadSnapshot()).performance.filter((item) => !employeeId || item.employeeId === employeeId);
}

/** GET /api/d4/performance-evaluations/:id */
export async function getEvaluation(id: string) {
  const { repository } = await d4Session();
  const evaluation = (await repository.loadSnapshot()).performance.find((item) => item.id === id);
  if (!evaluation) throw new ApiError("NOT_FOUND", "Evaluasi tidak ditemukan.");
  return evaluation;
}

function parseAspects(value: unknown, completed: boolean): EvaluationAspect[] {
  if (!Array.isArray(value)) throw new ApiError("VALIDATION_FAILED", "Field aspects harus berupa daftar.");
  return value.map((raw, index) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    const name = field.text(item, "name", { max: 120 });
    const weight = typeof item.weight === "number" && item.weight >= 0 && item.weight <= 100 ? item.weight : NaN;
    if (Number.isNaN(weight)) throw new ApiError("VALIDATION_FAILED", `Bobot aspek ${index + 1} harus 0 sampai 100.`);
    const score = field.score(item.score, `Skor aspek ${name}`, { required: completed });
    if (score !== null && !Number.isInteger(score)) throw new ApiError("VALIDATION_FAILED", `Skor aspek ${name} harus bilangan bulat.`);
    return { name, weight, score, notes: field.text(item, "notes", { required: false, max: 1000 }) };
  });
}

/** POST /api/d4/performance-evaluations — saves a new evaluation; earlier periods are never overwritten. */
export async function createEvaluation(request: Request) {
  const { repository } = await requireWriter();
  const body = await readJson(request);
  const status = field.oneOf(body, "status", ["draft", "completed"] as const);
  const completed = status === "completed";
  const input: EvaluationInput = {
    employeeId: field.uuid(body, "employeeId"),
    period: field.period(body, "period"),
    evaluationDate: field.date(body, "evaluationDate", { required: completed }),
    evaluator: field.text(body, "evaluator", { required: completed, max: 120 }),
    status,
    reviewStatus: field.oneOf(body, "reviewStatus", reviewStatuses),
    overallScore: field.score(body.overallScore, "Skor keseluruhan", { required: completed }),
    aspects: parseAspects(body.aspects, completed),
    generalNotes: field.text(body, "generalNotes", { required: false, max: 4000 }),
    evidenceReference: field.text(body, "evidenceReference", { required: false, max: 500 }) || null,
  };
  return { id: await repository.savePerformance(input, await repository.loadReferenceData()) };
}
