"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { D4Shell } from "../shared/ui";
import { createD4BrowserClient, hasSupabaseConfig } from "./client";
import { LiveModuleContent } from "./LiveModuleContent";
import { PeoplePages } from "./pages/PeoplePages";
import { PerformancePages } from "./pages/PerformancePages";
import { TrainingPages } from "./pages/TrainingPages";
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
    performance: ["list", "add", "edit", "detail", "history", "scorecard"],
    competency: ["competency", "assessment"],
    training: ["list", "add", "progress", "history"],
    dashboard: ["dashboard"],
    development: ["list", "development-new"],
    kpi: ["list", "scorecard"],
  };
  return value && allowed[module].includes(value) ? value : allowed[module][0];
}

function LoadingState() {
  return <section role="status" className="max-w-[820px] rounded-xl border border-[#e0e7f1] bg-white p-6 shadow-sm">
    <h1 className="text-lg font-semibold text-[#243b65]">Memuat data D4</h1>
    <p className="mt-3 text-sm text-[#607796]">Mengambil data performance, KPI, kompetensi, dan training...</p>
    <div className="mt-6 space-y-3" aria-hidden="true">{[0, 1, 2, 3].map((index) => <div key={index} className="h-3 animate-pulse rounded-full bg-[#e8eef8]" style={{ width: `${96 - index * 8}%` }} />)}</div>
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

  return <D4Shell live activeModule={activeModule} navigationEnabled={status === "ready"} accountName={snapshot?.reference.employees.find((employee) => employee.id === snapshot.actorEmployeeId)?.fullName} accountRole={snapshot?.role} people={people} onSignOut={status === "ready" ? signOut : undefined}>
    <div className="mx-auto max-w-[1604px]">
      {status === "loading" ? <LoadingState /> : status === "error" ? <section role="alert" className="max-w-[820px] rounded-xl border border-[#f0c7cd] bg-white p-6 shadow-sm"><h1 className="text-lg font-semibold text-[#983c48]">Data D4 belum dapat dimuat</h1><p className="mt-3 text-sm text-[#8c4c56]">{error}</p><div className="mt-5 flex gap-2"><button type="button" onClick={() => { setStatus("loading"); setRetryKey((key) => key + 1); }} className="rounded-md bg-[#3b6ff5] px-4 py-2 text-sm font-semibold text-white">Coba lagi</button><button type="button" onClick={signOut} className="rounded-md border border-[#d7e1ee] px-4 py-2 text-sm text-[#526a89]">Keluar</button></div></section> : snapshot ? <>
        {(currentModule === "performance" || (currentModule === "kpi" && view === "scorecard")) && <PerformancePages {...shared} view={view as "list" | "add" | "edit" | "detail" | "history" | "scorecard"} employeeId={employeeId} evaluationId={evaluationId} />}
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
