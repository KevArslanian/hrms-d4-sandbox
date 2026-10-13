import { NotFound } from "@/modules/d4/web/ui/layout";

export default function PageNotFound() {
  return <main className="mx-auto max-w-xl p-6"><NotFound what="Page" backHref="/dashboard" backLabel="Back to People Dashboard" /></main>;
}
