"use client";

import { useEffect, useMemo, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import Image from "next/image";
import { compareCompetencies } from "../../competency/service";
import type { DevelopmentPriority, DevelopmentSourceType } from "../../development/types";
import type { TrainingStatus, TrainingVersion } from "../../training/types";
import { SupabaseD4Repository } from "../repository";
import { latestDevelopment, latestTraining, type D4LiveSnapshot } from "../types";

type View = "list" | "add" | "progress" | "history" | "development-new";
export interface TrainingPagesProps {
  view: View;
  snapshot: D4LiveSnapshot;
  busy: boolean;
  runWrite: (operation: (repo: SupabaseD4Repository, data: D4LiveSnapshot) => Promise<unknown>, success: string) => Promise<void>;
  employeeId?: string;
  trainingId?: string;
  sourceRef?: string;
  navigate: (url: string) => void;
}

const field = "mt-2 h-[42px] w-full rounded-lg border border-[#d9e2ec] bg-white px-3.5 text-xs font-normal text-[#172033] outline-none focus:border-[#3b6ff5] focus:ring-2 focus:ring-[#3b6ff5]/15";
const label = "block text-[11px] font-semibold text-[#64748b]";
const primary = "min-h-10 rounded-lg bg-[#3b6ff5] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#305cdb] disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "min-h-10 rounded-lg border border-[#3b6ff5] bg-white px-4 py-2.5 text-xs font-semibold text-[#3b6ff5] hover:bg-[#f1f3ff]";
const card = "rounded-xl border border-[#d9e2ec] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]";

function canWrite(snapshot: D4LiveSnapshot) { return snapshot.role === "HR" || snapshot.role === "MANAGER"; }
function today() { return new Date().toISOString().slice(0, 10); }
function prettyDate(value: string) {
  if (!value) return "-";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}
function period(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(date);
}
function person(snapshot: D4LiveSnapshot, id: string) {
  return snapshot.reference.employees.find((item) => item.id === id);
}
function source(snapshot: D4LiveSnapshot, record: TrainingVersion) {
  return latestDevelopment(snapshot).find((item) => item.needId === record.developmentNeedId);
}
function url(view: View, params: Record<string, string | undefined> = {}) {
  const query = new URLSearchParams({ module: view === "development-new" ? "development" : "training", view });
  for (const [key, value] of Object.entries(params)) if (value) query.set(key === "trainingId" ? "training" : key === "employeeId" ? "employee" : key === "sourceRef" ? "source" : key, value);
  return `/live?${query}`;
}
function Title({ title, subtitle, actions, back }: { title: string; subtitle: string; actions?: ReactNode; back?: () => void }) {
  return <div className="mb-9 flex flex-wrap items-start justify-between gap-3">
    <div>{back && <button type="button" onClick={back} className="mb-2 text-[13px] font-semibold text-[#64748b] hover:text-[#3b6ff5]">← Back</button>}
      <h2 className="text-[25px] font-bold leading-8 tracking-[-0.6px] text-[#121b2e]">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-[#4d5f81]">{subtitle}</p></div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>;
}
function Badge({ status }: { status: TrainingStatus }) {
  const tone = status === "Completed" ? "bg-[#e8f7f0] text-[#16a37a]" : status === "Cancelled" ? "bg-[#fdeced] text-[#d56b74]" : status === "In Progress" ? "bg-[#e9efff] text-[#3b6ff5]" : "bg-[#fff5dc] text-[#c58a14]";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${tone}`}><span className="size-1.5 rounded-full bg-current" />{status}</span>;
}
function Empty({ children }: { children: ReactNode }) { return <p className="p-7 text-sm text-[#64748b]">{children}</p>; }
function Filter({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <div className="relative min-w-0"><select {...props} className="h-[34px] w-full appearance-none rounded-lg border border-[#becabd]/50 bg-white pl-3 pr-8 text-xs text-[#121b2e] outline-none focus:border-[#3b6ff5]">{children}</select><Image src="/figma/training/dropdown.svg" alt="" width={18} height={18} className="pointer-events-none absolute right-2 top-2" /></div>;
}
function MissingProgress() { return <div className="flex items-center gap-2"><span className="h-2 flex-1 rounded-full bg-[#e8eef6]" /><span className="text-[10px] text-[#64748b]">Belum dicatat</span></div>; }

function csvCell(value: string) { const safe = /^[=+@\-\t\r]/.test(value) ? `'${value}` : value; return `"${safe.replaceAll('"', '""')}"`; }
function exportCsv(snapshot: D4LiveSnapshot, records: TrainingVersion[]) {
  const rows = [["Employee", "Employee ID", "Training", "Source Requirement", "Period", "Status", "Result", "Notes", "Revision"]];
  for (const record of records) {
    const employee = person(snapshot, record.employeeId);
    const need = source(snapshot, record);
    rows.push([employee?.fullName ?? "", employee?.employeeId ?? "", record.activity, need?.sourceRef ?? "", record.date, record.status, record.result, record.notes, String(record.revision)]);
  }
  const blob = new Blob([rows.map((row) => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href; anchor.download = "d4-training.csv"; anchor.click();
  URL.revokeObjectURL(href);
}

function Tracking({ snapshot, navigate, employeeId }: TrainingPagesProps) {
  const all = latestTraining(snapshot).filter((item) => snapshot.role !== "EMPLOYEE" || item.employeeId === snapshot.actorEmployeeId);
  const [search, setSearch] = useState("");
  const [positionId, setPositionId] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [anchor, setAnchor] = useState<{ top: number; right: number; mobile: boolean } | null>(null);
  const periods = [...new Set(all.map((item) => item.date.slice(0, 7)))].sort().reverse();
  const filtered = all.filter((item) => {
    const employee = person(snapshot, item.employeeId);
    return (!employeeId || item.employeeId === employeeId)
      && (!search || `${employee?.fullName ?? ""} ${employee?.employeeId ?? ""}`.toLowerCase().includes(search.toLowerCase()))
      && (!positionId || employee?.positionId === positionId)
      && (!selectedPeriod || item.date.startsWith(selectedPeriod))
      && (!status || item.status === status);
  });
  const selected = filtered.find((item) => item.trainingId === selectedId) ?? null;
  const pageCount = Math.max(1, Math.ceil(filtered.length / 8));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * 8, currentPage * 8);
  useEffect(() => {
    if (!selectedId) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedId(""); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);
  function toggleDetail(event: MouseEvent<HTMLButtonElement>, trainingId: string) {
    if (selectedId === trainingId) { setSelectedId(""); return; }
    const button = event.currentTarget.getBoundingClientRect();
    const panelHeight = Math.min(420, window.innerHeight - 32);
    const top = Math.max(16, Math.min(button.top - 8, window.innerHeight - panelHeight - 16));
    const left = Math.max(16, Math.min(button.left - 165, window.innerWidth - 526));
    setAnchor({ top, right: Math.max(16, window.innerWidth - left - 510), mobile: window.innerWidth < 640 });
    setSelectedId(trainingId);
  }
  return <div>
    <Title title="Training Tracking" subtitle="Track training and development records from requirement to completion" actions={<>
      <button type="button" onClick={() => exportCsv(snapshot, filtered)} className={secondary}>Export CSV</button>
      {canWrite(snapshot) && <button type="button" onClick={() => navigate(url("add"))} className={primary}>+ Add Training</button>}
    </>} />
    <div className={`${card} mb-10 grid min-h-[69px] items-center gap-4 p-3.5 sm:grid-cols-2 xl:grid-cols-[minmax(240px,514px)_129px_129px_129px] xl:gap-x-8`}>
      <div className="relative"><Image src="/figma/training/search.svg" alt="" width={13.5} height={13.5} className="pointer-events-none absolute left-2.5 top-2.5" /><input aria-label="Search by Employee’s Name" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by Employee’s Name" className="h-[34px] w-full rounded-lg border border-[#d9e2fc] bg-[#f1f3ff] pl-8 pr-3 text-xs text-[#172033] outline-none placeholder:text-[#4d5f81]/60 focus:border-[#3b6ff5]" /></div>
      <Filter aria-label="Filter position" value={positionId} onChange={(event) => { setPositionId(event.target.value); setPage(1); }}><option value="">All Position</option>{snapshot.reference.positions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</Filter>
      <Filter aria-label="Filter period" value={selectedPeriod} onChange={(event) => { setSelectedPeriod(event.target.value); setPage(1); }}><option value="">All Period</option>{periods.map((item) => <option key={item} value={item}>{period(`${item}-01`)}</option>)}</Filter>
      <Filter aria-label="Filter status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All Status</option>{(["Planned", "In Progress", "Completed", "Cancelled"] as TrainingStatus[]).map((item) => <option key={item}>{item}</option>)}</Filter>
    </div>
    <section className={`${card} flex min-h-[570px] flex-col overflow-hidden xl:w-[73%]`}>
      <div className="flex-1 overflow-x-auto"><table className="w-full min-w-[840px] text-left text-xs text-[#172033]"><thead className="bg-[#f1f3ff]/70 text-[11px] uppercase tracking-[0.5px] text-[#4d5f81]"><tr>{["Employees", "Training / development", "Source requirement", "Period", "Status", "Actions"].map((item) => <th key={item} className="px-4 py-3 font-semibold last:text-right">{item}</th>)}</tr></thead><tbody>{visible.map((item) => {
        const employee = person(snapshot, item.employeeId); const need = source(snapshot, item);
        return <tr key={item.trainingId} className={`h-[65px] border-t border-[#edf0f5] ${selected?.trainingId === item.trainingId ? "bg-[#f0f8f5]" : "hover:bg-[#fafbff]"}`}>
          <td className="px-4 py-3"><strong className="block text-sm text-[#121b2e]">{employee?.fullName ?? "Employee tidak tersedia"}</strong><span className="text-[11px] text-[#64748b]">{employee?.employeeId ?? ""}</span></td>
          <td className="px-4 py-3">{item.activity}</td><td className="px-4 py-3">{need?.sourceRef || "-"}</td><td className="whitespace-nowrap px-4 py-3">{period(item.date)}</td>
          <td className="px-4 py-3"><Badge status={item.status} /></td><td className="px-4 py-3 text-right"><button type="button" aria-label={`Detail ${item.activity}`} aria-expanded={selected?.trainingId === item.trainingId} aria-haspopup="dialog" onClick={(event) => toggleDetail(event, item.trainingId)} className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-[#eaf1ff]"><Image src="/figma/training/actions.svg" alt="" width={2.667} height={10.667} /></button></td>
        </tr>;
      })}</tbody></table>{!filtered.length && <Empty>Belum ada training yang cocok dengan filter.</Empty>}</div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f5] px-4 py-3 text-[11px] text-[#64748b]"><p>Showing {filtered.length ? (currentPage - 1) * 8 + 1 : 0}-{Math.min(currentPage * 8, filtered.length)} of {filtered.length} training records</p><div className="flex gap-1"><button type="button" disabled={currentPage === 1} onClick={() => { setPage(currentPage - 1); setSelectedId(""); }} className="rounded border border-[#d9e2ec] px-2 py-1 disabled:opacity-40">Previous</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => <button type="button" key={item} onClick={() => { setPage(item); setSelectedId(""); }} aria-current={item === currentPage ? "page" : undefined} className={`rounded px-2 py-1 ${item === currentPage ? "bg-[#168453] text-white" : "border border-[#d9e2ec]"}`}>{item}</button>)}<button type="button" disabled={currentPage === pageCount} onClick={() => { setPage(currentPage + 1); setSelectedId(""); }} className="rounded border border-[#d9e2ec] px-2 py-1 disabled:opacity-40">Next</button></div></div>
    </section>
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:block sm:p-0">
      <button type="button" aria-label="Tutup detail training" onClick={() => setSelectedId("")} className="absolute inset-0 bg-[#0d2142]/20 sm:bg-transparent" />
      <section role="dialog" aria-label={`Training Detail ${selected.activity}`} style={anchor && !anchor.mobile ? { top: anchor.top, right: anchor.right } : undefined} className="relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-[510px] overflow-y-auto rounded-xl border border-[#8091ae] bg-white p-6 shadow-[0_2px_4px_rgba(12,32,64,0.04)] sm:fixed">
        <div className="flex items-center justify-between gap-3"><p className="text-[11px] font-semibold text-[#64748b]">Training Detail</p><button type="button" aria-label="Tutup" onClick={() => setSelectedId("")} className="rounded-md p-1 text-[#64748b] hover:bg-[#f1f3ff]"><X size={16} /></button></div>
        <h3 className="mt-4 text-[22px] font-bold leading-8 text-[#172033]">{selected.activity}</h3><p className="mt-1 text-xs text-[#64748b]">{person(snapshot, selected.employeeId)?.fullName ?? "Employee tidak tersedia"} · {person(snapshot, selected.employeeId)?.employeeId ?? ""}</p>
        <dl className="mt-6 grid grid-cols-[minmax(90px,0.8fr)_minmax(0,1.2fr)] items-center gap-x-4 gap-y-5 text-xs"><dt className="text-[#64748b]">Source Requirement</dt><dd className="break-all font-semibold text-[#172033]">{source(snapshot, selected)?.sourceRef || "-"}</dd><dt className="text-[#64748b]">Period</dt><dd>{prettyDate(selected.date)}</dd><dt className="text-[#64748b]">Progress</dt><dd>{snapshot.isFigmaDemo && /^\d+% complete$/.test(selected.notes) ? <div className="flex items-center gap-2"><span className="h-2 flex-1 rounded-full bg-[#e8eef6]"><span className="block h-2 rounded-full bg-[#3b6ff5]" style={{ width: selected.notes.split("%")[0] + "%" }} /></span><span className="text-[10px] text-[#64748b]">{selected.notes.split("%")[0]}%</span></div> : <MissingProgress />}</dd><dt className="text-[#64748b]">Status</dt><dd><Badge status={selected.status} /></dd></dl>
        <div className="mt-8 flex flex-wrap gap-6">{canWrite(snapshot) && <button type="button" onClick={() => navigate(url("progress", { trainingId: selected.trainingId }))} className={primary}>Update Progress</button>}<button type="button" onClick={() => navigate(url("history", { employeeId: selected.employeeId, trainingId: selected.trainingId }))} className={secondary}>View History</button></div>
      </section>
    </div>}
  </div>;
}

function AddTraining({ snapshot, busy, runWrite, navigate, employeeId }: TrainingPagesProps) {
  const [employee, setEmployee] = useState(employeeId ?? "");
  const [status, setStatus] = useState<TrainingStatus>("Planned");
  const needs = latestDevelopment(snapshot).filter((item) => item.employeeId === employee);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = { employeeId: employee, developmentNeedId: String(form.get("need") ?? ""), activity: String(form.get("activity") ?? ""), date: String(form.get("date") ?? ""), status, result: String(form.get("result") ?? ""), notes: String(form.get("notes") ?? "") };
    if (!needs.some((item) => item.needId === input.developmentNeedId)) return;
    await runWrite((repo, data) => repo.createTraining(input, data), "Training tersimpan.");
  }
  return <div><Title title="Add Training Record" subtitle="Create a training or development record linked to an employee and source requirement" back={() => navigate(url("list"))} />
    <form onSubmit={(event) => void submit(event)} className={`${card} space-y-6 p-5 sm:p-7`}><div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <label className={label}>Employee *<select value={employee} onChange={(event) => setEmployee(event.target.value)} required className={field}><option value="">Select employee</option>{snapshot.reference.employees.map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.employeeId}</option>)}</select></label>
      <label className={label}>Source Requirement *<select name="need" key={employee} required className={field}><option value="">Select development need</option>{needs.map((item) => <option key={item.needId} value={item.needId}>{item.objective} · {item.sourceRef}</option>)}</select></label>
      <label className={label}>Training / Development *<input name="activity" required placeholder="Training activity" className={field} /></label>
      <label className={label}>Period / Date *<input name="date" type="date" defaultValue={today()} required className={field} /></label>
      <label className={label}>Status *<select value={status} onChange={(event) => setStatus(event.target.value as TrainingStatus)} className={field}><option>Planned</option><option>In Progress</option><option>Completed</option><option>Cancelled</option></select></label>
      <label className={label}>Result {status === "Completed" ? "*" : ""}<input name="result" required={status === "Completed"} placeholder="Outcome when completed" className={field} /></label>
    </div><label className={label}>Notes<textarea name="notes" rows={5} placeholder="Training notes" className={`${field} h-auto py-3`} /></label>
      {employee && !needs.length && <p className="rounded-lg bg-[#fff5dc] p-3 text-xs text-[#9b7218]">Employee ini belum memiliki development need. Buat sumber kebutuhan terlebih dahulu.</p>}
      <div className="flex flex-wrap items-center gap-3"><button type="submit" disabled={busy || !canWrite(snapshot) || !employee || !needs.length} className={primary}>Save Training</button><button type="button" onClick={() => navigate(url("list"))} className={secondary}>Cancel</button></div>
    </form></div>;
}

function StatusHistory({ versions }: { versions: TrainingVersion[] }) {
  return <section className={`${card} min-h-[526px] p-6`}><h3 className="text-base font-semibold text-[#172033]">Status History</h3><ol className="mt-7 space-y-7 pl-7">{versions.map((version) => <li key={version.id} className="text-xs"><p className="text-[10px] text-[#64748b]">{prettyDate(version.createdAt)}</p><p className="mt-2 font-semibold text-[#172033]">{version.status}</p><p className="mt-2 text-[10px] text-[#64748b]">Updated by {version.actor}</p></li>)}</ol>{!versions.length && <Empty>Belum ada riwayat status.</Empty>}</section>;
}

function Progress({ snapshot, busy, runWrite, navigate, trainingId }: TrainingPagesProps) {
  const record = latestTraining(snapshot).find((item) => item.trainingId === trainingId && (snapshot.role !== "EMPLOYEE" || item.employeeId === snapshot.actorEmployeeId));
  const versions = snapshot.trainingVersions.filter((item) => item.trainingId === trainingId).sort((a, b) => b.revision - a.revision);
  const [status, setStatus] = useState<TrainingStatus>(record?.status ?? "Planned");
  const [result, setResult] = useState(record?.result ?? "");
  const [notes, setNotes] = useState(record?.notes ?? "");
  if (!record) return <div><Title title="Training Progress" subtitle="Training record tidak ditemukan." back={() => navigate(url("list"))} /></div>;
  async function save(nextStatus = status) {
    if (!record || (nextStatus === "Completed" && !result.trim())) return;
    await runWrite((repo) => repo.updateTraining(record.trainingId, nextStatus, result, notes), "Status training diperbarui sebagai revisi baru.");
  }
  return <div>
    <div className="mb-12 flex flex-wrap items-start justify-between gap-3"><button type="button" onClick={() => navigate(url("list"))} className="text-xs text-[#64748b] hover:text-[#3b6ff5]">← Back</button>{canWrite(snapshot) && <div className="flex flex-wrap gap-3 pt-4"><button type="button" disabled={busy || (status === "Completed" && !result.trim())} onClick={() => void save()} className={primary}>Save Changes</button><button type="button" disabled={busy || !result.trim()} onClick={() => { setStatus("Completed"); void save("Completed"); }} className="min-h-10 rounded-lg bg-[#16a37a] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">Mark Completed</button></div>}</div>
    <div className={`${card} mb-7 grid min-h-[122px] gap-5 p-6 md:grid-cols-[minmax(220px,2.1fr)_repeat(3,minmax(130px,1fr))]`}><div><h2 className="text-[25px] font-bold leading-8 text-[#172033]">{record.activity}</h2><div className="mt-2 flex flex-wrap items-center gap-4"><p className="text-xs text-[#64748b]">{person(snapshot, record.employeeId)?.fullName ?? "Employee tidak tersedia"} · {person(snapshot, record.employeeId)?.employeeId ?? ""}</p><Badge status={record.status} /></div></div><div><p className="text-[10px] text-[#64748b]">Source Requirement</p><p className="mt-2 break-words text-xs font-semibold">{source(snapshot, record)?.sourceRef || "-"}</p></div><div><p className="text-[10px] text-[#64748b]">Period</p><p className="mt-2 text-xs font-semibold">{prettyDate(record.date)}</p></div><div><p className="text-[10px] text-[#64748b]">Last Updated</p><p className="mt-2 text-xs font-semibold">{prettyDate(record.createdAt)} · {record.actor}</p></div></div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.72fr)_minmax(280px,1fr)]"><section className={`${card} min-h-[526px] space-y-6 p-6`}><h3 className="text-base font-semibold text-[#172033]">Progress Update</h3><div className="grid gap-5 sm:grid-cols-3"><label className={label}>Status *<select disabled={!canWrite(snapshot)} value={status} onChange={(event) => setStatus(event.target.value as TrainingStatus)} className={field}><option>Planned</option><option>In Progress</option><option>Completed</option><option>Cancelled</option></select></label><label className={label}>Progress<input value="Belum dicatat" readOnly className={`${field} bg-[#f6f9fc] text-[#64748b]`} /></label><label className={label}>Update Date<input type="date" value={today()} readOnly className={field} /></label></div>
      <label className={label}>Update Notes<textarea disabled={!canWrite(snapshot)} value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} className={`${field} h-auto py-3`} /></label>
      <div className="grid gap-5 sm:grid-cols-2"><label className={label}>Evidence / Reference<input value="Belum ada bukti tertaut" readOnly className={`${field} bg-[#f6f9fc] text-[#64748b]`} /></label><label className={label}>Result {status === "Completed" ? "*" : ""}<input disabled={!canWrite(snapshot)} value={result} onChange={(event) => setResult(event.target.value)} placeholder="Outcome or result" className={field} /></label></div>
      <p className="flex flex-wrap gap-4 pt-3 text-[11px] text-[#64748b]"><strong className="text-[#d99a18]">Important</strong> Marking training completed does not automatically close the competency gap.</p>
    </section><StatusHistory versions={versions} /></div>
  </div>;
}

function History({ snapshot, navigate, employeeId, trainingId }: TrainingPagesProps) {
  const selected = latestTraining(snapshot).find((item) => item.trainingId === trainingId && (snapshot.role !== "EMPLOYEE" || item.employeeId === snapshot.actorEmployeeId));
  const employee = snapshot.role === "EMPLOYEE" ? snapshot.actorEmployeeId : employeeId || selected?.employeeId || "";
  const records = latestTraining(snapshot).filter((item) => !employee || item.employeeId === employee).sort((a, b) => b.date.localeCompare(a.date));
  const versions = selected ? snapshot.trainingVersions.filter((item) => item.trainingId === selected.trainingId).sort((a, b) => b.revision - a.revision) : [];
  return <div><Title title="Training History" subtitle="Review previous and current training records for an employee" back={() => navigate(url("list"))} actions={<button type="button" onClick={() => exportCsv(snapshot, records)} className={secondary}>Export CSV</button>} />
    <div className={`${card} mt-12 overflow-x-auto sm:mt-36 xl:w-[73%]`}><table className="w-full min-w-[900px] text-left text-xs text-[#172033]"><thead className="bg-[#f1f3ff]/70 text-[11px] uppercase tracking-[0.5px] text-[#4d5f81]"><tr>{["Period", "Training / development", "Source requirement", "Result / progress", "Status", "Updated by"].map((item) => <th key={item} className="px-6 py-3 font-semibold">{item}</th>)}</tr></thead><tbody>{records.map((item) => <tr key={item.trainingId} className="h-[65px] border-t border-[#edf0f5]"><td className="whitespace-nowrap px-6 py-4 text-sm font-bold">{period(item.date)}</td><td className="px-6 py-4">{item.activity}</td><td className="px-6 py-4">{source(snapshot, item)?.sourceRef || "-"}</td><td className="px-6 py-4">{item.result || "Belum dicatat"}</td><td className="px-6 py-4"><Badge status={item.status} /></td><td className="px-6 py-4">{item.actor}</td></tr>)}</tbody></table>{!records.length && <Empty>Belum ada riwayat training untuk employee ini.</Empty>}</div>
    <div className="mt-16 min-h-[204px] rounded-xl border border-[#d9e2ec] bg-[#f6f9fc] p-6 text-xs text-[#64748b]"><strong className="text-[13px] font-semibold text-[#172033]">History note</strong><p className="mt-4 leading-5">Training records remain linked to their original requirement source. Completed training does not automatically mean the source gap is resolved; reassessment is required.</p><span className="mt-8 inline-block rounded-full bg-[#efeafd] px-3 py-1 text-[11px] text-[#8057e8]">Traceable to requirement source</span></div>
    {selected && <details className="mt-6"><summary className="cursor-pointer text-xs text-[#64748b]">View saved status revisions</summary><div className="mt-3"><StatusHistory versions={versions} /></div></details>}
  </div>;
}

function DevelopmentNew({ snapshot, busy, runWrite, navigate, employeeId, sourceRef }: TrainingPagesProps) {
  const [employee, setEmployee] = useState(employeeId ?? "");
  const [sourceType, setSourceType] = useState<DevelopmentSourceType>("competency_gap");
  const sources = useMemo(() => {
    const current = person(snapshot, employee);
    if (sourceType === "competency_gap") return current?.positionId ? compareCompetencies(employee, current.positionId, snapshot.reference).findings.filter((item) => item.status === "Gap").map((item) => ({ ref: item.requirementId, label: item.competencyName })) : [];
    if (sourceType === "role_change") return snapshot.competency.filter((item) => item.employeeId === employee && item.context === "role-change").map((item) => ({ ref: item.id, label: `Role change assessment · ${prettyDate(item.effectiveDate)}` }));
    return snapshot.performance.filter((item) => item.employeeId === employee && item.status === "completed").map((item) => ({ ref: item.id, label: `Performance evaluation · ${item.period}` }));
  }, [snapshot, employee, sourceType]);
  const [reference, setReference] = useState(sourceRef ?? "");
  const selectedSource = sources.find((item) => item.ref === reference);
  const selectedEmployee = person(snapshot, employee);
  const position = snapshot.reference.positions.find((item) => item.id === selectedEmployee?.positionId);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sources.some((item) => item.ref === reference)) return;
    const form = new FormData(event.currentTarget);
    const input = { employeeId: employee, sourceType, sourceRef: reference, objective: String(form.get("objective") ?? ""), priority: String(form.get("priority") ?? "Medium") as DevelopmentPriority, notes: String(form.get("notes") ?? "") };
    await runWrite((repo, data) => repo.createDevelopment(input, data), "Development need tersimpan dengan referensi sumber.");
  }
  return <div><Title title="Creating Training Need" subtitle="Create a development requirement while preserving the source gap reference." back={() => navigate("/live?module=competency")} />
    <div className="mb-10 mt-6 min-h-[146px] rounded-xl border border-[#d9e2ec] bg-[#efeafd] px-6 py-5"><p className="text-xs font-semibold text-[#8057e8]">Source Context</p><dl className="mt-5 grid gap-x-6 gap-y-4 text-xs sm:grid-cols-2 xl:grid-cols-[1.05fr_1.2fr_0.75fr_1fr]"><div className="flex items-baseline gap-4"><dt className="shrink-0 text-[10px] text-[#64748b]">Employee</dt><dd className="font-semibold text-[#172033]">{selectedEmployee ? `${selectedEmployee.fullName} · ${selectedEmployee.employeeId}` : "Select employee"}</dd></div><div className="flex items-baseline gap-4"><dt className="shrink-0 text-[10px] text-[#64748b]">Position</dt><dd className="font-semibold text-[#172033]">{position?.title ?? "-"}</dd></div><div className="flex items-baseline gap-4"><dt className="shrink-0 text-[10px] text-[#64748b]">Source</dt><dd className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#8057e8]"><span className="size-1.5 shrink-0 rounded-full bg-current" />{sourceType === "competency_gap" ? "Competency Gap" : sourceType === "role_change" ? "Role Change" : "Performance Context"}</dd></div><div className="flex items-baseline gap-4"><dt className="shrink-0 text-[10px] text-[#64748b]">Source Ref</dt><dd className="break-all font-semibold text-[#172033]">{reference || "-"}</dd></div></dl><div className="mt-5 flex gap-4 text-xs text-[#172033]"><span className="text-[10px] text-[#64748b]">Requirement</span><strong className="font-semibold">{selectedSource?.label ?? "Select source requirement"}</strong></div></div>
    <form onSubmit={(event) => void submit(event)} className={`${card} min-h-[530px] space-y-6 p-5 sm:p-7`}><div className="grid gap-6 lg:grid-cols-[1fr_1fr_1.12fr]"><label className={label}>Employee *<select value={employee} onChange={(event) => { setEmployee(event.target.value); setReference(""); }} required className={`${field} bg-[#f7f9fc]`}><option value="">Select employee</option>{snapshot.reference.employees.map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.employeeId}</option>)}</select></label><label className={label}>Source / Reason *<select value={sourceType} onChange={(event) => { setSourceType(event.target.value as DevelopmentSourceType); setReference(""); }} className={`${field} bg-[#f7f9fc]`}><option value="competency_gap">Competency Gap</option><option value="role_change">Role Change</option><option value="performance_context">Performance Context</option></select></label><label className={label}>Created Date *<input value={prettyDate(today())} readOnly className={field} /></label></div>
      <details open={!selectedSource} className="text-xs text-[#64748b]"><summary className="cursor-pointer text-[11px]">Source Reference {selectedSource ? "retained" : "*"}</summary><label className={`${label} mt-3`}>Select source reference<select value={reference} onChange={(event) => setReference(event.target.value)} required className={field}><option value="">Select source reference</option>{sources.map((item) => <option key={item.ref} value={item.ref}>{item.label} · {item.ref}</option>)}</select></label></details>
      {employee && !sources.length && <p className="rounded-lg bg-[#fff5dc] p-3 text-xs text-[#9b7218]">Belum ada sumber yang memenuhi untuk employee ini.</p>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3.7fr)_minmax(130px,1fr)_minmax(130px,1fr)]"><label className={label}>Development Objective *<input name="objective" required placeholder="Define the development outcome" className={field} /></label><label className={label}>Priority<select name="priority" defaultValue="Medium" className={field}><option>Medium</option><option>High</option><option>Low</option></select></label><label className={label}>Status<input value="Identified" readOnly className={field} /></label></div>
      <label className={label}>Notes<textarea name="notes" rows={5} placeholder="Define the intended development outcome. The final training method is selected by HR and is not automatically determined by the gap." className={`${field} h-[132px] resize-y py-4 text-[11px] placeholder:text-[#9aa8bc]`} /></label>
      <p className="flex flex-wrap items-center gap-4 pt-3 text-[11px] text-[#64748b]">Traceability <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${selectedSource ? "bg-[#e8f7f0] text-[#16a37a]" : "bg-[#f1f3f7] text-[#64748b]"}`}><span className="size-1.5 rounded-full bg-current" />{selectedSource ? "Source reference retained" : "Select source reference"}</span> Saving this requirement does not automatically close the competency gap.</p>
      <button type="submit" disabled={busy || !canWrite(snapshot) || !employee || !reference} className={primary}>Save Requirement</button>
    </form></div>;
}

export function TrainingPages(props: TrainingPagesProps) {
  if ((props.view === "add" || props.view === "development-new") && !canWrite(props.snapshot)) return <div><Title title={props.view === "add" ? "Add Training Record" : "Creating Training Need"} subtitle="Akses ini hanya tersedia untuk HR atau manager." back={() => props.navigate(url("list"))} /></div>;
  if (props.view === "add") return <AddTraining {...props} />;
  if (props.view === "progress") return <Progress {...props} />;
  if (props.view === "history") return <History {...props} />;
  if (props.view === "development-new") return <DevelopmentNew {...props} />;
  return <Tracking {...props} />;
}
