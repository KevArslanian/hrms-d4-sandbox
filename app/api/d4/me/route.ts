import { handle } from "@/modules/d4/server/_lib/http";
import { getMe } from "@/modules/d4/server/snapshot";

export const GET = () => handle(getMe);
