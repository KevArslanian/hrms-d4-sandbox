"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { D4Shell } from "../shared/ui";
import { createD4BrowserClient, hasSupabaseConfig } from "./client";
import { LiveModuleContent, moduleLabels, type LiveModule } from "./LiveModuleContent";
import { SupabaseD4Repository } from "./repository";
import type { D4LiveSnapshot } from "./types";
import { OwnerPreview } from "./OwnerPreview";

function validModule(value?: string): LiveModule {
  return value && value in moduleLabels ? value as LiveModule : "dashboard";
}

function sidebarModule(module: LiveModule) {
  if (module === "kpi") return "performance";
  if (module === "development") return "competency";
  return module;
}

export function LiveD4Screen({ initialModule, ownerPreview = false }: { initialModule?: string; ownerPreview?: boolean }) {
  const router = useRouter();
  const configured = hasSupabaseConfig();
  const client = useMemo(() => configured ? createD4BrowserClient() : null, [configured]);
  const repository = useMemo(() => client ? new SupabaseD4Repository(client) : null, [client]);
  const activeModule = validModule(initialModule);
  const [status, setStatus] = useState<"loading" | "preview" | "login" | "ready" | "error">(ownerPreview ? "preview" : "loading");
  const [snapshot, setSnapshot] = useState<D4LiveSnapshot | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (ownerPreview) return;
    let active = true;
    async function load() {
      if (!client || !repository) {
        if (active) { setStatus("error"); setError("URL dan publishable key Supabase belum diatur di lingkungan lokal."); }
        return;
      }
      const { data, error: authError } = await client.auth.getUser();
      if (!active) return;
      if (authError || !data.user) { setStatus("login"); return; }
      try {
        const next = await repository.loadSnapshot();
        if (active) { setSnapshot(next); setStatus("ready"); setError(""); }
      } catch (cause) {
        if (active) { setStatus("error"); setError(cause instanceof Error ? cause.message : "Data Supabase gagal dimuat."); }
      }
    }
    void load();
    return () => { active = false; };
  }, [client, repository, ownerPreview]);

  async function signIn() {
    if (!client || !repository) return;
    setBusy(true); setError("");
    try {
      const { error: signInError } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw signInError;
      setPassword("");
      const next = await repository.loadSnapshot();
      setSnapshot(next); setStatus("ready");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Login gagal."); }
    finally { setBusy(false); }
  }

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
    setSnapshot(null); setStatus("login"); setMessage(""); setError("");
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
      : status === "preview" ? <OwnerPreview />
      : status === "login" ? <section className="max-w-md rounded-xl border border-[#dce5ef] bg-white p-6 shadow-sm"><h2 className="text-lg font-bold text-[#2b456d]">Masuk ke aplikasi HRMS</h2><p className="mt-2 text-xs leading-relaxed text-[#7185a0]">Gunakan akun aplikasi HRMS yang sudah diberi akses data. Login GitHub untuk mengelola dashboard Supabase tidak otomatis masuk ke aplikasi ini.</p><label className="mt-5 block text-xs font-semibold text-[#526987]">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#d6e0ea] px-3 text-sm font-normal" /></label><label className="mt-4 block text-xs font-semibold text-[#526987]">Kata sandi<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void signIn(); }} className="mt-2 h-10 w-full rounded-md border border-[#d6e0ea] px-3 text-sm font-normal" /></label><button type="button" disabled={busy || !email || !password} onClick={signIn} className="mt-5 h-10 w-full rounded-md bg-[#087e69] text-sm font-bold text-white disabled:opacity-50">{busy ? "Memproses..." : "Masuk"}</button>{error && <p role="alert" className="mt-3 text-xs text-[#b44550]">{error}</p>}<p className="mt-5 border-t border-[#e3eaf2] pt-4 text-xs leading-relaxed text-[#7185a0]">Minta akses akun aplikasi HRMS kepada pengelola proyek. Data yang terlihat mengikuti peran akun di Supabase.</p></section>
      : status === "error" ? <section role="alert" className="rounded-lg border border-[#f0c7cd] bg-[#fff3f4] p-5 text-sm text-[#a7434c]">{error}</section>
        : snapshot && repository ? <><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2" role="tablist" aria-label="Modul D4">{(["performance", "competency", "training", "dashboard"] as LiveModule[]).map((key) => <button type="button" role="tab" aria-selected={sidebarModule(activeModule) === key} key={key} onClick={() => { router.push(`/live?module=${key}`); setMessage(""); setError(""); }} className={`rounded-md px-3 py-2 text-xs font-semibold ${sidebarModule(activeModule) === key ? "bg-[#0a8175] text-white" : "border border-[#dce5ef] bg-white text-[#56718f]"}`}>{key === "performance" ? "Performance & KPI" : key === "competency" ? "Competency Needs" : key === "training" ? "Training Tracking" : "KPI Dashboard"}</button>)}</div><span className="rounded-full bg-[#e8f5f2] px-3 py-1.5 text-[11px] font-semibold text-[#238370]">{snapshot.role} · Supabase</span></div><div className="mb-4 flex flex-wrap gap-2">{sidebarModule(activeModule) === "performance" && <button type="button" onClick={() => router.push("/live?module=kpi")} className="rounded-md border border-[#cbd8e8] px-3 py-2 text-xs font-semibold text-[#426384]">Kelola KPI Scorecard</button>}{sidebarModule(activeModule) === "competency" && <button type="button" onClick={() => router.push("/live?module=development")} className="rounded-md border border-[#cbd8e8] px-3 py-2 text-xs font-semibold text-[#426384]">Kelola Development Needs</button>}</div><LiveModuleContent module={activeModule} snapshot={snapshot} busy={busy} runWrite={runWrite} />{(error || message) && <p role={error ? "alert" : "status"} className={`mt-4 rounded-md px-4 py-3 text-sm ${error ? "bg-[#fff1f2] text-[#af4d56]" : "bg-[#e9f7ef] text-[#227a58]"}`}>{error || message}</p>}</> : null}
  </div></D4Shell>;
}
