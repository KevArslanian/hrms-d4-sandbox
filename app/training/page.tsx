import { TrainingScreen } from "@/modules/d4/training/TrainingScreen";

export default async function TrainingPage({ searchParams }: {
  searchParams: Promise<{ employeeId?: string; developmentId?: string }>;
}) {
  const { employeeId, developmentId } = await searchParams;
  return <TrainingScreen initialEmployeeId={employeeId} initialDevelopmentId={developmentId} />;
}
