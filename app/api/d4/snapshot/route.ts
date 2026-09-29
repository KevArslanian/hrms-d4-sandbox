import { d4Repository, handle } from "@/lib/d4/api";

// GET /api/d4/snapshot — seluruh data D4 yang boleh dilihat akun ini (dipakai layar /live).
export async function GET() {
  return handle(async () => (await d4Repository()).loadSnapshot());
}
