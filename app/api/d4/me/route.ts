import { d4Repository, handle } from "@/lib/d4/api";

// GET /api/d4/me — peran dan employee milik akun yang sedang login.
export async function GET() {
  return handle(async () => {
    const snapshot = await (await d4Repository()).loadSnapshot();
    const employee = snapshot.reference.employees.find((item) => item.id === snapshot.actorEmployeeId) ?? null;
    return { role: snapshot.role, employee };
  });
}
