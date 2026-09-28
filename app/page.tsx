import { redirect } from "next/navigation";

export default function HomePage() {
  redirect(process.env.NEXT_PUBLIC_D4_DATA_MODE === "supabase" ? "/live" : "/performance");
}
