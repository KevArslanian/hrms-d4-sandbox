"use client";

import { useEffect, useState } from "react";

type Row = Record<string, string | number | null>;
type PreviewData = Record<"employees" | "positions" | "departments" | "kpi" | "performance" | "competency" | "development" | "training", Row[]>;

export function OwnerPreview() {
  const [data, setData] = useState<PreviewData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/owner-preview", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Data pratinjau belum tersedia.");
        return response.json() as Promise<PreviewData>;
      })
      .then(setData)
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Data gagal dimuat."); });
    return () => controller.abort();
  }, []);
  if (error) return <p role="alert" className="rounded-lg bg-red-50 p-5 text-red-700">{error}</p>;
  if (!data) return <p role="status" className="rounded-lg bg-white p-5">Memuat data Supabase...</p>;

  const positions = new Map(data.positions.map((item) => [item.id, item.title]));
  const departments = new Map(data.departments.map((item) => [item.id, item.name]));
  const sections = [
    ["KPI D3 (0–100)", data.kpi, (row: Row) => `${row.period}: ${row.kpi_score}/100`],
    ["Evaluasi D4 (1–5)", data.performance, (row: Row) => `${row.period}: ${row.overall_score ?? "-"}/5 · ${row.status}`],
    ["Kompetensi D4", data.competency, (row: Row) => `${row.effective_date}: ${row.overall_status}`],
    ["Development D4", data.development, (row: Row) => `Prioritas ${row.priority}`],
    ["Training D4", data.training, (row: Row) => `${row.activity_date}: ${row.activity}`],
  ] as const;
  return <div className="space-y-5">
    <div className="rounded-lg border border-[#cfe8de] bg-[#edfaf4] p-5"><h2 className="text-lg font-bold text-[#1d335b]">Pratinjau data Supabase · baca saja</h2><p className="mt-1 text-sm text-[#526987]">Akses pratinjau dilindungi login Vercel. Data employee berasal dari D3 dan ringkasan D4 dibaca langsung dari Supabase.</p></div>
    <section className="rounded-lg border border-[#dce5ef] bg-white p-5"><h3 className="mb-3 font-bold text-[#243f67]">Employee master D3 · {data.employees.length} orang</h3><div className="grid gap-3 sm:grid-cols-2">{data.employees.map((employee) => <div key={employee.id} className="rounded-md border border-[#e2e9f2] p-3 text-sm"><strong>{employee.full_name}</strong><p className="text-[#627995]">{employee.employee_id} · {positions.get(employee.position_id) ?? "Posisi belum tersedia"} · {departments.get(employee.department_id) ?? "Departemen belum tersedia"}</p></div>)}</div></section>
    <div className="grid gap-4 lg:grid-cols-2">{sections.map(([title, rows, describe]) => <section key={title} className="rounded-lg border border-[#dce5ef] bg-white p-5"><h3 className="mb-3 font-bold text-[#243f67]">{title} · {rows.length}</h3>{rows.length ? rows.map((row, index) => <p key={index} className="border-t border-[#e2e9f2] py-2 text-sm text-[#526987]"><strong>{data.employees.find((employee) => employee.id === row.employee_id)?.full_name ?? "Employee"}</strong> · {describe(row)}</p>) : <p className="text-sm text-[#7387a2]">Belum ada data.</p>}</section>)}</div>
  </div>;
}
