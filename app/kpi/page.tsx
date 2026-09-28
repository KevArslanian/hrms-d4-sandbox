import { KpiScreen } from "@/modules/d4/kpi/KpiScreen";

export default async function KpiPage({ searchParams }: {
  searchParams: Promise<{ employeeId?: string }>;
}) {
  const { employeeId } = await searchParams;
  return <KpiScreen initialEmployeeId={employeeId} />;
}
