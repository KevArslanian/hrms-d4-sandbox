import { handle } from "@/modules/d4/server/_lib/http";
import { createTraining, listTraining } from "@/modules/d4/server/training-records";

export const GET = (request: Request) => handle(() => listTraining(request));
export const POST = (request: Request) => handle(() => createTraining(request), 201);
