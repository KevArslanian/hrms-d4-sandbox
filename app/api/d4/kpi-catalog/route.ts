import { handle } from "@/modules/d4/server/_lib/http";
import { getCatalog } from "@/modules/d4/server/kpi-catalog";

export const GET = (request: Request) => handle(() => getCatalog(request));
