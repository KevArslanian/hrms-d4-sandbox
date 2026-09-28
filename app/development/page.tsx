import { DevelopmentScreen } from "@/modules/d4/development/DevelopmentScreen";

export default async function DevelopmentPage({ searchParams }: {
  searchParams: Promise<{ employeeId?: string; sourceType?: string; sourceRef?: string }>;
}) {
  const { employeeId, sourceType, sourceRef } = await searchParams;
  return <DevelopmentScreen initialEmployeeId={employeeId} initialSourceType={sourceType} initialSourceRef={sourceRef} />;
}
