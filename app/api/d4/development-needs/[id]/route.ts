import { handle } from "@/modules/d4/server/_lib/http";
import { getDevelopment } from "@/modules/d4/server/development-needs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => getDevelopment(id));
}
