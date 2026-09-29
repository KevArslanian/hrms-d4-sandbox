import { handle } from "@/modules/d4/server/_lib/http";
import { getSnapshot } from "@/modules/d4/server/snapshot";

export const GET = () => handle(getSnapshot);
