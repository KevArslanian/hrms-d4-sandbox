import { LiveD4Screen } from "@/modules/d4/supabase/LiveD4Screen";

export default async function LivePage({ searchParams }: {
  searchParams: Promise<{ module?: string; auth_error?: string }>;
}) {
  const { module, auth_error } = await searchParams;
  return <LiveD4Screen initialModule={module} initialAuthError={auth_error} />;
}
