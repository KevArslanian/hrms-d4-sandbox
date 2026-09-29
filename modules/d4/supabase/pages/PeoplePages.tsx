"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
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
const competencySelectClass = "h-[34px] w-full appearance-none rounded-lg border border-[rgba(190,202,189,0.5)] bg-white pl-3 pr-8 text-xs font-medium text-[#334155] outline-none focus:border-[#3b6ff5]";

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

function statusForFinding(finding: CompetencyFinding | null) {
  if (!finding || (finding.actualLevel === null && !finding.evidenceNotes?.trim())) return "Not Evaluated";
  if (finding.status === "Gap") return "Needs Attention";
  if (finding.status === "Bukti Belum Cukup") return "Needs Review";
  return "On Track";
}

function evidenceForFinding(finding: CompetencyFinding | null) {
  if (!finding || (finding.actualLevel === null && !finding.evidenceNotes?.trim())) return "No evidence submitted";
  if (!finding.evidenceNotes?.trim()) return "Documented evidence pending";
  if (finding.status === "Gap") return "Evidence below requirement";
  if (finding.status === "Bukti Belum Cukup") return "Partial evidence";
  return "Evidence meets requirement";
}

function CompetencyFilter({ label, value, onChange, children, evidence = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  evidence?: boolean;
}) {
  return <label className={`relative block shrink-0 ${evidence ? "w-[149px]" : "w-[129px]"}`}>
    <span className="sr-only">{label}</span>
    <select className={competencySelectClass} value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
    <span className="pointer-events-none absolute right-[9px] top-2"><Image src={`/figma/competency/${evidence ? "evidence-chevron" : "select-chevron"}.svg`} width={18} height={18} alt="" /></span>
  </label>;
}

function CompetencyEvidenceBadge({ finding }: { finding: CompetencyFinding | null }) {
  const gap = finding?.status === "Gap";
  const missing = !finding || finding.status === "Bukti Belum Cukup" || finding.actualLevel === null || !finding.evidenceNotes?.trim();
  if (!gap && !missing) return null;
  return <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-[11px] py-[3px] text-xs font-semibold leading-4 ${gap ? "border-[#fde68a] bg-[#fef9c3] text-[#d99a16]" : "border-[#bfdbfe] bg-[#eff6ff] text-[#3b6ff5]"}`}><span aria-hidden="true" className="size-1.5 rounded-full bg-current" />{gap ? "Gap" : "Evidence Missing"}</span>;
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
    if (query && !`${row.employee.fullName} ${row.employee.employeeId}`.toLocaleLowerCase().includes(query)) return false;
    if (positionFilter && row.positionId !== positionFilter) return false;
    if (statusFilter && statusForFinding(row.finding) !== statusFilter) return false;
    if (evidenceFilter && evidenceForFinding(row.finding) !== evidenceFilter) return false;
    return true;
  });
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selected = rows.find((row) => `${row.employee.id}:${row.finding?.requirementId ?? "none"}` === openRow);
  const canWrite = snapshot.role === "HR" || snapshot.role === "MANAGER";
  const firstPage = Math.max(1, Math.min(currentPage - 1, pageCount - 2));
  const pageNumbers = Array.from({ length: Math.min(3, pageCount) }, (_, index) => firstPage + index);
  function updateFilter(update: () => void) { update(); setPage(1); setOpenRow(null); }

  return <div className="space-y-[31px] text-[#172033]">
    <header className="min-h-[56px]">
      <h1 className="text-[25px] font-semibold leading-8 tracking-[-0.5px]">Competency Needs</h1>
      <p className="mt-1 text-xs leading-4 text-[#64748b]">Compare employee capability evidence with the requirement of the current position.</p>
    </header>
    <div className="flex min-h-[69px] flex-wrap items-center gap-x-[39px] gap-y-3 rounded-xl border border-[rgba(190,202,189,0.3)] bg-white px-[14px] py-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
      <label className="relative block w-full max-w-[514px] shrink-0">
        <span className="pointer-events-none absolute left-[10px] top-[10.25px]"><Image src="/figma/competency/search.svg" width={13.5} height={13.5} alt="" /></span>
        <span className="sr-only">Search by Employee’s Name</span>
        <input value={search} onChange={(event) => updateFilter(() => setSearch(event.target.value))} placeholder="Search by Employee’s Name" className="h-[34px] w-full rounded-lg border border-[#e5eaf0] bg-[#f4f6fa] pl-[33px] pr-[13px] text-xs text-[#334155] outline-none placeholder:text-[#4d5f81]/60 focus:border-[#3b6ff5]" />
      </label>
      <CompetencyFilter label="Filter posisi" value={positionFilter} onChange={(value) => updateFilter(() => setPositionFilter(value))}><option value="">All Positions</option>{snapshot.reference.positions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</CompetencyFilter>
      <CompetencyFilter label="Filter status" value={statusFilter} onChange={(value) => updateFilter(() => setStatusFilter(value))}><option value="">All Gap Status</option>{["On Track", "Needs Review", "Needs Attention", "Not Evaluated"].map((status) => <option key={status}>{status}</option>)}</CompetencyFilter>
      <CompetencyFilter label="Filter bukti" evidence value={evidenceFilter} onChange={(value) => updateFilter(() => setEvidenceFilter(value))}><option value="">All Evidence State</option>{["Evidence meets requirement", "Evidence below requirement", "Partial evidence", "Documented evidence pending", "No evidence submitted"].map((evidence) => <option key={evidence}>{evidence}</option>)}</CompetencyFilter>
    </div>
    <section className="max-w-[1051px] overflow-hidden rounded-xl border border-[#e5eaf0] bg-white" aria-label="Daftar kebutuhan kompetensi">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] table-fixed text-left text-xs">
          <colgroup><col className="w-[34%]" /><col className="w-[21.5%]" /><col className="w-[21%]" /><col className="w-[16.5%]" /><col className="w-[7%]" /></colgroup>
          <thead className="h-[54px] border-b border-[#f2f4f2] bg-white text-xs font-bold uppercase tracking-[0.6px] text-[#94a3b8]"><tr><th scope="col" className="px-[23px] font-bold">Employees</th><th scope="col" className="px-3 font-bold">Competency Requirement</th><th scope="col" className="px-3 font-bold">Evidence / Level</th><th scope="col" className="px-3 font-bold">Status</th><th scope="col" className="pr-4 text-right font-bold">Actions</th></tr></thead>
          <tbody>{visible.map((row) => {
            const key = `${row.employee.id}:${row.finding?.requirementId ?? "none"}`;
            return <tr key={key} className="h-[66px] border-b border-[#f2f4f2] last:border-0">
              <td className="px-[23px] py-3"><strong className="block text-sm font-semibold leading-5 tracking-[0.07px] text-[#121b2e]">{row.employee.fullName}</strong><span className="block text-xs leading-4 text-[#64748b]">{row.employee.employeeId}</span></td>
              <td className="px-3 py-3 font-medium leading-4 text-[#121b2e]">{row.finding?.competencyName ?? "No position requirements"}</td>
              <td className="px-3 py-3 font-medium leading-4 text-[#121b2e]" title={row.finding?.evidenceNotes ?? ""}>{evidenceForFinding(row.finding)}</td>
              <td className="px-3 py-3"><CompetencyEvidenceBadge finding={row.finding} /></td>
              <td className="pr-4 text-right"><button type="button" className="inline-flex h-7 w-6 items-center justify-center rounded hover:bg-[#f4f6fa] focus-visible:outline-2 focus-visible:outline-[#3b6ff5]" aria-label={`Aksi ${row.employee.fullName}, ${row.finding?.competencyName ?? "kompetensi"}`} aria-haspopup="dialog" onClick={() => setOpenRow(key)}><Image src="/figma/competency/actions.svg" width={2.66667} height={10.6667} alt="" /></button></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      {!filtered.length && <p className="px-5 py-10 text-center text-sm text-[#64748b]">Tidak ada data kompetensi yang cocok dengan filter.</p>}
      {!!filtered.length && <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-3 border-t border-[rgba(190,202,189,0.3)] px-4 py-3 text-xs text-[#4d5f81]">
        <span>Showing <strong className="font-semibold text-[#121b2e]">{(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filtered.length)}</strong> of {filtered.length} competency requirements</span>
        <div className="flex items-center gap-1 text-[11px] font-medium">
          <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="h-6 rounded border border-[#e5eaf0] px-2.5 text-[#475569] disabled:border-transparent disabled:bg-[#f8fafc] disabled:text-[#94a3b8]">Previous</button>
          {pageNumbers.map((number) => <button key={number} type="button" aria-current={number === currentPage ? "page" : undefined} onClick={() => setPage(number)} className={`h-6 min-w-6 rounded border px-1 ${number === currentPage ? "border-[#3b6ff5] bg-[#3b6ff5] font-semibold text-white" : "border-[#e5eaf0] text-[#475569]"}`}>{number}</button>)}
          <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} className="h-[26px] rounded border border-[#e5eaf0] px-[11px] text-[#475569] disabled:border-transparent disabled:bg-[#f8fafc] disabled:text-[#94a3b8]">Next</button>
        </div>
      </div>}
    </section>
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f2342]/40 p-4" onClick={() => setOpenRow(null)}>
      <section role="dialog" aria-modal="true" aria-labelledby="competency-detail-title" className="w-full max-w-lg rounded-xl border border-[#e5eaf0] bg-white p-6 shadow-lg" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "Escape") setOpenRow(null); }}>
        <div className="flex items-start justify-between gap-3"><div><h2 id="competency-detail-title" className="text-base font-semibold">{selected.employee.fullName}</h2><p className="mt-1 text-xs text-[#64748b]">{selected.position}</p></div><button type="button" autoFocus onClick={() => setOpenRow(null)} className="rounded px-2 py-1 text-xs text-[#64748b] hover:bg-[#f4f6fa]">Tutup</button></div>
        <dl className="mt-5 space-y-3 text-xs"><div><dt className="text-[#64748b]">Kompetensi</dt><dd className="mt-1 font-medium">{selected.finding?.competencyName ?? "Persyaratan posisi belum tersedia"}</dd></div><div><dt className="text-[#64748b]">Bukti dan level</dt><dd className="mt-1 leading-relaxed">{selected.finding ? `Level aktual ${selected.finding.actualLevel ?? "belum ada"}, minimal ${selected.finding.requiredLevel}.` : "Belum ada level yang dapat dibandingkan."}<br />{selected.finding?.evidenceNotes?.trim() || "Bukti belum tersedia."}</dd></div><div><dt className="text-[#64748b]">Status berdasarkan data saat ini</dt><dd className="mt-1 font-medium">{statusForFinding(selected.finding)}</dd></div><div><dt className="text-[#64748b]">Assessment terakhir tersimpan</dt><dd className="mt-1">{selected.assessedAt ?? "Belum ada assessment tersimpan."}</dd></div></dl>
        {canWrite && <div className="mt-5 flex flex-wrap gap-2 border-t border-[#e5eaf0] pt-4">{selected.positionId && selected.finding && <button type="button" disabled={busy} className="rounded-md bg-[#3b6ff5] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" onClick={() => void runWrite((repo, data) => repo.saveCompetency({ employeeId: selected.employee.id, positionId: selected.positionId!, effectiveDate: new Date().toISOString().slice(0, 10) }, data.reference), "Assessment kompetensi tersimpan.")}>Simpan assessment</button>}{selected.finding?.status === "Gap" && <button type="button" className="rounded-md border border-[#3b6ff5] px-3 py-2 text-xs font-semibold text-[#3b6ff5]" onClick={() => navigate(`/live?module=development&view=development-new&employee=${encodeURIComponent(selected.employee.id)}&source=${encodeURIComponent(selected.finding!.requirementId)}`)}>Buat development need</button>}<button type="button" onClick={() => navigate("/live?module=competency&view=assessment")} className="rounded-md border border-[#e5eaf0] px-3 py-2 text-xs font-medium text-[#475569]">Assessment posisi lain</button></div>}
      </section>
    </div>}
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
  const openGaps = employees.reduce((sum, employee) => sum + (currentComparison(snapshot, employee)?.findings.filter((finding) => finding.status === "Gap").length ?? 0), 0);
  const currentTraining = training.filter((item) => item.status === "In Progress").length;
  const cards = [
    { label: "Avg Performance", value: displayScore(average(performances.map((item) => item.overallScore!)), 5), note: `${performances.length} evaluasi selesai` },
    { label: "Avg KPI Score", value: displayScore(average(kpis.map((item) => item.score)), 100), note: `${kpis.length} pegawai dengan data` },
    { label: "Open Gaps", value: String(openGaps), note: "Berdasarkan bukti terkini" },
    { label: "Training In Progress", value: String(currentTraining), note: `${training.length} training tercatat` },
  ];
  const quarters = [...new Set([...snapshot.performance.filter((item) => ids.has(item.employeeId) && item.status === "completed" && item.overallScore !== null).map((item) => quarter(item.period)), ...snapshot.kpi.filter((item) => ids.has(item.employeeId)).map((item) => quarter(item.period))].filter((value): value is string => !!value))].sort().slice(-4);
  const trend = quarters.map((label) => ({
    label,
    performance: average(snapshot.performance.filter((item) => ids.has(item.employeeId) && item.status === "completed" && quarter(item.period) === label && item.overallScore !== null).map((item) => item.overallScore!)),
    kpi: average(snapshot.kpi.filter((item) => ids.has(item.employeeId) && quarter(item.period) === label).map((item) => item.score)),
  }));
  const chartTrend = trend;
  const attention = employees.flatMap((employee) => {
    const messages: string[] = [];
    const evaluation = latestByEmployee(snapshot.performance, employee.id);
    const performance = performances.find((item) => item.employeeId === employee.id);
    const kpi = kpis.find((item) => item.employeeId === employee.id);
    const comparison = currentComparison(snapshot, employee);
    const gaps = comparison?.findings.filter((item) => item.status === "Gap").length ?? 0;
    const gapKnown = Boolean(comparison?.findings.length) && comparison?.overallStatus === "Terpenuhi";
    const employeeTraining = training.filter((item) => item.employeeId === employee.id);
    const activeTraining = employeeTraining.filter((item) => item.status === "In Progress").length;
    const needsReview = gaps > 0 || evaluation?.reviewStatus === "Needs Attention" || evaluation?.reviewStatus === "Needs Review" || comparison?.overallStatus === "Bukti Belum Cukup";
    if (evaluation?.reviewStatus === "Needs Attention" || evaluation?.reviewStatus === "Needs Review") messages.push(`Evaluasi perlu ditinjau: ${evaluation.reviewStatus}`);
    if (gaps) messages.push(`${gaps} gap kompetensi memerlukan pengembangan`);
    if (comparison?.overallStatus === "Bukti Belum Cukup") messages.push("Bukti kompetensi perlu dilengkapi");
    if (activeTraining) messages.push(`${activeTraining} training masih berjalan`);
    if (!kpi) messages.push("Data sumber KPI belum tersedia");
    const state = needsReview ? "Review" : activeTraining ? "In Progress" : "Unknown";
    const tone = needsReview ? "amber" : activeTraining ? "blue" : "gray";
    const position = snapshot.reference.positions.find((item) => item.id === employee.positionId)?.title ?? "Belum ada posisi";
    return messages.length ? [{ employee, messages, performance, kpi, gaps, gapKnown, training: employeeTraining[0], state, tone: tone as "amber" | "blue" | "gray", position }] : [];
  });
  function exportReport() {
    const csv = (value: string) => `"${(/^[=+@-]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`;
    const rows = [["Employee", "Employee ID", "Position", "Performance / 5", "KPI / 100", "Open Gaps", "Training", "Attention", "Notes"], ...attention.map((item) => [item.employee.fullName, item.employee.employeeId, item.position, item.performance?.overallScore?.toFixed(2) ?? "", item.kpi?.score.toFixed(2) ?? "", String(item.gaps), item.training?.status ?? "", item.state, item.messages.join("; ")])];
    const href = URL.createObjectURL(new Blob([rows.map((row) => row.map(csv).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = href; link.download = "d4-people-attention-report.csv"; link.click();
    URL.revokeObjectURL(href);
  }
  return <div className="space-y-10 text-[#172033]">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-[25px] font-bold tracking-tight text-[#1d335b]">People Dashboard</h1><p className="mt-1 text-xs text-[#7786a1]">Management summary of performance, KPI, competency gaps, and training progress.</p></div><button type="button" onClick={exportReport} className="rounded-lg border border-[#3b6ff5] bg-white px-4 py-2.5 text-xs font-semibold text-[#3b6ff5] hover:bg-[#f1f3ff]">Export Report</button></header>
    <div className="grid max-w-[1048px] gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <section key={card.label} title={card.note} className={`${surface} min-h-[86px] px-4 py-3.5`}><p className="text-[10px] font-medium text-[#64748b]">{card.label}</p><p className="mt-2 text-[22px] font-bold tabular-nums text-[#172033]">{card.value}</p><span className="sr-only">{card.note}</span></section>)}</div>
    <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
      <section aria-label="Performance and KPI trend" className={`${surface} min-w-0 rounded-xl p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold">Performance &amp; KPI Trend</h2><p className="mt-1 text-[10px] text-[#64748b]">Ringkasan kuartal, kinerja 1-5 dan KPI 0-100</p></div><div className="flex gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-[#efeafd] px-2.5 py-1 text-[11px] font-medium text-[#8057e8]"><i className="size-1.5 rounded-full bg-current" />Performance</span><Badge tone="blue">KPI</Badge></div></div>
        {chartTrend.length ? <div className="mt-5 flex h-[194px] items-end justify-around gap-2 overflow-x-auto sm:gap-5">{chartTrend.map((item) => <div key={item.label} className="flex min-w-[56px] flex-1 flex-col items-center gap-2 sm:min-w-[108px]"><div className="flex h-[168px] w-full items-end justify-center gap-1.5 sm:gap-3"><div aria-label={item.performance === null ? "Kinerja belum ada" : `Kinerja ${item.performance.toFixed(2)} / 5`} title={item.performance === null ? "Kinerja belum ada" : `Kinerja ${item.performance.toFixed(2)} / 5`} className="w-5 rounded-md bg-[#8057e8] sm:w-11" style={{ height: item.performance === null ? 0 : `${Math.min(100, Math.max(0, item.performance / 5 * 100))}%` }} /><div aria-label={item.kpi === null ? "KPI belum ada" : `KPI ${item.kpi.toFixed(2)} / 100`} title={item.kpi === null ? "KPI belum ada" : `KPI ${item.kpi.toFixed(2)} / 100`} className="w-5 rounded-md bg-[#3b6ff5] sm:w-11" style={{ height: item.kpi === null ? 0 : `${Math.min(100, Math.max(0, item.kpi))}%` }} /></div><span className="text-[10px] text-[#64748b]">{item.label}</span></div>)}</div> : <p className="mt-5 flex min-h-[194px] items-center justify-center rounded-md bg-[#f6f8fc] p-5 text-xs text-[#64748b]">Belum ada data per periode untuk membuat tren.</p>}
      </section>
      <section className={`${surface} min-w-0 rounded-xl p-6`}><h2 className="text-base font-semibold">Attention Needed</h2><p className="mt-1 text-[10px] text-[#64748b]">Exceptions and human-review items</p>{attention.length ? <ul className="mt-5 space-y-3">{attention.slice(0, 4).map((item) => <li key={item.employee.id} className="grid min-h-9 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 text-[11px] sm:grid-cols-[minmax(80px,1fr)_minmax(0,2fr)_auto]"><strong className="text-[#172033]">{item.employee.fullName}</strong><span className="col-span-2 row-start-2 text-[10px] leading-relaxed text-[#64748b] sm:col-span-1 sm:row-start-auto">{item.messages.join(" · ")}</span><span className="col-start-2 row-start-1 sm:col-start-3"><Badge tone={item.tone}>{item.state}</Badge></span></li>)}</ul> : <p className="mt-5 rounded-md bg-[#f6f8fc] p-5 text-xs text-[#64748b]">Belum ada catatan yang perlu ditinjau.</p>}</section>
    </div>
    <section className={`${surface} min-w-0 rounded-xl p-6`}><h2 className="mb-5 text-base font-semibold">Employee Attention List</h2><div className="max-w-[1180px] overflow-x-auto rounded-xl border border-[#e5eaf0]"><table className="w-full min-w-[870px] text-left text-xs"><thead className="bg-[#f1f3ff]/70 text-[10px] uppercase tracking-wide text-[#4d5f81]"><tr>{["Employee", "Position", "Performance", "KPI", "Gap", "Training", "Attention", "Action"].map((label) => <th key={label} className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{attention.map((item) => <tr key={item.employee.id} className="border-t border-[#edf1f6]"><td className="px-3 py-4"><strong className="block">{item.employee.fullName}</strong><small className="text-[10px] text-[#7b91ad]">{item.employee.employeeId}</small></td><td className="px-3 py-4">{item.position}</td><td className="whitespace-nowrap px-3 py-4 tabular-nums">{item.performance?.overallScore == null ? "-" : `${item.performance.overallScore.toFixed(1)} / 5`}</td><td className="whitespace-nowrap px-3 py-4 tabular-nums">{item.kpi ? `${item.kpi.score.toFixed(0)} / 100` : "-"}</td><td className="px-3 py-4"><Badge tone={item.gaps ? "amber" : item.gapKnown ? "green" : "gray"}>{item.gaps ? `${item.gaps} Gap` : item.gapKnown ? "Met" : "Unknown"}</Badge></td><td className="px-3 py-4"><Badge tone={item.training?.status === "Completed" ? "green" : item.training?.status === "In Progress" ? "blue" : "gray"}>{item.training?.status ?? "Belum ada"}</Badge></td><td className="px-3 py-4"><Badge tone={item.tone}>{item.state === "In Progress" ? "Monitor" : item.state}</Badge></td><td className="px-3 py-4"><button type="button" onClick={() => navigate(`/live?module=performance&view=detail&employee=${encodeURIComponent(item.employee.id)}`)} className="font-medium text-[#64748b] hover:text-[#3b6ff5] hover:underline">View</button></td></tr>)}</tbody></table></div>{!attention.length && <p className="py-8 text-center text-xs text-[#64748b]">Tidak ada pegawai pada daftar perhatian.</p>}</section>
  </div>;
}

export function PeoplePages({ view, ...props }: Props) {
  return view === "competency" ? <CompetencyNeeds {...props} /> : <PeopleDashboard {...props} />;
}
