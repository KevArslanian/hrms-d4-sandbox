import { handle } from "@/modules/d4/server/_lib/http";
import { getEvaluation } from "@/modules/d4/server/performance-evaluations";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => getEvaluation(id));
}
