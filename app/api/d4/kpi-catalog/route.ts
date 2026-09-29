import { d4Session, handle } from "@/lib/d4/api";
import { ACTIVE_KPI_VERSION } from "@/modules/d4/supabase/types";

// GET /api/d4/kpi-catalog?role_order=1&version=V5.1 — katalog KPI per jabatan (default versi aktif).
export async function GET(request: Request) {
  return handle(async () => {
    const { client } = await d4Session();
    const params = new URL(request.url).searchParams;
    const roleOrder = params.get("role_order");
    let query = client.from("d4_kpi_role_catalog")
      .select("role_order,role_name,indicator_order,kpi_name,target,weight_percent,source_version")
      .eq("source_version", params.get("version") || ACTIVE_KPI_VERSION)
      .order("role_order").order("indicator_order");
    if (roleOrder) query = query.eq("role_order", Number(roleOrder));
    const { data, error } = await query;
    if (error) throw new Error(`Katalog KPI: ${error.message}`);
    return data;
  });
}
