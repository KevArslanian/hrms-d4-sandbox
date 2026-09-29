import { d4Repository, filterByEmployee, handle, readJson } from "@/lib/d4/api";
import type { TrainingStatus } from "@/modules/d4/training/types";

type CreateTrainingBody = { employeeId: string; developmentNeedId: string; activity: string; date: string; status: TrainingStatus; result?: string; notes?: string };

// GET /api/d4/training-records?employee_id=… — semua versi training.
export async function GET(request: Request) {
  return handle(async () => filterByEmployee((await (await d4Repository()).loadSnapshot()).trainingVersions, request));
}

// POST /api/d4/training-records — buat training + versi 1 (satu transaksi via RPC).
export async function POST(request: Request) {
  return handle(async () => {
    const repository = await d4Repository();
    const body = await readJson<CreateTrainingBody>(request);
    return { id: await repository.createTraining({ ...body, result: body.result ?? "", notes: body.notes ?? "" }, await repository.loadSnapshot()) };
  }, 201);
}
