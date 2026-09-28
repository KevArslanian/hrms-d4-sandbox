import { LiveD4Screen } from "@/modules/d4/supabase/LiveD4Screen";

export default async function LivePage({ searchParams }: {
  searchParams: Promise<{ module?: string }>;
}) {
  const { module } = await searchParams;
  return <LiveD4Screen initialModule={module} />;
}
