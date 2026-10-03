import { describe, expect, it } from "vitest";
import { KPI_V51_CATALOG, roleForPositionTitle, selectCatalog } from "@/modules/d4/kpi/catalog";

const catalog = selectCatalog(KPI_V51_CATALOG);

describe("roleForPositionTitle matches keywords on whole words", () => {
  it.each([["Credit Control Staff"], ["Media Relations Officer"], ["Medical Officer"], ["Operations Staff"]])("%s → 0", (title) => {
    expect(roleForPositionTitle(catalog, title)).toBe(0);
  });

  it.each([
    ["Vice President / CEO", 1], ["CEO", 1], ["Director", 2], ["Operations Director", 3], ["Branch Manager", 4],
    ["Customs Clearance Officer", 5], ["PPJK Officer", 5], ["Seafreight Ops Staff", 6], ["Airfreight Staff", 6], ["Freight Staff", 6],
    ["Warehouse Staff", 7], ["Logistics Staff", 7], ["EDI Officer", 8], ["Manifest Input Staff", 8], ["Implant Staff", 8],
    ["Sales Staff", 9], ["Marketing Staff", 9], ["Sales Administration Associate", 9], ["Finance Staff", 10],
    ["Finance Administrator", 10], ["Accounting Staff", 10], ["Admin Staff", 10],
  ])("%s → role %i", (title, role) => {
    expect(roleForPositionTitle(catalog, title)).toBe(role);
  });
});
