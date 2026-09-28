import { redirect } from "next/navigation";

export default function Page() {
  redirect("/live?module=training");
}
