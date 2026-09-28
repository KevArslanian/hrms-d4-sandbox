import { CompetencyScreen } from "@/modules/d4/competency/CompetencyScreen";

export default async function CompetencyPage({ searchParams }: {
  searchParams: Promise<{ employeeId?: string }>;
}) {
  const { employeeId } = await searchParams;
  return <CompetencyScreen initialEmployeeId={employeeId} />;
}
