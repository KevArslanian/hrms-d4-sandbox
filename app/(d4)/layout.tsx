import type { ReactNode } from "react";
import { D4App } from "@/modules/d4/web/D4App";
import { d4DataMode } from "@/modules/d4/web/data/mode";

export default function D4Layout({ children }: { children: ReactNode }) {
  return <D4App mode={d4DataMode}>{children}</D4App>;
}
