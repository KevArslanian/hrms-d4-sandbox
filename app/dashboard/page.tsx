import { DashboardScreen } from "@/modules/d4/dashboard/DashboardScreen";

export default async function DashboardPage({ searchParams }: {
  searchParams: Promise<{ employeeId?: string; period?: string }>;
}) {
  const { employeeId, period } = await searchParams;
  return <DashboardScreen initialEmployeeId={employeeId} initialPeriod={period} />;
}
