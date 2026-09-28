import { listLatestDevelopmentNeeds } from "../development/service";
import { d4ReferenceFixture } from "../shared/fixtures";
import { trainingFixtureVersions } from "./fixtures";
import type { TrainingStatus, TrainingVersion } from "./types";

const storageKey = "hrms-d4-training-versions-v1";
const changeEvent = "hrms-d4-training-changed";

export function getTrainingStoredSnapshot(): string {
  if (typeof window === "undefined") return "";
  try { return window.localStorage.getItem(storageKey) ?? ""; } catch { return ""; }
}

export function subscribeTraining(listener: () => void): () => void {
  window.addEventListener("storage", listener); window.addEventListener(changeEvent, listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener(changeEvent, listener); };
}

export function listTrainingVersions(snapshot = getTrainingStoredSnapshot()): TrainingVersion[] {
  try {
    const saved: unknown = JSON.parse(snapshot || "[]");
    const valid = Array.isArray(saved) ? saved.filter((item): item is TrainingVersion =>
      item !== null && typeof item === "object" && item.source === "local-demo" &&
      typeof item.id === "string" && typeof item.trainingId === "string" &&
      typeof item.employeeId === "string" && typeof item.developmentNeedId === "string") : [];
    return [...valid, ...trainingFixtureVersions];
  } catch { return [...trainingFixtureVersions]; }
}

export function listLatestTrainingRecords(snapshot = getTrainingStoredSnapshot()): TrainingVersion[] {
  const seen = new Set<string>();
  return listTrainingVersions(snapshot).filter((item) => {
    if (seen.has(item.trainingId)) return false;
    seen.add(item.trainingId);
    return true;
  });
}

function writeVersion(record: TrainingVersion) {
  if (typeof window === "undefined") throw new Error("Penyimpanan demo hanya tersedia di browser.");
  const saved = listTrainingVersions().filter((item) => item.source === "local-demo");
  window.localStorage.setItem(storageKey, JSON.stringify([record, ...saved]));
  window.dispatchEvent(new Event(changeEvent));
}

export function createTraining(input: {
  employeeId: string; developmentNeedId: string; activity: string; date: string;
  status: TrainingStatus; result: string; notes: string;
}): TrainingVersion {
  if (!d4ReferenceFixture.employees.some((item) => item.id === input.employeeId)) throw new Error("Employee tidak ditemukan pada data demo.");
  const need = listLatestDevelopmentNeeds().find((item) => item.needId === input.developmentNeedId);
  if (!need || need.employeeId !== input.employeeId) throw new Error("Development need harus milik employee yang dipilih.");
  if (!input.activity.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(Date.parse(input.date))) throw new Error("Aktivitas dan tanggal yang valid wajib diisi.");
  if (input.status === "Completed" && !input.result.trim()) throw new Error("Hasil wajib diisi saat training selesai.");
  if (typeof window === "undefined") throw new Error("Penyimpanan demo hanya tersedia di browser.");
  const record: TrainingVersion = {
    ...input, activity: input.activity.trim(), result: input.result.trim(), notes: input.notes.trim(),
    id: window.crypto.randomUUID(), trainingId: window.crypto.randomUUID(), revision: 1,
    source: "local-demo", createdAt: new Date().toISOString(), actor: "Akun demo lokal",
  };
  writeVersion(record);
  return record;
}

export function updateTraining(trainingId: string, status: TrainingStatus, result: string, notes: string): TrainingVersion {
  const previous = listLatestTrainingRecords().find((item) => item.trainingId === trainingId);
  if (!previous) throw new Error("Training tidak ditemukan.");
  if (status === "Completed" && !result.trim()) throw new Error("Hasil wajib diisi saat training selesai.");
  if (typeof window === "undefined") throw new Error("Penyimpanan demo hanya tersedia di browser.");
  const record: TrainingVersion = {
    ...previous, id: window.crypto.randomUUID(), revision: previous.revision + 1,
    status, result: result.trim(), notes: notes.trim(), source: "local-demo",
    createdAt: new Date().toISOString(), actor: "Akun demo lokal",
  };
  writeVersion(record);
  return record;
}
