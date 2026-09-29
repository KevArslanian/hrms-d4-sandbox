"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { EvaluationAspect, PerformanceEvaluation } from "../../performance/types";
import type { EmployeeReference } from "../../shared/types";
import type { SupabaseD4Repository } from "../repository";
import { kpiScore, kpiScoreLabel, type D4LiveSnapshot } from "../types";
import { KpiAssessmentForm } from "./KpiAssessmentForm";

type View = "list" | "add" | "edit" | "detail" | "history" | "scorecard";
type Props = {
  view: View;
  snapshot: D4LiveSnapshot;
  busy: boolean;
  runWrite: (operation: (repo: SupabaseD4Repository, data: D4LiveSnapshot) => Promise<unknown>, success: string) => Promise<void>;
  employeeId?: string;
  evaluationId?: string;
  kpiAssessmentId?: string;
  navigate: (url: string) => void;
};
type PersonProps = { snapshot: D4LiveSnapshot; employee: EmployeeReference; evaluation?: PerformanceEvaluation; kpiAssessmentId?: string; navigate: Props["navigate"] };
const defaultAspects: readonly EvaluationAspect[] = [
  { name: "Work Quality", weight: 20, score: null, notes: "" },
  { name: "Productivity", weight: 15, score: null, notes: "" },
  { name: "Accuracy", weight: 15, score: null, notes: "" },
  { name: "Team Collaboration", weight: 15, score: null, notes: "" },
  { name: "Initiative & Growth", weight: 10, score: null, notes: "" },
  { name: "Discipline", weight: 15, score: null, notes: "" },
  { name: "Attendance", weight: 10, score: null, notes: "" },
];
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
function url(view: View, employee?: string, evaluation?: string, assessment?: string) {
  const params = new URLSearchParams({ module: "performance", view });
  if (employee) params.set("employee", employee);
  if (evaluation) params.set("evaluation", evaluation);
  if (assessment) params.set("assessment", assessment);
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
  }).sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName)), [snapshot, search, position, period, status]);
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
      <button type="button" onClick={() => navigate("/live?module=performance&view=roles")} className={`${smallButton} ml-auto`}>KPI per Jabatan</button>
      {canWrite(snapshot) && <button type="button" onClick={() => navigate(url("add", selected?.id))} className={primary}><Icon name="plus" /> Nilai KPI</button>}
    </div>
    <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1032fr)_minmax(0,556fr)]">
      <section className="max-w-[1032px] overflow-hidden rounded-xl border border-[#e5eaf0] bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[860px] table-fixed text-left text-xs text-[#121b2e]"><colgroup><col className="w-[18%]" /><col className="w-[21%]" /><col className="w-[11%]" /><col className="w-[14%]" /><col className="w-[11%]" /><col className="w-[14%]" /><col className="w-[11%]" /></colgroup><thead className={`h-[53px] bg-white ${headings}`}><tr>{["Employees", "Position", "Period", "Performance", "KPI Score", "Status", "Actions"].map((heading) => <th key={heading} className="px-5 py-4">{heading}</th>)}</tr></thead><tbody>{visible.length ? visible.map(({ employee, evaluation, kpi, position: rowPosition }) => <tr key={employee.id} onClick={() => setSelectedId(employee.id)} className={`h-[65.5px] cursor-pointer border-t border-[#e5eaf0] hover:bg-[#f6fbf8] ${selectedId === employee.id ? "bg-[#f4fcf8]" : ""}`}><td className="px-5 py-3"><strong className="block font-semibold">{employee.fullName}</strong><small className="block text-[11px] text-[#64748b]">{employee.employeeId}</small></td><td className="px-5 py-3 font-medium leading-4">{rowPosition?.title ?? "-"}</td><td className="px-5 py-3">{formatPeriod(evaluation?.period ?? kpi?.period ?? "")}</td><td className="px-5 py-3">{evaluation?.overallScore == null ? "-" : `${evaluation.overallScore.toFixed(2)} / 5`}</td><td className="px-5 py-3">{kpiScoreLabel(snapshot, kpi)}</td><td className="px-5 py-3"><Status evaluation={evaluation} /></td><td className="px-5 py-3 text-center"><button type="button" aria-label={`Aksi ${employee.fullName}`} aria-expanded={selectedId === employee.id} onClick={(event) => { event.stopPropagation(); setSelectedId(selectedId === employee.id ? "" : employee.id); }} className="inline-flex size-7 items-center justify-center rounded hover:bg-[#edf3ff]"><Icon name="more" /></button></td></tr>) : <tr><td colSpan={7} className="h-40 text-center text-[#64748b]">Tidak ada pegawai sesuai filter.</td></tr>}</tbody></table></div>
        <footer className="flex h-[52px] flex-wrap items-center justify-between gap-2 border-t border-[#e5eaf0] px-4 text-xs text-[#4d5f81]"><span>Showing {rows.length ? (currentPage - 1) * 8 + 1 : 0}-{Math.min(currentPage * 8, rows.length)} of {rows.length} employees</span><div className="flex items-center gap-1"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded border border-[#e5eaf0] px-2 py-1 text-[10px] disabled:opacity-40">Previous</button>{Array.from({ length: Math.min(pageCount, 5) }, (_, index) => Math.max(1, Math.min(currentPage - 2, pageCount - 4)) + index).map((number) => <button key={number} type="button" onClick={() => setPage(number)} aria-current={number === currentPage ? "page" : undefined} className={`size-6 rounded border text-[10px] ${number === currentPage ? "border-[#3b6ff5] bg-[#3b6ff5] text-white" : "border-[#e5eaf0]"}`}>{number}</button>)}<button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} className="rounded border border-[#e5eaf0] px-2 py-1 text-[10px] disabled:opacity-40">Next</button></div></footer>
      </section>
      {selected && <SelectedPerson snapshot={snapshot} employee={selected} evaluation={evaluationFor(snapshot, selected.id, period)} navigate={navigate} onClose={() => setSelectedId("")} />}
    </div>
  </div>;
}
function ProfileHeader({ snapshot, employee, evaluation, navigate }: PersonProps) {
  return <><button type="button" onClick={() => navigate(url("list", employee.id))} className={`${smallButton} mb-10`}><span className="rotate-90"><Icon name="back" /></span> Back</button><header className="flex min-h-[161px] flex-wrap items-center gap-4 sm:gap-9 rounded-xl border border-[#e5eaf0] bg-white px-7 py-6 shadow-[0_1px_2px_rgba(0,0,0,.05)]"><span className="flex size-[72px] shrink-0 items-center justify-center rounded-full bg-[#505d6f] text-[28px] font-light text-white sm:size-[100px] sm:text-[40px]">{initials(employee.fullName)}</span><div className="min-w-0 flex-1"><h1 className="text-[24px] font-semibold leading-tight text-[#1e3765] sm:text-[36px]">{employee.fullName}</h1><p className="mt-1 break-words text-sm font-light text-[#5c7195] sm:text-[24px]">{positionFor(snapshot, employee)?.title ?? "-"} | {departmentFor(snapshot, employee)?.name ?? "-"}</p><p className="break-words text-sm font-light text-[#5c7195] sm:text-[24px]">{employee.employeeId}</p></div><nav aria-label="Performance navigation" className="flex flex-wrap gap-3 sm:gap-8">{canWrite(snapshot) && <button type="button" onClick={() => navigate(url("add", employee.id))} className="inline-flex h-10 w-[168px] items-center justify-center gap-2 rounded-lg border-[3px] border-[#deebfe] bg-[#f2f5fd] text-sm font-semibold text-[#1e3765]"><Icon name="edit" /> Nilai KPI</button>}<button type="button" onClick={() => navigate(url("scorecard", employee.id, evaluation?.id))} className="inline-flex h-10 w-[168px] items-center justify-center gap-2 rounded-lg border-[3px] border-[#deebfe] bg-[#f2f5fd] text-sm font-semibold text-[#1e3765]"><Icon name="kpi" /> KPI Scorecard</button><button type="button" onClick={() => navigate(url("history", employee.id, evaluation?.id))} className="inline-flex h-10 w-[168px] items-center justify-center gap-2 rounded-lg border-[3px] border-[#deebfe] bg-[#f2f5fd] text-sm font-semibold text-[#1e3765]"><Icon name="history" /> View History</button></nav></header></>;
}
function StatCard({ icon, value, suffix, label }: { icon: string; value: ReactNode; suffix?: string; label: string }) {
  return <div className="flex min-h-[125px] items-center gap-3 rounded-[10px] bg-[#eef4f8] px-5 py-5 sm:min-h-[151px] sm:gap-4 sm:px-6 shadow-[8px_8px_8px_rgba(0,0,0,.25)]"><span className="flex size-[56px] shrink-0 items-center justify-center rounded-full bg-[#d9e2ec] sm:size-[88px]"><Icon name={icon} /></span><div className="min-w-0"><strong className="whitespace-nowrap text-[32px] font-semibold sm:text-[48px] leading-none text-[#1e3765]">{value}{suffix && <small className="text-[18px] text-[#647994] sm:text-[28px]"> {suffix}</small>}</strong><p className="mt-1 text-sm font-light text-[#5c7195] sm:text-xl">{label}</p></div></div>;
}
function Detail({ snapshot, employee, evaluation, navigate }: PersonProps) {
  const kpi = kpiFor(snapshot, employee.id, evaluation?.period);
  return <div className="mx-auto max-w-[1509px]"><ProfileHeader snapshot={snapshot} employee={employee} evaluation={evaluation} navigate={navigate} /><div className="mt-[68px] grid items-start gap-10 xl:grid-cols-[minmax(275px,358fr)_minmax(0,704fr)_minmax(260px,340fr)]">
    <div className="grid gap-[34px] lg:grid-cols-3 xl:grid-cols-1"><StatCard icon="star" value={evaluation?.overallScore?.toFixed(1) ?? "-"} suffix="/ 5.0" label="Overall Performance" /><StatCard icon="bars" value={kpi ? kpiScore(snapshot, kpi).value : "-"} suffix={kpi ? kpiScore(snapshot, kpi).suffix : "/ 5"} label="KPI Score" /><div className="flex min-h-[125px] items-center gap-3 rounded-[10px] bg-[#eef4f8] px-5 py-5 sm:min-h-[151px] sm:gap-4 sm:px-6 shadow-[8px_8px_8px_rgba(0,0,0,.25)]"><span className="flex size-[56px] shrink-0 items-center justify-center rounded-full bg-[#d9e2ec] sm:size-[88px]"><Icon name="check" /></span><div><strong className="text-[24px] font-semibold text-[#1e3765] sm:text-[32px]">{evaluation ? evaluation.status === "completed" ? "Completed" : "Draft" : "Not Evaluated"}</strong><p className="text-sm font-light text-[#5c7195] sm:text-xl">Evaluation Status</p></div></div></div>
    <div className="overflow-x-auto rounded-xl border border-[#e5eaf0] bg-white"><table className="w-full min-w-[520px] table-fixed text-left text-xs text-[#121b2e]"><colgroup><col className="w-[30%]" /><col className="w-[18%]" /><col className="w-[16%]" /><col className="w-[36%]" /></colgroup><thead className={`h-[53px] ${headings}`}><tr>{["Aspect", "Weight", "Score", "Comments"].map((head) => <th key={head} className="px-5 py-4">{head}</th>)}</tr></thead><tbody>{(evaluation?.aspects.length ? evaluation.aspects : defaultAspects).map((item, index) => <tr key={`${item.name}-${index}`} className="h-[66px] border-t border-[#e5eaf0]"><td className="px-5 py-4 font-medium">{item.name}</td><td className="px-5 py-4">{evaluation ? `${item.weight}%` : "-"}</td><td className="px-5 py-4">{item.score ?? "-"}</td><td className="px-5 py-4 leading-4">{item.notes || "-"}</td></tr>)}</tbody></table></div>
    <aside className="min-h-[522px] rounded-[10px] border-[3px] border-[#f4f6f4] bg-white px-7 py-8 text-sm leading-5 text-[#121b2e]"><h2 className="mb-7 text-center text-[24px] font-bold leading-6">Employee Context &amp; Evaluation</h2><dl className="space-y-2"><div><dt className="inline font-semibold">Reports To:</dt> <dd className="inline">-</dd></div><div><dt className="inline font-semibold">Function:</dt> <dd className="inline">-</dd></div><div><dt className="inline font-semibold">Hierarchy Level:</dt> <dd className="inline">-</dd></div><div><dt className="inline font-semibold">Location:</dt> <dd className="inline">-</dd></div><div><dt className="inline font-semibold">Employment Status:</dt> <dd className="inline">-</dd></div></dl><h3 className="mb-2 mt-8 font-semibold">Evaluation Notes</h3><p className="rounded-lg border border-[#d9e2ec] bg-[#f6f9fc] p-2 text-xs leading-4">{evaluation?.generalNotes || "Belum ada catatan evaluasi."}</p><h3 className="mt-8 font-semibold">Evidence &amp; Audit</h3><p className="mt-1 break-words text-[10px] leading-4 text-[#90a1b9]">Reference: {evaluation?.evidenceReference || evaluation?.id || "-"}</p><p className="mt-3 text-[10px] leading-4 text-[#90a1b9]">Created by {evaluation?.actor || "-"} · {evaluation ? formatDate(evaluation.createdAt) : "-"}</p></aside>
  </div></div>;
}
function HistoryPage({ snapshot, employee, evaluation, navigate }: PersonProps) {
  const [type, setType] = useState("");
  const [period, setPeriod] = useState("");
  const [newest, setNewest] = useState(true);
  const assessmentIds = new Set((snapshot.kpiAssessments ?? []).map((item) => item.id));
  const entries: { id: string; date: string; period: string; type: string; value: string; status: string; actor: string; reference: string; assessmentId?: string }[] = [
    ...snapshot.performance.filter((item) => item.employeeId === employee.id).map((item) => ({ id: item.id, date: item.evaluationDate || item.createdAt, period: item.period, type: "Performance", value: item.overallScore === null ? "-" : `${item.overallScore.toFixed(2)} / 5`, status: item.status === "draft" ? "Draft" : "Completed", actor: item.actor, reference: item.evidenceReference || item.id })),
    ...snapshot.kpi.filter((item) => item.employeeId === employee.id && !assessmentIds.has(item.id)).map((item) => ({ id: item.id, date: item.createdAt, period: item.period, type: "KPI", value: `${item.score} / 100`, status: "Recorded", actor: "-", reference: item.id, assessmentId: item.id })),
    ...(snapshot.kpiAssessments ?? []).filter((item) => item.employeeId === employee.id).map((item) => ({ id: item.id, date: item.evaluationDate || item.createdAt, period: item.period, type: "KPI", value: item.overallScore === null ? "-" : `${item.overallScore.toFixed(2)} / 5`, status: item.status === "completed" ? "Completed" : "Draft", actor: item.actor, reference: item.roleName, assessmentId: item.id })),
  ].filter((item) => (!type || item.type === type) && (!period || item.period === period)).sort((a, b) => newest ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  const periods = [...new Set([...snapshot.performance, ...snapshot.kpi, ...(snapshot.kpiAssessments ?? [])].filter((item) => item.employeeId === employee.id).map((item) => item.period))].sort().reverse();
  return <div className="mx-auto max-w-[1509px]"><ProfileHeader snapshot={snapshot} employee={employee} evaluation={evaluation} navigate={navigate} /><section className="mt-11 max-w-[1280px]"><div className="mb-11 flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-[#172033]">Performance &amp; KPI History</h2><p className="mt-1 text-xs text-[#64748b]">Historical records are preserved by period and actor.</p></div><div className="flex flex-wrap gap-10"><SelectFilter label="All Types" value={type} onChange={setType} options={[{ value: "Performance", label: "Performance" }, { value: "KPI", label: "KPI" }]} /><SelectFilter label="All Periods" value={period} onChange={setPeriod} options={periods.map((item) => ({ value: item, label: formatPeriod(item) }))} /><span className="relative"><select aria-label="Urutan riwayat" value={newest ? "newest" : "oldest"} onChange={(event) => setNewest(event.target.value === "newest")} className="h-[34px] w-[129px] appearance-none rounded-lg border border-[#dee4dd] bg-white pl-3 pr-7 text-xs"><option value="newest">Newest First</option><option value="oldest">Oldest First</option></select><span className="pointer-events-none absolute right-2 top-2"><Icon name="chevron" /></span></span></div></div><div className="overflow-x-auto rounded-xl border border-[#e5eaf0] bg-white"><table className="w-full min-w-[980px] table-fixed text-left text-xs text-[#121b2e]"><colgroup><col className="w-[13%]" /><col className="w-[11%]" /><col className="w-[17%]" /><col className="w-[12%]" /><col className="w-[14%]" /><col className="w-[15%]" /><col className="w-[18%]" /></colgroup><thead className={`h-[53px] ${headings}`}><tr>{["Date", "Period", "Type", "Value", "Status", "Actor", "Reference"].map((head) => <th key={head} className="px-5 py-4">{head}</th>)}</tr></thead><tbody>{entries.length ? entries.map((item) => <tr key={`${item.type}-${item.id}`} className="h-[66px] border-t border-[#e5eaf0]"><td className="px-5 py-4">{formatDate(item.date)}</td><td className="px-5 py-4">{formatPeriod(item.period)}</td><td className="px-5 py-4">{item.type}</td><td className="px-5 py-4">{item.value}</td><td className="px-5 py-4"><Badge tone={item.status === "Completed" ? "green" : item.status === "Draft" ? "yellow" : "gray"}>{item.status}</Badge></td><td className="px-5 py-4">{item.actor}</td><td className="px-5 py-4"><button type="button" onClick={() => navigate(url(item.type === "Performance" ? "detail" : "scorecard", employee.id, item.type === "Performance" ? item.id : undefined, item.assessmentId))} title={item.reference} className="max-w-full truncate text-left hover:text-[#3b6ff5] hover:underline">{item.reference}</button></td></tr>) : <tr><td colSpan={7} className="h-40 text-center text-[#64748b]">Belum ada riwayat sesuai filter.</td></tr>}</tbody></table></div></section></div>;
}
function Scorecard({ snapshot, employee, evaluation, kpiAssessmentId, navigate }: PersonProps) {
  const kpi = kpiAssessmentId
    ? snapshot.kpi.find((item) => item.id === kpiAssessmentId && item.employeeId === employee.id) ?? kpiFor(snapshot, employee.id, evaluation?.period)
    : kpiFor(snapshot, employee.id, evaluation?.period);
  const assessments = [...(snapshot.kpiAssessments ?? [])].filter((item) => item.employeeId === employee.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const assessment = kpiAssessmentId ? assessments.find((item) => item.id === kpiAssessmentId) : assessments[0];
  if (assessment) {
    const total = assessment.overallScore;
    return <div className="mx-auto max-w-[1509px]"><ProfileHeader snapshot={snapshot} employee={employee} evaluation={evaluation} navigate={navigate} />
      <div className="mt-9 flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#3b6ff5]">KPI Scorecard {assessment.definitionVersion}</p><h2 className="mt-1 text-xl font-semibold text-[#172033]">{assessment.roleName}</h2><p className="mt-1 text-xs text-[#64748b]">Periode {formatPeriod(assessment.period)} · Penilai {assessment.evaluatorName || "-"} · {assessment.status === "completed" ? "Selesai" : "Draft"}</p></div>{canWrite(snapshot) && <button type="button" onClick={() => navigate(url("add", employee.id))} className={primary}>Penilaian KPI Baru</button>}</div>
      <div className="mt-7 grid min-w-0 gap-7 2xl:grid-cols-[minmax(0,1fr)_270px]">
        <section className="min-w-0 overflow-x-auto rounded-xl border border-[#e5eaf0] bg-white"><table className="w-full min-w-[900px] table-fixed text-left text-xs text-[#172033]"><colgroup><col className="w-[5%]" /><col className="w-[28%]" /><col className="w-[8%]" /><col className="w-[12%]" /><col className="w-[12%]" /><col className="w-[9%]" /><col className="w-[10%]" /><col className="w-[16%]" /></colgroup><thead className={`bg-[#f5f7fb] ${headings}`}><tr>{["No", "Core KPI", "Bobot", "Target", "Realisasi", "Skor 1-5", "Terbobot", "Komentar"].map((head) => <th key={head} className="px-3 py-4">{head}</th>)}</tr></thead><tbody>{assessment.lines.map((line) => <tr key={line.indicator_order} className="border-t border-[#e5eaf0] align-top"><td className="px-3 py-4">{line.indicator_order}</td><td className="px-3 py-4 pr-5 font-medium leading-5">{line.kpi_name}</td><td className="py-4 pl-4 pr-2">{line.weight_percent}%</td><td className="break-words px-3 py-4">{line.target || "-"}</td><td className="break-words px-3 py-4">{line.actual || "-"}</td><td className="px-3 py-4">{line.raw_score ?? "-"}</td><td className="px-3 py-4 font-semibold">{line.raw_score === null ? "-" : (line.weight_percent * line.raw_score / 100).toFixed(2)}</td><td className="break-words px-3 py-4">{line.comment || "-"}</td></tr>)}</tbody><tfoot><tr className="border-t border-[#dce3ee] bg-[#f5f7fb] font-semibold"><td colSpan={2} className="px-3 py-4">TOTAL</td><td className="px-3 py-4">100%</td><td colSpan={3} /><td className="px-3 py-4">{total === null ? "-" : `${total.toFixed(2)} / 5`}</td><td /></tr></tfoot></table></section>
        <aside className="flex flex-col items-center rounded-xl border border-[#e5eaf0] bg-white px-4 py-6"><h3 className="text-center text-2xl font-semibold text-[#1e3765]">Total KPI</h3><div role="img" aria-label={total === null ? "Total KPI belum dihitung" : `Total KPI ${total.toFixed(2)} dari 5`} className="mt-5 flex size-[220px] items-center justify-center rounded-full" style={{ background: `conic-gradient(#27bf78 ${total === null ? 0 : total / 5 * 100}%, #dce3ee 0)` }}><div className="flex size-[166px] flex-col items-center justify-center rounded-full bg-white"><strong className="text-[47px] font-semibold leading-none text-[#1e3765]">{total?.toFixed(2) ?? "-"}</strong><span className="mt-2 text-sm text-[#6b7e9e]">dari 5.00</span></div></div><p className="mt-4 text-xs text-[#71829a]">Jumlah skor tertimbang</p></aside>
      </div>
      {assessment.generalNotes && <section className="mt-6 rounded-xl border border-[#e5eaf0] bg-white p-5"><h3 className="text-sm font-semibold text-[#172033]">Catatan / rekomendasi atasan</h3><p className="mt-2 whitespace-pre-wrap text-sm text-[#64748b]">{assessment.generalNotes}</p></section>}
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
      kpiAssessments: snapshot.kpiAssessments?.filter((record) => record.employeeId === snapshot.actorEmployeeId),
    } };
  }
  const { view, snapshot, employeeId, evaluationId, navigate } = props;
  const requested = snapshot.performance.find((item) => item.id === evaluationId);
  const employee = snapshot.reference.employees.find((item) => item.id === (employeeId || requested?.employeeId));
  const evaluation = requested?.employeeId === employee?.id ? requested : employee ? evaluationFor(snapshot, employee.id) : undefined;
  if (view === "list") return <List {...props} />;
  if (view === "add") return <><List {...props} view="list" /><KpiAssessmentForm {...props} /></>;
  if (!employee) return <div className="rounded-xl border border-[#e5eaf0] bg-white p-8 text-center"><p className="text-sm text-[#64748b]">Pegawai tidak ditemukan.</p><button type="button" onClick={() => navigate(url("list"))} className={`${smallButton} mt-4`}>Kembali ke daftar</button></div>;
  if (view === "edit") return <><List {...props} view="list" /><KpiAssessmentForm {...props} employeeId={employee.id} /></>;
  if (view === "detail") return <Detail snapshot={snapshot} employee={employee} evaluation={evaluation} navigate={navigate} />;
  if (view === "history") return <HistoryPage snapshot={snapshot} employee={employee} evaluation={evaluation} navigate={navigate} />;
  return <Scorecard snapshot={snapshot} employee={employee} evaluation={evaluation} kpiAssessmentId={props.kpiAssessmentId} navigate={navigate} />;
}
