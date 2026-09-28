import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Vercel Authentication protects Preview deployments at the platform edge.
// The production deployment never runs this endpoint, even if configured by mistake.
export async function GET() {
  if (process.env.VERCEL_ENV !== "preview" || process.env.D4_OWNER_PREVIEW !== "enabled") {
    return new NextResponse(null, { status: 404 });
  }
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const employeeIds = (process.env.D4_PREVIEW_EMPLOYEE_IDS ?? "")
    .split(",").map((id) => id.trim()).filter((id) => /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id));
  if (!url || !secret || !employeeIds.length || employeeIds.length > 10) {
    return NextResponse.json({ error: "Pratinjau belum dikonfigurasi." }, { status: 503 });
  }
  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const [employees, kpi, performance, competency, development, training] = await Promise.all([
    db.from("d3_employee").select("id,employee_id,full_name,position_id,department_id").in("id", employeeIds),
    db.from("employee_kpi").select("employee_id,period,kpi_score").in("employee_id", employeeIds),
    db.from("d4_performance_evaluations").select("employee_id,period,overall_score,status").in("employee_id", employeeIds),
    db.from("d4_competency_assessments").select("employee_id,effective_date,overall_status").in("employee_id", employeeIds),
    db.from("d4_development_needs").select("employee_id,priority").in("employee_id", employeeIds),
    db.from("d4_training_records").select("employee_id,activity,activity_date").in("employee_id", employeeIds),
  ]);
  const positionIds = [...new Set((employees.data ?? []).map((row) => row.position_id).filter((id): id is string => Boolean(id)))];
  const departmentIds = [...new Set((employees.data ?? []).map((row) => row.department_id).filter((id): id is string => Boolean(id)))];
  const [positions, departments] = await Promise.all([
    positionIds.length ? db.from("positions").select("id,title").in("id", positionIds) : Promise.resolve({ data: [], error: null }),
    departmentIds.length ? db.from("d3_departments").select("id,name").in("id", departmentIds) : Promise.resolve({ data: [], error: null }),
  ]);
  const queries = { employees, positions, departments, kpi, performance, competency, development, training };
  if (Object.values(queries).some((result) => result.error)) {
    console.error("Preview read failed:", Object.entries(queries).filter(([, result]) => result.error).map(([name]) => name));
    return NextResponse.json({ error: "Data pratinjau gagal dimuat." }, { status: 502 });
  }
  return NextResponse.json(Object.fromEntries(Object.entries(queries).map(([name, result]) => [name, result.data ?? []])), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
