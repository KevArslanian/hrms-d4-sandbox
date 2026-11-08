import { afterEach, describe, expect, it, vi } from "vitest";
import { compileDaily, dailyEntriesOf, daysBelowTarget } from "@/modules/d4/kpi/daily";
import { assertDailyDate, canFillDaily, localToday } from "@/modules/d4/shared/rules";
import type { KpiDailyEntry } from "@/modules/d4/supabase/types";

const WEIGHTS = [30, 25, 15, 15, 15];
function entry(day: string, scores: number[], patch: Partial<KpiDailyEntry> = {}): KpiDailyEntry {
  const lines = scores.map((score, index) => ({ indicator_order: index + 1, kpi_name: `KPI ${index + 1}`, weight_percent: WEIGHTS[index], target: "85", actual: String(score), raw_score: score, comment: "" }));
  const overallScore = Math.round(lines.reduce((sum, line) => sum + line.weight_percent * line.raw_score / 100, 0) * 100) / 100;
  return { id: `${day}-${patch.createdAt ?? ""}`, definitionVersion: "V6", employeeId: "e1", entryDate: `2026-11-${day}`, period: "2026-11", roleOrder: 5, roleName: "Customs", lines, overallScore, createdAt: `2026-11-${day}T10:00:00Z`, ...patch };
}

describe("compileDaily", () => {
  it("averages each indicator over the days and rounds to whole scores, which the scorecard trigger requires", () => {
    // 87 and 88 average to 87.5: an unrounded prefill would fail the trigger's integer cast when HR saves.
    const result = compileDaily([entry("02", [87, 80, 90, 85, 70]), entry("03", [88, 81, 90, 85, 71])], "e1", "2026-11")!;
    expect(result.scores).toEqual([88, 81, 90, 85, 71]);
    expect(result.scores.every(Number.isInteger)).toBe(true);
    expect(result.days).toHaveLength(2);
    expect(result.total).toBe(Math.round((30 * 88 + 25 * 81 + 15 * 90 + 15 * 85 + 15 * 71) / 100 * 100) / 100);
  });

  it("counts only the newest row of a day (a correction is a new row)", () => {
    const old = entry("02", [60, 60, 60, 60, 60], { createdAt: "2026-11-02T08:00:00Z" });
    const fixed = entry("02", [90, 90, 90, 90, 90], { createdAt: "2026-11-02T09:00:00Z" });
    expect(dailyEntriesOf([fixed, old], "e1", "2026-11")).toEqual([fixed]);
    expect(compileDaily([old, fixed], "e1", "2026-11")!.scores).toEqual([90, 90, 90, 90, 90]);
  });

  it("ignores other employees and periods, and returns null without entries", () => {
    expect(compileDaily([entry("02", [90, 90, 90, 90, 90], { employeeId: "e2" })], "e1", "2026-11")).toBeNull();
    expect(compileDaily([entry("02", [90, 90, 90, 90, 90], { period: "2026-10", entryDate: "2026-10-02" })], "e1", "2026-11")).toBeNull();
  });

  it("does not mix KPI sets when the position changed during the period", () => {
    const before = entry("02", [50, 50, 50, 50, 50], { roleOrder: 4 });
    const after = entry("03", [90, 90, 90, 90, 90]);
    const result = compileDaily([before, after], "e1", "2026-11")!;
    expect(result.days).toEqual([after]);
    expect(result.roleOrder).toBe(5);
  });
});

describe("daysBelowTarget", () => {
  it("counts the run of most recent entries under the target", () => {
    const days = [entry("02", [70, 70, 70, 70, 70]), entry("03", [90, 90, 90, 90, 90]), entry("04", [80, 80, 80, 80, 80]), entry("05", [84, 84, 84, 84, 84])];
    expect(daysBelowTarget(days, 85)).toBe(2);
  });

  it("is 0 for 1–5 entries, which have no target", () => {
    expect(daysBelowTarget([entry("02", [3, 3, 3, 3, 3], { definitionVersion: "V5.1" })], 85)).toBe(0);
  });
});

describe("daily rules", () => {
  afterEach(() => { vi.useRealTimers(); });

  it("lets every linked account except MANAGEMENT fill its own day", () => {
    expect(canFillDaily("EMPLOYEE", "e1")).toBe(true);
    expect(canFillDaily("HR", "e1")).toBe(true);
    expect(canFillDaily("MANAGEMENT", "e1")).toBe(false);
    expect(canFillDaily("EMPLOYEE", null)).toBe(false);
  });

  it("accepts today and earlier days of the running WIB period only", () => {
    // 1 Nov 2026 03:00 WIB is still 31 Oct in UTC; the WIB day decides.
    const now = new Date("2026-10-31T20:00:00Z");
    expect(localToday(now)).toBe("2026-11-01");
    expect(() => assertDailyDate("2026-11-01", now)).not.toThrow();
    expect(() => assertDailyDate("2026-11-02", now)).toThrow(/lebih dari hari ini/);
    expect(() => assertDailyDate("2026-10-31", now)).toThrow(/periode berjalan \(2026-11\)/);
  });
});
