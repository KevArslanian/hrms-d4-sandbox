import { buildKpiLines, kpiTotal, selectCatalog, type RoleKpiRow } from "../../kpi/catalog";
import type { EvaluationInput } from "../../performance/types";
import { databaseError } from "../../shared/errors";
import { assertNotFutureDate, assertNotSelf, assertPeriodRevision } from "../../shared/rules";
import { ApiError, employeeFilter, enforce, field, optionalUuid, readJson } from "../_lib/http";
import { d4Session, requireWriter } from "../_lib/session";

/** GET /api/d4/performance-evaluations?employee_id= — Penilaian Kinerja history, newest first. */
export async function listEvaluations(request: Request) {
  const { repository } = await d4Session();
  const employeeId = employeeFilter(request);
  return (await repository.loadSnapshot()).performance.filter((item) => !employeeId || item.employeeId === employeeId);
}

/** GET /api/d4/performance-evaluations/:id */
export async function getEvaluation(id: string) {
  const { repository } = await d4Session();
  const evaluation = (await repository.loadSnapshot()).performance.find((item) => item.id === id);
  if (!evaluation) throw new ApiError("NOT_FOUND", "Penilaian kinerja tidak ditemukan.");
  return evaluation;
}

/**
 * POST /api/d4/performance-evaluations — one Penilaian Kinerja (FR-D4-001 v3.0): five Core KPI and the
 * evaluation notes, saved in one request. Weights come from the catalog role of the employee's position, never
 * from the client (Core KPI names are editable); Total KPI is calculated here. The evaluator is the signed-in user, never
 * self; a second record for the same period must name the current one in `revisionOf` (FR-01.14).
 */
export async function createEvaluation(request: Request) {
  const { client, repository, access } = await requireWriter();
  const body = await readJson(request);
  const [snapshot, catalogResult] = await Promise.all([
    repository.loadSnapshot(),
    client.from("d4_kpi_role_catalog").select("role_order,role_name,indicator_order,kpi_name,target,weight_percent,source_version"),
  ]);
  if (catalogResult.error) throw databaseError(catalogResult.error, "Katalog KPI");
  const evaluator = snapshot.reference.employees.find((item) => item.id === access.employeeId)?.fullName;
  if (!evaluator) throw new ApiError("FORBIDDEN", "Akun ini belum terhubung ke data pegawai.");
  const status = field.oneOf(body, "status", ["completed"] as const); // FR-D4-001 defines no draft.
  const employeeId = field.uuid(body, "employeeId");
  const employee = snapshot.reference.employees.find((item) => item.id === employeeId);
  if (!employee) throw new ApiError("NOT_FOUND", "Pegawai tidak ditemukan.");
  enforce(() => assertNotSelf(access.employeeId, employeeId));
  const positionTitle = snapshot.reference.positions.find((item) => item.id === employee.positionId)?.title;
  const lines = (() => { try { return buildKpiLines(selectCatalog((catalogResult.data ?? []) as RoleKpiRow[]), positionTitle, body.lines); }
    catch (cause) { throw new ApiError("VALIDATION_FAILED", (cause as Error).message); } })();
  const input: EvaluationInput = {
    employeeId,
    period: field.period(body, "period"),
    evaluationDate: field.date(body, "evaluationDate"),
    evaluator,
    status,
    lines,
    overallScore: kpiTotal(lines),
    generalNotes: field.text(body, "generalNotes", { max: 4000 }),
    evidenceReference: field.text(body, "evidenceReference", { required: false, max: 500 }) || null,
  };
  enforce(() => assertNotFutureDate(input.evaluationDate));
  enforce(() => assertPeriodRevision(snapshot.performance, input.employeeId, input.period, optionalUuid(body, "revisionOf"), "Penilaian kinerja"));
  return { id: await repository.savePerformance(input, snapshot.reference) };
}
