"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { D4Shell } from "../shared/ui";
import { createD4BrowserClient, hasSupabaseConfig } from "./client";
import { LiveModuleContent } from "./LiveModuleContent";
import { PeoplePages } from "./pages/PeoplePages";
import { PerformancePages } from "./pages/PerformancePages";
import { TrainingPages } from "./pages/TrainingPages";
import { RoleKpiCatalog } from "./RoleKpiCatalog";
import { SupabaseD4Repository } from "./repository";
import type { D4LiveSnapshot } from "./types";

type D4Module = "performance" | "competency" | "training" | "dashboard" | "development" | "kpi";
type ScreenProps = {
  initialModule?: string;
  initialView?: string;
  employeeId?: string;
  evaluationId?: string;
  trainingId?: string;
  sourceRef?: string;
};

function selectedModule(value?: string): D4Module {
  return (["performance", "competency", "training", "dashboard", "development", "kpi"] as string[]).includes(value ?? "")
    ? value as D4Module : "dashboard";
}

function selectedView(module: D4Module, value?: string) {
  const allowed: Record<D4Module, readonly string[]> = {
    performance: ["list", "add", "edit", "detail", "history", "scorecard", "roles"],
    competency: ["competency", "assessment"],
    training: ["list", "add", "progress", "history"],
    dashboard: ["dashboard"],
    development: ["list", "development-new"],
    kpi: ["list", "scorecard"],
  };
  return value && allowed[module].includes(value) ? value : allowed[module][0];
}

function LoadingState() {
  return <section role="status" className="min-h-[250px] max-w-[782px] rounded-xl border border-[#d9e2ec] bg-white p-6 sm:p-8">
    <h1 className="text-lg font-semibold text-[#243b65]">Memuat data D4</h1>
    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#edf3ff] px-3 py-1.5 text-xs font-medium text-[#3b6ff5]"><span aria-hidden="true" className="size-1.5 rounded-full bg-current" />Loading</span>
    <p className="mt-4 text-xs leading-5 text-[#7a8ba8]">Mengambil data performance, KPI, kompetensi, dan training...</p>
    <div className="mt-5 max-w-[620px] space-y-[8px]" aria-hidden="true">{[0, 1, 2, 3].map((index) => <div key={index} className="h-[10px] animate-pulse rounded-full bg-[#e7edf5]" />)}</div>
  </section>;
}

function ErrorState({ error, onRetry, onSignOut }: { error: string; onRetry: () => void; onSignOut: () => void }) {
  return <section role="alert" className="min-h-[250px] max-w-[782px] rounded-xl border border-[#d9e2ec] bg-white p-6 sm:p-8">
    <h1 className="text-lg font-semibold text-[#243b65]">Data D4 belum dapat dimuat</h1>
    <span className="mt-3 inline-flex rounded-full bg-[#fff0f1] px-3 py-1.5 text-xs font-medium text-[#d34d60]">Error</span>
    <p className="mt-4 break-words text-xs leading-5 text-[#7a8ba8]">{error}</p>
    <div className="mt-7 flex flex-wrap gap-2"><button type="button" onClick={onRetry} className="min-h-10 rounded-md bg-[#3b6ff5] px-4 text-xs font-medium text-white">Coba lagi</button><button type="button" onClick={onSignOut} className="min-h-10 rounded-md border border-[#d9e2ec] px-4 text-xs font-medium text-[#526a89]">Keluar</button></div>
  </section>;
}

export function LiveD4Screen({ initialModule, initialView, employeeId, evaluationId, trainingId, sourceRef }: ScreenProps) {
  const router = useRouter();
  const configured = hasSupabaseConfig();
  const client = useMemo(() => configured ? createD4BrowserClient() : null, [configured]);
  const repository = useMemo(() => client ? new SupabaseD4Repository(client) : null, [client]);
  const currentModule = selectedModule(initialModule);
  const view = selectedView(currentModule, initialView);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [snapshot, setSnapshot] = useState<D4LiveSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!client || !repository) {
        if (active) { setStatus("error"); setError("Konfigurasi Supabase belum tersedia."); }
        return;
      }
      const { data, error: authError } = await client.auth.getUser();
      if (!active) return;
      if (authError || !data.user) { router.replace("/login"); return; }
      try {
        const next = await repository.loadSnapshot();
        if (active) { setSnapshot(next); setStatus("ready"); setError(""); }
      } catch (cause) {
        if (active) { setStatus("error"); setError(cause instanceof Error ? cause.message : "Data Supabase gagal dimuat."); }
      }
    }
    void load();
    return () => { active = false; };
  }, [client, repository, router, retryKey]);

  useEffect(() => {
    if (status !== "ready" || !repository) return;
    let active = true;
    async function refresh() {
      try {
        const next = await repository!.loadSnapshot();
        if (active) { setSnapshot(next); setError(""); }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Data Supabase gagal diperbarui.");
      }
    }
    const onFocus = () => { void refresh(); };
    const onVisibility = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [repository, status]);

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
    setSnapshot(null);
    router.replace("/login");
    router.refresh();
  }

  async function runWrite(operation: (repo: SupabaseD4Repository, data: D4LiveSnapshot) => Promise<unknown>, success: string) {
    if (!repository || !snapshot) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await operation(repository, snapshot);
      setSnapshot(await repository.loadSnapshot());
      setMessage(success);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Penyimpanan gagal.");
    } finally {
      setBusy(false);
    }
  }

  const shared = { snapshot: snapshot!, busy, runWrite, navigate: (url: string) => { setMessage(""); setError(""); router.push(url); } };
  const activeModule = currentModule === "development" ? "competency" : currentModule === "kpi" ? "performance" : currentModule;
  const people = snapshot?.role === "EMPLOYEE" ? snapshot.reference.employees.filter((employee) => employee.id === snapshot.actorEmployeeId) : snapshot?.reference.employees;

  return <D4Shell live activeModule={activeModule} canvasBackground={currentModule === "development" ? "white" : undefined} navigationEnabled={status === "ready"} accountName={snapshot?.reference.employees.find((employee) => employee.id === snapshot.actorEmployeeId)?.fullName} accountRole={snapshot?.role} people={people} onSignOut={status === "ready" ? signOut : undefined}>
    <div className="mx-auto max-w-[1604px]">
      {status === "loading" ? <LoadingState /> : status === "error" ? <ErrorState error={error} onRetry={() => { setStatus("loading"); setRetryKey((key) => key + 1); }} onSignOut={() => { void signOut(); }} /> : snapshot ? <>
        {currentModule === "performance" && view === "roles" && <RoleKpiCatalog />}
        {(currentModule === "performance" && view !== "roles" || (currentModule === "kpi" && view === "scorecard")) && <PerformancePages {...shared} view={view as "list" | "add" | "edit" | "detail" | "history" | "scorecard"} employeeId={employeeId} evaluationId={evaluationId} />}
        {(currentModule === "dashboard" || (currentModule === "competency" && view === "competency")) && <PeoplePages {...shared} view={currentModule === "competency" ? "competency" : "dashboard"} />}
        {(currentModule === "training" || (currentModule === "development" && view === "development-new")) && <TrainingPages {...shared} view={view as "list" | "add" | "progress" | "history" | "development-new"} employeeId={employeeId} trainingId={trainingId} sourceRef={sourceRef} />}
        {currentModule === "competency" && view === "assessment" && <LiveModuleContent {...shared} module="competency" />}
        {currentModule === "development" && view === "list" && <LiveModuleContent {...shared} module="development" />}
        {currentModule === "kpi" && view === "list" && <LiveModuleContent {...shared} module="kpi" />}
        {(error || message) && <p role={error ? "alert" : "status"} className={`fixed right-5 top-5 z-[60] max-w-md rounded-md border px-4 py-3 text-sm shadow-lg ${error ? "border-[#f0c7cd] bg-[#fff1f2] text-[#a43f4b]" : "border-[#bde4ca] bg-[#e9f7ef] text-[#227a58]"}`}>{error || message}</p>}
      </> : null}
    </div>
  </D4Shell>;
}
