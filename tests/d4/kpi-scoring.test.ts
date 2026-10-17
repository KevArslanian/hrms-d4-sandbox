import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { catalogFor, indicatorsFor, KPI_TARGET, KPI_V51_CATALOG, roleForPosition, roleForPositionTitle, rolesOf, targetOf, type KpiCatalogSet } from "@/modules/d4/kpi/catalog";
import { d4ReferenceFixture } from "@/modules/d4/shared/fixtures";
import { createFixtureSource } from "@/modules/d4/web/data/fixture-source";
import type { D4DataSource } from "@/modules/d4/web/data/source";
import { HIGH_ABOVE, performanceBand, scaleMaxOf, UNDER_BELOW } from "@/modules/d4/kpi/scale";
import { weighted } from "@/modules/d4/web/features/kpi/KpiFormModal";

const catalog = { rows: KPI_V51_CATALOG };
const ALFA = "d4000000-0000-4000-8000-000000000009"; // Finance Staff → role 10 (weights 25/25/20/15/15)
const FINANCE_ROLE = 10;

describe("KPI V5.1 catalog: weights per role (FR-02.4, FR-06.9)", () => {
  const roles = rolesOf(catalog);

  it("serves V5.1 with ten roles", () => {
    expect(new Set(KPI_V51_CATALOG.map((row) => row.source_version))).toEqual(new Set(["V5.1"]));
    expect(roles.map((role) => role.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it.each(roles.map((role) => [role.order, role.name] as const))("role %i (%s) has five indicators, ordered 1–5, weights summing to exactly 100", (order) => {
    const indicators = indicatorsFor(catalog, order);
    expect(indicators.map((row) => row.indicator_order)).toEqual([1, 2, 3, 4, 5]);
    expect(indicators.every((row) => Number.isInteger(row.weight_percent) && row.weight_percent > 0)).toBe(true);
    expect(indicators.reduce((sum, row) => sum + row.weight_percent, 0)).toBe(100);
  });

  it("matches the V5.1 seed in the Supabase migration row by row", () => {
    const sql = readFileSync(fileURLToPath(new URL("../../supabase/migrations/20260929150000_d4_kpi_catalog_v51.sql", import.meta.url)), "utf8");
    const seeded = [...sql.matchAll(/^\s*\((\d+),'((?:[^']|'')*)',(\d+),'((?:[^']|'')*)',null,(\d+),'V5\.1'\)/gm)]
      .map(([, role, roleName, indicator, kpiName, weight]) => ({ role_order: Number(role), role_name: roleName.replace(/''/g, "'"), indicator_order: Number(indicator), kpi_name: kpiName.replace(/''/g, "'"), weight_percent: Number(weight) }));
    expect(seeded).toHaveLength(KPI_V51_CATALOG.length);
    expect(seeded).toEqual(KPI_V51_CATALOG.map(({ role_order, role_name, indicator_order, kpi_name, weight_percent }) => ({ role_order, role_name, indicator_order, kpi_name, weight_percent })));
  });
});

describe("weighted KPI score (FR-02.5, FR-02.6)", () => {
  // Uneven example: Σ weight × score / 100 = 2.0 + 0.9 + 0.8 + 0.2 = 3.9 (in floating point 3.9000000000000004).
  const lines = [[40, 5], [30, 3], [20, 4], [10, 2]].map(([weight_percent, raw_score]) => ({ weight_percent, raw_score }));

  it("weights each line as weight × raw score / 100", () => {
    expect(lines.map((line) => weighted(line))).toEqual([2, 0.9, 0.8, 0.2]);
  });

  it("totals to 3.9 on the 1–5 scale once rounded to two decimals", () => {
    const raw = lines.reduce((sum, line) => sum + (weighted(line) ?? 0), 0);
    expect(raw).not.toBe(3.9); // floating-point noise is why the total is rounded
    expect(Math.round(raw * 100) / 100).toBe(3.9);
  });

  it.each([[null], [0], [6], [3.5]])("gives no weighted value for an invalid raw score %s", (raw_score) => {
    expect(weighted({ weight_percent: 40, raw_score })).toBeNull();
  });
});

describe("KPI score scale per catalog version", () => {
  it("scores V3.1 and V5.1 on 1–5 and every later version on 1–100", () => {
    expect([scaleMaxOf("V3.1"), scaleMaxOf("V5.1"), scaleMaxOf(undefined), scaleMaxOf(null)]).toEqual([5, 5, 5, 5]);
    expect([scaleMaxOf("V6"), scaleMaxOf("V7")]).toEqual([100, 100]);
  });

  it("bands a 1–100 score: below 80 under, 80–85 acceptable, above 85 high", () => {
    expect([UNDER_BELOW, HIGH_ABOVE]).toEqual([80, 85]);
    expect(performanceBand(79.99, "V6")).toBe("Under Performance");
    expect(performanceBand(80, "V6")).toBe("Acceptable");
    expect(performanceBand(85, "V6")).toBe("Acceptable");
    expect(performanceBand(85.01, "V6")).toBe("High Performance");
  });

  it("has no band for a 1–5 scorecard or a missing score", () => {
    expect(performanceBand(4.5, "V5.1")).toBeNull();
    expect(performanceBand(null, "V6")).toBeNull();
  });

  it("weights a 1–100 raw score with the same formula (weight × score / 100)", () => {
    expect(weighted({ weight_percent: 25, raw_score: 80 }, 100)).toBe(20);
    expect(weighted({ weight_percent: 25, raw_score: 80 })).toBeNull(); // 80 is not a valid 1–5 score
  });
});

describe("fixed KPI target", () => {
  it("is 85 when the catalog carries no target, and the catalog target wins when it does", () => {
    expect(KPI_TARGET).toBe("85");
    expect(KPI_V51_CATALOG.every((row) => targetOf(row) === "85")).toBe(true);
    expect(targetOf({ target: "90" })).toBe("90");
  });
});

describe("saved scorecard total (fixture source, mirrors the DB trigger d4_calculate_kpi_assessment)", () => {
  let source: D4DataSource;
  beforeEach(() => {
    // The fixture source waits 250 ms per read to imitate the network; run it immediately.
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((run: () => void) => { run(); return 0; }) as unknown as typeof setTimeout);
    source = createFixtureSource();
  });

  async function save(scores: number[], period: string) {
    const lines = indicatorsFor(catalog, FINANCE_ROLE).map((row, index) => ({
      indicator_order: row.indicator_order, kpi_name: row.kpi_name, weight_percent: row.weight_percent, target: "", actual: "", raw_score: scores[index], comment: "",
    }));
    const id = await source.createKpiAssessment({ employeeId: ALFA, roleOrder: FINANCE_ROLE, period, evaluationDate: "2026-10-01", evaluatorName: "x", status: "completed", lines, generalNotes: "Catatan uji.", evidenceReference: "DOC-1" });
    return (await source.loadSnapshot()).kpiAssessments!.find((item) => item.id === id)!.overallScore;
  }

  it("saves a V6 period on the 1–100 scale and totals it with the same formula", async () => {
    const scores = [90, 80, 70, 85, 100]; // weights 25/25/20/15/15
    const lines = indicatorsFor(catalog, FINANCE_ROLE).map((row, index) => ({
      indicator_order: row.indicator_order, kpi_name: row.kpi_name, weight_percent: row.weight_percent, target: "", actual: "", raw_score: scores[index], comment: "",
    }));
    const base = { employeeId: ALFA, roleOrder: FINANCE_ROLE, period: "2026-11", evaluationDate: "2026-10-01", evaluatorName: "x", status: "completed" as const, generalNotes: "Catatan", evidenceReference: "DOC-1" };
    const id = await source.createKpiAssessment({ ...base, lines });
    const saved = (await source.loadSnapshot()).kpiAssessments!.find((item) => item.id === id)!;
    expect(saved.definitionVersion).toBe("V6");
    expect(saved.overallScore).toBe(84.25); // 22.5 + 20 + 14 + 12.75 + 15
    expect(performanceBand(saved.overallScore, saved.definitionVersion)).toBe("Acceptable");
    await expect(source.createKpiAssessment({ ...base, period: "2026-10", lines })).rejects.toThrow("1 sampai 5");
    await expect(source.createKpiAssessment({ ...base, period: "2026-12", lines: lines.map((line) => ({ ...line, raw_score: 101 })) })).rejects.toThrow("1 sampai 100");
  });

  it("stores the catalog target, not the one in the request", async () => {
    const lines = indicatorsFor(catalog, FINANCE_ROLE).map((row) => ({
      indicator_order: row.indicator_order, kpi_name: row.kpi_name, weight_percent: row.weight_percent, target: "999", actual: "", raw_score: 4, comment: "",
    }));
    const id = await source.createKpiAssessment({ employeeId: ALFA, roleOrder: FINANCE_ROLE, period: "2026-10", evaluationDate: "2026-10-01", evaluatorName: "x", status: "completed", lines, generalNotes: "Catatan", evidenceReference: "DOC-1" });
    const saved = (await source.loadSnapshot()).kpiAssessments!.find((item) => item.id === id)!;
    expect(saved.lines.map((line) => line.target)).toEqual(["85", "85", "85", "85", "85"]);
  });

  it.each([
    // weights 25/25/20/15/15
    [[5, 3, 4, 2, 1], 3.25], // raw 3.2499999999999996
    [[3, 3, 3, 3, 4], 3.15], // raw 3.1500000000000004
    [[1, 2, 3, 4, 5], 2.7],
    [[4, 5, 4, 3, 4], 4.1],
    [[1, 1, 1, 1, 1], 1],
    [[5, 5, 5, 5, 5], 5],
  ])("scores %j → overall %s", async (scores, expected) => {
    expect(await save(scores, "2026-11")).toBe(expected);
  });
});

describe("roleForPositionTitle (FR-02.11)", () => {
  it.each([["Operations Staff"], ["HR Associate Officer"], [""], [undefined]])("%s has no KPI in V5.1 → 0 (by design)", (title) => {
    expect(roleForPositionTitle(catalog, title)).toBe(0);
  });

  it.each([
    ["Vice President / CEO", 1], ["CEO", 1], ["Director", 2], ["Operations Director", 3], ["Branch Manager", 4],
    ["Customs Clearance Officer", 5], ["PPJK Officer", 5], ["Seafreight Ops Staff", 6], ["Airfreight Staff", 6], ["Freight Staff", 6],
    ["Warehouse Staff", 7], ["Logistics Staff", 7], ["EDI Officer", 8], ["Manifest Input Staff", 8], ["Implant Staff", 8],
    ["Sales Staff", 9], ["Marketing Staff", 9], ["Sales Administration Associate", 9], ["Finance Staff", 10], ["Finance Administrator", 10],
    ["Accounting Staff", 10], ["Admin Staff", 10],
  ])("%s → role %i", (title, role) => {
    expect(roleForPositionTitle(catalog, title)).toBe(role);
  });

  it("maps every fixture position; only the positions without a V5.1 KPI return 0", () => {
    const withoutKpi = d4ReferenceFixture.positions.filter((position) => roleForPositionTitle(catalog, position.title) === 0).map((position) => position.title);
    expect(withoutKpi.sort()).toEqual(["D4 Demo Staff", "HR Associate Officer", "Operations Staff"]);
  });

  // BUG-D4-005 regression: keywords match whole words, so "edi" inside "Credit"/"Media" no longer maps to Implant Staff.
  it.each([["Credit Control Staff"], ["Media Relations Officer"], ["Medical Officer"]])("%s has no KPI → 0", (title) => {
    expect(roleForPositionTitle(catalog, title)).toBe(0);
  });
});

describe("catalogFor: the catalog version follows the scorecard period", () => {
  const v6 = KPI_V51_CATALOG.map((row) => ({ ...row, source_version: "V6", weight_percent: row.indicator_order === 1 ? row.weight_percent + 5 : row.indicator_order === 5 ? row.weight_percent - 5 : row.weight_percent }));
  const set: KpiCatalogSet = {
    versions: [{ source_version: "V5.1", effective_from: "2026-01" }, { source_version: "V6", effective_from: "2027-01" }],
    rows: [...KPI_V51_CATALOG, ...v6],
    positionRoles: [{ source_version: "V5.1", position_id: "pos-a", role_order: 9 }, { source_version: "V6", position_id: "pos-a", role_order: 10 }],
  };

  it.each([["2025-12", null], ["2026-01", "V5.1"], ["2026-12", "V5.1"], ["2027-01", "V6"], ["2030-06", "V6"]])("%s → %s", (period, version) => {
    expect(catalogFor(set, period)?.version ?? null).toBe(version);
  });

  it("serves only that version's rows and HR's position mapping for it", () => {
    const old = catalogFor(set, "2026-12")!, next = catalogFor(set, "2027-01")!;
    expect(old.rows.every((row) => row.source_version === "V5.1")).toBe(true);
    expect(indicatorsFor(next, 9)[0].weight_percent).toBe(indicatorsFor(old, 9)[0].weight_percent + 5);
    expect([roleForPosition(old, "pos-a"), roleForPosition(next, "pos-a"), roleForPosition(next, "pos-b")]).toEqual([9, 10, 0]);
  });
});
