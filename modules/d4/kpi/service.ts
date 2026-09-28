import { d4ReferenceFixture } from "../shared/fixtures";
import { kpiDefinitions, kpiFixtureRecords } from "./fixtures";
import type { KpiDefinition, KpiLineInput, KpiRecord } from "./types";

const storageKey = "hrms-d4-kpi-records-v1";
const changeEvent = "hrms-d4-kpi-records-changed";

export function definitionsForPosition(positionId: string): readonly KpiDefinition[] {
  return kpiDefinitions.filter((item) => item.positionId === positionId);
}

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

  const definitions = definitionsForPosition(employee.positionId);
  if (definitions.length !== 5 || definitions.reduce((sum, item) => sum + item.weight, 0) !== 100) {
    throw new Error("Definisi KPI posisi belum lengkap atau bobot bukan 100%.");
  }

  const lines = definitions.map((definition) => {
    const item = input.lines.find((line) => line.definitionId === definition.id);
    if (!item || !item.target.trim() || !item.realization.trim()) {
      throw new Error(`Target dan realisasi ${definition.name} wajib diisi.`);
    }
    if (item.rawScore === null || !Number.isInteger(item.rawScore) || item.rawScore < 1 || item.rawScore > 5) {
      throw new Error(`Skor mentah ${definition.name} harus bilangan 1 sampai 5.`);
    }
    return {
      definitionId: definition.id,
      name: definition.name,
      weight: definition.weight,
      target: item.target.trim(),
      realization: item.realization.trim(),
      rawScore: item.rawScore,
      weightedScore: (definition.weight / 100) * item.rawScore,
    };
  });

  const record: KpiRecord = {
    id: window.crypto.randomUUID(),
    source: "local-demo",
    employeeId: employee.id,
    positionId: employee.positionId,
    period: input.period,
    definitionVersion: definitions[0].version,
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
