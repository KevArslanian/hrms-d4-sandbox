"use client";

import { ArrowLeft, BarChart3, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, History, MoreVertical, Plus, Search, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { EvaluationAspect, EvaluationInput, EvaluationStatus, PerformanceEvaluation, ReviewStatus } from "../../performance/types";
import type { EmployeeReference } from "../../shared/types";
import type { SupabaseD4Repository } from "../repository";
import type { D4LiveSnapshot } from "../types";

type View = "list" | "add" | "edit" | "detail" | "history" | "scorecard";
type Props = {
  view: View;
  snapshot: D4LiveSnapshot;
  busy: boolean;
  runWrite: (operation: (repo: SupabaseD4Repository, data: D4LiveSnapshot) => Promise<unknown>, success: string) => Promise<void>;
  employeeId?: string;
  evaluationId?: string;
  navigate: (url: string) => void;
};

const aspects: readonly EvaluationAspect[] = [
  { name: "Work Quality", weight: 20, score: null, notes: "" },
  { name: "Productivity", weight: 15, score: null, notes: "" },
  { name: "Accuracy", weight: 15, score: null, notes: "" },
  { name: "Team Collaboration", weight: 15, score: null, notes: "" },
  { name: "Initiative & Growth", weight: 10, score: null, notes: "" },
  { name: "Discipline", weight: 15, score: null, notes: "" },
  { name: "Attendance", weight: 10, score: null, notes: "" },
];
const inputClass = "h-10 w-full rounded-md border border-[#d7dfeb] bg-white px-3 text-sm text-[#233c65] outline-none focus:border-[#3b6ff5] focus:ring-2 focus:ring-[#3b6ff5]/15";
const selectClass = `${inputClass} cursor-pointer`;
const softButton = "inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-[#d9e2f1] bg-white px-3 text-xs font-semibold text-[#2b4774] hover:bg-[#f4f7fd]";
const primaryButton = "inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-[#3b6ff5] px-4 text-xs font-semibold text-white hover:bg-[#315dd2] disabled:cursor-not-allowed disabled:opacity-50";

function url(view: View, employee?: string, evaluation?: string) {
  const params = new URLSearchParams({ module: "performance", view });
  if (employee) params.set("employee", employee);
  if (evaluation) params.set("evaluation", evaluation);
  return `/live?${params.toString()}`;
}

function formatPeriod(period: string) {
  const date = new Date(`${period}-01T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? period : new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function roleCanWrite(snapshot: D4LiveSnapshot) { return snapshot.role === "HR" || snapshot.role === "MANAGER"; }
function employeePosition(snapshot: D4LiveSnapshot, employee: EmployeeReference) { return snapshot.reference.positions.find((item) => item.id === employee.positionId); }
function employeeDepartment(snapshot: D4LiveSnapshot, employee: EmployeeReference) { return snapshot.reference.departments.find((item) => item.id === employee.departmentId); }
function latestForEmployee(snapshot: D4LiveSnapshot, employeeId: string) {
  return snapshot.performance.filter((item) => item.employeeId === employeeId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}
function latestKpi(snapshot: D4LiveSnapshot, employeeId: string) {
  return snapshot.kpi.filter((item) => item.employeeId === employeeId).sort((a, b) => b.period.localeCompare(a.period) || b.createdAt.localeCompare(a.createdAt))[0];
}
function statusLabel(evaluation?: PerformanceEvaluation) {
  return evaluation ? evaluation.status === "draft" ? "Pending" : evaluation.reviewStatus : "Not Evaluated";
}
function Status({ evaluation }: { evaluation?: PerformanceEvaluation }) {
  const label = statusLabel(evaluation);
  const tone = label === "On Track" ? "bg-[#e8f7ed] text-[#248454]" : label === "Needs Attention" ? "bg-[#ffe9e9] text-[#cf555b]" : label === "Not Evaluated" ? "bg-[#eaf2ff] text-[#3b6ff5]" : "bg-[#fff3c6] text-[#b9870f]";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>● {label}</span>;
}

function List({ snapshot, navigate }: Props) {
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("");
  const [period, setPeriod] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState<string | null>(null);
  const positions = snapshot.reference.positions.slice().sort((a, b) => a.title.localeCompare(b.title));
  const periods = [...new Set(snapshot.performance.map((item) => item.period))].sort().reverse();
  const rows = useMemo(() => snapshot.reference.employees.map((employee) => ({
    employee,
    evaluation: snapshot.performance.filter((item) => item.employeeId === employee.id && (!period || item.period === period)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
    kpi: snapshot.kpi.filter((item) => item.employeeId === employee.id && (!period || item.period === period)).sort((a, b) => b.period.localeCompare(a.period) || b.createdAt.localeCompare(a.createdAt))[0],
    position: employeePosition(snapshot, employee),
  })).filter((row) => {
    const term = search.toLocaleLowerCase();
    return (!term || `${row.employee.fullName} ${row.employee.employeeId}`.toLocaleLowerCase().includes(term))
      && (!position || row.position?.id === position)
      && (!period || row.evaluation?.period === period || row.kpi?.period === period)
      && (!status || statusLabel(row.evaluation) === status);
  }).sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName)), [snapshot, search, position, period, status]);
  const pages = Math.max(1, Math.ceil(rows.length / 8));
  const currentPage = Math.min(page, pages);
  const visible = rows.slice((currentPage - 1) * 8, currentPage * 8);
  const filter = <T extends string>(setter: (value: T) => void) => (event: React.ChangeEvent<HTMLSelectElement>) => { setter(event.target.value as T); setPage(1); };
  return <div className="space-y-5">
    <header><h1 className="text-[25px] font-bold tracking-tight text-[#1d335b]">Performance &amp; KPI</h1><p className="mt-1 text-xs text-[#7786a1]">Manage employee performance evaluations and track KPI by position and evaluation period.</p></header>
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#e4e9f2] bg-white p-4 shadow-sm">
      <label className="relative min-w-[220px] flex-1 sm:max-w-[400px]"><Search size={15} className="absolute left-3 top-3 text-[#8292aa]" /><span className="sr-only">Cari nama pegawai</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by Employee’s Name" className={`${inputClass} bg-[#f3f6fb] pl-9`} /></label>
      <select aria-label="Filter posisi" value={position} onChange={filter(setPosition)} className={`${selectClass} sm:w-40`}><option value="">All Positions</option>{positions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
      <select aria-label="Filter periode" value={period} onChange={filter(setPeriod)} className={`${selectClass} sm:w-32`}><option value="">All Periods</option>{periods.map((item) => <option key={item} value={item}>{formatPeriod(item)}</option>)}</select>
      <select aria-label="Filter status" value={status} onChange={filter(setStatus)} className={`${selectClass} sm:w-36`}><option value="">All Status</option>{["On Track", "Needs Review", "Needs Attention", "Pending", "Not Evaluated"].map((item) => <option key={item}>{item}</option>)}</select>
      {roleCanWrite(snapshot) && <button type="button" onClick={() => navigate(url("add"))} className={`${primaryButton} sm:ml-auto`}><Plus size={15} /> Add Evaluation</button>}
    </div>
    <section className="overflow-x-auto rounded-lg border border-[#e4e9f2] bg-white shadow-sm"><table className="w-full min-w-[830px] text-left text-xs"><thead className="bg-[#f8fafd] text-[10px] font-bold uppercase tracking-[.08em] text-[#7184a6]"><tr><th className="px-4 py-4">Employees</th><th className="px-4 py-4">Position</th><th className="px-4 py-4">Period</th><th className="px-4 py-4">Performance</th><th className="px-4 py-4">KPI Score</th><th className="px-4 py-4">Status</th><th className="px-4 py-4">Actions</th></tr></thead><tbody className="divide-y divide-[#edf0f5]">{visible.length ? visible.map(({ employee, evaluation, kpi, position: rowPosition }) => <tr key={employee.id} className="hover:bg-[#f9fbff]"><td className="px-4 py-3"><strong className="block text-[#23395d]">{employee.fullName}</strong><small className="text-[#8090a9]">{employee.employeeId}</small></td><td className="px-4 py-3 text-[#405574]">{rowPosition?.title ?? "-"}</td><td className="px-4 py-3 text-[#405574]">{formatPeriod(evaluation?.period ?? kpi?.period ?? "")}</td><td className="px-4 py-3 font-semibold text-[#254e87]">{evaluation?.overallScore == null ? "-" : `${Math.round(evaluation.overallScore * 20)}%`}</td><td className="px-4 py-3 font-semibold text-[#254e87]">{kpi ? `${kpi.score}%` : "-"}</td><td className="px-4 py-3"><Status evaluation={evaluation} /></td><td className="relative px-4 py-3"><button type="button" aria-label={`Aksi ${employee.fullName}`} aria-expanded={menu === employee.id} onClick={() => setMenu(menu === employee.id ? null : employee.id)} className="rounded p-1 text-[#617c9d] hover:bg-[#edf3ff]"><MoreVertical size={17} /></button>{menu === employee.id && <div className="absolute right-4 z-20 w-40 rounded-md border border-[#dce5f0] bg-white p-1 shadow-xl">{(["detail", "edit", "scorecard", "history"] as const).map((view) => <button key={view} type="button" disabled={view === "edit" && (!evaluation || !roleCanWrite(snapshot))} onClick={() => { setMenu(null); navigate(url(view, employee.id, evaluation?.id)); }} className="block w-full rounded px-3 py-2 text-left text-xs capitalize text-[#334e73] hover:bg-[#edf3ff] disabled:opacity-40">{view === "scorecard" ? "KPI Scorecard" : view === "history" ? "View History" : view === "detail" ? "View Detail" : "Edit Evaluation"}</button>)}</div>}</td></tr>) : <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-[#8292aa]">Tidak ada pegawai sesuai filter.</td></tr>}</tbody></table><footer className="flex items-center justify-between gap-3 border-t border-[#edf0f5] px-4 py-3 text-[11px] text-[#7b8aa2]"><span>Showing {rows.length ? (currentPage - 1) * 8 + 1 : 0}-{Math.min(currentPage * 8, rows.length)} of {rows.length} employees</span><div className="flex items-center gap-1"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className={softButton}><ChevronLeft size={13} /> Previous</button><span className="px-2">{currentPage} / {pages}</span><button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} className={softButton}>Next <ChevronRight size={13} /></button></div></footer></section>
  </div>;
}

function initialInput(employeeId: string, existing?: PerformanceEvaluation): EvaluationInput {
  if (existing) return { employeeId: existing.employeeId, period: existing.period, evaluationDate: existing.evaluationDate, evaluator: existing.evaluator, status: existing.status, reviewStatus: existing.reviewStatus, overallScore: existing.overallScore, aspects: existing.aspects.map((item) => ({ ...item })), generalNotes: existing.generalNotes, evidenceReference: existing.evidenceReference };
  return { employeeId, period: new Date().toISOString().slice(0, 7), evaluationDate: new Date().toISOString().slice(0, 10), evaluator: "", status: "draft", reviewStatus: "Needs Review", overallScore: null, aspects: aspects.map((item) => ({ ...item })), generalNotes: "", evidenceReference: null };
}

function Form({ snapshot, busy, runWrite, navigate, employeeId, existing }: Props & { existing?: PerformanceEvaluation }) {
  const [input, setInput] = useState<EvaluationInput>(() => initialInput(employeeId ?? "", existing));
  const [error, setError] = useState("");
  const [showExtras, setShowExtras] = useState(false);
  const employee = snapshot.reference.employees.find((item) => item.id === input.employeeId);
  const position = employee && employeePosition(snapshot, employee);
  const department = employee && employeeDepartment(snapshot, employee);
  const close = () => navigate(existing ? url("detail", existing.employeeId, existing.id) : url("list"));
  const canWrite = roleCanWrite(snapshot);
  function updateAspect(index: number, patch: Partial<EvaluationAspect>) {
    setInput((previous) => {
      const next = previous.aspects.map((item, at) => at === index ? { ...item, ...patch } : item);
      const overallScore = next.length && next.every((item) => item.score !== null) ? Math.round(next.reduce((sum, item) => sum + (item.score ?? 0) * item.weight, 0) / 100 * 100) / 100 : null;
      return { ...previous, aspects: next, overallScore };
    });
    setError("");
  }
  async function save(status: EvaluationStatus) {
    if (!canWrite) return;
    if (!input.employeeId) { setError("Pilih pegawai terlebih dahulu."); return; }
    if (status === "completed" && input.aspects.some((item) => item.score === null)) { setError("Isi skor seluruh aspek sebelum Submit."); return; }
    setError("");
    await runWrite((repo, data) => repo.savePerformance({ ...input, status }, data.reference), existing ? "Revisi evaluasi tersimpan sebagai riwayat baru." : status === "draft" ? "Draft evaluasi tersimpan." : "Evaluasi tersimpan.");
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/80 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section role="dialog" aria-modal="true" aria-labelledby="performance-form-title" className="max-h-[94vh] w-full max-w-[1180px] overflow-y-auto rounded-md bg-white p-5 shadow-2xl sm:p-8">
    <div className="mb-5 flex items-center justify-between"><h1 id="performance-form-title" className="text-lg font-bold text-[#1d335b]">{existing ? "Edit Evaluation" : "Add Evaluation"}</h1><button type="button" onClick={close} aria-label="Tutup" className="rounded p-2 text-[#8190a8] hover:bg-[#f4f7fb]"><X size={18} /></button></div>
    {existing && <p className="mb-4 rounded-md bg-[#eef5ff] px-3 py-2 text-xs text-[#3d638e]">Perubahan disimpan sebagai evaluasi baru. Riwayat sebelumnya tetap tersedia.</p>}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><label className="text-xs font-semibold uppercase text-[#627795]">Employee *<select value={input.employeeId} disabled={!!existing} onChange={(event) => setInput({ ...input, employeeId: event.target.value })} className={`mt-2 ${selectClass}`}><option value="">Select Employee</option>{snapshot.reference.employees.map((item) => <option key={item.id} value={item.id}>{item.fullName} | {item.employeeId}</option>)}</select></label><label className="text-xs font-semibold uppercase text-[#627795]">Position<div className={`mt-2 flex items-center bg-[#f4f6fb] ${inputClass}`}>{position?.title ?? "-"}</div></label><label className="text-xs font-semibold uppercase text-[#627795]">Department<div className={`mt-2 flex items-center bg-[#f4f6fb] ${inputClass}`}>{department?.name ?? "-"}</div></label><label className="text-xs font-semibold uppercase text-[#627795]">Evaluation Period *<input type="month" value={input.period} onChange={(event) => setInput({ ...input, period: event.target.value })} className={`mt-2 ${inputClass}`} /></label><label className="text-xs font-semibold uppercase text-[#627795]">Evaluation Date *<input type="date" value={input.evaluationDate} onChange={(event) => setInput({ ...input, evaluationDate: event.target.value })} className={`mt-2 ${inputClass}`} /></label><label className="text-xs font-semibold uppercase text-[#627795]">Evaluator *<input value={input.evaluator} onChange={(event) => setInput({ ...input, evaluator: event.target.value })} className={`mt-2 ${inputClass}`} /></label></div>
    <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(240px,.8fr)]"><div className="overflow-x-auto rounded-lg border border-[#e0e7f0]"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-[#f5f8fc] text-[10px] font-bold uppercase tracking-wide text-[#7990ab]"><tr><th className="px-4 py-3">Aspect</th><th className="px-3 py-3">Weight</th><th className="px-3 py-3">Score</th><th className="px-3 py-3">Comments</th></tr></thead><tbody className="divide-y divide-[#e9eef4]">{input.aspects.map((item, index) => <tr key={`${item.name}-${index}`}><td className="px-4 py-3 text-[#263b5c]">{item.name}</td><td className="px-3 py-3 text-[#5c7191]">{item.weight}%</td><td className="px-3 py-3"><input type="number" min="1" max="5" step="1" aria-label={`Score ${item.name}`} value={item.score ?? ""} onChange={(event) => updateAspect(index, { score: event.target.value ? Number(event.target.value) : null })} className="h-8 w-16 rounded border border-[#d7dfeb] px-2" /></td><td className="px-3 py-3"><input aria-label={`Comments ${item.name}`} value={item.notes} onChange={(event) => updateAspect(index, { notes: event.target.value })} className="h-8 w-full rounded border border-[#d7dfeb] px-2" /></td></tr>)}</tbody></table></div><div className="flex flex-col items-center"><h2 className="mb-5 text-center text-2xl font-bold text-[#1f3c6f]">Overall Score</h2><div className="flex size-40 items-center justify-center rounded-full bg-[#dfe6f0] sm:size-48" style={{ background: input.overallScore === null ? undefined : `conic-gradient(#3b6ff5 ${input.overallScore / 5 * 100}%, #dfe6f0 0)` }}><div className="flex size-28 flex-col items-center justify-center rounded-full bg-white text-[#1d335b] sm:size-36"><strong className="text-3xl">{input.overallScore?.toFixed(2) ?? "-"}</strong>{input.overallScore !== null && <span className="text-xs text-[#7284a0]">/ 5.0</span>}</div></div><span className="mt-5 rounded-full border border-[#d4e4ff] bg-[#eef5ff] px-4 py-1.5 text-xs font-semibold text-[#3b6ff5]">{input.overallScore === null ? "Not Calculated" : "Calculated from aspects"}</span></div></div>
    <button type="button" aria-expanded={showExtras} onClick={() => setShowExtras(!showExtras)} className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-[#3b6ff5]">Review status, notes &amp; evidence <ChevronDown size={14} /></button>{showExtras && <div className="mt-3 grid gap-3 sm:grid-cols-3"><label className="text-xs font-semibold text-[#627795]">Review Status<select value={input.reviewStatus} onChange={(event) => setInput({ ...input, reviewStatus: event.target.value as ReviewStatus })} className={`mt-2 ${selectClass}`}><option>Needs Review</option><option>On Track</option><option>Needs Attention</option></select></label><label className="text-xs font-semibold text-[#627795]">Evaluation Notes<textarea value={input.generalNotes} onChange={(event) => setInput({ ...input, generalNotes: event.target.value })} rows={2} className={`mt-2 h-auto min-h-20 py-2 ${inputClass}`} /></label><label className="text-xs font-semibold text-[#627795]">Evidence Reference<input value={input.evidenceReference ?? ""} onChange={(event) => setInput({ ...input, evidenceReference: event.target.value || null })} className={`mt-2 ${inputClass}`} /></label></div>}
    {error && <p role="alert" className="mt-4 rounded-md bg-[#fff0f1] p-3 text-sm text-[#b43e48]">{error}</p>}
    <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={close} className={softButton}>Cancel</button><button type="button" disabled={busy || !canWrite} onClick={() => void save("draft")} className={`${softButton} border-[#bdd1ec] bg-[#f4f8ff] text-[#3164a8]`}>Save Draft</button><button type="button" disabled={busy || !canWrite} onClick={() => void save("completed")} className={primaryButton}>{existing ? "Save Revision" : "Submit"}</button></div>
  </section></div>;
}

function ProfileHeader({ snapshot, employee, evaluation, navigate }: { snapshot: D4LiveSnapshot; employee: EmployeeReference; evaluation?: PerformanceEvaluation; navigate: Props["navigate"] }) {
  const position = employeePosition(snapshot, employee);
  const department = employeeDepartment(snapshot, employee);
  return <><button type="button" onClick={() => navigate(url("list"))} className={`${softButton} mb-5`}><ArrowLeft size={14} /> Back</button><header className="flex flex-wrap items-center gap-5 rounded-lg border border-[#e4e9f2] bg-white p-5 shadow-sm"><span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#4d5b71] text-xl text-white">{employee.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span><div className="min-w-0 flex-1"><h1 className="text-2xl font-bold text-[#1d3b6e]">{employee.fullName}</h1><p className="text-sm text-[#677c9b]">{position?.title ?? "Posisi belum ada"} | {department?.name ?? "Departemen belum ada"}</p><p className="text-xs text-[#8293a9]">{employee.employeeId}</p></div><nav aria-label="Performance navigation" className="flex flex-wrap gap-2">{roleCanWrite(snapshot) && evaluation && <button type="button" onClick={() => navigate(url("edit", employee.id, evaluation.id))} className={softButton}>✎ Edit Evaluation</button>}<button type="button" onClick={() => navigate(url("scorecard", employee.id, evaluation?.id))} className={softButton}><BarChart3 size={14} /> KPI Scorecard</button><button type="button" onClick={() => navigate(url("history", employee.id, evaluation?.id))} className={softButton}><History size={14} /> View History</button></nav></header></>;
}

function Detail({ snapshot, employee, evaluation, navigate }: { snapshot: D4LiveSnapshot; employee: EmployeeReference; evaluation?: PerformanceEvaluation; navigate: Props["navigate"] }) {
  const kpi = latestKpi(snapshot, employee.id);
  return <div className="space-y-8"><ProfileHeader snapshot={snapshot} employee={employee} evaluation={evaluation} navigate={navigate} /><div className="grid gap-5 xl:grid-cols-[190px_minmax(0,1fr)_260px]"><div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1"><div className="flex items-center gap-3 rounded-lg bg-[#eaf2f8] p-4 shadow-md"><Star size={26} className="text-[#1f4178]" /><div><strong className="text-2xl text-[#1d3b6e]">{evaluation?.overallScore?.toFixed(1) ?? "-"}<small className="text-sm text-[#697d99]"> / 5.0</small></strong><p className="text-xs text-[#6e82a0]">Overall Performance</p></div></div><div className="flex items-center gap-3 rounded-lg bg-[#eaf2f8] p-4 shadow-md"><BarChart3 size={26} className="text-[#1f4178]" /><div><strong className="text-2xl text-[#1d3b6e]">{kpi?.score ?? "-"}<small className="text-sm text-[#697d99]"> / 100</small></strong><p className="text-xs text-[#6e82a0]">KPI Score</p></div></div><div className="flex items-center gap-3 rounded-lg bg-[#eaf2f8] p-4 shadow-md"><Check size={26} className="text-[#1f4178]" /><div><strong className="text-lg text-[#1d3b6e]">{evaluation ? evaluation.status === "completed" ? "Completed" : "Draft" : "Not Evaluated"}</strong><p className="text-xs text-[#6e82a0]">Evaluation Status</p></div></div></div><div className="overflow-x-auto rounded-lg border border-[#e4e9f2] bg-white"><table className="w-full min-w-[470px] text-left text-xs"><thead className="bg-[#f8fafd] text-[10px] font-bold uppercase tracking-wide text-[#8194ae]"><tr><th className="px-4 py-4">Aspect</th><th className="px-3 py-4">Weight</th><th className="px-3 py-4">Score</th><th className="px-3 py-4">Comments</th></tr></thead><tbody className="divide-y divide-[#edf1f5]">{evaluation?.aspects.length ? evaluation.aspects.map((item, index) => <tr key={`${item.name}-${index}`}><td className="px-4 py-4 text-[#2a3d5e]">{item.name}</td><td className="px-3 py-4">{item.weight}%</td><td className="px-3 py-4">{item.score ?? "-"}</td><td className="px-3 py-4 text-[#536984]">{item.notes || "-"}</td></tr>) : <tr><td colSpan={4} className="px-4 py-10 text-center text-[#8698b1]">Belum ada evaluasi untuk pegawai ini.</td></tr>}</tbody></table></div><aside className="space-y-5 rounded-lg border border-[#e4e9f2] bg-white p-5 text-xs text-[#526784]"><h2 className="text-center text-lg font-bold leading-tight text-[#23395c]">Employee Context &amp; Evaluation</h2><p><strong>Position:</strong> {employeePosition(snapshot, employee)?.title ?? "-"}</p><p><strong>Department:</strong> {employeeDepartment(snapshot, employee)?.name ?? "-"}</p><p><strong>Evaluation Period:</strong> {evaluation ? formatPeriod(evaluation.period) : "-"}</p><p><strong>Evaluator:</strong> {evaluation?.evaluator || "-"}</p><div><h3 className="font-bold text-[#23395c]">Evaluation Notes</h3><p className="mt-2 rounded-md bg-[#f6f8fc] p-3">{evaluation?.generalNotes || "Belum ada catatan."}</p></div><div><h3 className="font-bold text-[#23395c]">Evidence &amp; Audit</h3><p className="mt-2 break-words text-[#7a8ca5]">Reference: {evaluation?.evidenceReference || "-"}</p><p className="mt-2 text-[#7a8ca5]">Created by {evaluation?.actor || "-"} · {evaluation ? formatDate(evaluation.createdAt) : "-"}</p></div></aside></div></div>;
}

function HistoryPage({ snapshot, employee, evaluation, navigate }: { snapshot: D4LiveSnapshot; employee: EmployeeReference; evaluation?: PerformanceEvaluation; navigate: Props["navigate"] }) {
  const [type, setType] = useState("");
  const [period, setPeriod] = useState("");
  const [newest, setNewest] = useState(true);
  const entries = [
    ...snapshot.performance.filter((item) => item.employeeId === employee.id).map((item) => ({ id: item.id, date: item.evaluationDate || item.createdAt, period: item.period, type: "Performance", value: item.overallScore === null ? "-" : `${item.overallScore.toFixed(2)} / 5`, status: item.status === "draft" ? "Draft" : item.reviewStatus, actor: item.actor, reference: item.evidenceReference || item.id })),
    ...snapshot.kpi.filter((item) => item.employeeId === employee.id).map((item) => ({ id: item.id, date: item.createdAt, period: item.period, type: "KPI", value: `${item.score} / 100`, status: "Recorded", actor: "-", reference: item.id })),
  ].filter((item) => (!type || item.type === type) && (!period || item.period === period)).sort((a, b) => newest ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  const periods = [...new Set([...snapshot.performance, ...snapshot.kpi].filter((item) => item.employeeId === employee.id).map((item) => item.period))].sort().reverse();
  return <div className="space-y-7"><ProfileHeader snapshot={snapshot} employee={employee} evaluation={evaluation} navigate={navigate} /><section className="rounded-lg border border-[#e4e9f2] bg-white p-5 shadow-sm"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold text-[#1d335b]">Performance &amp; KPI History</h2><p className="mt-1 text-xs text-[#7487a1]">Historical records are preserved by period and actor.</p></div><div className="flex flex-wrap gap-2"><select aria-label="Filter tipe" value={type} onChange={(event) => setType(event.target.value)} className={`${selectClass} w-32`}><option value="">All Types</option><option>Performance</option><option>KPI</option></select><select aria-label="Filter periode" value={period} onChange={(event) => setPeriod(event.target.value)} className={`${selectClass} w-32`}><option value="">All Periods</option>{periods.map((item) => <option key={item} value={item}>{formatPeriod(item)}</option>)}</select><button type="button" onClick={() => setNewest(!newest)} className={softButton}>{newest ? "Newest First" : "Oldest First"} <ChevronDown size={13} /></button></div></div><div className="overflow-x-auto"><table className="w-full min-w-[740px] text-left text-xs"><thead className="bg-[#f7f9fc] text-[10px] font-bold uppercase tracking-wide text-[#8194ae]"><tr>{["Date", "Period", "Type", "Value", "Status", "Actor", "Reference"].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead><tbody className="divide-y divide-[#e9eef4]">{entries.length ? entries.map((item) => <tr key={`${item.type}-${item.id}`}><td className="px-3 py-4">{formatDate(item.date)}</td><td className="px-3 py-4">{formatPeriod(item.period)}</td><td className="px-3 py-4"><span className="rounded-full bg-[#ecf3ff] px-2 py-1 font-semibold text-[#3b6ff5]">{item.type}</span></td><td className="px-3 py-4 font-semibold text-[#234371]">{item.value}</td><td className="px-3 py-4">{item.status}</td><td className="px-3 py-4">{item.actor}</td><td className="max-w-44 truncate px-3 py-4" title={item.reference}>{item.type === "Performance" ? <button type="button" onClick={() => navigate(url("detail", employee.id, item.id))} className="font-semibold text-[#3b6ff5] hover:underline">{item.reference}</button> : item.reference}</td></tr>) : <tr><td colSpan={7} className="px-3 py-12 text-center text-[#8190a8]">Belum ada riwayat sesuai filter.</td></tr>}</tbody></table></div></section></div>;
}

function Scorecard({ snapshot, employee, evaluation, navigate }: { snapshot: D4LiveSnapshot; employee: EmployeeReference; evaluation?: PerformanceEvaluation; navigate: Props["navigate"] }) {
  const kpi = latestKpi(snapshot, employee.id);
  return <div className="space-y-7"><ProfileHeader snapshot={snapshot} employee={employee} evaluation={evaluation} navigate={navigate} /><section className="rounded-lg border border-[#e4e9f2] bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><BarChart3 size={24} className="text-[#3b6ff5]" /><div><h2 className="text-xl font-bold text-[#1d335b]">Position-based KPI Scorecard</h2><p className="text-xs text-[#8190a8]">{employeePosition(snapshot, employee)?.title ?? "Posisi belum tersedia"}</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-[#edf4ff] p-5"><span className="text-xs text-[#697e9c]">Overall KPI Score</span><strong className="mt-1 block text-2xl text-[#1d3b6e]">{kpi ? `${kpi.score} / 100` : "-"}</strong></div><div className="rounded-lg bg-[#edf4ff] p-5"><span className="text-xs text-[#697e9c]">Performance Score</span><strong className="mt-1 block text-2xl text-[#1d3b6e]">{evaluation?.overallScore == null ? "-" : `${evaluation.overallScore.toFixed(2)} / 5`}</strong></div><div className="rounded-lg bg-[#edf4ff] p-5"><span className="text-xs text-[#697e9c]">Period</span><strong className="mt-1 block text-2xl text-[#1d3b6e]">{formatPeriod(kpi?.period ?? evaluation?.period ?? "")}</strong></div></div><div className="mt-7 rounded-lg border border-[#d9e2f1] bg-[#f7f9fd] p-6"><div className="flex items-center gap-3"><ClipboardList size={21} className="text-[#6783ae]" /><h3 className="font-bold text-[#29456d]">Detail indikator belum tersedia</h3></div><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#647b9a]">Supabase saat ini menyediakan nilai KPI ringkas per pegawai dan periode. Target, realisasi, bobot, serta skor tiap indikator seperti pada desain Figma belum tersimpan, sehingga tabel rinci belum dapat ditampilkan.</p>{kpi?.notes && <p className="mt-4 rounded-md bg-white p-3 text-xs text-[#526b89]"><strong>Catatan KPI:</strong> {kpi.notes}</p>}</div></section></div>;
}

export function PerformancePages(props: Props) {
  const { view, snapshot, employeeId, evaluationId, navigate } = props;
  const requested = snapshot.performance.find((item) => item.id === evaluationId);
  const employee = snapshot.reference.employees.find((item) => item.id === (employeeId || requested?.employeeId));
  const evaluation = requested?.employeeId === employee?.id ? requested : employee ? latestForEmployee(snapshot, employee.id) : undefined;
  if (view === "list") return <List {...props} />;
  if (view === "add") return <><List {...props} view="list" /><Form {...props} /></>;
  if (!employee) return <div className="rounded-lg border border-[#dce5ef] bg-white p-8 text-center"><p className="text-sm text-[#647b9a]">Pegawai tidak ditemukan.</p><button type="button" onClick={() => navigate(url("list"))} className={`${softButton} mt-4`}>Kembali ke daftar</button></div>;
  if (view === "edit") return evaluation ? <><Detail snapshot={snapshot} employee={employee} evaluation={evaluation} navigate={navigate} /><Form key={evaluation.id} {...props} employeeId={employee.id} existing={evaluation} /></> : <div className="rounded-lg bg-white p-8 text-sm text-[#647b9a]">Belum ada evaluasi untuk diedit. <button type="button" onClick={() => navigate(url("add", employee.id))} className="font-bold text-[#3b6ff5]">Tambah evaluasi</button></div>;
  if (view === "detail") return <Detail snapshot={snapshot} employee={employee} evaluation={evaluation} navigate={navigate} />;
  if (view === "history") return <HistoryPage snapshot={snapshot} employee={employee} evaluation={evaluation} navigate={navigate} />;
  return <Scorecard snapshot={snapshot} employee={employee} evaluation={evaluation} navigate={navigate} />;
}
