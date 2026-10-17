/**
 * KPI score scale per catalog version.
 *
 * V3.1 and V5.1 follow the Excel rule: integer raw score 1–5. Every later version (V6 onward) is scored 1–100
 * (interview D4, 14 Oct 2026: the daily KPI the company uses is 1–100 with a target of 85).
 * Scorecards keep the scale of the version they were saved under, so old 1–5 scorecards stay valid and readable.
 */
const FIVE_POINT_VERSIONS: readonly string[] = ["V3.1", "V5.1"];

/** Highest raw score (and overall score) a catalog version allows; unknown or missing version = the legacy 1–5. */
export const scaleMaxOf = (definitionVersion?: string | null): 5 | 100 =>
  !definitionVersion || FIVE_POINT_VERSIONS.includes(definitionVersion) ? 5 : 100;

/** Interview D4: below 80 is under performance, 80–85 is acceptable, above 85 is high performance. */
export const UNDER_BELOW = 80;
export const HIGH_ABOVE = 85;

export type PerformanceBand = "Under Performance" | "Acceptable" | "High Performance";

/** Band of an overall score; only defined for 1–100 scorecards (a 1–5 score has no official threshold). */
export function performanceBand(score: number | null | undefined, definitionVersion?: string | null): PerformanceBand | null {
  if (score === null || score === undefined || scaleMaxOf(definitionVersion) !== 100) return null;
  if (score < UNDER_BELOW) return "Under Performance";
  return score <= HIGH_ABOVE ? "Acceptable" : "High Performance";
}
