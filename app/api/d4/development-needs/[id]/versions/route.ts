import { d4Repository, handle, readJson } from "@/lib/d4/api";
import type { DevelopmentStatus } from "@/modules/d4/development/types";

// POST /api/d4/development-needs/:id/versions — tambah revisi status (riwayat tidak ditimpa).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const repository = await d4Repository();
    const body = await readJson<{ status: DevelopmentStatus; notes?: string }>(request);
    await repository.updateDevelopment(id, body.status, body.notes ?? "");
    return { developmentNeedId: id, status: body.status };
  }, 201);
}
