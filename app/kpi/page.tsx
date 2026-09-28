import { KpiScreen } from "@/modules/d4/kpi/KpiScreen";

export default async function KpiPage({ searchParams }: {
  searchParams: Promise<{ employeeId?: string; period?: string }>;
}) {
  const { employeeId, period } = await searchParams;
  return <KpiScreen initialEmployeeId={employeeId} initialPeriod={period} />;
}
