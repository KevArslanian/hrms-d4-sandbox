import { indicatorsFor, selectCatalog, type RoleKpiRow } from "../../kpi/catalog";
import type { KpiAssessmentLine } from "../../supabase/types";
import { ApiError, employeeFilter, field, readJson } from "../_lib/http";
import { d4Session, requireWriter } from "../_lib/session";

/** GET /api/d4/kpi-assessments?employee_id= — KPI scorecards, newest first. */
export async function listAssessments(request: Request) {
  const { repository } = await d4Session();
  const employeeId = employeeFilter(request);
  return ((await repository.loadSnapshot()).kpiAssessments ?? []).filter((item) => !employeeId || item.employeeId === employeeId);
}

/** GET /api/d4/kpi-assessments/:id */
export async function getAssessment(id: string) {
  const { repository } = await d4Session();
  const assessment = (await repository.loadSnapshot()).kpiAssessments?.find((item) => item.id === id);
  if (!assessment) throw new ApiError("NOT_FOUND", "Scorecard KPI tidak ditemukan.");
  return assessment;
}

/**
 * POST /api/d4/kpi-assessments — the five lines must match the catalog role exactly
 * (name, order, weight = 100 %). Weighted and total scores are calculated by the
 * database trigger; realisation is never converted into a raw score automatically.
 */
export async function createAssessment(request: Request) {
  const { client, repository } = await requireWriter();
  const body = await readJson(request);
  const status = field.oneOf(body, "status", ["draft", "completed"] as const);
  const roleOrder = typeof body.roleOrder === "number" ? body.roleOrder : NaN;
  const { data, error } = await client.from("d4_kpi_role_catalog")
    .select("role_order,role_name,indicator_order,kpi_name,target,weight_percent,source_version");
  if (error) throw new Error(`Katalog KPI: ${error.message}`);
  const catalog = selectCatalog((data ?? []) as RoleKpiRow[]);
  const indicators = indicatorsFor(catalog, roleOrder);
  if (indicators.length !== 5 || indicators.reduce((sum, row) => sum + row.weight_percent, 0) !== 100) throw new ApiError("VALIDATION_FAILED", "Jabatan KPI tidak ditemukan pada katalog atau bobotnya bukan 100%.");
  if (!Array.isArray(body.lines) || body.lines.length !== 5) throw new ApiError("VALIDATION_FAILED", "Scorecard harus memiliki lima indikator KPI.");
  const lines: KpiAssessmentLine[] = indicators.map((indicator, index) => {
    const raw = (body.lines as unknown[])[index] as Record<string, unknown> | null;
    if (!raw || raw.kpi_name !== indicator.kpi_name) throw new ApiError("VALIDATION_FAILED", `Indikator ${index + 1} harus ${indicator.kpi_name}.`);
    const score = field.score(raw.raw_score, `Skor ${indicator.kpi_name}`, { required: status === "completed" });
    if (score !== null && !Number.isInteger(score)) throw new ApiError("VALIDATION_FAILED", `Skor ${indicator.kpi_name} harus bilangan bulat 1 sampai 5.`);
    return {
      indicator_order: indicator.indicator_order, kpi_name: indicator.kpi_name, weight_percent: indicator.weight_percent,
      target: field.text(raw, "target", { required: false, max: 200 }), actual: field.text(raw, "actual", { required: false, max: 200 }),
      raw_score: score, comment: field.text(raw, "comment", { required: false, max: 500 }),
    };
  });
  const id = await repository.saveKpiAssessment({
    definitionVersion: catalog.version,
    employeeId: field.uuid(body, "employeeId"), roleOrder, roleName: indicators[0].role_name,
    period: field.period(body, "period"), evaluationDate: field.date(body, "evaluationDate", { required: status === "completed" }),
    evaluatorName: field.text(body, "evaluatorName", { required: status === "completed", max: 120 }),
    status, lines, generalNotes: field.text(body, "generalNotes", { required: false, max: 4000 }),
  });
  return { id, definitionVersion: catalog.version };
}
