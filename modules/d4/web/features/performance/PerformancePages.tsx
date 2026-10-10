"use client";

import { Eye, History, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { weighted } from "../../../kpi/catalog";
import type { PerformanceEvaluation } from "../../../performance/types";
import type { KpiAssessmentLine } from "../../../supabase/types";
import type { EmployeeReference } from "../../../shared/types";
import { useSnapshot } from "../../data/D4DataProvider";
import { canAssess, canWrite, departmentOf, describeSource, developmentNeeds, employeeById, employeeMeta, evaluationsOf, formatDate, formatPeriod, formatScore, includesText, latestEvaluation, positionOf, revisionTag, visibleEmployees } from "../../data/selectors";
import { DataTable, PersonCell } from "../../ui/DataTable";
import { FilterBar, SearchInput, SelectFilter } from "../../ui/forms";
import { DetailHeader, NotFound, PageHeader, Timeline } from "../../ui/layout";
import { RowActionMenu } from "../../ui/RowActionMenu";
import { Button, ButtonLink, Card, InfoGrid, SourceChip, statusLabel, StatusBadge } from "../../ui/primitives";
import { EvaluationFormModal } from "./EvaluationFormModal";

const evaluationStatus = (evaluation?: PerformanceEvaluation) => !evaluation ? "Not Evaluated" : evaluation.status === "completed" ? "Completed" : "Draft";

type Row = { employee: EmployeeReference; position: string; evaluation?: PerformanceEvaluation };

/** The five Core KPI of one Penilaian Kinerja with weighted scores and the Total KPI; shared with the People Dashboard. */
export function KpiTable({ lines, total, period, testId = "kpi-detail-table" }: { lines: readonly KpiAssessmentLine[]; total: number | null; period?: string; testId?: string }) {
  if (!lines.length) return <p className="px-6 pb-6 text-sm text-ink-3">Penilaian ini disimpan sebelum KPI digabung ke Penilaian Kinerja, jadi tidak memiliki tabel KPI.</p>;
  const totalWeight = lines.reduce((sum, line) => sum + line.weight_percent, 0);
  return <div className="overflow-x-auto">
    <table data-testid={testId} className="w-full min-w-[680px] text-left text-sm">
      <thead className="bg-app text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3"><tr><th className="px-5 py-2.5">No</th><th className="px-5 py-2.5">Core KPI</th><th className="px-5 py-2.5">Weight</th><th className="px-5 py-2.5">Target</th><th className="px-5 py-2.5">Actual</th><th className="px-5 py-2.5">Score</th><th className="px-5 py-2.5 text-right">Weighted</th><th className="px-5 py-2.5">Comment</th></tr></thead>
      <tbody>{lines.map((line) => <tr key={line.indicator_order} data-testid={`kpi-line-${line.indicator_order}`} className="border-t border-line"><td className="px-5 py-3 text-ink-3">{line.indicator_order}</td><td className="px-5 py-3 font-semibold">{line.kpi_name}</td><td className="px-5 py-3 tabular-nums">{line.weight_percent}%</td><td className="px-5 py-3">{line.target || "—"}</td><td className="px-5 py-3">{line.actual || "—"}</td><td className="px-5 py-3 tabular-nums">{line.raw_score ?? "—"}</td><td className="px-5 py-3 text-right font-semibold tabular-nums">{weighted(line)?.toFixed(2) ?? "—"}</td><td data-testid={`kpi-comment-${line.indicator_order}`} className="px-5 py-3 text-ink-2">{line.comment || "—"}</td></tr>)}</tbody>
      <tfoot className="border-t border-line bg-app"><tr><td colSpan={2} className="px-5 py-3 font-semibold">Total KPI{period ? ` (${formatPeriod(period)})` : ""}</td><td className="px-5 py-3 font-semibold tabular-nums">{totalWeight}%</td><td colSpan={3} /><td data-testid="total-kpi" className="whitespace-nowrap px-5 py-3 text-right font-display font-semibold text-base tabular-nums">{formatScore(total)}</td><td /></tr></tfoot>
    </table>
  </div>;
}

export function PerformanceListPage() {
  const snapshot = useSnapshot();
  const writer = canWrite(snapshot);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [period, setPeriod] = useState("");
  const [status, setStatus] = useState("");
  const [modalFor, setModalFor] = useState<string | null>(null);

  const periods = useMemo(() => [...new Set(snapshot.performance.map((item) => item.period))].sort().reverse(), [snapshot]);
  // FR-D4-001 has no draft; "Draft" is only offered when legacy draft rows still exist.
  const statuses = useMemo(() => ["Completed", ...(snapshot.performance.some((item) => item.status !== "completed") ? ["Draft"] : []), "Not Evaluated"], [snapshot]);
  const rows = useMemo<Row[]>(() => visibleEmployees(snapshot).map((employee) => {
    const evaluation = period ? evaluationsOf(snapshot, employee.id).find((item) => item.period === period) : latestEvaluation(snapshot, employee.id);
    return { employee, position: positionOf(snapshot, employee)?.title ?? "—", evaluation };
  }).filter((row) => includesText(`${row.employee.fullName} ${row.employee.employeeId}`, search)
    && (!position || row.employee.positionId === position) && (!department || row.employee.departmentId === department)
    && (!status || evaluationStatus(row.evaluation) === status))
    .sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName)), [snapshot, search, position, department, period, status]);

  return <>
    <PageHeader title="Penilaian Kinerja" subtitle="Lima Core KPI sesuai posisi dan catatan evaluasi dalam satu penilaian per pegawai dan periode. Hasilnya Total KPI."
      actions={writer && <Button icon={<Plus className="size-4" />} onClick={() => setModalFor("")} data-testid="btn-add-evaluation">Add Evaluation</Button>} />
    <FilterBar canReset={Boolean(search || position || department || period || status)} onReset={() => { setSearch(""); setPosition(""); setDepartment(""); setPeriod(""); setStatus(""); }}>
      <SearchInput value={search} onChange={setSearch} placeholder="Search name or ID" />
      {snapshot.role !== "EMPLOYEE" && <SelectFilter label="All positions" testId="all-positions" value={position} onChange={setPosition} options={snapshot.reference.positions.map((item) => ({ value: item.id, label: item.title }))} />}
      {snapshot.role !== "EMPLOYEE" && <SelectFilter label="All departments" testId="all-departments" value={department} onChange={setDepartment} options={snapshot.reference.departments.map((item) => ({ value: item.id, label: item.name }))} />}
      <SelectFilter label="All periods" testId="latest-period" value={period} onChange={setPeriod} options={periods.map((item) => ({ value: item, label: formatPeriod(item) }))} />
      <SelectFilter label="All status" testId="all-status" value={status} onChange={setStatus} options={statuses.map((item) => ({ value: item, label: statusLabel(item) }))} />
    </FilterBar>
    <DataTable<Row> rows={rows} noun="pegawai" rowKey={(row) => row.employee.id}
      emptyTitle="Tidak ada pegawai yang cocok" emptyText="Ubah kata kunci atau reset filter untuk melihat semua pegawai."
      columns={[
        { key: "employee", header: "Employee", cell: (row) => <PersonCell name={row.employee.fullName} code={row.employee.employeeId} /> },
        { key: "position", header: "Position", wrap: true, cell: (row) => row.position },
        { key: "department", header: "Department", wrap: true, cell: (row) => departmentOf(snapshot, row.employee)?.name ?? "—" },
        { key: "period", header: "Period", cell: (row) => formatPeriod(row.evaluation?.period) },
        { key: "score", header: "Total KPI", className: "tabular-nums", cell: (row) => formatScore(row.evaluation?.overallScore) },
        { key: "notes", header: "Notes", wrap: true, className: "max-w-[320px]", cell: (row) => row.evaluation?.generalNotes ? <span className="line-clamp-2">{row.evaluation.generalNotes}</span> : "—" },
        { key: "evaluator", header: "Evaluator", cell: (row) => row.evaluation?.evaluator || "—" },
        { key: "status", header: "Status", cell: (row) => <StatusBadge status={evaluationStatus(row.evaluation)} /> },
      ]}
      actions={(row) => <RowActionMenu label={`Actions for ${row.employee.fullName}`} actions={[
        { label: "View Detail", testId: "view-detail", icon: <Eye />, href: row.evaluation ? `/performance/${row.evaluation.id}` : undefined, hidden: !row.evaluation },
        { label: "View History", testId: "view-history", icon: <History />, href: `/performance/history/${row.employee.id}` },
      ]} />} />
    {modalFor !== null && <EvaluationFormModal employeeId={modalFor || undefined} onClose={() => setModalFor(null)} />}
  </>;
}

export function PerformanceDetailPage({ id }: { id: string }) {
  const snapshot = useSnapshot();
  const [adding, setAdding] = useState(false);
  const evaluation = snapshot.performance.find((item) => item.id === id);
  const employee = evaluation && employeeById(snapshot, evaluation.employeeId);
  if (!evaluation || !employee) return <NotFound what="Evaluation" backHref="/performance" backLabel="Back to Penilaian Kinerja" />;
  const needs = developmentNeeds(snapshot).filter((item) => item.sourceType === "performance_context" && item.sourceRef === evaluation.id);

  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "Penilaian Kinerja", href: "/performance" }, { label: "Detail" }]} backHref="/performance"
      name={employee.fullName} meta={[...employeeMeta(snapshot, employee), `Period ${formatPeriod(evaluation.period)}`]}
      status={evaluationStatus(evaluation)}
      actions={<>
        <ButtonLink href={`/performance/history/${employee.id}`} icon={<History className="size-4" />} testId="view-history">View History</ButtonLink>
        {canAssess(snapshot, employee.id) && <Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)} data-testid="btn-add-evaluation">Add Evaluation</Button>}
      </>} />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
      <div className="space-y-6">
        <Card title="Core KPI" testId="core-kpi" padded={false}><KpiTable lines={evaluation.lines} total={evaluation.overallScore} /></Card>
        <Card title="Evaluation summary" testId="evaluation-summary">
          <InfoGrid columns={3} items={[
            { label: "Period", testId: "period", value: formatPeriod(evaluation.period) },
            { label: "Evaluation date", testId: "evaluation-date", value: formatDate(evaluation.evaluationDate) },
            { label: "Evaluator", testId: "evaluator", value: evaluation.evaluator || "—" },
            { label: "Total KPI", testId: "total-score", value: <strong className="font-display font-semibold text-lg">{formatScore(evaluation.overallScore)}</strong> },
            { label: "Department", testId: "department", value: departmentOf(snapshot, employee)?.name ?? "—" },
          ]} />
          <h3 className="mb-2 mt-8 text-sm font-semibold text-ink-2">Evaluation notes</h3>
          <p className="whitespace-pre-wrap text-sm text-ink-2">{evaluation.generalNotes || "Belum ada catatan evaluasi."}</p>
          <p className="mt-5 text-xs text-ink-3">Total KPI = Σ (bobot × skor). Tidak ada label tercapai/tidak tercapai karena belum ada ambang resmi.</p>
        </Card>
      </div>
      <div className="space-y-6">
        <Card title="Evidence" testId="evidence">
          <p className="text-sm text-ink-2">{evaluation.evidenceReference || "Belum ada bukti atau referensi."}</p>
          <p className="mt-1 text-xs text-ink-3">Dicatat oleh {evaluation.actor} · {formatDate(evaluation.createdAt)}</p>
        </Card>
        <Card title="Related records" testId="related-records">
          <div className="flex flex-col items-start gap-2">
            {needs.length ? null : <p className="text-sm text-ink-3">Belum ada Development Requirement dari penilaian ini.</p>}
            {needs.map((need) => <SourceChip key={need.needId} label="Development Requirement" reference={need.objective} href={`/development/${need.needId}`} />)}
          </div>
          <p className="mt-4 text-xs text-ink-3">Catatan evaluasi dapat menjadi dasar development bila relevan; tidak ada keputusan HR yang dibuat otomatis dari Total KPI.</p>
        </Card>
      </div>
    </div>
    {adding && <EvaluationFormModal employeeId={employee.id} onClose={() => setAdding(false)} />}
  </>;
}

export function PerformanceHistoryPage({ employeeId }: { employeeId: string }) {
  const snapshot = useSnapshot();
  const [adding, setAdding] = useState(false);
  const employee = employeeById(snapshot, employeeId);
  if (!employee || !visibleEmployees(snapshot).some((item) => item.id === employeeId)) return <NotFound what="Employee" backHref="/performance" backLabel="Back to Penilaian Kinerja" />;
  const evaluations = evaluationsOf(snapshot, employee.id);
  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "Penilaian Kinerja", href: "/performance" }, { label: "History" }]} backHref="/performance"
      name={employee.fullName} meta={[...employeeMeta(snapshot, employee), `${evaluations.length} ${evaluations.length === 1 ? "evaluation" : "evaluations"}`]}
      actions={canAssess(snapshot, employee.id) && <Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)} data-testid="btn-add-evaluation">Add Evaluation</Button>} />
    <Card title="Evaluation history" testId="evaluation-history">
      <Timeline empty="Pegawai ini belum memiliki penilaian kinerja." entries={evaluations.map((item) => ({
        id: item.id, date: `${formatPeriod(item.period)} · ${formatDate(item.evaluationDate || item.createdAt)}`,
        title: `Penilaian ${formatPeriod(item.period)} — Total KPI ${formatScore(item.overallScore)}${revisionTag(evaluations, item)}`,
        status: evaluationStatus(item), actor: item.actor, href: `/performance/${item.id}`,
        body: <>Evaluator: {item.evaluator || "—"}{item.generalNotes ? ` · ${item.generalNotes}` : ""}</>,
      }))} />
    </Card>
    {developmentNeeds(snapshot).filter((need) => need.employeeId === employee.id && need.sourceType === "performance_context").length > 0 && <Card title="Development linked to evaluations" testId="development-linked-to-evaluations">
      <div className="flex flex-wrap gap-2">{developmentNeeds(snapshot).filter((need) => need.employeeId === employee.id && need.sourceType === "performance_context").map((need) => <SourceChip key={need.needId} label={describeSource(snapshot, need).label} reference={need.objective} href={`/development/${need.needId}`} />)}</div>
    </Card>}
    {adding && <EvaluationFormModal employeeId={employee.id} onClose={() => setAdding(false)} />}
  </>;
}
