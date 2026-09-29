import type { KpiCatalog } from "../../kpi/catalog";
import type { D4LiveSnapshot } from "../../supabase/types";
import type { D4DataSource } from "./source";

export class D4RequestError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => null) as { data?: T; error?: { code: string; message: string } } | null;
  if (!response.ok || !body || body.error) {
    throw new D4RequestError(response.status, body?.error?.code ?? "SERVER_ERROR", body?.error?.message ?? "Permintaan ke server gagal. Periksa koneksi lalu coba lagi.");
  }
  return body.data as T;
}

const post = <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) });

/** Live data through the D4 REST API, so every call is visible in the browser Network tab. */
export const apiSource: D4DataSource = {
  mode: "live",
  loadSnapshot: () => request<D4LiveSnapshot>("/api/d4/snapshot"),
  loadKpiCatalog: () => request<KpiCatalog>("/api/d4/kpi-catalog"),
  createEvaluation: async (input) => (await post<{ id: string }>("/api/d4/performance-evaluations", input)).id,
  createKpiAssessment: async (input) => (await post<{ id: string }>("/api/d4/kpi-assessments", input)).id,
  saveCompetency: async (input) => (await post<{ id: string }>("/api/d4/competency-assessments", input)).id,
  createDevelopment: async (input) => (await post<{ id: string }>("/api/d4/development-needs", input)).id,
  updateDevelopment: async (needId, status, notes) => { await post(`/api/d4/development-needs/${encodeURIComponent(needId)}/versions`, { status, notes }); },
  createTraining: async (input) => (await post<{ id: string }>("/api/d4/training-records", input)).id,
  updateTraining: async (trainingId, status, result, notes) => { await post(`/api/d4/training-records/${encodeURIComponent(trainingId)}/versions`, { status, result, notes }); },
};
