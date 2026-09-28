"use client";

import { ArrowRight, BookOpen, History, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { d4ReferenceFixture } from "../shared/fixtures";
import { D4Shell } from "../shared/ui";
import { availableDevelopmentSources, createDevelopmentNeed, getDevelopmentStoredSnapshot, listDevelopmentVersions, listLatestDevelopmentNeeds, subscribeDevelopment, updateDevelopmentNeed } from "./service";
import type { DevelopmentPriority, DevelopmentSourceType, DevelopmentStatus } from "./types";

const labels: Record<DevelopmentSourceType, string> = {
  competency_gap: "Gap Kompetensi", role_change: "Perubahan Peran", performance_context: "Konteks Evaluasi",
};

function badge(status: DevelopmentStatus) {
  switch (status) {
    case "Completed": return "bg-[#e7f7ed] text-[#2b8c5f]";
    case "In Progress": return "bg-[#e8f3ff] text-[#3b75ac]";
    case "Planned": return "bg-[#fff5db] text-[#a97924]";
    default: return "bg-[#f1f3f8] text-[#6d7f9b]";
  }
}

export function DevelopmentScreen({ initialEmployeeId, initialSourceType, initialSourceRef }: {
  initialEmployeeId?: string; initialSourceType?: string; initialSourceRef?: string;
}) {
  const defaultEmployeeId = d4ReferenceFixture.employees.some((item) => item.id === initialEmployeeId)
    ? initialEmployeeId! : "d4000000-0000-4000-8000-000000000009";
  const defaultSourceType: DevelopmentSourceType = initialSourceType === "role_change" || initialSourceType === "performance_context" ? initialSourceType : "competency_gap";
  const snapshot = useSyncExternalStore(subscribeDevelopment, getDevelopmentStoredSnapshot, () => "");
  const needs = useMemo(() => listLatestDevelopmentNeeds(snapshot), [snapshot]);
  const versions = useMemo(() => listDevelopmentVersions(snapshot), [snapshot]);
  const [selectedNeedId, setSelectedNeedId] = useState("FIX-D4-DEV-001");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [formOpen, setFormOpen] = useState(Boolean(initialSourceRef));
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId);
  const [sourceType, setSourceType] = useState<DevelopmentSourceType>(defaultSourceType);
  const [sourceRef, setSourceRef] = useState(initialSourceRef ?? "");
  const [objective, setObjective] = useState("");
  const [priority, setPriority] = useState<DevelopmentPriority>("Medium");
  const [notes, setNotes] = useState("");
  const [updateDraft, setUpdateDraft] = useState<{ needId: string; status: DevelopmentStatus; notes: string } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const sourceOptions = availableDevelopmentSources(employeeId, sourceType);
  const validSourceRef = sourceOptions.some((item) => item.ref === sourceRef) ? sourceRef : sourceOptions[0]?.ref ?? "";
  const selected = needs.find((item) => item.needId === selectedNeedId) ?? needs[0];
  const selectedEmployee = d4ReferenceFixture.employees.find((item) => item.id === selected?.employeeId);
  const detailStatus = updateDraft?.needId === selected?.needId ? updateDraft.status : selected?.status ?? "Identified";
  const detailNotes = updateDraft?.needId === selected?.needId ? updateDraft.notes : selected?.notes ?? "";
  const visible = needs.filter((item) => {
    const employee = d4ReferenceFixture.employees.find((ref) => ref.id === item.employeeId);
    return (!filter || item.status === filter) && (!query || `${employee?.fullName ?? ""} ${item.objective} ${labels[item.sourceType]}`.toLowerCase().includes(query.toLowerCase()));
  });

  function changeEmployee(nextId: string) { setEmployeeId(nextId); setSourceRef(""); }
  function changeSource(nextType: DevelopmentSourceType) { setSourceType(nextType); setSourceRef(""); }

  function createNeed() {
    try {
      const result = createDevelopmentNeed({ employeeId, sourceType, sourceRef: validSourceRef, objective, priority, notes });
      setSelectedNeedId(result.needId); setFormOpen(false); setObjective(""); setNotes("");
      setMessage("Development need baru tersimpan dengan referensi sumber yang valid."); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Development need gagal disimpan."); setMessage(""); }
  }

  function updateNeed() {
    if (!selected) return;
    try {
      updateDevelopmentNeed(selected.needId, detailStatus, detailNotes);
      setUpdateDraft(null); setMessage("Perubahan status tersimpan sebagai revisi baru, riwayat lama tetap ada."); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Status gagal diperbarui."); setMessage(""); }
  }

  return <D4Shell><div className="max-w-[1450px]"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-[27px] font-bold text-[#1d335b]">Development Needs</h1><p className="mt-1 text-sm text-[#7686a0]">Catat kebutuhan pengembangan dari gap, perubahan peran, atau konteks evaluasi.</p></div><button type="button" onClick={() => { setFormOpen(true); setError(""); }} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#087e69] px-4 text-xs font-bold text-white"><Plus size={14} /> Add Development Need</button></div>
    <div className="mb-5 rounded-lg border border-[#cde5f7] bg-[#f2f9ff] px-4 py-3 text-xs text-[#326285]">Data demo lokal. Tidak ada pembuatan kebutuhan secara periodik, pemilihan training otomatis, atau penutupan gap otomatis.</div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]"><section className="min-w-0"><div className="mb-3 flex flex-wrap gap-3 rounded-lg border border-[#e2e8f0] bg-white p-3"><label className="relative min-w-[230px] flex-1"><Search size={15} className="absolute left-3 top-2.5 text-[#8a9ab2]" /><input aria-label="Cari kebutuhan pengembangan" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search employee or objective..." className="h-9 w-full rounded-md border border-[#dbe3f0] bg-[#f3f6ff] pl-9 pr-3 text-xs" /></label><select aria-label="Filter status development" value={filter} onChange={(event) => setFilter(event.target.value)} className="h-9 rounded-md border border-[#dce5ef] bg-white px-3 text-xs"><option value="">All Status</option><option>Identified</option><option>Planned</option><option>In Progress</option><option>Completed</option></select></div><div className="overflow-x-auto rounded-lg border border-[#e2e8f0] bg-white"><table className="w-full min-w-[650px] text-left text-xs"><thead className="bg-[#f7f9fc] text-[10px] uppercase tracking-wide text-[#6f81a0]"><tr><th className="px-4 py-3">Employee</th><th className="px-3 py-3">Development Objective</th><th className="px-3 py-3">Source</th><th className="px-3 py-3">Priority</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Action</th></tr></thead><tbody className="divide-y divide-[#edf0f4]">{visible.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-[#8392a8]">Belum ada kebutuhan sesuai filter.</td></tr> : visible.map((item) => <tr key={item.needId} className={selected?.needId === item.needId ? "bg-[#f7fbff]" : "hover:bg-[#fbfcff]"}><td className="px-4 py-4 font-semibold text-[#2c4568]">{d4ReferenceFixture.employees.find((employee) => employee.id === item.employeeId)?.fullName}</td><td className="max-w-[230px] px-3 py-4 text-[#4d6484]">{item.objective}</td><td className="px-3 py-4 text-[#637b9a]">{labels[item.sourceType]}</td><td className="px-3 py-4 text-[#637b9a]">{item.priority}</td><td className="px-3 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${badge(item.status)}`}>{item.status}</span></td><td className="px-3 py-4"><button type="button" onClick={() => { setSelectedNeedId(item.needId); setUpdateDraft(null); setHistoryOpen(false); }} className="font-semibold text-[#2b6bad]">View Details</button></td></tr>)}</tbody></table><div className="border-t border-[#edf0f4] px-4 py-3 text-[11px] text-[#8392a8]">Showing {visible.length} development need(s)</div></div></section>
      <aside className="rounded-lg border border-[#dce5ef] bg-white p-5 shadow-[0_2px_8px_rgba(19,44,80,.07)]">{!selected ? <p className="text-sm text-[#8291a7]">Pilih kebutuhan untuk melihat detail.</p> : <><div className="mb-4 rounded-lg bg-[#203b67] p-4 text-white"><BookOpen size={18} /><h2 className="mt-2 text-lg font-bold">{selectedEmployee?.fullName}</h2><p className="text-xs text-[#c7d7ed]">{selectedEmployee?.employeeId} · {labels[selected.sourceType]}</p></div><h3 className="text-sm font-bold text-[#2b456c]">Development Objective</h3><p className="mt-2 text-sm leading-relaxed text-[#526a89]">{selected.objective}</p><dl className="mt-5 space-y-3 text-xs"><div><dt className="font-semibold text-[#7c8da6]">Source Reference</dt><dd className="mt-1 break-all text-[#416284]">{selected.sourceType}:{selected.sourceRef}</dd></div><div><dt className="font-semibold text-[#7c8da6]">Priority</dt><dd className="mt-1 text-[#416284]">{selected.priority}</dd></div><div><dt className="font-semibold text-[#7c8da6]">Created</dt><dd className="mt-1 text-[#416284]">{new Date(selected.createdAt).toLocaleDateString("id-ID")} · {selected.actor}</dd></div></dl><label className="mt-5 block text-xs font-semibold text-[#526987]">Status<select value={detailStatus} onChange={(event) => setUpdateDraft({ needId: selected.needId, status: event.target.value as DevelopmentStatus, notes: detailNotes })} className="mt-2 h-9 w-full rounded-md border border-[#d6e0ec] bg-white px-3 text-xs font-normal"><option>Identified</option><option>Planned</option><option>In Progress</option><option>Completed</option></select></label><label className="mt-3 block text-xs font-semibold text-[#526987]">Notes<textarea value={detailNotes} onChange={(event) => setUpdateDraft({ needId: selected.needId, status: detailStatus, notes: event.target.value })} rows={3} className="mt-2 w-full rounded-md border border-[#d6e0ec] p-3 text-xs font-normal" /></label><button type="button" onClick={updateNeed} className="mt-3 h-9 w-full rounded-md bg-[#087e69] text-xs font-bold text-white">Save New Revision</button><Link href={`/training?employeeId=${selected.employeeId}&developmentId=${selected.needId}`} className="mt-2 flex h-9 items-center justify-center gap-2 rounded-md border border-[#cbdcf0] bg-[#f5f8ff] text-xs font-semibold text-[#2e629b]">Add Training <ArrowRight size={13} /></Link><button type="button" onClick={() => setHistoryOpen((value) => !value)} className="mt-3 flex w-full items-center justify-center gap-2 text-xs font-semibold text-[#5276a4]"><History size={14} /> {historyOpen ? "Hide" : "View"} History</button>{historyOpen && <ul className="mt-3 space-y-2 border-t border-[#e6ebf2] pt-3">{versions.filter((item) => item.needId === selected.needId).map((item) => <li key={item.id} className="rounded-md bg-[#f5f8fb] p-2 text-[11px] text-[#5d7696]">Rev {item.revision} · {item.status} · {new Date(item.createdAt).toLocaleDateString("id-ID")}<br />{item.notes || "Tanpa catatan"}</li>)}</ul>}</>}</aside></div>
    {(message || error) && <p role="status" className={`mt-4 rounded-md px-3 py-2 text-sm ${error ? "bg-[#fff0f1] text-[#b5444c]" : "bg-[#e8f7ed] text-[#207b5c]"}`}>{error || message}</p>}
  </div>
  {formOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="development-form-title" className="w-full max-w-[720px] rounded-xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h2 id="development-form-title" className="text-xl font-bold text-[#1f3b65]">Add Development Need</h2><p className="mt-1 text-xs text-[#7e8ea5]">Pilih sumber yang dapat ditelusuri.</p></div><button type="button" aria-label="Tutup formulir" onClick={() => setFormOpen(false)}><X size={18} /></button></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-[#536a88]">Employee<select value={employeeId} onChange={(event) => changeEmployee(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#d5dfea] bg-white px-3 text-sm font-normal">{d4ReferenceFixture.employees.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select></label><label className="text-xs font-semibold text-[#536a88]">Source Type<select value={sourceType} onChange={(event) => changeSource(event.target.value as DevelopmentSourceType)} className="mt-2 h-10 w-full rounded-md border border-[#d5dfea] bg-white px-3 text-sm font-normal">{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-semibold text-[#536a88] sm:col-span-2">Source Reference<select value={validSourceRef} onChange={(event) => setSourceRef(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#d5dfea] bg-white px-3 text-sm font-normal"><option value="">{sourceOptions.length ? "Pilih sumber" : "Sumber belum tersedia untuk employee ini"}</option>{sourceOptions.map((item) => <option key={item.ref} value={item.ref}>{item.label}</option>)}</select></label><label className="text-xs font-semibold text-[#536a88] sm:col-span-2">Development Objective *<input value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Tujuan pengembangan yang spesifik" className="mt-2 h-10 w-full rounded-md border border-[#d5dfea] px-3 text-sm font-normal" /></label><label className="text-xs font-semibold text-[#536a88]">Priority<select value={priority} onChange={(event) => setPriority(event.target.value as DevelopmentPriority)} className="mt-2 h-10 w-full rounded-md border border-[#d5dfea] bg-white px-3 text-sm font-normal"><option>Low</option><option>Medium</option><option>High</option></select></label><label className="text-xs font-semibold text-[#536a88]">Notes<input value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#d5dfea] px-3 text-sm font-normal" /></label></div>{error && <p role="alert" className="mt-4 rounded-md bg-[#fff0f1] px-3 py-2 text-xs text-[#b5444c]">{error}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setFormOpen(false)} className="h-9 rounded-md border border-[#d5dfea] px-4 text-xs font-semibold text-[#536a88]">Cancel</button><button type="button" onClick={createNeed} className="h-9 rounded-md bg-[#087e69] px-4 text-xs font-bold text-white">Save Development Need</button></div></section></div>}
  </D4Shell>;
}
