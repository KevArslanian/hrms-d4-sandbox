import { d4Session, handle } from "@/lib/d4/api";

// GET /api/d4/kpi-catalog?role_order=1 — katalog KPI V3.1 (5 indikator per jabatan).
export async function GET(request: Request) {
  return handle(async () => {
    const { client } = await d4Session();
    const roleOrder = new URL(request.url).searchParams.get("role_order");
    let query = client.from("d4_kpi_role_catalog")
      .select("role_order,role_name,indicator_order,kpi_name,target,weight_percent,source_version")
      .order("role_order").order("indicator_order");
    if (roleOrder) query = query.eq("role_order", Number(roleOrder));
    const { data, error } = await query;
    if (error) throw new Error(`Katalog KPI: ${error.message}`);
    return data;
  });
}
