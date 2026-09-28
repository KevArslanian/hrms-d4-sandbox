import { listCompetencyAssessments, compareCompetencies } from "../competency/service";
import { listPerformanceEvaluations } from "../performance/service";
import { d4ReferenceFixture } from "../shared/fixtures";
import { developmentFixtureVersions } from "./fixtures";
import type { DevelopmentNeedVersion, DevelopmentPriority, DevelopmentSourceOption, DevelopmentSourceType, DevelopmentStatus } from "./types";

const storageKey = "hrms-d4-development-versions-v1";
const changeEvent = "hrms-d4-development-changed";

export function getDevelopmentStoredSnapshot(): string {
  if (typeof window === "undefined") return "";
  try { return window.localStorage.getItem(storageKey) ?? ""; } catch { return ""; }
}

export function subscribeDevelopment(listener: () => void): () => void {
  window.addEventListener("storage", listener); window.addEventListener(changeEvent, listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener(changeEvent, listener); };
}

export function listDevelopmentVersions(snapshot = getDevelopmentStoredSnapshot()): DevelopmentNeedVersion[] {
  try {
    const saved: unknown = JSON.parse(snapshot || "[]");
    const valid = Array.isArray(saved) ? saved.filter((item): item is DevelopmentNeedVersion =>
      item !== null && typeof item === "object" && item.source === "local-demo" &&
      typeof item.id === "string" && typeof item.needId === "string" &&
      typeof item.employeeId === "string" && typeof item.sourceRef === "string") : [];
    return [...valid, ...developmentFixtureVersions];
  } catch { return [...developmentFixtureVersions]; }
}

export function listLatestDevelopmentNeeds(snapshot = getDevelopmentStoredSnapshot()): DevelopmentNeedVersion[] {
  const seen = new Set<string>();
  return listDevelopmentVersions(snapshot).filter((item) => {
    if (seen.has(item.needId)) return false;
    seen.add(item.needId);
    return true;
  });
}

export function availableDevelopmentSources(employeeId: string, type: DevelopmentSourceType): DevelopmentSourceOption[] {
  const employee = d4ReferenceFixture.employees.find((item) => item.id === employeeId);
  if (!employee) return [];
  if (type === "competency_gap") {
    if (!employee.positionId) return [];
    return compareCompetencies(employeeId, employee.positionId).findings.filter((item) => item.status === "Gap").map((item) => ({
      type, ref: item.requirementId, label: `${item.competencyName}, required ${item.requiredLevel}, actual ${item.actualLevel}`,
    }));
  }
  if (type === "role_change") return listCompetencyAssessments().filter((item) => item.employeeId === employeeId && item.context === "role-change").map((item) => ({
    type, ref: item.id, label: `${d4ReferenceFixture.positions.find((position) => position.id === item.positionId)?.title ?? "Posisi"}, ${item.effectiveDate}`,
  }));
  return listPerformanceEvaluations().filter((item) => item.employeeId === employeeId && item.status === "completed").map((item) => ({
    type, ref: item.id, label: `Evaluasi ${item.period}, ${item.evaluator}`,
  }));
}

function writeVersion(record: DevelopmentNeedVersion) {
  if (typeof window === "undefined") throw new Error("Penyimpanan demo hanya tersedia di browser.");
  const saved = listDevelopmentVersions().filter((item) => item.source === "local-demo");
  window.localStorage.setItem(storageKey, JSON.stringify([record, ...saved]));
  window.dispatchEvent(new Event(changeEvent));
}

export function createDevelopmentNeed(input: {
  employeeId: string; sourceType: DevelopmentSourceType; sourceRef: string;
  objective: string; priority: DevelopmentPriority; notes: string;
}): DevelopmentNeedVersion {
  if (!d4ReferenceFixture.employees.some((item) => item.id === input.employeeId)) throw new Error("Employee tidak ditemukan pada data demo.");
  if (!availableDevelopmentSources(input.employeeId, input.sourceType).some((item) => item.ref === input.sourceRef)) throw new Error("Referensi sumber tidak sesuai employee atau belum tersedia.");
  if (!input.objective.trim()) throw new Error("Development objective wajib diisi.");
  if (typeof window === "undefined") throw new Error("Penyimpanan demo hanya tersedia di browser.");
  const record: DevelopmentNeedVersion = {
    ...input, objective: input.objective.trim(), notes: input.notes.trim(),
    id: window.crypto.randomUUID(), needId: window.crypto.randomUUID(), revision: 1,
    source: "local-demo", status: "Identified", createdAt: new Date().toISOString(), actor: "Akun demo lokal",
  };
  writeVersion(record);
  return record;
}

export function updateDevelopmentNeed(needId: string, status: DevelopmentStatus, notes: string): DevelopmentNeedVersion {
  const previous = listLatestDevelopmentNeeds().find((item) => item.needId === needId);
  if (!previous) throw new Error("Development need tidak ditemukan.");
  if (typeof window === "undefined") throw new Error("Penyimpanan demo hanya tersedia di browser.");
  const record: DevelopmentNeedVersion = {
    ...previous, id: window.crypto.randomUUID(), revision: previous.revision + 1, status,
    notes: notes.trim(), source: "local-demo", createdAt: new Date().toISOString(), actor: "Akun demo lokal",
  };
  writeVersion(record);
  return record;
}
