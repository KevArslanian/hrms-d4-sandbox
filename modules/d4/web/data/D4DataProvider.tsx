"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { KpiCatalog } from "../../kpi/catalog";
import type { D4LiveSnapshot } from "../../supabase/types";
import { apiSource, D4RequestError } from "./api-source";
import { createFixtureSource } from "./fixture-source";
import type { D4DataSource } from "./source";

export type ToastMessage = { id: number; tone: "success" | "error"; text: string };

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

type D4Data = {
  mode: D4DataSource["mode"];
  status: "loading" | "ready" | "error";
  error: string;
  snapshot: D4LiveSnapshot | null;
  catalog: KpiCatalog | null;
  busy: boolean;
  reload: () => void;
  /** Runs a write, refreshes the snapshot, and shows a toast. Returns the error message for inline form feedback. */
  run: <T>(operation: (source: D4DataSource) => Promise<T>, success: string) => Promise<Result<T>>;
  toasts: ToastMessage[];
  dismissToast: (id: number) => void;
};

const Context = createContext<D4Data | null>(null);

export function useD4() {
  const value = useContext(Context);
  if (!value) throw new Error("useD4 must be used inside D4DataProvider");
  return value;
}

/** Same snapshot as useD4, but only for screens rendered after the shell has finished loading. */
export function useSnapshot() {
  const { snapshot } = useD4();
  if (!snapshot) throw new Error("Snapshot not loaded yet");
  return snapshot;
}

export function D4DataProvider({ children, mode }: { children: ReactNode; mode: "live" | "fixture" }) {
  const router = useRouter();
  const source = useMemo(() => mode === "fixture" ? createFixtureSource() : apiSource, [mode]);
  const [status, setStatus] = useState<D4Data["status"]>("loading");
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<D4LiveSnapshot | null>(null);
  const [catalog, setCatalog] = useState<KpiCatalog | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback((tone: ToastMessage["tone"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 4000);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([source.loadSnapshot(), source.loadKpiCatalog()]).then(([nextSnapshot, nextCatalog]) => {
      if (!active) return;
      setSnapshot(nextSnapshot); setCatalog(nextCatalog); setStatus("ready"); setError("");
    }).catch((cause: unknown) => {
      if (!active) return;
      if (cause instanceof D4RequestError && cause.status === 401) { router.replace("/login"); return; }
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Data D4 gagal dimuat.");
    });
    return () => { active = false; };
  }, [source, router, attempt]);

  const run = useCallback(async <T,>(operation: (data: D4DataSource) => Promise<T>, success: string): Promise<Result<T>> => {
    setBusy(true);
    try {
      const value = await operation(source);
      setSnapshot(await source.loadSnapshot());
      pushToast("success", success);
      return { ok: true, value };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Penyimpanan gagal.";
      pushToast("error", message);
      return { ok: false, error: message };
    } finally {
      setBusy(false);
    }
  }, [source, pushToast]);

  const value = useMemo<D4Data>(() => ({
    mode, status, error, snapshot, catalog, busy, run, toasts,
    reload: () => { setStatus("loading"); setAttempt((count) => count + 1); },
    dismissToast: (id) => setToasts((items) => items.filter((item) => item.id !== id)),
  }), [mode, status, error, snapshot, catalog, busy, run, toasts]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
