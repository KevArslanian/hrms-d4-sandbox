import { d4Repository, handle, readJson } from "@/lib/d4/api";
import type { TrainingStatus } from "@/modules/d4/training/types";

// POST /api/d4/training-records/:id/versions — tambah versi status/hasil training.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const repository = await d4Repository();
    const body = await readJson<{ status: TrainingStatus; result?: string; notes?: string }>(request);
    await repository.updateTraining(id, body.status, body.result ?? "", body.notes ?? "");
    return { trainingId: id, status: body.status };
  }, 201);
}
