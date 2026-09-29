"use client";

import { useEffect, useMemo, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { X } from "lucide-react";
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

const field = "mt-1 w-full rounded-lg border border-[#d9e2ec] bg-white px-3.5 py-2.5 text-[13px] text-[#172033] outline-none focus:border-[#3b6ff5] focus:ring-2 focus:ring-[#3b6ff5]/15";
const label = "block text-[11px] font-semibold text-[#64748b]";
const primary = "rounded-lg bg-[#3b6ff5] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#305cdb] disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "rounded-lg border border-[#3b6ff5] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#3b6ff5] hover:bg-[#f1f3ff]";
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
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>{back && <button type="button" onClick={back} className="mb-2 text-[13px] font-semibold text-[#64748b] hover:text-[#3b6ff5]">← Back</button>}
      <h2 className="text-[25px] font-bold tracking-tight text-[#1d335b]">{title}</h2>
      <p className="mt-1 text-xs text-[#7786a1]">{subtitle}</p></div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>;
}
function Badge({ status }: { status: TrainingStatus }) {
  const tone = status === "Completed" ? "bg-[#e8f7f0] text-[#16a37a]" : status === "Cancelled" ? "bg-[#fdeced] text-[#d56b74]" : status === "In Progress" ? "bg-[#e9efff] text-[#3b6ff5]" : "bg-[#fff5dc] text-[#c58a14]";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${tone}`}><span className="size-1.5 rounded-full bg-current" />{status}</span>;
}
function Empty({ children }: { children: ReactNode }) { return <p className="p-7 text-sm text-[#64748b]">{children}</p>; }

function csvCell(value: string) { return `"${value.replaceAll('"', '""')}"`; }
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
  const all = latestTraining(snapshot);
  const [search, setSearch] = useState("");
  const [positionId, setPositionId] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [status, setStatus] = useState("");
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
    const below = button.bottom + 8;
    const top = below + panelHeight <= window.innerHeight - 16
      ? below : Math.max(16, button.top - panelHeight - 8);
    setAnchor({ top, right: Math.max(16, window.innerWidth - button.right), mobile: window.innerWidth < 640 });
    setSelectedId(trainingId);
  }
  return <div className="space-y-5">
    <Title title="Training Tracking" subtitle="Track training and development records from requirement to completion" actions={<>
      <button type="button" onClick={() => exportCsv(snapshot, filtered)} className={secondary}>Export CSV</button>
      {canWrite(snapshot) && <button type="button" onClick={() => navigate(url("add"))} className={primary}>+ Add Training</button>}
    </>} />
    <div className={`${card} grid gap-3 p-3.5 sm:grid-cols-2 xl:grid-cols-[minmax(230px,2fr)_repeat(3,minmax(125px,1fr))]`}>
      <input aria-label="Search by Employee’s Name" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by Employee’s Name" className="rounded-lg border border-[#d9e2fc] bg-[#f1f3ff] px-3 py-2 text-xs text-[#172033] outline-none focus:border-[#3b6ff5]" />
      <select aria-label="Filter position" value={positionId} onChange={(event) => setPositionId(event.target.value)} className={field.replace("mt-1 ", "")}><option value="">All Position</option>{snapshot.reference.positions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
      <select aria-label="Filter period" value={selectedPeriod} onChange={(event) => setSelectedPeriod(event.target.value)} className={field.replace("mt-1 ", "")}><option value="">All Period</option>{periods.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <select aria-label="Filter status" value={status} onChange={(event) => setStatus(event.target.value)} className={field.replace("mt-1 ", "")}><option value="">All Status</option>{(["Planned", "In Progress", "Completed", "Cancelled"] as TrainingStatus[]).map((item) => <option key={item}>{item}</option>)}</select>
    </div>
    <section className={`${card} overflow-hidden`}>
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs text-[#172033]"><thead className="bg-[#f1f3ff]/70 text-[11px] uppercase tracking-[0.5px] text-[#4d5f81]"><tr>{["Employees", "Training / development", "Source requirement", "Period", "Status", "Actions"].map((item) => <th key={item} className="px-3 py-3 font-semibold">{item}</th>)}</tr></thead><tbody>{filtered.map((item) => {
        const employee = person(snapshot, item.employeeId); const need = source(snapshot, item);
        return <tr key={item.trainingId} className={`border-t border-[#edf0f5] ${selected?.trainingId === item.trainingId ? "bg-[#f8faff]" : "hover:bg-[#fafbff]"}`}>
          <td className="px-3 py-3"><strong className="block text-[#121b2e]">{employee?.fullName ?? "Employee tidak tersedia"}</strong><span className="text-[10px] text-[#64748b]">{employee?.employeeId ?? ""}</span></td>
          <td className="px-3 py-3">{item.activity}</td><td className="px-3 py-3">{need?.sourceRef || "-"}</td><td className="px-3 py-3">{period(item.date)}</td>
          <td className="px-3 py-3"><Badge status={item.status} /></td><td className="px-3 py-3"><button type="button" aria-label={`Detail ${item.activity}`} aria-expanded={selected?.trainingId === item.trainingId} aria-haspopup="dialog" onClick={(event) => toggleDetail(event, item.trainingId)} className="font-semibold text-[#3b6ff5] hover:underline">Detail</button></td>
        </tr>;
      })}</tbody></table></div>{!filtered.length && <Empty>Belum ada training yang cocok dengan filter.</Empty>}<p className="border-t border-[#edf0f5] px-3 py-3 text-[11px] text-[#64748b]">Showing {filtered.length} of {all.length} training records</p>
    </section>
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:block sm:p-0">
      <button type="button" aria-label="Tutup detail training" onClick={() => setSelectedId("")} className="absolute inset-0 bg-[#0d2142]/20 sm:bg-transparent" />
      <section role="dialog" aria-label={`Training Detail ${selected.activity}`} style={anchor && !anchor.mobile ? { top: anchor.top, right: anchor.right } : undefined} className={`${card} relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-[380px] overflow-y-auto p-5 shadow-[0_18px_50px_rgba(12,32,64,0.18)] sm:fixed`}>
        <div className="flex items-center justify-between gap-3"><p className="text-[11px] font-semibold text-[#64748b]">Training Detail</p><button type="button" aria-label="Tutup" onClick={() => setSelectedId("")} className="rounded-md p-1 text-[#64748b] hover:bg-[#f1f3ff]"><X size={16} /></button></div>
        <h3 className="mt-3 text-base font-bold text-[#121b2e]">{selected.activity}</h3><p className="mt-1 text-xs text-[#64748b]">{person(snapshot, selected.employeeId)?.fullName ?? "Employee tidak tersedia"} · {person(snapshot, selected.employeeId)?.employeeId ?? ""}</p>
        <dl className="mt-5 grid grid-cols-[115px_1fr] gap-y-4 text-xs"><dt className="text-[#64748b]">Source Requirement</dt><dd className="break-words font-semibold text-[#172033]">{source(snapshot, selected)?.sourceRef || "-"}</dd><dt className="text-[#64748b]">Period</dt><dd>{prettyDate(selected.date)}</dd><dt className="text-[#64748b]">Status</dt><dd><Badge status={selected.status} /></dd><dt className="text-[#64748b]">Result</dt><dd>{selected.result || "Belum dicatat"}</dd></dl>
        <p className="mt-5 rounded-md bg-[#f4f6fa] p-3 text-[11px] text-[#64748b]">Persentase progres belum disimpan dalam data D4. Status dan catatan tersedia.</p>
        <div className="mt-5 flex flex-wrap gap-2">{canWrite(snapshot) && <button type="button" onClick={() => navigate(url("progress", { trainingId: selected.trainingId }))} className={primary}>Update Progress</button>}<button type="button" onClick={() => navigate(url("history", { employeeId: selected.employeeId, trainingId: selected.trainingId }))} className={secondary}>View History</button></div>
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
    <form onSubmit={(event) => void submit(event)} className={`${card} max-w-5xl space-y-5 p-5 sm:p-7`}><div className="grid gap-5 md:grid-cols-2">
      <label className={label}>Employee *<select value={employee} onChange={(event) => setEmployee(event.target.value)} required className={field}><option value="">Select employee</option>{snapshot.reference.employees.map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.employeeId}</option>)}</select></label>
      <label className={label}>Source Requirement *<select name="need" key={employee} required className={field}><option value="">Select development need</option>{needs.map((item) => <option key={item.needId} value={item.needId}>{item.objective} · {item.sourceRef}</option>)}</select></label>
      <label className={label}>Training / Development *<input name="activity" required placeholder="Training activity" className={field} /></label>
      <label className={label}>Period / Date *<input name="date" type="date" defaultValue={today()} required className={field} /></label>
      <label className={label}>Status *<select value={status} onChange={(event) => setStatus(event.target.value as TrainingStatus)} className={field}><option>Planned</option><option>In Progress</option><option>Completed</option><option>Cancelled</option></select></label>
      <label className={label}>Result {status === "Completed" ? "*" : ""}<input name="result" required={status === "Completed"} placeholder="Outcome when completed" className={field} /></label>
    </div><label className={label}>Notes<textarea name="notes" rows={4} placeholder="Training notes" className={field} /></label>
      {employee && !needs.length && <p className="rounded-lg bg-[#fff5dc] p-3 text-xs text-[#9b7218]">Employee ini belum memiliki development need. Buat sumber kebutuhan terlebih dahulu.</p>}
      <div className="flex flex-wrap items-center gap-3"><button type="submit" disabled={busy || !canWrite(snapshot) || !employee || !needs.length} className={primary}>Save Training</button><button type="button" onClick={() => navigate(url("list"))} className={secondary}>Cancel</button></div>
    </form></div>;
}

function StatusHistory({ versions }: { versions: TrainingVersion[] }) {
  return <section className={`${card} p-5`}><h3 className="text-base font-semibold text-[#172033]">Status History</h3><ol className="mt-5 space-y-5 border-l border-[#d9e2ec] pl-5">{versions.map((version) => <li key={version.id} className="relative text-xs before:absolute before:-left-[25px] before:top-1 before:size-2 before:rounded-full before:bg-[#3b6ff5]"><p className="text-[10px] text-[#64748b]">{prettyDate(version.createdAt)} · revisi {version.revision}</p><p className="mt-1 font-semibold text-[#172033]">{version.status}</p><p className="mt-1 text-[10px] text-[#64748b]">Updated by {version.actor}</p>{version.notes && <p className="mt-2 text-[#4d5f81]">{version.notes}</p>}</li>)}</ol>{!versions.length && <Empty>Belum ada riwayat status.</Empty>}</section>;
}

function Progress({ snapshot, busy, runWrite, navigate, trainingId }: TrainingPagesProps) {
  const record = latestTraining(snapshot).find((item) => item.trainingId === trainingId);
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
    <Title title="Training Progress" subtitle="Update status and review each saved revision" back={() => navigate(url("list"))} actions={canWrite(snapshot) && <><button type="button" disabled={busy || (status === "Completed" && !result.trim())} onClick={() => void save()} className={primary}>Save Changes</button><button type="button" disabled={busy || !result.trim()} onClick={() => { setStatus("Completed"); void save("Completed"); }} className="rounded-lg bg-[#16a37a] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50">Mark Completed</button></>} />
    <div className={`${card} mb-5 grid gap-5 p-5 md:grid-cols-[minmax(200px,2fr)_repeat(3,minmax(130px,1fr))]`}><div><h3 className="font-bold text-[#172033]">{record.activity}</h3><p className="mt-1 text-xs text-[#64748b]">{person(snapshot, record.employeeId)?.fullName ?? "Employee tidak tersedia"} · {person(snapshot, record.employeeId)?.employeeId ?? ""}</p><span className="mt-2 inline-block"><Badge status={record.status} /></span></div><div><p className="text-[10px] text-[#64748b]">Source Requirement</p><p className="mt-1 text-xs font-semibold">{source(snapshot, record)?.sourceRef || "-"}</p></div><div><p className="text-[10px] text-[#64748b]">Period</p><p className="mt-1 text-xs font-semibold">{prettyDate(record.date)}</p></div><div><p className="text-[10px] text-[#64748b]">Last Updated</p><p className="mt-1 text-xs font-semibold">{prettyDate(record.createdAt)} · {record.actor}</p></div></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]"><section className={`${card} space-y-5 p-5`}><h3 className="text-base font-semibold text-[#172033]">Progress Update</h3><div className="grid gap-4 sm:grid-cols-2"><label className={label}>Status *<select disabled={!canWrite(snapshot)} value={status} onChange={(event) => setStatus(event.target.value as TrainingStatus)} className={field}><option>Planned</option><option>In Progress</option><option>Completed</option><option>Cancelled</option></select></label><label className={label}>Update Date<input type="date" value={today()} readOnly className={`${field} bg-[#f7f9fc]`} /></label></div>
      <p className="rounded-lg bg-[#f7f9fc] px-4 py-3 text-xs text-[#64748b]">Persentase progres dan lampiran bukti pada Figma belum tersedia di skema Supabase D4. Perubahan yang disimpan di sini adalah status, hasil, dan catatan.</p>
      <label className={label}>Result {status === "Completed" ? "*" : ""}<input disabled={!canWrite(snapshot)} value={result} onChange={(event) => setResult(event.target.value)} placeholder="Outcome or result" className={field} /></label>
      <label className={label}>Update Notes<textarea disabled={!canWrite(snapshot)} value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} className={field} /></label>
      <p className="text-[11px] text-[#b47b13]"><strong>Important</strong> · Marking training completed does not automatically close the competency gap.</p>
    </section><StatusHistory versions={versions} /></div>
  </div>;
}

function History({ snapshot, navigate, employeeId, trainingId }: TrainingPagesProps) {
  const selected = latestTraining(snapshot).find((item) => item.trainingId === trainingId);
  const employee = employeeId || selected?.employeeId || "";
  const records = latestTraining(snapshot).filter((item) => !employee || item.employeeId === employee).sort((a, b) => b.date.localeCompare(a.date));
  const versions = selected ? snapshot.trainingVersions.filter((item) => item.trainingId === selected.trainingId).sort((a, b) => b.revision - a.revision) : [];
  return <div><Title title="Training History" subtitle="Review previous and current training records for an employee" back={() => navigate(url("list"))} actions={<button type="button" onClick={() => exportCsv(snapshot, records)} className={secondary}>Export CSV</button>} />
    <div className={`${card} mt-12 overflow-x-auto`}><table className="w-full min-w-[760px] text-left text-xs text-[#172033]"><thead className="bg-[#f1f3ff]/70 text-[11px] uppercase tracking-[0.5px] text-[#4d5f81]"><tr>{["Period", "Training / development", "Source requirement", "Result / progress", "Status", "Updated by"].map((item) => <th key={item} className="px-4 py-3 font-semibold">{item}</th>)}</tr></thead><tbody>{records.map((item) => <tr key={item.trainingId} className="border-t border-[#edf0f5]"><td className="px-4 py-4 font-bold">{period(item.date)}</td><td className="px-4 py-4">{item.activity}</td><td className="px-4 py-4">{source(snapshot, item)?.sourceRef || "-"}</td><td className="px-4 py-4">{item.result || "Belum dicatat"}</td><td className="px-4 py-4"><Badge status={item.status} /></td><td className="px-4 py-4">{item.actor}</td></tr>)}</tbody></table>{!records.length && <Empty>Belum ada riwayat training untuk employee ini.</Empty>}</div>
    {selected && <div className="mt-5"><StatusHistory versions={versions} /></div>}
    <div className="mt-7 rounded-xl border border-[#d9e2ec] bg-[#f4f7fa] p-5 text-xs text-[#64748b]"><strong className="text-[#172033]">History note</strong><p className="mt-2">Training records remain linked to their original requirement source. Completed training does not automatically mean the source gap is resolved; reassessment is required.</p><span className="mt-4 inline-block rounded-full bg-[#efeafd] px-3 py-1 text-[11px] text-[#8057e8]">Traceable to requirement source</span></div>
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
    <div className="mb-5 rounded-xl border border-[#d9e2ec] bg-[#efeafd] p-5"><p className="text-xs font-semibold text-[#8057e8]">Source Context</p><dl className="mt-4 grid gap-4 text-xs sm:grid-cols-2 xl:grid-cols-4"><div><dt className="text-[10px] text-[#64748b]">Employee</dt><dd className="mt-1 font-semibold text-[#172033]">{selectedEmployee ? `${selectedEmployee.fullName} · ${selectedEmployee.employeeId}` : "Select employee"}</dd></div><div><dt className="text-[10px] text-[#64748b]">Position</dt><dd className="mt-1 font-semibold text-[#172033]">{position?.title ?? "-"}</dd></div><div><dt className="text-[10px] text-[#64748b]">Source</dt><dd className="mt-1 font-semibold text-[#8057e8]">{sourceType.replaceAll("_", " ")}</dd></div><div><dt className="text-[10px] text-[#64748b]">Source Ref</dt><dd className="mt-1 break-all font-semibold text-[#172033]">{reference || "-"}</dd></div></dl>{selectedSource && <p className="mt-4 text-xs text-[#172033]"><span className="text-[#64748b]">Requirement</span> · {selectedSource.label}</p>}</div>
    <form onSubmit={(event) => void submit(event)} className={`${card} space-y-6 p-5 sm:p-7`}><div className="grid gap-5 lg:grid-cols-3"><label className={label}>Employee *<select value={employee} onChange={(event) => { setEmployee(event.target.value); setReference(""); }} required className={field}><option value="">Select employee</option>{snapshot.reference.employees.map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.employeeId}</option>)}</select></label><label className={label}>Source / Reason *<select value={sourceType} onChange={(event) => { setSourceType(event.target.value as DevelopmentSourceType); setReference(""); }} className={field}><option value="competency_gap">Competency Gap</option><option value="role_change">Role Change</option><option value="performance_context">Performance Context</option></select></label><label className={label}>Created Date<input value={today()} readOnly className={`${field} bg-[#f7f9fc]`} /></label></div>
      <label className={label}>Source Reference *<select value={reference} onChange={(event) => setReference(event.target.value)} required className={field}><option value="">Select source reference</option>{sources.map((item) => <option key={item.ref} value={item.ref}>{item.label} · {item.ref}</option>)}</select></label>
      {employee && !sources.length && <p className="rounded-lg bg-[#fff5dc] p-3 text-xs text-[#9b7218]">Belum ada sumber yang memenuhi untuk employee ini.</p>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(160px,1fr)_minmax(160px,1fr)]"><label className={label}>Development Objective *<input name="objective" required placeholder="Define the development outcome" className={field} /></label><label className={label}>Priority<select name="priority" defaultValue="Medium" className={field}><option>Medium</option><option>High</option><option>Low</option></select></label><label className={label}>Status<input value="Identified" readOnly className={`${field} bg-[#f7f9fc]`} /></label></div>
      <label className={label}>Notes<textarea name="notes" rows={5} placeholder="Define the intended development outcome. The final training method is selected by HR and is not automatically determined by the gap." className={field} /></label>
      <p className="text-[11px] text-[#64748b]">Traceability <span className="mx-2 rounded-full bg-[#e8f7f0] px-2.5 py-1 text-[#16a37a]">Source reference retained</span> Saving this requirement does not automatically close the competency gap.</p>
      <button type="submit" disabled={busy || !canWrite(snapshot) || !employee || !reference} className={primary}>Save Requirement</button>
    </form></div>;
}

export function TrainingPages(props: TrainingPagesProps) {
  if (props.view === "add") return <AddTraining {...props} />;
  if (props.view === "progress") return <Progress {...props} />;
  if (props.view === "history") return <History {...props} />;
  if (props.view === "development-new") return <DevelopmentNew {...props} />;
  return <Tracking {...props} />;
}
