"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { D4Shell } from "../shared/ui";
import { createD4BrowserClient, hasSupabaseConfig } from "./client";
import { LiveModuleContent, moduleLabels, type LiveModule } from "./LiveModuleContent";
import { SupabaseD4Repository } from "./repository";
import type { D4LiveSnapshot } from "./types";

function validModule(value?: string): LiveModule {
  return value && value in moduleLabels ? value as LiveModule : "dashboard";
}

function sidebarModule(module: LiveModule) {
  if (module === "kpi") return "performance";
  if (module === "development") return "competency";
  return module;
}

export function LiveD4Screen({ initialModule }: { initialModule?: string }) {
  const router = useRouter();
  const configured = hasSupabaseConfig();
  const client = useMemo(() => configured ? createD4BrowserClient() : null, [configured]);
  const repository = useMemo(() => client ? new SupabaseD4Repository(client) : null, [client]);
  const activeModule = validModule(initialModule);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [snapshot, setSnapshot] = useState<D4LiveSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!client || !repository) {
        if (active) { setStatus("error"); setError("URL dan publishable key Supabase belum diatur di lingkungan lokal."); }
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
  }, [client, repository, router]);

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
    setSnapshot(null); setMessage(""); setError("");
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
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Penyimpanan gagal."); }
    finally { setBusy(false); }
  }

  return <D4Shell live activeModule={sidebarModule(activeModule)} navigationEnabled={status === "ready"}><div className="max-w-[1500px]"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-[27px] font-bold text-[#1d335b]">HRMS D4</h1><p className="mt-1 text-sm text-[#70829d]">Data dari proyek Supabase PISD x Andima Transportindo.</p></div>{status === "ready" && <button type="button" onClick={signOut} className="rounded-md border border-[#cbd8e8] px-3 py-2 text-xs font-semibold text-[#426384]">Keluar</button>}</div>
    {status === "loading" ? <div role="status" className="rounded-lg border border-[#dce5ef] bg-white p-8 text-center text-sm text-[#7790ac]">Memuat data...</div>
      : status === "error" ? <section role="alert" className="rounded-lg border border-[#f0c7cd] bg-[#fff3f4] p-5 text-sm text-[#a7434c]">{error}</section>
        : snapshot && repository ? <><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2" role="tablist" aria-label="Modul D4">{(["performance", "competency", "training", "dashboard"] as LiveModule[]).map((key) => <button type="button" role="tab" aria-selected={sidebarModule(activeModule) === key} key={key} onClick={() => { router.push(`/live?module=${key}`); setMessage(""); setError(""); }} className={`rounded-md px-3 py-2 text-xs font-semibold ${sidebarModule(activeModule) === key ? "bg-[#0a8175] text-white" : "border border-[#dce5ef] bg-white text-[#56718f]"}`}>{key === "performance" ? "Performance & KPI" : key === "competency" ? "Competency Needs" : key === "training" ? "Training Tracking" : "KPI Dashboard"}</button>)}</div><span className="rounded-full bg-[#e8f5f2] px-3 py-1.5 text-[11px] font-semibold text-[#238370]">{snapshot.role} · Supabase</span></div><div className="mb-4 flex flex-wrap gap-2">{sidebarModule(activeModule) === "performance" && <button type="button" onClick={() => router.push("/live?module=kpi")} className="rounded-md border border-[#cbd8e8] px-3 py-2 text-xs font-semibold text-[#426384]">Kelola KPI Scorecard</button>}{sidebarModule(activeModule) === "competency" && <button type="button" onClick={() => router.push("/live?module=development")} className="rounded-md border border-[#cbd8e8] px-3 py-2 text-xs font-semibold text-[#426384]">Kelola Development Needs</button>}</div><LiveModuleContent module={activeModule} snapshot={snapshot} busy={busy} runWrite={runWrite} />{(error || message) && <p role={error ? "alert" : "status"} className={`mt-4 rounded-md px-4 py-3 text-sm ${error ? "bg-[#fff1f2] text-[#af4d56]" : "bg-[#e9f7ef] text-[#227a58]"}`}>{error || message}</p>}</> : null}
  </div></D4Shell>;
}
