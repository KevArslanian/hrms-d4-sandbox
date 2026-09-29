import { handle } from "@/modules/d4/server/_lib/http";
import { addDevelopmentVersion } from "@/modules/d4/server/development-needs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => addDevelopmentVersion(request, id), 201);
}
