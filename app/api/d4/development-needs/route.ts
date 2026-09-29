import { handle } from "@/modules/d4/server/_lib/http";
import { createDevelopment, listDevelopment } from "@/modules/d4/server/development-needs";

export const GET = (request: Request) => handle(() => listDevelopment(request));
export const POST = (request: Request) => handle(() => createDevelopment(request), 201);
