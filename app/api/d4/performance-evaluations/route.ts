import { d4Repository, filterByEmployee, handle, readJson } from "@/lib/d4/api";
import type { EvaluationInput } from "@/modules/d4/performance/types";

// GET /api/d4/performance-evaluations?employee_id=… — riwayat evaluasi kinerja.
export async function GET(request: Request) {
  return handle(async () => filterByEmployee((await (await d4Repository()).loadSnapshot()).performance, request));
}

// POST /api/d4/performance-evaluations — simpan evaluasi baru (draft atau completed).
export async function POST(request: Request) {
  return handle(async () => {
    const repository = await d4Repository();
    const input = await readJson<EvaluationInput>(request);
    return { id: await repository.savePerformance(input, await repository.loadReferenceData()) };
  }, 201);
}
