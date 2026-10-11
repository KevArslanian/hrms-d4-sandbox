import { redirect } from "next/navigation";

// KPI Scorecard is part of Performance & KPI; the old URL keeps working for bookmarks and shared links.
export default function Page() {
  redirect("/performance");
}
