"use client";

import { useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { compareCompetencies } from "../../competency/service";
import type { CompetencyFinding } from "../../competency/types";
import type { EmployeeReference } from "../../shared/types";
import { SupabaseD4Repository } from "../repository";
import { latestTraining, type D4LiveSnapshot } from "../types";

type Props = {
  view: "competency" | "dashboard";
  snapshot: D4LiveSnapshot;
  busy: boolean;
  runWrite: (operation: (repo: SupabaseD4Repository, data: D4LiveSnapshot) => Promise<unknown>, success: string) => Promise<void>;
  navigate: (url: string) => void;
};

type FindingRow = {
  employee: EmployeeReference;
  position: string;
  positionId: string | null;
  finding: CompetencyFinding | null;
  assessedAt: string | null;
};

const surface = "rounded-[10px] border border-[#d9e2ec] bg-white";
const selectClass = "h-9 rounded-md border border-[#d9e2ec] bg-white px-3 text-xs text-[#334766] outline-none focus:border-[#3b6ff5]";

function visibleEmployees(snapshot: D4LiveSnapshot) {
  return snapshot.role === "EMPLOYEE"
    ? snapshot.reference.employees.filter((item) => item.id === snapshot.actorEmployeeId)
    : snapshot.reference.employees;
}

function currentComparison(snapshot: D4LiveSnapshot, employee: EmployeeReference) {
  if (!employee.positionId || !snapshot.reference.positions.some((item) => item.id === employee.positionId)) return null;
  return compareCompetencies(employee.id, employee.positionId, snapshot.reference);
}

function latestByEmployee<T extends { employeeId: string; createdAt: string }>(items: readonly T[], employeeId: string): T | null {
  return items.filter((item) => item.employeeId === employeeId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

function statusForFinding(finding: CompetencyFinding | null, assessedAt: string | null) {
  if (!finding) return "Belum Dinilai";
  if (finding.status === "Gap") return "Perlu Perhatian";
  if (finding.status === "Bukti Belum Cukup") return "Perlu Ditinjau";
  return assessedAt ? "Sesuai" : "Belum Dinilai";
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "green" | "amber" | "red" | "blue" | "gray" }) {
  const colors = {
    green: "bg-[#eaf7f0] text-[#16815f]",
    amber: "bg-[#fff4d4] text-[#9a7000]",
    red: "bg-[#fde9ea] text-[#ca4c58]",
    blue: "bg-[#eaf1ff] text-[#3b6ff5]",
    gray: "bg-[#eef2f7] text-[#64748b]",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${colors[tone]}`}><span aria-hidden="true" className="size-1.5 rounded-full bg-current" />{children}</span>;
}

function CompetencyNeeds({ snapshot, busy, runWrite, navigate }: Omit<Props, "view">) {
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [evidenceFilter, setEvidenceFilter] = useState("");
  const [page, setPage] = useState(1);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const employees = visibleEmployees(snapshot);
  const rows = useMemo(() => employees.flatMap((employee): FindingRow[] => {
    const position = snapshot.reference.positions.find((item) => item.id === employee.positionId);
    const comparison = currentComparison(snapshot, employee);
    const assessment = snapshot.competency.filter((item) => item.employeeId === employee.id && item.positionId === employee.positionId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const base = { employee, position: position?.title ?? "Posisi belum tersedia", positionId: employee.positionId, assessedAt: assessment?.effectiveDate ?? null };
    return comparison?.findings.length
      ? comparison.findings.map((finding) => ({ ...base, finding }))
      : [{ ...base, finding: null }];
  }), [employees, snapshot]);

  const filtered = rows.filter((row) => {
    const query = search.trim().toLocaleLowerCase();
    if (query && !`${row.employee.fullName} ${row.employee.employeeId} ${row.finding?.competencyName ?? ""}`.toLocaleLowerCase().includes(query)) return false;
    if (positionFilter && row.positionId !== positionFilter) return false;
    if (statusFilter && statusForFinding(row.finding, row.assessedAt) !== statusFilter) return false;
    if (evidenceFilter === "with-evidence" && !row.finding?.evidenceNotes?.trim()) return false;
    if (evidenceFilter === "without-evidence" && !!row.finding?.evidenceNotes?.trim()) return false;
    return true;
  });
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const canWrite = snapshot.role === "HR" || snapshot.role === "MANAGER";
  function updateFilter(update: () => void) { update(); setPage(1); setOpenRow(null); }

  return <div className="space-y-5 text-[#172033]">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-[25px] font-bold tracking-tight text-[#1d335b]">Competency Needs</h1><p className="mt-1 text-xs text-[#7786a1]">Bandingkan bukti kompetensi pegawai dengan persyaratan posisi saat ini.</p></div>{canWrite && <button type="button" onClick={() => navigate("/live?module=competency&view=assessment")} className="rounded-md border border-[#d9e2ec] bg-white px-3 py-2 text-xs font-semibold text-[#3b6ff5]">Assessment posisi lain</button>}</header>
    <div className={`${surface} flex flex-wrap items-center gap-3 p-4`}>
      <label className="relative min-w-[220px] flex-1"><Search size={15} className="absolute left-3 top-2.5 text-[#7b91ad]" /><span className="sr-only">Cari pegawai atau kompetensi</span><input value={search} onChange={(event) => updateFilter(() => setSearch(event.target.value))} placeholder="Cari nama pegawai atau kompetensi" className="h-9 w-full rounded-md border border-[#e5eaf0] bg-[#f4f6fa] pl-9 pr-3 text-xs outline-none focus:border-[#3b6ff5]" /></label>
      <label><span className="sr-only">Filter posisi</span><select className={selectClass} value={positionFilter} onChange={(event) => updateFilter(() => setPositionFilter(event.target.value))}><option value="">Semua posisi</option>{snapshot.reference.positions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <label><span className="sr-only">Filter status</span><select className={selectClass} value={statusFilter} onChange={(event) => updateFilter(() => setStatusFilter(event.target.value))}><option value="">Semua status</option><option>Sesuai</option><option>Perlu Ditinjau</option><option>Perlu Perhatian</option><option>Belum Dinilai</option></select></label>
      <label><span className="sr-only">Filter bukti</span><select className={selectClass} value={evidenceFilter} onChange={(event) => updateFilter(() => setEvidenceFilter(event.target.value))}><option value="">Semua bukti</option><option value="with-evidence">Ada bukti</option><option value="without-evidence">Tanpa bukti</option></select></label>
    </div>
    <section className={`${surface} overflow-hidden`} aria-label="Daftar kebutuhan kompetensi">
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead className="border-b border-[#e5eaf0] bg-[#f6f8fc] text-[10px] font-semibold uppercase tracking-wide text-[#7b91ad]"><tr><th className="px-4 py-3">Pegawai</th><th className="px-4 py-3">Posisi</th><th className="px-4 py-3">Persyaratan kompetensi</th><th className="px-4 py-3">Bukti / level</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Aksi</th></tr></thead><tbody>{visible.map((row) => {
        const key = `${row.employee.id}:${row.finding?.requirementId ?? "none"}`;
        const status = statusForFinding(row.finding, row.assessedAt);
        const tone = status === "Sesuai" ? "green" : status === "Perlu Perhatian" ? "red" : status === "Perlu Ditinjau" ? "amber" : "gray";
        return <tr key={key} className="border-b border-[#edf1f6] align-top last:border-0"><td className="px-4 py-3"><strong className="block font-semibold text-[#172033]">{row.employee.fullName}</strong><span className="text-[10px] text-[#7b91ad]">{row.employee.employeeId}</span></td><td className="px-4 py-3">{row.position}</td><td className="px-4 py-3">{row.finding?.competencyName ?? "Belum ada persyaratan"}<span className="block text-[10px] text-[#7b91ad]">{row.finding ? `Minimal level ${row.finding.requiredLevel}` : ""}</span></td><td className="px-4 py-3">{row.finding?.actualLevel == null ? "Belum ada level" : `Level ${row.finding.actualLevel}`}<span className="block max-w-[210px] truncate text-[10px] text-[#7b91ad]" title={row.finding?.evidenceNotes ?? ""}>{row.finding?.evidenceNotes?.trim() || "Bukti belum tersedia"}</span></td><td className="px-4 py-3"><Badge tone={tone}>{status}</Badge></td><td className="px-4 py-3"><button type="button" className="text-xs font-semibold text-[#3b6ff5] hover:underline" aria-expanded={openRow === key} onClick={() => setOpenRow(openRow === key ? null : key)}>{openRow === key ? "Tutup" : "Detail"}</button>{openRow === key && <div className="mt-3 min-w-[160px] space-y-2 rounded-md border border-[#d9e2ec] bg-white p-3 shadow-sm"><p className="text-[11px] text-[#64748b]">{row.assessedAt ? `Assessment terakhir: ${row.assessedAt}` : "Belum ada assessment tersimpan."}</p>{canWrite && row.positionId && row.finding && <button type="button" disabled={busy} className="block font-semibold text-[#3b6ff5] disabled:opacity-50" onClick={() => void runWrite((repo, data) => repo.saveCompetency({ employeeId: row.employee.id, positionId: row.positionId!, effectiveDate: new Date().toISOString().slice(0, 10) }, data.reference), "Assessment kompetensi tersimpan.")}>Simpan assessment</button>}{canWrite && row.finding?.status === "Gap" && <button type="button" className="flex items-center gap-1 font-semibold text-[#3b6ff5]" onClick={() => navigate(`/live?module=development&view=development-new&employee=${encodeURIComponent(row.employee.id)}&source=${encodeURIComponent(row.finding!.requirementId)}`)}>Buat development need <ArrowRight size={12} /></button>}</div>}</td></tr>;
      })}</tbody></table></div>
      {!filtered.length && <p className="px-5 py-10 text-center text-sm text-[#64748b]">Tidak ada data kompetensi yang cocok dengan filter.</p>}
      {!!filtered.length && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5eaf0] px-4 py-3 text-[11px] text-[#64748b]"><span>Menampilkan {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filtered.length)} dari {filtered.length} persyaratan</span><div className="flex items-center gap-1"><button type="button" aria-label="Halaman sebelumnya" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded border border-[#d9e2ec] p-1.5 disabled:opacity-40"><ChevronLeft size={13} /></button><span className="px-2">{currentPage} / {pageCount}</span><button type="button" aria-label="Halaman berikutnya" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} className="rounded border border-[#d9e2ec] p-1.5 disabled:opacity-40"><ChevronRight size={13} /></button></div></div>}
    </section>
  </div>;
}

function average(values: number[]) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; }
function displayScore(value: number | null, scale: number) { return value === null ? "Belum ada" : `${value.toFixed(2)} / ${scale}`; }
function quarter(period: string) {
  const match = /^(\d{4})-(\d{2})/.exec(period);
  if (!match) return null;
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? `${match[1]} Q${Math.ceil(month / 3)}` : null;
}

function PeopleDashboard({ snapshot, navigate }: Pick<Props, "snapshot" | "navigate">) {
  const employees = visibleEmployees(snapshot);
  const ids = new Set(employees.map((item) => item.id));
  const performances = employees.flatMap((employee) => {
    const record = latestByEmployee(snapshot.performance.filter((item) => item.status === "completed"), employee.id);
    return record && record.overallScore !== null ? [record] : [];
  });
  const kpis = employees.flatMap((employee) => {
    const record = snapshot.kpi.filter((item) => item.employeeId === employee.id)
      .sort((a, b) => b.period.localeCompare(a.period) || b.createdAt.localeCompare(a.createdAt))[0];
    return record ? [record] : [];
  });
  const training = latestTraining(snapshot).filter((item) => ids.has(item.employeeId));
  const comparisons = employees.map((employee) => ({ employee, comparison: currentComparison(snapshot, employee) }));
  const openGaps = comparisons.reduce((sum, item) => sum + (item.comparison?.findings.filter((finding) => finding.status === "Gap").length ?? 0), 0);
  const currentTraining = training.filter((item) => item.status === "In Progress").length;
  const cards = [
    { label: "Rata-rata kinerja", value: displayScore(average(performances.map((item) => item.overallScore!)), 5), color: "#8057e8", note: `${performances.length} evaluasi selesai` },
    { label: "Rata-rata KPI", value: displayScore(average(kpis.map((item) => item.score)), 100), color: "#3b6ff5", note: `${kpis.length} pegawai dengan data` },
    { label: "Gap terbuka", value: String(openGaps), color: "#f4a700", note: "Berdasarkan bukti terkini" },
    { label: "Training berjalan", value: String(currentTraining), color: "#3b6ff5", note: `${training.length} training tercatat` },
  ];
  const quarters = [...new Set([...snapshot.performance.filter((item) => ids.has(item.employeeId) && item.status === "completed" && item.overallScore !== null).map((item) => quarter(item.period)), ...snapshot.kpi.filter((item) => ids.has(item.employeeId)).map((item) => quarter(item.period))].filter((value): value is string => !!value))].sort().slice(-4);
  const trend = quarters.map((label) => ({
    label,
    performance: average(snapshot.performance.filter((item) => ids.has(item.employeeId) && item.status === "completed" && quarter(item.period) === label && item.overallScore !== null).map((item) => item.overallScore!)),
    kpi: average(snapshot.kpi.filter((item) => ids.has(item.employeeId) && quarter(item.period) === label).map((item) => item.score)),
  }));
  const attention = employees.flatMap((employee) => {
    const messages: string[] = [];
    const evaluation = latestByEmployee(snapshot.performance, employee.id);
    if (evaluation?.reviewStatus === "Needs Attention" || evaluation?.reviewStatus === "Needs Review") messages.push(`Evaluasi: ${evaluation.reviewStatus}`);
    const gaps = currentComparison(snapshot, employee)?.findings.filter((item) => item.status === "Gap").length ?? 0;
    if (gaps) messages.push(`${gaps} gap kompetensi`);
    const activeTraining = training.filter((item) => item.employeeId === employee.id && item.status === "In Progress").length;
    if (activeTraining) messages.push(`${activeTraining} training berjalan`);
    return messages.length ? [{ employee, messages, evaluation, gaps, activeTraining }] : [];
  });

  return <div className="space-y-6 text-[#172033]">
    <header><h1 className="text-[25px] font-bold tracking-tight text-[#1d335b]">People Dashboard</h1><p className="mt-1 text-xs text-[#7786a1]">Ringkasan kinerja, KPI, gap kompetensi, dan progres training dari data HRMS.</p></header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <section key={card.label} className={`${surface} min-h-[94px] p-4`}><p className="text-[11px] font-medium text-[#64748b]">{card.label}</p><p className="mt-1 text-xl font-bold" style={{ color: card.color }}>{card.value}</p><p className="mt-1 text-[10px] text-[#94a3b8]">{card.note}</p></section>)}</div>
    <div className="grid gap-4 xl:grid-cols-2"><section className={`${surface} p-5`}><h2 className="text-sm font-semibold">Tren kinerja &amp; KPI</h2><p className="mt-1 text-[11px] text-[#64748b]">Nilai rata-rata per kuartal dari catatan yang tersedia. Skala kinerja 1-5, KPI 0-100.</p>{trend.length ? <div className="mt-6 flex h-52 items-end gap-4 overflow-x-auto border-b border-[#e5eaf0] pb-1">{trend.map((item) => <div key={item.label} className="flex min-w-[74px] flex-1 flex-col items-center gap-2"><div className="flex h-40 w-full items-end justify-center gap-2"><div title={item.performance === null ? "Kinerja belum ada" : `Kinerja ${item.performance.toFixed(2)} / 5`} className="w-5 rounded-t bg-[#8057e8]" style={{ height: item.performance === null ? 0 : `${Math.min(100, Math.max(0, item.performance / 5 * 100))}%` }} /><div title={item.kpi === null ? "KPI belum ada" : `KPI ${item.kpi.toFixed(2)} / 100`} className="w-5 rounded-t bg-[#3b6ff5]" style={{ height: item.kpi === null ? 0 : `${Math.min(100, Math.max(0, item.kpi))}%` }} /></div><span className="text-[10px] text-[#64748b]">{item.label}</span></div>)}</div> : <p className="mt-6 rounded-md bg-[#f6f8fc] p-5 text-xs text-[#64748b]">Belum ada data per periode untuk membuat tren.</p>}<div className="mt-4 flex gap-4 text-[11px] text-[#64748b]"><span><i className="mr-1 inline-block size-2 rounded-full bg-[#8057e8]" /> Kinerja / 5</span><span><i className="mr-1 inline-block size-2 rounded-full bg-[#3b6ff5]" /> KPI / 100</span></div></section>
      <section className={`${surface} p-5`}><h2 className="text-sm font-semibold">Perlu perhatian</h2><p className="mt-1 text-[11px] text-[#64748b]">Pengecualian berdasarkan evaluasi, gap, dan training yang tercatat.</p>{attention.length ? <ul className="mt-4 divide-y divide-[#edf1f6]">{attention.slice(0, 5).map((item) => <li key={item.employee.id} className="flex items-start justify-between gap-3 py-3 text-xs"><strong className="min-w-[85px] text-[#172033]">{item.employee.fullName}</strong><span className="flex-1 text-[#64748b]">{item.messages.join(" · ")}</span><Badge tone={item.gaps || item.evaluation?.reviewStatus === "Needs Attention" ? "amber" : "blue"}>{item.gaps ? "Tinjau" : "Pantau"}</Badge></li>)}</ul> : <p className="mt-4 rounded-md bg-[#f6f8fc] p-5 text-xs text-[#64748b]">Belum ada catatan yang perlu ditinjau.</p>}</section></div>
    <section className={`${surface} overflow-hidden p-5`}><h2 className="mb-4 text-sm font-semibold">Daftar perhatian pegawai</h2><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-[#f6f8fc] text-[10px] uppercase tracking-wide text-[#7b91ad]"><tr><th className="px-3 py-3">Pegawai</th><th className="px-3 py-3">Posisi</th><th className="px-3 py-3">Kinerja</th><th className="px-3 py-3">KPI</th><th className="px-3 py-3">Gap</th><th className="px-3 py-3">Training</th><th className="px-3 py-3">Tindakan</th></tr></thead><tbody>{attention.map((item) => {
      const position = snapshot.reference.positions.find((entry) => entry.id === item.employee.positionId)?.title ?? "Belum ada posisi";
      const performance = latestByEmployee(snapshot.performance.filter((entry) => entry.status === "completed"), item.employee.id);
      const kpi = snapshot.kpi.filter((entry) => entry.employeeId === item.employee.id).sort((a, b) => b.period.localeCompare(a.period))[0];
      return <tr key={item.employee.id} className="border-t border-[#edf1f6]"><td className="px-3 py-3"><strong className="block">{item.employee.fullName}</strong><small className="text-[#7b91ad]">{item.employee.employeeId}</small></td><td className="px-3 py-3">{position}</td><td className="px-3 py-3">{performance?.overallScore == null ? "-" : `${performance.overallScore.toFixed(1)} / 5`}</td><td className="px-3 py-3">{kpi ? `${kpi.score.toFixed(0)} / 100` : "-"}</td><td className="px-3 py-3"><Badge tone={item.gaps ? "amber" : "green"}>{item.gaps ? `${item.gaps} gap` : "Sesuai"}</Badge></td><td className="px-3 py-3">{item.activeTraining ? `${item.activeTraining} berjalan` : "-"}</td><td className="px-3 py-3"><button type="button" onClick={() => navigate(`/live?module=performance&view=detail&employee=${encodeURIComponent(item.employee.id)}`)} className="font-semibold text-[#3b6ff5] hover:underline">Lihat</button></td></tr>;
    })}</tbody></table></div>{!attention.length && <p className="py-8 text-center text-xs text-[#64748b]">Tidak ada pegawai pada daftar perhatian.</p>}</section>
  </div>;
}

export function PeoplePages({ view, ...props }: Props) {
  return view === "competency" ? <CompetencyNeeds {...props} /> : <PeopleDashboard {...props} />;
}
