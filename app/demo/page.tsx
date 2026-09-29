"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { D4Shell } from "@/modules/d4/shared/ui";
import { createD4BrowserClient } from "@/modules/d4/supabase/client";
import { buildDemoSnapshot, type DemoPerson } from "@/modules/d4/supabase/demo/buildDemoSnapshot";
import { PerformancePages } from "@/modules/d4/supabase/pages/PerformancePages";
import { RoleKpiCatalog, type RoleKpiRow } from "@/modules/d4/supabase/demo/RoleKpiCatalog";
import { PeoplePages } from "@/modules/d4/supabase/pages/PeoplePages";
import { TrainingPages } from "@/modules/d4/supabase/pages/TrainingPages";
import type { D4LiveSnapshot } from "@/modules/d4/supabase/types";

export default function DemoPage() {
  const search = useSyncExternalStore(() => () => {}, () => window.location.search, () => null);
  const [snapshot, setSnapshot] = useState<D4LiveSnapshot | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [roleKpis, setRoleKpis] = useState<RoleKpiRow[]>([]);
  useEffect(() => {
    let active = true;
    const client = createD4BrowserClient();
    void Promise.all([
      client.from("d4_figma_demo_people").select("*").order("sort_order"),
      client.from("d4_figma_demo_trend").select("quarter,performance_avg,kpi_avg").order("sort_order"),
      client.from("d4_kpi_role_catalog").select("role_order,role_name,indicator_order,kpi_name,target,weight_percent").order("role_order").order("indicator_order"),
    ]).then(([people, trend, catalog]) => {
      if (!active) return;
      if (people.error || trend.error || catalog.error) setError(people.error?.message ?? trend.error?.message ?? catalog.error!.message);
      else {
        setRoleKpis((catalog.data ?? []) as RoleKpiRow[]);
        setSnapshot(buildDemoSnapshot((people.data ?? []) as DemoPerson[], trend.data ?? []));
      }
    });
    return () => { active = false; };
  }, []);
  if (search === null) return null;
  const query = new URLSearchParams(search);
  const currentModule = query.get("module") ?? "performance";
  const view = query.get("view") ?? (currentModule === "dashboard" ? "dashboard" : currentModule === "competency" ? "competency" : "list");
  const employeeId = query.get("employee") ?? (view !== "list" && view !== "roles" && currentModule !== "dashboard" && currentModule !== "competency" ? snapshot?.reference.employees[0]?.id : undefined);
  const navigate = (url: string) => window.location.assign(url.replace("/live", "/demo"));
  const runWrite = async () => { setMessage("Mode demo hanya untuk pratinjau. Data contoh tersimpan di Supabase dan tidak diubah dari halaman ini."); };
  const props = { snapshot: snapshot!, busy: false, runWrite, navigate, employeeId,
    evaluationId: query.get("evaluation") ?? undefined, trainingId: query.get("training") ?? undefined,
    sourceRef: query.get("source") ?? undefined };
  return <D4Shell live demo activeModule={currentModule === "development" ? "competency" : currentModule as "performance" | "competency" | "training" | "dashboard"} canvasBackground={currentModule === "development" ? "white" : undefined} accountName="Figma Demo" accountRole="Read only" people={snapshot?.reference.employees ?? []}>
    <div className="mx-auto max-w-[1604px]">
      {error ? <p role="alert" className="rounded-lg bg-white p-6 text-red-600">Data demo Supabase gagal dimuat: {error}</p> : !snapshot ? <p role="status" className="rounded-lg bg-white p-6">Memuat data demo dari Supabase...</p> : <>
        {message && <p role="status" className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}
        {currentModule === "performance" && view === "roles" && <RoleKpiCatalog rows={roleKpis} />}
        {currentModule === "performance" && view !== "roles" && <>{view === "list" && <div className="mb-4 flex justify-end"><a href="/demo?module=performance&view=roles" className="rounded-lg bg-[#3b6ff5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#315fd7]">KPI per Jabatan</a></div>}<PerformancePages {...props} view={view as "list" | "add" | "edit" | "detail" | "history" | "scorecard"} /></>}
        {(currentModule === "dashboard" || currentModule === "competency") && <PeoplePages {...props} view={currentModule === "dashboard" ? "dashboard" : "competency"} />}
        {(currentModule === "training" || currentModule === "development") && <TrainingPages {...props} view={view as "list" | "add" | "progress" | "history" | "development-new"} />}
      </>}
    </div>
  </D4Shell>;
}
