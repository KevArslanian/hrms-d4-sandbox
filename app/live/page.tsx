import { LiveD4Screen } from "@/modules/d4/supabase/LiveD4Screen";

export default async function LivePage({ searchParams }: {
  searchParams: Promise<{ module?: string; view?: string; employee?: string; evaluation?: string; training?: string; source?: string }>;
}) {
  const { module, view, employee, evaluation, training, source } = await searchParams;
  return <LiveD4Screen initialModule={module} initialView={view} employeeId={employee} evaluationId={evaluation} trainingId={training} sourceRef={source} />;
}
