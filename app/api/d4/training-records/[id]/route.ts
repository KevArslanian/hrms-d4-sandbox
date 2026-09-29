import { handle } from "@/modules/d4/server/_lib/http";
import { getTraining } from "@/modules/d4/server/training-records";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => getTraining(id));
}
