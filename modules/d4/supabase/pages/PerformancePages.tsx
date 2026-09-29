"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
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
type PersonProps = { snapshot: D4LiveSnapshot; employee: EmployeeReference; evaluation?: PerformanceEvaluation; navigate: Props["navigate"] };
const defaultAspects: readonly EvaluationAspect[] = [
  { name: "Work Quality", weight: 20, score: null, notes: "" },
  { name: "Productivity", weight: 15, score: null, notes: "" },
  { name: "Accuracy", weight: 15, score: null, notes: "" },
  { name: "Team Collaboration", weight: 15, score: null, notes: "" },
  { name: "Initiative & Growth", weight: 10, score: null, notes: "" },
  { name: "Discipline", weight: 15, score: null, notes: "" },
  { name: "Attendance", weight: 10, score: null, notes: "" },
];
const field = "h-[52px] w-full rounded-lg border border-black/20 bg-white px-4 text-sm font-normal text-[#90a1b9] outline-none focus:border-[#3b6ff5] focus:ring-2 focus:ring-[#3b6ff5]/10 disabled:bg-[#f6f7ff]";
const smallButton = "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#e5eaf0] bg-white px-4 text-xs font-semibold text-[#172033] hover:bg-[#f4f6fa] disabled:cursor-not-allowed disabled:opacity-40";
const primary = "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#3b6ff5] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#315fd7] disabled:cursor-not-allowed disabled:opacity-40";
const headings = "text-[12px] font-bold uppercase tracking-[.6px] text-[#94a3b8]";
const iconSizes: Record<string, [number, number]> = {
  search: [13.5, 13.5], chevron: [18, 18], plus: [11.6667, 11.6667], more: [2.66667, 10.6667],
  eye: [24.2258, 17], "panel-kpi": [19, 18], "panel-history": [20.0001, 19.9991],
  back: [9.00001, 11], history: [20.0001, 19.9991], edit: [16, 16], kpi: [19, 18],
  bars: [48, 46], star: [44.9974, 43.0004], check: [39.0001, 30.0001],
};
function Icon({ name, className = "" }: { name: string; className?: string }) {
  const [width, height] = iconSizes[name];
  return <Image src={`/figma/performance/${name}.svg`} width={width} height={height} alt="" aria-hidden="true" unoptimized className={`shrink-0 ${className}`} />;
}
function url(view: View, employee?: string, evaluation?: string) {
  const params = new URLSearchParams({ module: "performance", view });
  if (employee) params.set("employee", employee);
  if (evaluation) params.set("evaluation", evaluation);
  return `/live?${params}`;
}
function formatPeriod(period: string) {
  if (!period) return "-";
  const date = new Date(`${period}-01T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? period : new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}
function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(date);
}
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join(""); }
function canWrite(snapshot: D4LiveSnapshot) { return snapshot.role === "HR" || snapshot.role === "MANAGER"; }
function positionFor(snapshot: D4LiveSnapshot, employee: EmployeeReference) { return snapshot.reference.positions.find((item) => item.id === employee.positionId); }
function departmentFor(snapshot: D4LiveSnapshot, employee: EmployeeReference) { return snapshot.reference.departments.find((item) => item.id === employee.departmentId); }
function evaluationFor(snapshot: D4LiveSnapshot, employeeId: string, period?: string) {
  return snapshot.performance.filter((item) => item.employeeId === employeeId && (!period || item.period === period)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}
function kpiFor(snapshot: D4LiveSnapshot, employeeId: string, period?: string) {
  return snapshot.kpi.filter((item) => item.employeeId === employeeId && (!period || item.period === period)).sort((a, b) => b.period.localeCompare(a.period) || b.createdAt.localeCompare(a.createdAt))[0];
}
function statusLabel(evaluation?: PerformanceEvaluation) { return evaluation ? evaluation.status === "draft" ? "Pending" : evaluation.reviewStatus : "Not Evaluated"; }
function Badge({ children, tone = "green", dot = false }: { children: ReactNode; tone?: "green" | "yellow" | "red" | "blue" | "gray"; dot?: boolean }) {
  const colors = { green: "border-[#b9e6d0] bg-[#eaf7f0] text-[#16834b]", yellow: "border-[#fde68a] bg-[#fef9c3] text-[#b9870f]", red: "border-[#fecaca] bg-[#fee2e2] text-[#d04848]", blue: "border-[#bfdbfe] bg-[#eff6ff] text-[#3b6ff5]", gray: "border-[#e5eaf0] bg-[#f4f6fa] text-[#64748b]" };
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1 text-[11px] leading-4 ${colors[tone]}`}>{dot && <span className="size-1.5 rounded-full bg-current" />}{children}</span>;
}
function Status({ evaluation }: { evaluation?: PerformanceEvaluation }) {
  const label = statusLabel(evaluation);
  return <Badge dot tone={label === "On Track" ? "green" : label === "Needs Attention" ? "red" : label === "Not Evaluated" ? "blue" : "yellow"}>{label}</Badge>;
}
function SelectFilter({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <span className="relative block shrink-0"><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="h-[34px] w-[129px] cursor-pointer appearance-none rounded-lg border border-[#dee4dd] bg-white pl-3 pr-7 text-xs text-[#172033] outline-none focus:border-[#3b6ff5]"><option value="">{label}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><span className="pointer-events-none absolute right-2 top-2"><Icon name="chevron" /></span></span>;
}
function PeriodFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(value.slice(0, 4)) || new Date().getFullYear());
  return <div className="relative shrink-0" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button type="button" aria-expanded={open} aria-label="Filter periode" onClick={() => setOpen(!open)} className="flex h-[34px] w-[129px] items-center justify-between rounded-lg border border-[#dee4dd] bg-white px-3 text-xs text-[#172033]">{value ? formatPeriod(value) : "All Periods"}<Icon name="chevron" className={open ? "rotate-180" : ""} /></button>
    {open && <div className="absolute left-0 top-[35px] z-30 w-[164px] rounded-b-lg border border-[#dee4dd] bg-white p-2 shadow-lg"><div className="flex items-center justify-between text-xs"><button type="button" aria-label="Tahun sebelumnya" onClick={() => setYear(year - 1)} className="p-1"><ChevronLeft size={13} /></button><strong>{year}</strong><button type="button" aria-label="Tahun berikutnya" onClick={() => setYear(year + 1)} className="p-1"><ChevronRight size={13} /></button></div><div className="mt-2 grid grid-cols-4 gap-1">{Array.from({ length: 12 }, (_, index) => { const month = `${year}-${String(index + 1).padStart(2, "0")}`; return <button key={month} type="button" onClick={() => { onChange(month); setOpen(false); }} className={`rounded px-1 py-2 text-[10px] hover:bg-[#edf3ff] ${value === month ? "bg-[#d5d8e3]" : ""}`}>{new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(year, index))}</button>; })}</div><button type="button" onClick={() => { onChange(""); setOpen(false); }} className="mt-2 w-full rounded py-1 text-[10px] text-[#3b6ff5] hover:bg-[#edf3ff]">All Periods</button></div>}
  </div>;
}
function SelectedPerson({ snapshot, employee, evaluation, navigate, onClose }: PersonProps & { onClose: () => void }) {
  return <aside className="overflow-hidden rounded-lg border border-[#dce2ef] shadow-sm" aria-label={`Detail ringkas ${employee.fullName}`}>
    <div className="flex h-[60px] items-center justify-between bg-[#f1f3ff] px-4"><button type="button" onClick={onClose} className="text-xs text-[#405c87] hover:underline">Cancel</button></div>
    <div className="bg-[#1e3765] px-6 pb-12 pt-9 text-white">
      <div className="flex items-center gap-5"><span className="flex size-[100px] shrink-0 items-center justify-center rounded-full bg-[#505d6f] text-[40px] font-light">{initials(employee.fullName)}</span><div className="min-w-0"><h2 className="text-[30px] font-semibold leading-tight">{employee.fullName}</h2><p className="mt-1 text-base font-light text-[#c3cfe1]">{positionFor(snapshot, employee)?.title ?? "-"}</p></div></div>
      <dl className="mt-8 space-y-4 text-base"><div className="flex justify-between gap-4"><dt className="shrink-0 font-semibold">Employee ID</dt><dd className="text-right font-light">{employee.employeeId}</dd></div><div className="flex justify-between gap-4"><dt className="shrink-0 font-semibold">Department</dt><dd className="max-w-[225px] text-right font-light">{departmentFor(snapshot, employee)?.name ?? "-"}</dd></div><div className="flex justify-between gap-4"><dt className="shrink-0 font-semibold">Last Evaluation</dt><dd className="text-right font-light">{evaluation ? formatDate(evaluation.evaluationDate || evaluation.createdAt) : "-"}</dd></div><div className="flex justify-between gap-4"><dt className="font-semibold">Status</dt><dd className="font-light">{evaluation ? evaluation.status === "completed" ? "Completed" : "Draft" : "Not Evaluated"}</dd></div></dl>
      <div className="mt-10 grid grid-cols-2 gap-4"><button type="button" onClick={() => navigate(url("detail", employee.id, evaluation?.id))} className={`${primary} px-2 text-xs`}><Icon name="eye" /> View Detail</button><button type="button" onClick={() => navigate(url("history", employee.id, evaluation?.id))} className={`${primary} px-2 text-xs`}><Icon name="panel-history" /> View History</button><button type="button" onClick={() => navigate(url("scorecard", employee.id, evaluation?.id))} className={`${primary} col-span-2 text-xs`}><Icon name="panel-kpi" /> KPI Scorecard</button></div>
    </div>
  </aside>;
}
function List({ snapshot, navigate, employeeId }: Props) {
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("");
  const [period, setPeriod] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(employeeId ?? "");
  const rows = useMemo(() => snapshot.reference.employees.map((employee) => ({ employee, evaluation: evaluationFor(snapshot, employee.id, period), kpi: kpiFor(snapshot, employee.id, period), position: positionFor(snapshot, employee) })).filter((row) => {
    const term = search.toLocaleLowerCase();
    return (!term || `${row.employee.fullName} ${row.employee.employeeId}`.toLocaleLowerCase().includes(term)) && (!position || row.position?.id === position) && (!period || row.evaluation || row.kpi) && (!status || statusLabel(row.evaluation) === status);
  }).sort((a, b) => snapshot.isFigmaDemo ? snapshot.reference.employees.indexOf(a.employee) - snapshot.reference.employees.indexOf(b.employee) : a.employee.fullName.localeCompare(b.employee.fullName)), [snapshot, search, position, period, status]);
  const pageCount = Math.max(1, Math.ceil(rows.length / 8));
  const currentPage = Math.min(page, pageCount);
  const visible = rows.slice((currentPage - 1) * 8, currentPage * 8);
  const selected = snapshot.reference.employees.find((employee) => employee.id === selectedId);
  return <div>
    <header className="mb-[31px]"><h1 className="text-[25px] font-semibold tracking-[-.5px] text-[#172033]">Performance &amp; KPI</h1><p className="mt-1 text-xs text-[#64748b]">Manage employee performance evaluations and track KPI by position and evaluation period.</p></header>
    <div className="mb-8 flex min-h-[69px] flex-wrap items-center gap-10 rounded-xl border border-[#e5eaf0] bg-white px-[14px] py-[14px] shadow-[0_1px_1px_rgba(0,0,0,.05)]">
      <label className="relative w-full sm:w-[32%] sm:min-w-[240px]"><span className="absolute left-[10px] top-[10px]"><Icon name="search" /></span><span className="sr-only">Cari nama pegawai</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by Employee’s Name" className="h-[34px] w-full rounded-lg border border-[#e5eaf0] bg-[#f4f6fa] pl-[33px] pr-3 text-xs text-[#172033] outline-none placeholder:text-[#8c9ab0] focus:border-[#3b6ff5]" /></label>
      <SelectFilter label="All Positions" value={position} onChange={(value) => { setPosition(value); setPage(1); }} options={snapshot.reference.positions.map((item) => ({ value: item.id, label: item.title }))} />
      <PeriodFilter value={period} onChange={(value) => { setPeriod(value); setPage(1); }} />
      <SelectFilter label="All Status" value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={["On Track", "Needs Review", "Needs Attention", "Pending", "Not Evaluated"].map((item) => ({ value: item, label: item }))} />
      {canWrite(snapshot) && <button type="button" onClick={() => navigate(url("add", selected?.id ?? (snapshot.isFigmaDemo ? snapshot.reference.employees[0]?.id : undefined)))} className={`${primary} ml-auto`}><Icon name="plus" /> Add Evaluation</button>}
    </div>
    <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1032fr)_minmax(0,556fr)]">
      <section className="max-w-[1032px] overflow-hidden rounded-xl border border-[#e5eaf0] bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[860px] table-fixed text-left text-xs text-[#121b2e]"><colgroup><col className="w-[18%]" /><col className="w-[21%]" /><col className="w-[11%]" /><col className="w-[14%]" /><col className="w-[11%]" /><col className="w-[14%]" /><col className="w-[11%]" /></colgroup><thead className={`h-[53px] bg-white ${headings}`}><tr>{["Employees", "Position", "Period", "Performance", "KPI Score", "Status", "Actions"].map((heading) => <th key={heading} className="px-5 py-4">{heading}</th>)}</tr></thead><tbody>{visible.length ? visible.map(({ employee, evaluation, kpi, position: rowPosition }) => <tr key={employee.id} onClick={() => setSelectedId(employee.id)} className={`h-[65.5px] cursor-pointer border-t border-[#e5eaf0] hover:bg-[#f6fbf8] ${selectedId === employee.id ? "bg-[#f4fcf8]" : ""}`}><td className="px-5 py-3"><strong className="block font-semibold">{employee.fullName}</strong><small className="block text-[11px] text-[#64748b]">{employee.employeeId}</small></td><td className="px-5 py-3 font-medium leading-4">{rowPosition?.title ?? "-"}</td><td className="px-5 py-3">{formatPeriod(evaluation?.period ?? kpi?.period ?? "")}</td><td className="px-5 py-3">{evaluation?.overallScore == null ? "-" : snapshot.isFigmaDemo ? `${Math.round(evaluation.overallScore * 20)}%` : `${evaluation.overallScore.toFixed(2)} / 5`}</td><td className="px-5 py-3">{kpi ? snapshot.isFigmaDemo ? `${kpi.score}%` : `${kpi.score} / 100` : "-"}</td><td className="px-5 py-3"><Status evaluation={evaluation} /></td><td className="px-5 py-3 text-center"><button type="button" aria-label={`Aksi ${employee.fullName}`} aria-expanded={selectedId === employee.id} onClick={(event) => { event.stopPropagation(); setSelectedId(selectedId === employee.id ? "" : employee.id); }} className="inline-flex size-7 items-center justify-center rounded hover:bg-[#edf3ff]"><Icon name="more" /></button></td></tr>) : <tr><td colSpan={7} className="h-40 text-center text-[#64748b]">Tidak ada pegawai sesuai filter.</td></tr>}</tbody></table></div>
        <footer className="flex h-[52px] flex-wrap items-center justify-between gap-2 border-t border-[#e5eaf0] px-4 text-xs text-[#4d5f81]"><span>Showing {rows.length ? (currentPage - 1) * 8 + 1 : 0}-{Math.min(currentPage * 8, rows.length)} of {rows.length} employees</span><div className="flex items-center gap-1"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded border border-[#e5eaf0] px-2 py-1 text-[10px] disabled:opacity-40">Previous</button>{Array.from({ length: Math.min(pageCount, 5) }, (_, index) => Math.max(1, Math.min(currentPage - 2, pageCount - 4)) + index).map((number) => <button key={number} type="button" onClick={() => setPage(number)} aria-current={number === currentPage ? "page" : undefined} className={`size-6 rounded border text-[10px] ${number === currentPage ? "border-[#3b6ff5] bg-[#3b6ff5] text-white" : "border-[#e5eaf0]"}`}>{number}</button>)}<button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} className="rounded border border-[#e5eaf0] px-2 py-1 text-[10px] disabled:opacity-40">Next</button></div></footer>
      </section>
      {selected && <SelectedPerson snapshot={snapshot} employee={selected} evaluation={evaluationFor(snapshot, selected.id, period)} navigate={navigate} onClose={() => setSelectedId("")} />}
    </div>
  </div>;
}
function initialInput(employeeId: string, existing?: PerformanceEvaluation): EvaluationInput {
  if (existing) return { employeeId: existing.employeeId, period: existing.period, evaluationDate: existing.evaluationDate, evaluator: existing.evaluator, status: existing.status, reviewStatus: existing.reviewStatus, overallScore: existing.overallScore, aspects: existing.aspects.length ? existing.aspects.map((item) => ({ ...item })) : defaultAspects.map((item) => ({ ...item })), generalNotes: existing.generalNotes, evidenceReference: existing.evidenceReference };
  return { employeeId, period: new Date().toISOString().slice(0, 7), evaluationDate: new Date().toISOString().slice(0, 10), evaluator: "", status: "draft", reviewStatus: "Needs Review", overallScore: null, aspects: defaultAspects.map((item) => ({ ...item })), generalNotes: "", evidenceReference: null };
}
function Form({ snapshot, busy, runWrite, navigate, employeeId, existing }: Props & { existing?: PerformanceEvaluation }) {
  const [input, setInput] = useState(() => {
    const preview = snapshot.isFigmaDemo && !existing ? snapshot.performance.find((item) => item.employeeId === employeeId) : undefined;
    if (preview?.aspects.length) {
      const input = initialInput(employeeId ?? "", preview);
      const weight = input.aspects.reduce((sum, aspect) => sum + aspect.weight, 0);
      const score = input.aspects.reduce((sum, aspect) => sum + (aspect.score ?? 0) * aspect.weight, 0);
      return { ...input, overallScore: weight ? Math.round(score / weight * 100) / 100 : null };
    }
    return initialInput(employeeId ?? "", existing ?? preview);
  });
  const [error, setError] = useState("");
  const [showExtras, setShowExtras] = useState(false);
  const employee = snapshot.reference.employees.find((item) => item.id === input.employeeId);
  const close = () => navigate(url("list", employee?.id));
  function updateAspect(index: number, patch: Partial<EvaluationAspect>) {
    setInput((previous) => {
      const next = previous.aspects.map((item, at) => at === index ? { ...item, ...patch } : item);
      const weight = next.reduce((sum, item) => sum + item.weight, 0);
      const overallScore = next.length && weight > 0 && next.every((item) => item.score !== null) ? Math.round(next.reduce((sum, item) => sum + (item.score ?? 0) * item.weight, 0) / weight * 100) / 100 : null;
      return { ...previous, aspects: next, overallScore };
    });
    setError("");
  }
  async function save(status: EvaluationStatus) {
    if (!canWrite(snapshot)) return;
    if (!input.employeeId) { setError("Pilih pegawai terlebih dahulu."); return; }
    if (status === "completed" && (!input.evaluator.trim() || !input.evaluationDate || input.aspects.some((item) => item.score === null || !Number.isInteger(item.score) || item.score < 1 || item.score > 5))) { setError("Lengkapi tanggal, evaluator, dan skor bulat 1 sampai 5 untuk seluruh aspek."); return; }
    setError("");
    await runWrite((repo, data) => repo.savePerformance({ ...input, status }, data.reference), existing ? "Revisi evaluasi tersimpan sebagai riwayat baru." : status === "draft" ? "Draft evaluasi tersimpan." : "Evaluasi tersimpan.");
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-3 lg:pl-[285px] lg:pr-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 bg-black/85 lg:left-[261px] lg:top-16" /><section role="dialog" aria-modal="true" aria-labelledby="performance-form-title" className="relative max-h-[94vh] w-full max-w-[1485px] overflow-y-auto rounded-lg bg-white px-5 pb-8 pt-9 shadow-2xl sm:p-10 lg:h-[870px] lg:translate-y-[min(35px,3vh)]">
    <h1 id="performance-form-title" className="sr-only">{existing ? "Edit Evaluation" : "Add Evaluation"}</h1><button type="button" onClick={close} aria-label="Tutup formulir" className="absolute right-2 top-2 rounded p-1 text-[#7c8da5] hover:bg-[#f4f6fa]"><X size={16} /></button>
    <div className="grid gap-x-9 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm font-semibold uppercase text-[#45556c]">Employee *<select value={input.employeeId} disabled={!!existing} onChange={(event) => setInput({ ...input, employeeId: event.target.value })} className={`mt-2 ${field}`}><option value="">Select Employee</option>{snapshot.reference.employees.map((item) => <option key={item.id} value={item.id}>{item.fullName} | {item.employeeId}</option>)}</select></label>
      <label className="text-sm font-semibold uppercase text-[#45556c]">Position<input readOnly value={employee ? positionFor(snapshot, employee)?.title ?? "" : ""} className={`mt-2 ${field.replace("bg-white", "bg-[#f6f7ff]")}`} /></label>
      <label className="text-sm font-semibold uppercase text-[#45556c]">Department<input readOnly value={employee ? departmentFor(snapshot, employee)?.name ?? "" : ""} className={`mt-2 ${field.replace("bg-white", "bg-[#f6f7ff]")}`} /></label>
      <label className="text-sm font-semibold uppercase text-[#45556c]">Evaluation Period *<input type="month" value={input.period} onChange={(event) => setInput({ ...input, period: event.target.value })} className={`mt-2 ${field}`} /></label>
      <label className="text-sm font-semibold uppercase text-[#45556c]">Evaluation Date *<input type="date" value={input.evaluationDate} onChange={(event) => setInput({ ...input, evaluationDate: event.target.value })} className={`mt-2 ${field}`} /></label>
      <label className="text-sm font-semibold uppercase text-[#45556c]">Evaluator *<input value={input.evaluator} onChange={(event) => setInput({ ...input, evaluator: event.target.value })} className={`mt-2 ${field}`} /></label>
    </div>
    <div className="mt-[38px] grid gap-8 lg:grid-cols-[minmax(0,919fr)_minmax(280px,462fr)]">
      <div className="overflow-x-auto rounded-xl border border-[#e5eaf0]"><table className="w-full min-w-[630px] table-fixed text-left text-xs text-[#121b2e]"><colgroup><col className="w-[25%]" /><col className="w-[14%]" /><col className="w-[14%]" /><col className="w-[47%]" /></colgroup><thead className={`h-[53px] ${headings}`}><tr>{["Aspect", "Weight", "Score", "Comments"].map((head) => <th key={head} className="px-5 py-4">{head}</th>)}</tr></thead><tbody>{input.aspects.map((item, index) => <tr key={`${item.name}-${index}`} className="h-[66px] border-t border-[#e5eaf0]"><td className="px-5 py-4 font-medium">{item.name}</td><td className="px-5 py-4">{item.weight}%</td><td className="px-4 py-4"><input type="number" min="1" max="5" step="1" aria-label={`Score ${item.name}`} value={item.score ?? ""} onChange={(event) => updateAspect(index, { score: event.target.value ? Number(event.target.value) : null })} className="h-[27px] w-[66px] rounded-lg border border-black/20 bg-white px-2 text-center text-xs outline-none focus:border-[#3b6ff5]" /></td><td className="px-5 py-4"><input aria-label={`Comments ${item.name}`} value={item.notes} onChange={(event) => updateAspect(index, { notes: event.target.value })} className="h-[27px] w-full rounded-lg border border-black/20 bg-white px-2 text-xs outline-none focus:border-[#3b6ff5]" /></td></tr>)}</tbody></table></div>
      <div className="flex flex-col items-center"><h2 className="text-[36px] font-semibold text-[#1e3765]">Overall Score</h2><div className="mt-8 flex size-[255px] items-center justify-center rounded-full" style={{ background: `conic-gradient(#27bf78 ${input.overallScore === null ? 0 : input.overallScore / 5 * 100}%, #dce3ee 0)` }}><div className="flex size-[193px] flex-col items-center justify-center rounded-full bg-white"><strong className="text-[72px] font-semibold leading-none text-[#1e3765]">{input.overallScore?.toFixed(1) ?? ""}</strong>{input.overallScore !== null && <span className="mt-2 text-[24px] text-[#6b7e9e]">of 5.0</span>}</div></div><div className="mt-8"><Badge tone={input.overallScore === null ? "blue" : "green"}>{input.overallScore === null ? "Not Calculated" : input.overallScore >= 4 ? "Good Performance" : "Score Calculated"}</Badge></div><div className="mt-auto flex w-full flex-wrap justify-center gap-5 pt-14"><button type="button" onClick={close} className={`${smallButton} h-[47px] min-w-[115px]`}>Cancel</button><button type="button" disabled={busy || !canWrite(snapshot)} onClick={() => void save("draft")} className="inline-flex h-[47px] min-w-[115px] items-center justify-center rounded-lg border-2 border-[#bfdbfe] bg-[#eff6ff] px-4 text-xs font-semibold text-[#3b6ff5] disabled:opacity-40">Save Draft</button><button type="button" disabled={busy || !canWrite(snapshot)} onClick={() => void save("completed")} className={`${primary} h-[47px] min-w-[115px] text-sm`}>Submit</button></div></div>
    </div>
    <button type="button" aria-expanded={showExtras} onClick={() => setShowExtras(!showExtras)} className="mt-5 text-xs font-semibold text-[#617b9f]">{showExtras ? "Hide" : "+"} review status, notes &amp; evidence</button>
    {showExtras && <div className="mt-4 grid gap-5 sm:grid-cols-3"><label className="text-xs font-semibold text-[#45556c]">Review Status<select value={input.reviewStatus} onChange={(event) => setInput({ ...input, reviewStatus: event.target.value as ReviewStatus })} className={`mt-2 ${field}`}><option>Needs Review</option><option>On Track</option><option>Needs Attention</option></select></label><label className="text-xs font-semibold text-[#45556c]">Evaluation Notes<textarea value={input.generalNotes} onChange={(event) => setInput({ ...input, generalNotes: event.target.value })} rows={2} className={`mt-2 h-auto py-3 ${field}`} /></label><label className="text-xs font-semibold text-[#45556c]">Evidence Reference<input value={input.evidenceReference ?? ""} onChange={(event) => setInput({ ...input, evidenceReference: event.target.value || null })} className={`mt-2 ${field}`} /></label></div>}
    {existing && <p className="mt-4 text-[11px] text-[#8694a8]">Perubahan disimpan sebagai riwayat baru, evaluasi sebelumnya tetap tersedia.</p>}{error && <p role="alert" className="mt-4 rounded-lg bg-[#fff0f1] p-3 text-sm text-[#b43e48]">{error}</p>}
  </section></div>;
}
function ProfileHeader({ snapshot, employee, evaluation, navigate }: PersonProps) {
  return <><button type="button" onClick={() => navigate(url("list", employee.id))} className={`${smallButton} mb-10`}><span className="rotate-90"><Icon name="back" /></span> Back</button><header className="flex min-h-[161px] flex-wrap items-center gap-4 sm:gap-9 rounded-xl border border-[#e5eaf0] bg-white px-7 py-6 shadow-[0_1px_2px_rgba(0,0,0,.05)]"><span className="flex size-[72px] shrink-0 items-center justify-center rounded-full bg-[#505d6f] text-[28px] font-light text-white sm:size-[100px] sm:text-[40px]">{initials(employee.fullName)}</span><div className="min-w-0 flex-1"><h1 className="text-[24px] font-semibold leading-tight text-[#1e3765] sm:text-[36px]">{employee.fullName}</h1><p className="mt-1 break-words text-sm font-light text-[#5c7195] sm:text-[24px]">{positionFor(snapshot, employee)?.title ?? "-"} | {departmentFor(snapshot, employee)?.name ?? "-"}</p><p className="break-words text-sm font-light text-[#5c7195] sm:text-[24px]">{employee.employeeId}</p></div><nav aria-label="Performance navigation" className="flex flex-wrap gap-3 sm:gap-8">{canWrite(snapshot) && evaluation && <button type="button" onClick={() => navigate(url("edit", employee.id, evaluation.id))} className="inline-flex h-10 w-[168px] items-center justify-center gap-2 rounded-lg border-[3px] border-[#deebfe] bg-[#f2f5fd] text-sm font-semibold text-[#1e3765]"><Icon name="edit" /> Edit Evaluation</button>}<button type="button" onClick={() => navigate(url("scorecard", employee.id, evaluation?.id))} className="inline-flex h-10 w-[168px] items-center justify-center gap-2 rounded-lg border-[3px] border-[#deebfe] bg-[#f2f5fd] text-sm font-semibold text-[#1e3765]"><Icon name="kpi" /> KPI Scorecard</button><button type="button" onClick={() => navigate(url("history", employee.id, evaluation?.id))} className="inline-flex h-10 w-[168px] items-center justify-center gap-2 rounded-lg border-[3px] border-[#deebfe] bg-[#f2f5fd] text-sm font-semibold text-[#1e3765]"><Icon name="history" /> View History</button></nav></header></>;
}
function StatCard({ icon, value, suffix, label }: { icon: string; value: ReactNode; suffix?: string; label: string }) {
  return <div className="flex min-h-[125px] items-center gap-3 rounded-[10px] bg-[#eef4f8] px-5 py-5 sm:min-h-[151px] sm:gap-4 sm:px-6 shadow-[8px_8px_8px_rgba(0,0,0,.25)]"><span className="flex size-[56px] shrink-0 items-center justify-center rounded-full bg-[#d9e2ec] sm:size-[88px]"><Icon name={icon} /></span><div className="min-w-0"><strong className="whitespace-nowrap text-[32px] font-semibold sm:text-[48px] leading-none text-[#1e3765]">{value}{suffix && <small className="text-[18px] text-[#647994] sm:text-[28px]"> {suffix}</small>}</strong><p className="mt-1 text-sm font-light text-[#5c7195] sm:text-xl">{label}</p></div></div>;
}
function Detail({ snapshot, employee, evaluation, navigate }: PersonProps) {
  const kpi = kpiFor(snapshot, employee.id, evaluation?.period);
  return <div className="mx-auto max-w-[1509px]"><ProfileHeader snapshot={snapshot} employee={employee} evaluation={evaluation} navigate={navigate} /><div className="mt-[68px] grid items-start gap-10 xl:grid-cols-[minmax(275px,358fr)_minmax(0,704fr)_minmax(260px,340fr)]">
    <div className="grid gap-[34px] lg:grid-cols-3 xl:grid-cols-1"><StatCard icon="star" value={evaluation?.overallScore?.toFixed(1) ?? "-"} suffix="/ 5.0" label="Overall Performance" /><StatCard icon="bars" value={kpi?.score ?? "-"} suffix="/ 100" label="KPI Score" /><div className="flex min-h-[125px] items-center gap-3 rounded-[10px] bg-[#eef4f8] px-5 py-5 sm:min-h-[151px] sm:gap-4 sm:px-6 shadow-[8px_8px_8px_rgba(0,0,0,.25)]"><span className="flex size-[56px] shrink-0 items-center justify-center rounded-full bg-[#d9e2ec] sm:size-[88px]"><Icon name="check" /></span><div><strong className="text-[24px] font-semibold text-[#1e3765] sm:text-[32px]">{evaluation ? evaluation.status === "completed" ? "Completed" : "Draft" : "Not Evaluated"}</strong><p className="text-sm font-light text-[#5c7195] sm:text-xl">Evaluation Status</p></div></div></div>
    <div className="overflow-x-auto rounded-xl border border-[#e5eaf0] bg-white"><table className="w-full min-w-[520px] table-fixed text-left text-xs text-[#121b2e]"><colgroup><col className="w-[30%]" /><col className="w-[18%]" /><col className="w-[16%]" /><col className="w-[36%]" /></colgroup><thead className={`h-[53px] ${headings}`}><tr>{["Aspect", "Weight", "Score", "Comments"].map((head) => <th key={head} className="px-5 py-4">{head}</th>)}</tr></thead><tbody>{(evaluation?.aspects.length ? evaluation.aspects : defaultAspects).map((item, index) => <tr key={`${item.name}-${index}`} className="h-[66px] border-t border-[#e5eaf0]"><td className="px-5 py-4 font-medium">{item.name}</td><td className="px-5 py-4">{evaluation ? `${item.weight}%` : "-"}</td><td className="px-5 py-4">{item.score ?? "-"}</td><td className="px-5 py-4 leading-4">{item.notes || "-"}</td></tr>)}</tbody></table></div>
    <aside className="min-h-[522px] rounded-[10px] border-[3px] border-[#f4f6f4] bg-white px-7 py-8 text-sm leading-5 text-[#121b2e]"><h2 className="mb-7 text-center text-[24px] font-bold leading-6">Employee Context &amp; Evaluation</h2><dl className="space-y-2"><div><dt className="inline font-semibold">Reports To:</dt> <dd className="inline">-</dd></div><div><dt className="inline font-semibold">Function:</dt> <dd className="inline">-</dd></div><div><dt className="inline font-semibold">Hierarchy Level:</dt> <dd className="inline">-</dd></div><div><dt className="inline font-semibold">Location:</dt> <dd className="inline">-</dd></div><div><dt className="inline font-semibold">Employment Status:</dt> <dd className="inline">-</dd></div></dl><h3 className="mb-2 mt-8 font-semibold">Evaluation Notes</h3><p className="rounded-lg border border-[#d9e2ec] bg-[#f6f9fc] p-2 text-xs leading-4">{evaluation?.generalNotes || "Belum ada catatan evaluasi."}</p><h3 className="mt-8 font-semibold">Evidence &amp; Audit</h3><p className="mt-1 break-words text-[10px] leading-4 text-[#90a1b9]">Reference: {evaluation?.evidenceReference || evaluation?.id || "-"}</p><p className="mt-3 text-[10px] leading-4 text-[#90a1b9]">Created by {evaluation?.actor || "-"} · {evaluation ? formatDate(evaluation.createdAt) : "-"}</p></aside>
  </div></div>;
}
function HistoryPage({ snapshot, employee, evaluation, navigate }: PersonProps) {
  const [type, setType] = useState("");
  const [period, setPeriod] = useState("");
  const [newest, setNewest] = useState(true);
  const entries = [
    ...snapshot.performance.filter((item) => item.employeeId === employee.id).map((item) => ({ id: item.id, date: item.evaluationDate || item.createdAt, period: item.period, type: "Performance", value: item.overallScore === null ? "-" : `${item.overallScore.toFixed(2)} / 5`, status: item.status === "draft" ? "Draft" : "Completed", actor: item.actor, reference: item.evidenceReference || item.id })),
    ...snapshot.kpi.filter((item) => item.employeeId === employee.id).map((item) => ({ id: item.id, date: item.createdAt, period: item.period, type: "KPI", value: `${item.score} / 100`, status: "Recorded", actor: "-", reference: item.id })),
  ].filter((item) => (!type || item.type === type) && (!period || item.period === period)).sort((a, b) => newest ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  const periods = [...new Set([...snapshot.performance, ...snapshot.kpi].filter((item) => item.employeeId === employee.id).map((item) => item.period))].sort().reverse();
  return <div className="mx-auto max-w-[1509px]"><ProfileHeader snapshot={snapshot} employee={employee} evaluation={evaluation} navigate={navigate} /><section className="mt-11 max-w-[1280px]"><div className="mb-11 flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-[#172033]">Performance &amp; KPI History</h2><p className="mt-1 text-xs text-[#64748b]">Historical records are preserved by period and actor.</p></div><div className="flex flex-wrap gap-10"><SelectFilter label="All Types" value={type} onChange={setType} options={[{ value: "Performance", label: "Performance" }, { value: "KPI", label: "KPI" }]} /><SelectFilter label="All Periods" value={period} onChange={setPeriod} options={periods.map((item) => ({ value: item, label: formatPeriod(item) }))} /><span className="relative"><select aria-label="Urutan riwayat" value={newest ? "newest" : "oldest"} onChange={(event) => setNewest(event.target.value === "newest")} className="h-[34px] w-[129px] appearance-none rounded-lg border border-[#dee4dd] bg-white pl-3 pr-7 text-xs"><option value="newest">Newest First</option><option value="oldest">Oldest First</option></select><span className="pointer-events-none absolute right-2 top-2"><Icon name="chevron" /></span></span></div></div><div className="overflow-x-auto rounded-xl border border-[#e5eaf0] bg-white"><table className="w-full min-w-[980px] table-fixed text-left text-xs text-[#121b2e]"><colgroup><col className="w-[13%]" /><col className="w-[11%]" /><col className="w-[17%]" /><col className="w-[12%]" /><col className="w-[14%]" /><col className="w-[15%]" /><col className="w-[18%]" /></colgroup><thead className={`h-[53px] ${headings}`}><tr>{["Date", "Period", "Type", "Value", "Status", "Actor", "Reference"].map((head) => <th key={head} className="px-5 py-4">{head}</th>)}</tr></thead><tbody>{entries.length ? entries.map((item) => <tr key={`${item.type}-${item.id}`} className="h-[66px] border-t border-[#e5eaf0]"><td className="px-5 py-4">{formatDate(item.date)}</td><td className="px-5 py-4">{formatPeriod(item.period)}</td><td className="px-5 py-4">{item.type}</td><td className="px-5 py-4">{item.value}</td><td className="px-5 py-4"><Badge tone={item.status === "Completed" ? "green" : item.status === "Draft" ? "yellow" : "gray"}>{item.status}</Badge></td><td className="px-5 py-4">{item.actor}</td><td className="px-5 py-4"><button type="button" onClick={() => navigate(url(item.type === "Performance" ? "detail" : "scorecard", employee.id, item.type === "Performance" ? item.id : undefined))} title={item.reference} className="max-w-full truncate text-left hover:text-[#3b6ff5] hover:underline">{item.reference}</button></td></tr>) : <tr><td colSpan={7} className="h-40 text-center text-[#64748b]">Belum ada riwayat sesuai filter.</td></tr>}</tbody></table></div></section></div>;
}
function Scorecard({ snapshot, employee, evaluation, navigate }: PersonProps) {
  const kpi = kpiFor(snapshot, employee.id, evaluation?.period);
  const demoRows = snapshot.isFigmaDemo ? snapshot.demoScorecards?.[employee.id] ?? [] : [];
  if (snapshot.isFigmaDemo && demoRows.length) {
    const total = demoRows.reduce((sum, row) => sum + row.weighted, 0);
    return <div className="mx-auto max-w-[1509px]"><ProfileHeader snapshot={snapshot} employee={employee} evaluation={evaluation} navigate={navigate} />
      <div className="mt-11 grid max-w-[693px] gap-4 sm:grid-cols-3">{[
        { label: "Overall KPI Score", value: `${total.toFixed(2)} / 5` },
        { label: "Performance Score", value: evaluation?.aspects.length ? `${(evaluation.aspects.reduce((sum, aspect) => sum + (aspect.score ?? 0) * aspect.weight, 0) / evaluation.aspects.reduce((sum, aspect) => sum + aspect.weight, 0)).toFixed(2)} / 5` : evaluation?.overallScore == null ? "-" : `${evaluation.overallScore.toFixed(2)} / 5` },
        { label: "Period", value: "Q3 2026" },
      ].map((card) => <div key={card.label} className="min-h-[86px] rounded-lg border border-[#d9e2fc] bg-white px-4 py-3"><p className="text-xs text-[#4d5f81]">{card.label}</p><strong className="mt-2 block text-[24px] font-bold text-[#172033]">{card.value}</strong></div>)}</div>
      <section className="mt-11 overflow-hidden rounded-xl border border-[#e5eaf0] bg-white"><h2 className="border-b border-[#e5eaf0] px-5 py-4 text-base font-bold text-[#172033]">Position-based KPI Scorecard</h2><div className="overflow-x-auto"><table className="w-full min-w-[1120px] table-fixed text-left text-xs text-[#121b2e]"><colgroup><col className="w-[31%]" /><col className="w-[7%]" /><col className="w-[18%]" /><col className="w-[19%]" /><col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[9%]" /></colgroup><thead className={`h-[47px] ${headings}`}><tr>{["Aspect", "Weight", "Target", "Actual", "Raw Score", "Weighted", "Result"].map((head) => <th key={head} className="px-5 py-4">{head}</th>)}</tr></thead><tbody>{demoRows.map((row) => <tr key={row.aspect} className="h-[66px] border-t border-[#e5eaf0]"><td className="px-5 py-4 font-medium">{row.aspect}</td><td className="px-5 py-4">{row.weight}%</td><td className="px-5 py-4">{row.target}</td><td className="px-5 py-4">{row.actual}</td><td className="px-5 py-4">{row.rawScore}</td><td className="px-5 py-4">{row.weighted.toFixed(2)}</td><td className="px-5 py-4"><Badge tone={row.result === "Satisfactory" ? "yellow" : "green"}>{row.result}</Badge></td></tr>)}</tbody><tfoot><tr className="h-[47px] border-t border-[#e5eaf0] font-bold"><th className={`px-5 py-3 ${headings}`}>Total</th><td className="px-5 py-3">100%</td><td /><td /><td /><td className="px-5 py-3">{total.toFixed(2)}</td><td className="px-5 py-3"><Badge tone="green">Good</Badge></td></tr></tfoot></table></div></section>
    </div>;
  }
  const emptyRows = Array.from({ length: 5 }, (_, index) => index);
  return <div className="mx-auto max-w-[1509px]"><ProfileHeader snapshot={snapshot} employee={employee} evaluation={evaluation} navigate={navigate} />
    <div className="mt-11 grid max-w-[693px] gap-4 sm:grid-cols-3">{[{ label: "Overall KPI Score", value: kpi ? `${kpi.score} / 100` : "-" }, { label: "Performance Score", value: evaluation?.overallScore == null ? "-" : `${evaluation.overallScore.toFixed(2)} / 5` }, { label: "Period", value: formatPeriod(evaluation?.period ?? kpi?.period ?? "") }].map((card) => <div key={card.label} className="min-h-[86px] rounded-lg border border-[#d9e2fc] bg-white px-4 py-3"><p className="text-xs text-[#4d5f81]">{card.label}</p><strong className="mt-2 block text-[24px] font-bold text-[#172033]">{card.value}</strong></div>)}</div>
    <section className="mt-11 overflow-hidden rounded-xl border border-[#e5eaf0] bg-white"><h2 className="border-b border-[#e5eaf0] px-5 py-4 text-base font-bold text-[#172033]">Position-based KPI Scorecard</h2><div className="overflow-x-auto"><table className="w-full min-w-[1120px] table-fixed text-left text-xs text-[#121b2e]"><colgroup><col className="w-[31%]" /><col className="w-[7%]" /><col className="w-[18%]" /><col className="w-[19%]" /><col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[9%]" /></colgroup><thead className={`h-[47px] ${headings}`}><tr>{["Aspect", "Weight", "Target", "Actual", "Raw Score", "Weighted", "Result"].map((head) => <th key={head} className="px-5 py-4">{head}</th>)}</tr></thead><tbody>{emptyRows.map((index) => <tr key={index} className="h-[66px] border-t border-[#e5eaf0]"><td className="px-5 py-4 text-[#90a1b9]">{index === 0 ? "Indikator belum tersedia" : "-"}</td>{Array.from({ length: 5 }, (_, column) => <td key={column} className="px-5 py-4 text-[#90a1b9]">-</td>)}<td className="px-5 py-4"><Badge tone="gray">-</Badge></td></tr>)}</tbody><tfoot><tr className="h-[47px] border-t border-[#e5eaf0] font-bold"><th className={`px-5 py-3 ${headings}`}>Total</th><td className="px-5 py-3">-</td><td /><td /><td className="px-5 py-3">-</td><td className="px-5 py-3">-</td><td className="px-5 py-3"><Badge tone="gray">-</Badge></td></tr></tfoot></table></div><p className="border-t border-[#e5eaf0] px-5 py-3 text-xs text-[#7a8ca5]">Nilai KPI ringkas tersedia di atas. Indikator, bobot, target, realisasi, dan hasil per indikator belum tersedia dari Supabase.{kpi?.notes && <span className="mt-1 block">Catatan: {kpi.notes}</span>}</p></section>
  </div>;
}
export function PerformancePages(props: Props) {
  if (props.snapshot.role === "EMPLOYEE") {
    const snapshot = props.snapshot;
    props = { ...props, snapshot: { ...snapshot,
      reference: { ...snapshot.reference, employees: snapshot.reference.employees.filter((employee) => employee.id === snapshot.actorEmployeeId) },
      performance: snapshot.performance.filter((record) => record.employeeId === snapshot.actorEmployeeId),
      kpi: snapshot.kpi.filter((record) => record.employeeId === snapshot.actorEmployeeId),
    } };
  }
  const { view, snapshot, employeeId, evaluationId, navigate } = props;
  const requested = snapshot.performance.find((item) => item.id === evaluationId);
  const employee = snapshot.reference.employees.find((item) => item.id === (employeeId || requested?.employeeId));
  const evaluation = requested?.employeeId === employee?.id ? requested : employee ? evaluationFor(snapshot, employee.id) : undefined;
  if (view === "list") return <List {...props} />;
  if (view === "add") return <><List {...props} view="list" /><Form {...props} /></>;
  if (!employee) return <div className="rounded-xl border border-[#e5eaf0] bg-white p-8 text-center"><p className="text-sm text-[#64748b]">Pegawai tidak ditemukan.</p><button type="button" onClick={() => navigate(url("list"))} className={`${smallButton} mt-4`}>Kembali ke daftar</button></div>;
  if (view === "edit") return evaluation ? <><List {...props} view="list" /><Form key={evaluation.id} {...props} employeeId={employee.id} existing={evaluation} /></> : <div className="rounded-xl bg-white p-8 text-sm text-[#64748b]">Belum ada evaluasi untuk diedit. <button type="button" onClick={() => navigate(url("add", employee.id))} className="font-semibold text-[#3b6ff5]">Tambah evaluasi</button></div>;
  if (view === "detail") return <Detail snapshot={snapshot} employee={employee} evaluation={evaluation} navigate={navigate} />;
  if (view === "history") return <HistoryPage snapshot={snapshot} employee={employee} evaluation={evaluation} navigate={navigate} />;
  return <Scorecard snapshot={snapshot} employee={employee} evaluation={evaluation} navigate={navigate} />;
}
