import type { ReactNode } from "react";
import { D4App } from "@/modules/d4/web/D4App";

// Fixture mode is a local preview with fictional data. It is ignored in production builds.
const mode = process.env.NEXT_PUBLIC_D4_DATA_MODE === "fixture" && process.env.NODE_ENV !== "production" ? "fixture" : "live";

export default function D4Layout({ children }: { children: ReactNode }) {
  return <D4App mode={mode}>{children}</D4App>;
}
