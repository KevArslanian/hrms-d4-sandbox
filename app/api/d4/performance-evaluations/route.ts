import { handle } from "@/modules/d4/server/_lib/http";
import { createEvaluation, listEvaluations } from "@/modules/d4/server/performance-evaluations";

export const GET = (request: Request) => handle(() => listEvaluations(request));
export const POST = (request: Request) => handle(() => createEvaluation(request), 201);
