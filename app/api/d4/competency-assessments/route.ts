import { d4Repository, filterByEmployee, handle, readJson } from "@/lib/d4/api";

// GET /api/d4/competency-assessments?employee_id=… — snapshot hasil gap kompetensi.
export async function GET(request: Request) {
  return handle(async () => filterByEmployee((await (await d4Repository()).loadSnapshot()).competency, request));
}

// POST /api/d4/competency-assessments — hitung gap di server lalu simpan snapshot-nya.
export async function POST(request: Request) {
  return handle(async () => {
    const repository = await d4Repository();
    const input = await readJson<{ employeeId: string; positionId: string; effectiveDate: string }>(request);
    return { id: await repository.saveCompetency(input, await repository.loadReferenceData()) };
  }, 201);
}
