import { handle } from "@/modules/d4/server/_lib/http";
import { getAssessment } from "@/modules/d4/server/kpi-assessments";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => getAssessment(id));
}
