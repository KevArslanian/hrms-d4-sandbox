import { handle } from "@/modules/d4/server/_lib/http";
import { createCompetency, listCompetency } from "@/modules/d4/server/competency-assessments";

export const GET = (request: Request) => handle(() => listCompetency(request));
export const POST = (request: Request) => handle(() => createCompetency(request), 201);
