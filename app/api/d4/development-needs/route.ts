import { d4Repository, filterByEmployee, handle, readJson } from "@/lib/d4/api";
import type { DevelopmentPriority, DevelopmentSourceType } from "@/modules/d4/development/types";

type CreateDevelopmentBody = { employeeId: string; sourceType: DevelopmentSourceType; sourceRef: string; objective: string; priority: DevelopmentPriority; notes?: string };

// GET /api/d4/development-needs?employee_id=… — semua revisi kebutuhan pengembangan.
export async function GET(request: Request) {
  return handle(async () => filterByEmployee((await (await d4Repository()).loadSnapshot()).developmentVersions, request));
}

// POST /api/d4/development-needs — buat kebutuhan baru + revisi 1 (satu transaksi via RPC).
export async function POST(request: Request) {
  return handle(async () => {
    const repository = await d4Repository();
    const body = await readJson<CreateDevelopmentBody>(request);
    return { id: await repository.createDevelopment({ ...body, notes: body.notes ?? "" }, await repository.loadSnapshot()) };
  }, 201);
}
