import { d4ReferenceFixture } from "../shared/fixtures";
import { performanceFixtureRecords } from "./fixtures";
import type { EvaluationInput, PerformanceEvaluation } from "./types";
import { validatePerformanceInput } from "./validation";

const storageKey = "hrms-d4-performance-records-v1";
const changeEvent = "hrms-d4-performance-changed";

export function getPerformanceStoredSnapshot(): string {
  if (typeof window === "undefined") return "";
  try { return window.localStorage.getItem(storageKey) ?? ""; } catch { return ""; }
}

export function subscribePerformance(listener: () => void): () => void {
  window.addEventListener("storage", listener);
  window.addEventListener(changeEvent, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(changeEvent, listener);
  };
}

export function listPerformanceEvaluations(snapshot = getPerformanceStoredSnapshot()): PerformanceEvaluation[] {
  try {
    const saved: unknown = JSON.parse(snapshot || "[]");
    const valid = Array.isArray(saved) ? saved.filter((item): item is PerformanceEvaluation =>
      item !== null && typeof item === "object" && item.source === "local-demo" &&
      typeof item.id === "string" && typeof item.employeeId === "string" &&
      typeof item.period === "string" && typeof item.createdAt === "string" &&
      Array.isArray(item.aspects)) : [];
    return [...valid, ...performanceFixtureRecords];
  } catch {
    return [...performanceFixtureRecords];
  }
}

export function savePerformanceEvaluation(input: EvaluationInput): PerformanceEvaluation {
  if (typeof window === "undefined") throw new Error("Penyimpanan demo hanya tersedia di browser.");
  if (!d4ReferenceFixture.employees.some((item) => item.id === input.employeeId)) throw new Error("Employee tidak ditemukan pada data demo.");
  validatePerformanceInput(input);
  const record: PerformanceEvaluation = {
    ...input,
    id: window.crypto.randomUUID(),
    source: "local-demo",
    createdAt: new Date().toISOString(),
    actor: "Akun demo lokal",
  };
  const saved = listPerformanceEvaluations().filter((item) => item.source === "local-demo");
  window.localStorage.setItem(storageKey, JSON.stringify([record, ...saved]));
  window.dispatchEvent(new Event(changeEvent));
  return record;
}
