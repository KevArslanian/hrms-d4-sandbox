import { EmployeeScreen } from "@/modules/d4/dashboard/EmployeeScreen";

export default async function EmployeePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const [{ id }, { period }] = await Promise.all([params, searchParams]);
  return <EmployeeScreen employeeId={id} initialPeriod={period} />;
}
