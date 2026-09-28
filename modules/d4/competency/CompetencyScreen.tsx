"use client";

import { ArrowRight, BookOpen, ChevronDown, ClipboardList, History, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { d4ReferenceFixture } from "../shared/fixtures";
import { D4Shell } from "../shared/ui";
import { compareCompetencies, getCompetencyStoredSnapshot, listCompetencyAssessments, saveCompetencyAssessment, subscribeCompetency } from "./service";
import type { CompetencyOverallStatus, CompetencyStatus } from "./types";

function statusClass(status: CompetencyOverallStatus | CompetencyStatus) {
  switch (status) {
    case "Terpenuhi": return "bg-[#e8f7ed] text-[#2b8a60] border-[#ccebd7]";
    case "Gap": return "bg-[#fff1f2] text-[#c45765] border-[#ffdadd]";
    case "Bukti Belum Cukup": return "bg-[#fff8e6] text-[#af7e22] border-[#f6e3ae]";
    default: return "bg-[#eef3fa] text-[#6c7d96] border-[#dbe3ee]";
  }
}

export function CompetencyScreen({ initialEmployeeId }: { initialEmployeeId?: string }) {
  const initial = d4ReferenceFixture.employees.find((item) => item.id === initialEmployeeId) ?? d4ReferenceFixture.employees.find((item) => item.fullName === "Nadin Amizah")!;
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initial.id);
  const [assessmentPositionId, setAssessmentPositionId] = useState(initial.positionId ?? "");
  const [effectiveDate, setEffectiveDate] = useState("2026-09-28");
  const [query, setQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const snapshot = useSyncExternalStore(subscribeCompetency, getCompetencyStoredSnapshot, () => "");
  const history = useMemo(() => listCompetencyAssessments(snapshot), [snapshot]);

  const selectedEmployee = d4ReferenceFixture.employees.find((item) => item.id === selectedEmployeeId)!;
  const selectedPosition = d4ReferenceFixture.positions.find((item) => item.id === assessmentPositionId);
  const comparison = compareCompetencies(selectedEmployeeId, assessmentPositionId);
  const gapFinding = comparison.findings.find((item) => item.status === "Gap");
  const rows = d4ReferenceFixture.employees.filter((item) => item.employeeId !== "FIX-D4-EMP-001").map((employee) => {
    const position = d4ReferenceFixture.positions.find((item) => item.id === employee.positionId);
    const result = compareCompetencies(employee.id, employee.positionId ?? "");
    return { employee, position, result };
  }).filter(({ employee, position, result }) => {
    const text = `${employee.fullName} ${employee.employeeId} ${position?.title ?? ""}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (!positionFilter || employee.positionId === positionFilter) && (!statusFilter || result.overallStatus === statusFilter);
  });

  function chooseEmployee(employeeId: string) {
    const employee = d4ReferenceFixture.employees.find((item) => item.id === employeeId);
    if (!employee) return;
    setSelectedEmployeeId(employeeId);
    setAssessmentPositionId(employee.positionId ?? "");
    setHistoryOpen(false);
    setMessage("");
    setError("");
  }

  function saveSnapshot() {
    try {
      const record = saveCompetencyAssessment({ employeeId: selectedEmployeeId, positionId: assessmentPositionId, effectiveDate });
      setMessage(`Snapshot ${record.context === "role-change" ? "perubahan posisi" : "posisi saat ini"} tersimpan tanpa mengubah master employee.`);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Snapshot gagal disimpan.");
      setMessage("");
    }
  }

  return <D4Shell>
    <div className="max-w-[1450px]"><div className="mb-5"><h1 className="text-[27px] font-bold tracking-tight text-[#1d335b]">Competency Needs</h1><p className="mt-1 text-sm text-[#7686a0]">Identify competency gaps and trace each comparison to position requirements and employee evidence.</p></div>
      <div className="mb-5 rounded-lg border border-[#cde5f7] bg-[#f2f9ff] px-4 py-3 text-xs text-[#326285]">Seluruh requirement dan skill di halaman ini adalah fixture. Kekurangan bukti tetap ditandai “Bukti Belum Cukup”, bukan otomatis dianggap gap.</div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_385px]">
        <section className="min-w-0"><div className="mb-3 flex flex-wrap gap-3 rounded-lg border border-[#e2e8f0] bg-white p-3"><label className="relative min-w-[200px] flex-1"><Search size={15} className="absolute left-3 top-2.5 text-[#8a9ab2]" /><input aria-label="Cari employee atau posisi" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search employee or competency..." className="h-9 w-full rounded-md border border-[#dbe3f0] bg-[#f3f6ff] pl-9 pr-3 text-xs" /></label><label className="relative"><span className="sr-only">Filter posisi</span><select value={positionFilter} onChange={(event) => setPositionFilter(event.target.value)} className="h-9 min-w-[125px] appearance-none rounded-md border border-[#dce5ef] pl-3 pr-7 text-xs"><option value="">All Positions</option>{d4ReferenceFixture.positions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><ChevronDown size={12} className="pointer-events-none absolute right-2 top-3 text-[#8290a4]" /></label><label className="relative"><span className="sr-only">Filter status gap</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 min-w-[135px] appearance-none rounded-md border border-[#dce5ef] pl-3 pr-7 text-xs"><option value="">All Gap Status</option><option>Terpenuhi</option><option>Gap</option><option>Bukti Belum Cukup</option><option>Belum Ada Persyaratan</option></select><ChevronDown size={12} className="pointer-events-none absolute right-2 top-3 text-[#8290a4]" /></label></div>
          <div className="overflow-x-auto rounded-lg border border-[#e2e8f0] bg-white shadow-[0_1px_4px_rgba(19,44,80,.05)]"><table className="w-full min-w-[650px] text-left text-xs"><thead className="bg-[#f7f9fc] text-[10px] uppercase tracking-wide text-[#6f81a0]"><tr><th className="px-4 py-3">Employee</th><th className="px-3 py-3">Position</th><th className="px-3 py-3">Needs</th><th className="px-3 py-3">Gap Status</th><th className="px-3 py-3">Action</th></tr></thead><tbody className="divide-y divide-[#edf0f4]">{rows.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-[#8493a8]">Tidak ada employee sesuai filter.</td></tr> : rows.map(({ employee, position, result }) => <tr key={employee.id} className={selectedEmployeeId === employee.id ? "bg-[#f7fbff]" : "hover:bg-[#fbfcff]"}><td className="px-4 py-4"><strong className="block text-[#284165]">{employee.fullName}</strong><small className="text-[10px] text-[#8998ad]">{employee.employeeId}</small></td><td className="px-3 py-4 text-[#526987]">{position?.title}</td><td className="px-3 py-4 text-[#526987]">{result.findings.filter((item) => item.status === "Gap").length} gap, {result.findings.filter((item) => item.status === "Bukti Belum Cukup").length} bukti</td><td className="px-3 py-4"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${statusClass(result.overallStatus)}`}>{result.overallStatus}</span></td><td className="px-3 py-4"><button type="button" onClick={() => chooseEmployee(employee.id)} className="text-xs font-semibold text-[#2866aa] hover:underline">View Details</button></td></tr>)}</tbody></table><div className="border-t border-[#edf0f4] px-4 py-3 text-[11px] text-[#8392a8]">Showing {rows.length} employee(s)</div></div>
        </section>
        <aside className="rounded-lg border border-[#dce5ef] bg-white p-5 shadow-[0_2px_8px_rgba(19,44,80,.07)]"><div className="mb-5 rounded-lg bg-[#203b67] p-4 text-white"><div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-full bg-[#6b7f9f] text-sm font-bold">{selectedEmployee.fullName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><h2 className="font-bold">{selectedEmployee.fullName}</h2><p className="text-[11px] text-[#bed1ed]">{selectedEmployee.employeeId}</p></div></div><p className="mt-3 text-xs text-[#c6d6ee]">{selectedPosition?.title}</p><span className={`mt-3 inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${statusClass(comparison.overallStatus)}`}>{comparison.overallStatus}</span></div>
          <label className="block text-xs font-semibold text-[#4b6383]">Posisi pembanding<select value={assessmentPositionId} onChange={(event) => { setAssessmentPositionId(event.target.value); setMessage(""); }} className="mt-2 h-9 w-full rounded-md border border-[#d6e0ec] bg-white px-2 text-xs font-normal">{d4ReferenceFixture.positions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><p className="mt-1 text-[10px] text-[#8493aa]">Memilih posisi lain membuat konteks role change untuk snapshot, tanpa mengubah employee master.</p>
          <div className="mt-5 space-y-3"><h3 className="text-xs font-bold uppercase tracking-wide text-[#6e82a0]">Competency Comparison</h3>{comparison.findings.length === 0 ? <p className="rounded-md bg-[#f5f7fa] p-3 text-xs text-[#7d8da4]">Belum ada persyaratan posisi dalam fixture.</p> : comparison.findings.map((finding) => <div key={finding.requirementId} className="rounded-lg border border-[#e4eaf1] p-3"><div className="flex items-start justify-between gap-2"><strong className="text-xs text-[#2b4468]">{finding.competencyName}</strong><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass(finding.status)}`}>{finding.status}</span></div><p className="mt-2 text-[11px] text-[#647b99]">Required level {finding.requiredLevel} · Actual {finding.actualLevel ?? "belum ada"}</p><p className="mt-1 text-[11px] text-[#8392a8]">{finding.evidenceNotes || "Evidence belum tersedia."}</p><p className="mt-2 break-all text-[10px] text-[#9aa7b9]">{finding.sourceReference}</p></div>)}</div>
          <label className="mt-5 block text-xs font-semibold text-[#4b6383]">Tanggal berlaku snapshot<input type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} className="mt-2 h-9 w-full rounded-md border border-[#d6e0ec] px-2 text-xs font-normal" /></label><button type="button" onClick={saveSnapshot} className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[#087a70] text-xs font-bold text-white"><ClipboardList size={14} /> Save Assessment Snapshot</button>
          {gapFinding && <Link href={`/development?employeeId=${selectedEmployeeId}&sourceType=competency_gap&sourceRef=${gapFinding.requirementId}`} className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-md border border-[#cbdcf0] bg-[#f5f8ff] text-xs font-semibold text-[#2e629b]"><BookOpen size={14} /> Create Development Need <ArrowRight size={13} /></Link>}
          <button type="button" onClick={() => setHistoryOpen((value) => !value)} className="mt-2 flex w-full items-center justify-center gap-2 text-xs font-semibold text-[#5276a4]"><History size={14} /> {historyOpen ? "Hide" : "View"} History</button>
          {(message || error) && <p role="status" className={`mt-3 rounded-md px-3 py-2 text-xs ${error ? "bg-[#fff0f1] text-[#b5444c]" : "bg-[#e8f7ed] text-[#207b5c]"}`}>{error || message}</p>}
          {historyOpen && <div className="mt-3 border-t border-[#e5eaf1] pt-3"><h3 className="text-xs font-bold text-[#405b80]">Assessment History</h3>{history.filter((item) => item.employeeId === selectedEmployeeId).length === 0 ? <p className="mt-2 text-xs text-[#8b99ad]">Belum ada snapshot tersimpan.</p> : <ul className="mt-2 space-y-2">{history.filter((item) => item.employeeId === selectedEmployeeId).map((item) => <li key={item.id} className="rounded-md bg-[#f6f8fb] p-2 text-[11px] text-[#5e7696]"><strong>{d4ReferenceFixture.positions.find((position) => position.id === item.positionId)?.title}</strong><br />{item.effectiveDate} · {item.context} · {item.overallStatus}</li>)}</ul>}</div>}
        </aside>
      </div>
    </div>
  </D4Shell>;
}
