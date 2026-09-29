import { d4Repository, filterByEmployee, handle, readJson } from "@/lib/d4/api";
import type { KpiAssessmentInput } from "@/modules/d4/supabase/types";

// GET /api/d4/kpi-assessments?employee_id=… — riwayat penilaian KPI.
export async function GET(request: Request) {
  return handle(async () => filterByEmployee((await (await d4Repository()).loadSnapshot()).kpiAssessments, request));
}

// POST /api/d4/kpi-assessments — simpan penilaian KPI (skor dihitung trigger database).
export async function POST(request: Request) {
  return handle(async () => {
    const repository = await d4Repository();
    const input = await readJson<KpiAssessmentInput>(request);
    return { id: await repository.saveKpiAssessment(input) };
  }, 201);
}
