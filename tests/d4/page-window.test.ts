import { describe, expect, it } from "vitest";
import { pageWindow } from "@/modules/d4/web/ui/DataTable";

// Load test: 1000 rows = 100 pages; the footer shows a handful of buttons, never all of them.
describe("pageWindow", () => {
  it("shows first, last and neighbours with gaps", () => {
    expect(pageWindow(50, 100)).toEqual([1, "gap", 49, 50, 51, "gap", 100]);
    expect(pageWindow(1, 100)).toEqual([1, 2, "gap", 100]);
    expect(pageWindow(100, 100)).toEqual([1, "gap", 99, 100]);
  });
  it("lists every page when there are few", () => {
    expect(pageWindow(2, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(1, 1)).toEqual([1]);
  });
});
