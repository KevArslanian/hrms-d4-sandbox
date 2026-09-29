import { handle } from "@/modules/d4/server/_lib/http";
import { addTrainingVersion } from "@/modules/d4/server/training-records";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => addTrainingVersion(request, id), 201);
}
