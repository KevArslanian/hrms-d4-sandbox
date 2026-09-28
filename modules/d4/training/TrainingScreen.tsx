"use client";

import { CalendarDays, GraduationCap, History, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { getDevelopmentStoredSnapshot, listLatestDevelopmentNeeds, subscribeDevelopment } from "../development/service";
import { d4ReferenceFixture } from "../shared/fixtures";
import { D4Shell } from "../shared/ui";
import { createTraining, getTrainingStoredSnapshot, listLatestTrainingRecords, listTrainingVersions, subscribeTraining, updateTraining } from "./service";
import type { TrainingStatus } from "./types";

const statuses: TrainingStatus[] = ["Planned", "In Progress", "Completed", "Cancelled"];

function statusStyle(status: TrainingStatus) {
  switch (status) {
    case "Completed": return "bg-[#e6f7ed] text-[#298259]";
    case "In Progress": return "bg-[#e6f2ff] text-[#346ea3]";
    case "Cancelled": return "bg-[#fff0f1] text-[#b64d56]";
    default: return "bg-[#fff6de] text-[#ad7b25]";
  }
}

export function TrainingScreen({ initialEmployeeId, initialDevelopmentId }: {
  initialEmployeeId?: string; initialDevelopmentId?: string;
}) {
  const trainingSnapshot = useSyncExternalStore(subscribeTraining, getTrainingStoredSnapshot, () => "");
  const developmentSnapshot = useSyncExternalStore(subscribeDevelopment, getDevelopmentStoredSnapshot, () => "");
  const records = useMemo(() => listLatestTrainingRecords(trainingSnapshot), [trainingSnapshot]);
  const versions = useMemo(() => listTrainingVersions(trainingSnapshot), [trainingSnapshot]);
  const needs = useMemo(() => listLatestDevelopmentNeeds(developmentSnapshot), [developmentSnapshot]);
  const defaultEmployee = d4ReferenceFixture.employees.some((item) => item.id === initialEmployeeId) ? initialEmployeeId! : "d4000000-0000-4000-8000-000000000009";
  const [selectedId, setSelectedId] = useState("FIX-D4-TRN-001");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [formOpen, setFormOpen] = useState(Boolean(initialDevelopmentId));
  const [employeeId, setEmployeeId] = useState(defaultEmployee);
  const [developmentId, setDevelopmentId] = useState(initialDevelopmentId ?? "");
  const [activity, setActivity] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<TrainingStatus>("Planned");
  const [result, setResult] = useState("");
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState<{ trainingId: string; status: TrainingStatus; result: string; notes: string } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const needOptions = needs.filter((item) => item.employeeId === employeeId);
  const validDevelopmentId = needOptions.some((item) => item.needId === developmentId) ? developmentId : needOptions[0]?.needId ?? "";
  const selected = records.find((item) => item.trainingId === selectedId) ?? records[0];
  const selectedNeed = needs.find((item) => item.needId === selected?.developmentNeedId);
  const selectedEmployee = d4ReferenceFixture.employees.find((item) => item.id === selected?.employeeId);
  const detailStatus = draft?.trainingId === selected?.trainingId ? draft.status : selected?.status ?? "Planned";
  const detailResult = draft?.trainingId === selected?.trainingId ? draft.result : selected?.result ?? "";
  const detailNotes = draft?.trainingId === selected?.trainingId ? draft.notes : selected?.notes ?? "";
  const visible = records.filter((item) => {
    const employee = d4ReferenceFixture.employees.find((ref) => ref.id === item.employeeId);
    return (!statusFilter || item.status === statusFilter) && (!query || `${employee?.fullName ?? ""} ${item.activity}`.toLowerCase().includes(query.toLowerCase()));
  });

  function saveNew() {
    try {
      const record = createTraining({ employeeId, developmentNeedId: validDevelopmentId, activity, date, status, result, notes });
      setSelectedId(record.trainingId); setFormOpen(false); setActivity(""); setDate(""); setResult(""); setNotes("");
      setMessage("Training tersimpan dan terhubung ke development need yang dipilih."); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Training gagal disimpan."); setMessage(""); }
  }

  function saveRevision() {
    if (!selected) return;
    try {
      updateTraining(selected.trainingId, detailStatus, detailResult, detailNotes);
      setDraft(null); setMessage("Revisi training tersimpan. Riwayat lama tetap ada."); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Perubahan gagal disimpan."); setMessage(""); }
  }

  return <D4Shell><div className="max-w-[1450px]">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-[27px] font-bold text-[#1d335b]">Training Tracking</h1><p className="mt-1 text-sm text-[#7686a0]">Pantau aktivitas pengembangan per employee.</p></div><button type="button" onClick={() => { setFormOpen(true); setError(""); }} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#087e69] px-4 text-xs font-bold text-white"><Plus size={14} /> Add Training</button></div>
    <div className="mb-5 rounded-lg border border-[#cde5f7] bg-[#f2f9ff] px-4 py-3 text-xs text-[#326285]">Data demo lokal. Status Completed tidak mengubah bukti kompetensi atau menutup gap.</div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]"><section className="min-w-0"><div className="mb-3 flex flex-wrap gap-3 rounded-lg border border-[#e2e8f0] bg-white p-3"><label className="relative min-w-[230px] flex-1"><Search size={15} className="absolute left-3 top-2.5 text-[#8a9ab2]" /><input aria-label="Cari training" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search employee or activity..." className="h-9 w-full rounded-md border border-[#dbe3f0] bg-[#f3f6ff] pl-9 pr-3 text-xs" /></label><select aria-label="Filter status training" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 rounded-md border border-[#dce5ef] bg-white px-3 text-xs"><option value="">All Status</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="overflow-x-auto rounded-lg border border-[#e2e8f0] bg-white"><table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-[#f7f9fc] text-[10px] uppercase tracking-wide text-[#6f81a0]"><tr><th className="px-4 py-3">Employee</th><th className="px-3 py-3">Training Activity</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Result</th><th className="px-3 py-3">Action</th></tr></thead><tbody className="divide-y divide-[#edf0f4]">{visible.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-[#8392a8]">Belum ada training sesuai filter.</td></tr> : visible.map((item) => <tr key={item.trainingId} className={selected?.trainingId === item.trainingId ? "bg-[#f7fbff]" : "hover:bg-[#fbfcff]"}><td className="px-4 py-4 font-semibold text-[#2c4568]">{d4ReferenceFixture.employees.find((employee) => employee.id === item.employeeId)?.fullName}</td><td className="px-3 py-4 text-[#4d6484]">{item.activity}</td><td className="px-3 py-4 text-[#637b9a]">{item.date}</td><td className="px-3 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusStyle(item.status)}`}>{item.status}</span></td><td className="max-w-[160px] truncate px-3 py-4 text-[#637b9a]">{item.result || "Pending"}</td><td className="px-3 py-4"><button type="button" onClick={() => { setSelectedId(item.trainingId); setDraft(null); setHistoryOpen(false); }} className="font-semibold text-[#2b6bad]">View Details</button></td></tr>)}</tbody></table><div className="border-t border-[#edf0f4] px-4 py-3 text-[11px] text-[#8392a8]">Showing {visible.length} training record(s)</div></div></section>
      <aside className="rounded-lg border border-[#dce5ef] bg-white p-5 shadow-[0_2px_8px_rgba(19,44,80,.07)]">{!selected ? <p className="text-sm text-[#8291a7]">Pilih training untuk melihat detail.</p> : <><div className="mb-4 rounded-lg bg-[#203b67] p-4 text-white"><GraduationCap size={19} /><h2 className="mt-2 text-lg font-bold">{selectedEmployee?.fullName}</h2><p className="text-xs text-[#c7d7ed]">{selectedEmployee?.employeeId} · {selected.activity}</p></div><div className="flex items-center gap-2 text-xs text-[#647e9f]"><CalendarDays size={14} /> {selected.date}</div><div className="mt-5 text-xs"><strong className="text-[#526987]">Linked Development Need</strong><p className="mt-1 text-[#597493]">{selectedNeed?.objective ?? "Referensi tidak tersedia"}</p><Link href={`/development?employeeId=${selected.employeeId}`} className="mt-2 inline-block font-semibold text-[#286ca8]">View Development</Link></div><label className="mt-5 block text-xs font-semibold text-[#526987]">Status<select value={detailStatus} onChange={(event) => setDraft({ trainingId: selected.trainingId, status: event.target.value as TrainingStatus, result: detailResult, notes: detailNotes })} className="mt-2 h-9 w-full rounded-md border border-[#d6e0ec] bg-white px-3 text-xs font-normal">{statuses.map((item) => <option key={item}>{item}</option>)}</select></label><label className="mt-3 block text-xs font-semibold text-[#526987]">Result<textarea value={detailResult} onChange={(event) => setDraft({ trainingId: selected.trainingId, status: detailStatus, result: event.target.value, notes: detailNotes })} rows={2} className="mt-2 w-full rounded-md border border-[#d6e0ec] p-3 text-xs font-normal" /></label><label className="mt-3 block text-xs font-semibold text-[#526987]">Notes<textarea value={detailNotes} onChange={(event) => setDraft({ trainingId: selected.trainingId, status: detailStatus, result: detailResult, notes: event.target.value })} rows={2} className="mt-2 w-full rounded-md border border-[#d6e0ec] p-3 text-xs font-normal" /></label><button type="button" onClick={saveRevision} className="mt-3 h-9 w-full rounded-md bg-[#087e69] text-xs font-bold text-white">Save New Revision</button><button type="button" onClick={() => setHistoryOpen((value) => !value)} className="mt-3 flex w-full items-center justify-center gap-2 text-xs font-semibold text-[#5276a4]"><History size={14} /> {historyOpen ? "Hide" : "View"} History</button>{historyOpen && <ul className="mt-3 space-y-2 border-t border-[#e6ebf2] pt-3">{versions.filter((item) => item.trainingId === selected.trainingId).map((item) => <li key={item.id} className="rounded-md bg-[#f5f8fb] p-2 text-[11px] text-[#5d7696]">Rev {item.revision} · {item.status} · {new Date(item.createdAt).toLocaleDateString("id-ID")}<br />{item.result || "Belum ada hasil"}</li>)}</ul>}</>}</aside></div>
    {(message || error) && <p role="status" className={`mt-4 rounded-md px-3 py-2 text-sm ${error ? "bg-[#fff0f1] text-[#b5444c]" : "bg-[#e8f7ed] text-[#207b5c]"}`}>{error || message}</p>}
  </div>
  {formOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="training-form-title" className="max-h-[90vh] w-full max-w-[720px] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h2 id="training-form-title" className="text-xl font-bold text-[#1f3b65]">Add Training</h2><p className="mt-1 text-xs text-[#7e8ea5]">Pilih employee dan kebutuhan development yang sudah ada.</p></div><button type="button" aria-label="Tutup formulir" onClick={() => setFormOpen(false)}><X size={18} /></button></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-[#536a88]">Employee<select value={employeeId} onChange={(event) => { setEmployeeId(event.target.value); setDevelopmentId(""); }} className="mt-2 h-10 w-full rounded-md border border-[#d5dfea] bg-white px-3 text-sm font-normal">{d4ReferenceFixture.employees.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select></label><label className="text-xs font-semibold text-[#536a88]">Development Need<select value={validDevelopmentId} onChange={(event) => setDevelopmentId(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#d5dfea] bg-white px-3 text-sm font-normal"><option value="">{needOptions.length ? "Pilih kebutuhan" : "Belum ada kebutuhan"}</option>{needOptions.map((item) => <option key={item.needId} value={item.needId}>{item.objective}</option>)}</select></label><label className="text-xs font-semibold text-[#536a88] sm:col-span-2">Training Activity *<input value={activity} onChange={(event) => setActivity(event.target.value)} placeholder="Nama kegiatan" className="mt-2 h-10 w-full rounded-md border border-[#d5dfea] px-3 text-sm font-normal" /></label><label className="text-xs font-semibold text-[#536a88]">Date *<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#d5dfea] px-3 text-sm font-normal" /></label><label className="text-xs font-semibold text-[#536a88]">Status<select value={status} onChange={(event) => setStatus(event.target.value as TrainingStatus)} className="mt-2 h-10 w-full rounded-md border border-[#d5dfea] bg-white px-3 text-sm font-normal">{statuses.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs font-semibold text-[#536a88] sm:col-span-2">Result{status === "Completed" ? " *" : ""}<input value={result} onChange={(event) => setResult(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#d5dfea] px-3 text-sm font-normal" /></label><label className="text-xs font-semibold text-[#536a88] sm:col-span-2">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} className="mt-2 w-full rounded-md border border-[#d5dfea] p-3 text-sm font-normal" /></label></div>{error && <p role="alert" className="mt-4 rounded-md bg-[#fff0f1] px-3 py-2 text-xs text-[#b5444c]">{error}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setFormOpen(false)} className="h-9 rounded-md border border-[#d5dfea] px-4 text-xs font-semibold text-[#536a88]">Cancel</button><button type="button" onClick={saveNew} className="h-9 rounded-md bg-[#087e69] px-4 text-xs font-bold text-white">Save Training</button></div></section></div>}
  </D4Shell>;
}
