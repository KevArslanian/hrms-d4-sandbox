"use client";

import { ChevronDown, MoreVertical, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { getKpiStoredSnapshot, listKpiRecords, subscribeKpiRecords } from "../kpi/service";
import { d4ReferenceFixture } from "../shared/fixtures";
import { D4Shell } from "../shared/ui";
import { EvaluationForm } from "./EvaluationForm";
import { getPerformanceStoredSnapshot, listPerformanceEvaluations, subscribePerformance } from "./service";
import type { ReviewStatus } from "./types";

const pageSize = 8;

function statusClass(status: ReviewStatus | "Draft" | "Not Evaluated") {
  switch (status) {
    case "On Track": return "border-[#c9edda] bg-[#e8f7ed] text-[#28845a]";
    case "Needs Review": return "border-[#ffe3a2] bg-[#fff9dc] text-[#ba8b18]";
    case "Needs Attention": return "border-[#ffd5d8] bg-[#fff0f1] text-[#ca5661]";
    case "Draft": return "border-[#d7d9ef] bg-[#f2f3fb] text-[#7574a1]";
    default: return "border-[#cbdfff] bg-[#f0f6ff] text-[#5585c4]";
  }
}

function periodLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-01T00:00:00.000Z`));
}

export function PerformanceScreen() {
  const performanceSnapshot = useSyncExternalStore(subscribePerformance, getPerformanceStoredSnapshot, () => "");
  const kpiSnapshot = useSyncExternalStore(subscribeKpiRecords, getKpiStoredSnapshot, () => "");
  const evaluations = useMemo(() => listPerformanceEvaluations(performanceSnapshot), [performanceSnapshot]);
  const kpiRecords = useMemo(() => listKpiRecords(kpiSnapshot), [kpiSnapshot]);
  const [search, setSearch] = useState("");
  const [positionId, setPositionId] = useState("");
  const [period, setPeriod] = useState("2026-09");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [formEmployeeId, setFormEmployeeId] = useState<string | null>(null);
  const [menuEmployeeId, setMenuEmployeeId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const employees = d4ReferenceFixture.employees.filter((item) => item.employeeId !== "FIX-D4-EMP-001");
  const rows = employees.map((employee) => {
    const evaluation = evaluations.find((item) => item.employeeId === employee.id && item.period === period);
    const kpi = kpiRecords.find((item) => item.employeeId === employee.id && item.period === period);
    const position = d4ReferenceFixture.positions.find((item) => item.id === employee.positionId);
    return { employee, evaluation, kpi, position };
  }).filter((row) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${row.employee.fullName} ${row.employee.employeeId}`.toLowerCase().includes(query);
    const matchesPosition = !positionId || row.employee.positionId === positionId;
    const rowStatus = row.evaluation?.status === "draft" ? "Draft" : row.evaluation?.reviewStatus ?? "Not Evaluated";
    return matchesSearch && matchesPosition && (!status || rowStatus === status);
  });
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function openForm(employeeId?: string) {
    setMenuEmployeeId(null);
    setFormEmployeeId(employeeId ?? "d4000000-0000-4000-8000-000000000009");
  }

  return <D4Shell>
    <div className="max-w-[1040px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-[27px] font-bold tracking-tight text-[#1d335b]">Performance & KPI</h1><p className="mt-1 text-[13px] text-[#7786a1]">Manage employee performance evaluations and track KPI by position and evaluation period.</p></div></div>
      <div className="mb-4 rounded-lg border border-[#cde5f7] bg-[#f2f9ff] px-4 py-3 text-xs text-[#326285]">Data yang tampil adalah fixture demo lokal. Skor KPI berasal dari modul KPI pada periode yang sama. Status review diisi manual, bukan hasil keputusan HR otomatis.</div>
      <section className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-[#e1e7f0] bg-white p-3 shadow-[0_1px_4px_rgba(19,44,80,.04)]">
        <label className="relative min-w-[220px] flex-1 sm:max-w-[310px]"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b9bba]" /><input aria-label="Cari employee" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by Employee&apos;s Name" className="h-9 w-full rounded-md border border-[#dbe3f6] bg-[#f3f5ff] pl-9 pr-3 text-xs text-[#27436d] outline-none focus:border-[#7da2d4]" /></label>
        <label className="relative"><span className="sr-only">Filter posisi</span><select value={positionId} onChange={(event) => { setPositionId(event.target.value); setPage(1); }} className="h-9 min-w-[120px] appearance-none rounded-md border border-[#e1e7f0] bg-white pl-3 pr-7 text-xs text-[#385171]"><option value="">All Position</option>{d4ReferenceFixture.positions.filter((item) => item.code !== "FIX-D4-POS").map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><ChevronDown size={12} className="pointer-events-none absolute right-2 top-3 text-[#71839f]" /></label>
        <label className="relative"><span className="sr-only">Filter periode</span><input type="month" value={period} onChange={(event) => { setPeriod(event.target.value); setPage(1); }} className="h-9 rounded-md border border-[#e1e7f0] bg-white px-3 text-xs text-[#385171]" /></label>
        <label className="relative"><span className="sr-only">Filter status</span><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-9 min-w-[125px] appearance-none rounded-md border border-[#e1e7f0] bg-white pl-3 pr-7 text-xs text-[#385171]"><option value="">All Status</option><option>Needs Review</option><option>On Track</option><option>Needs Attention</option><option>Draft</option><option>Not Evaluated</option></select><ChevronDown size={12} className="pointer-events-none absolute right-2 top-3 text-[#71839f]" /></label>
        <button type="button" onClick={() => openForm()} className="ml-auto inline-flex h-9 items-center gap-2 rounded-md bg-[#078a62] px-4 text-xs font-bold text-white hover:bg-[#067553]"><Plus size={14} /> Add Evaluation</button>
      </section>

      <section className="overflow-hidden rounded-lg border border-[#e5eaf1] bg-white shadow-[0_1px_4px_rgba(19,44,80,.05)]">
        <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-[12px]"><thead className="bg-[#f8fafd] text-[10px] font-bold uppercase tracking-wide text-[#7184a6]"><tr><th className="px-4 py-3">Employees</th><th className="px-4 py-3">Position</th><th className="px-4 py-3">Period</th><th className="px-4 py-3">Performance</th><th className="px-4 py-3">KPI Scores</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y divide-[#edf0f5]">{visibleRows.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-[#8d9ab0]">Tidak ada employee sesuai filter.</td></tr> : visibleRows.map(({ employee, evaluation, kpi, position }) => {
          const label = evaluation?.status === "draft" ? "Draft" : evaluation?.reviewStatus ?? "Not Evaluated";
          return <tr key={employee.id} className="hover:bg-[#fafcff]"><td className="px-4 py-3"><strong className="block text-[#243a5e]">{employee.fullName}</strong><small className="text-[10px] text-[#8493ab]">{employee.employeeId}</small></td><td className="px-4 py-3 text-[#415779]">{position?.title ?? "–"}</td><td className="px-4 py-3 text-[#415779]">{periodLabel(period)}</td><td className="px-4 py-3 text-[#415779]">{evaluation?.overallScore === null || evaluation?.overallScore === undefined ? "–" : `${(evaluation.overallScore / 5 * 100).toFixed(0)}%`}</td><td className="px-4 py-3 text-[#415779]">{kpi ? `${(kpi.totalScore / 5 * 100).toFixed(0)}%` : "–"}</td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${statusClass(label)}`}><span className="size-1.5 rounded-full bg-current" /> {label}</span></td><td className="relative px-4 py-3"><button type="button" aria-label={`Aksi ${employee.fullName}`} onClick={() => setMenuEmployeeId(menuEmployeeId === employee.id ? null : employee.id)} className="rounded-md p-1 text-[#657da0] hover:bg-[#edf2f9]"><MoreVertical size={15} /></button>{menuEmployeeId === employee.id && <div className="absolute right-5 top-9 z-10 w-36 rounded-md border border-[#d8e2ee] bg-white p-1 shadow-lg">{evaluation && <Link href={`/performance/${evaluation.id}`} className="block rounded px-3 py-2 text-xs text-[#294870] hover:bg-[#f2f6fc]">View Detail</Link>}<button type="button" onClick={() => openForm(employee.id)} className="block w-full rounded px-3 py-2 text-left text-xs text-[#294870] hover:bg-[#f2f6fc]">Add Evaluation</button><Link href={`/kpi?employeeId=${employee.id}`} className="block rounded px-3 py-2 text-xs text-[#294870] hover:bg-[#f2f6fc]">KPI Scorecard</Link></div>}</td></tr>;
        })}</tbody></table></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f5] px-4 py-3 text-[11px] text-[#8190a8]"><span>Showing {rows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, rows.length)} of {rows.length} follow-up items</span><div className="flex items-center gap-1"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded border border-[#e2e8f1] px-2 py-1 disabled:opacity-40">Previous</button>{Array.from({ length: totalPages }, (_, index) => <button type="button" key={index} onClick={() => setPage(index + 1)} className={`size-6 rounded border text-[10px] ${currentPage === index + 1 ? "border-[#078a62] bg-[#078a62] text-white" : "border-[#e2e8f1]"}`}>{index + 1}</button>)}<button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="rounded border border-[#e2e8f1] px-2 py-1 disabled:opacity-40">Next</button></div></div>
      </section>
      {message && <p role="status" className="mt-4 rounded-md bg-[#e8f7ed] px-3 py-2 text-sm text-[#21815c]">{message}</p>}
    </div>
    {formEmployeeId && <EvaluationForm employeeId={formEmployeeId} onClose={() => setFormEmployeeId(null)} onSaved={(text) => { setMessage(text); setFormEmployeeId(null); }} />}
  </D4Shell>;
}
