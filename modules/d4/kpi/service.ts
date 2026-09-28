import { d4ReferenceFixture } from "../shared/fixtures";
import { kpiFixtureRecords } from "./fixtures";
import { prepareKpiLines } from "./templates";
export { definitionsForPosition, definitionsForPositionTitle, prepareKpiLines, prepareKpiLinesForDefinitions } from "./templates";
import type { KpiLineInput, KpiRecord } from "./types";

const storageKey = "hrms-d4-kpi-records-v1";
const changeEvent = "hrms-d4-kpi-records-changed";

export function getKpiStoredSnapshot(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(storageKey) ?? "";
  } catch {
    return "";
  }
}

export function subscribeKpiRecords(listener: () => void): () => void {
  window.addEventListener("storage", listener);
  window.addEventListener(changeEvent, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(changeEvent, listener);
  };
}

export function listKpiRecords(snapshot = getKpiStoredSnapshot()): KpiRecord[] {
  try {
    const saved: unknown = JSON.parse(snapshot || "[]");
    const valid = Array.isArray(saved) ? saved.filter((item): item is KpiRecord =>
      item !== null && typeof item === "object" && item.source === "local-demo" &&
      typeof item.id === "string" && typeof item.employeeId === "string" &&
      typeof item.period === "string" && typeof item.totalScore === "number" &&
      Array.isArray(item.lines)) : [];
    return [...valid, ...kpiFixtureRecords];
  } catch {
    return [...kpiFixtureRecords];
  }
}

export function saveKpiRecord(input: {
  employeeId: string;
  period: string;
  lines: readonly KpiLineInput[];
}): KpiRecord {
  if (typeof window === "undefined") throw new Error("Penyimpanan demo hanya tersedia di browser.");
  const employee = d4ReferenceFixture.employees.find((item) => item.id === input.employeeId);
  if (!employee?.positionId) throw new Error("Employee atau posisi tidak ditemukan pada data demo.");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.period)) throw new Error("Periode penilaian wajib dipilih.");

  const lines = prepareKpiLines(employee.positionId, input.lines);

  const record: KpiRecord = {
    id: window.crypto.randomUUID(),
    source: "local-demo",
    employeeId: employee.id,
    positionId: employee.positionId,
    period: input.period,
    definitionVersion: "V5.1",
    lines,
    totalScore: Number(lines.reduce((sum, line) => sum + line.weightedScore, 0).toFixed(2)),
    createdAt: new Date().toISOString(),
    actor: "Akun demo lokal",
  };
  const saved = listKpiRecords().filter((item) => item.source === "local-demo");
  window.localStorage.setItem(storageKey, JSON.stringify([record, ...saved]));
  window.dispatchEvent(new Event(changeEvent));
  return record;
}
