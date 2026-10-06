"use client";

import { ClipboardCheck, History, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { ACTIVE_KPI_VERSION, roleForPositionTitle } from "../../../kpi/catalog";
import type { EmployeeReference } from "../../../shared/types";
import type { KpiAssessment } from "../../../supabase/types";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { canAssess, canWrite, departmentOf, employeeById, employeeMeta, evaluationsOf, formatDate, formatPeriod, formatScore, includesText, latestScorecard, positionOf, revisionTag, scorecardsOf, visibleEmployees } from "../../data/selectors";
import { DataTable, PersonCell } from "../../ui/DataTable";
import { FilterBar, SearchInput, SelectFilter } from "../../ui/forms";
import { DetailHeader, NotFound, PageHeader, Timeline } from "../../ui/layout";
import { RowActionMenu } from "../../ui/RowActionMenu";
import { Button, ButtonLink, Card, InfoGrid, Notice, SourceChip, statusLabel, StatusBadge } from "../../ui/primitives";
import { KpiFormModal, noKpiText, weighted } from "./KpiFormModal";

const scorecardStatus = (item?: KpiAssessment) => !item ? "Not Evaluated" : item.status === "completed" ? "Completed" : "Draft";

function CatalogNotice() {
  const { catalog } = useD4();
  if (!catalog || catalog.version === ACTIVE_KPI_VERSION) return null;
  return <Notice tone="warning">The KPI catalog in the database is still {catalog.version}. Apply migration <code>20260929150000_d4_kpi_catalog_v51.sql</code> so new scorecards use KPI Scorecard {ACTIVE_KPI_VERSION}.</Notice>;
}

type Row = { employee: EmployeeReference; position: string; hasKpi: boolean; scorecard?: KpiAssessment };

export function KpiListPage() {
  const snapshot = useSnapshot();
  const { catalog } = useD4();
  const writer = canWrite(snapshot);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [period, setPeriod] = useState("");
  const [status, setStatus] = useState("");
  const [modalFor, setModalFor] = useState<string | null>(null);
  const periods = useMemo(() => [...new Set((snapshot.kpiAssessments ?? []).map((item) => item.period))].sort().reverse(), [snapshot]);
  const rows = useMemo<Row[]>(() => visibleEmployees(snapshot).map((employee) => {
    const title = positionOf(snapshot, employee)?.title;
    return {
      employee, position: title ?? "—", hasKpi: !catalog || !title || roleForPositionTitle(catalog, title) > 0,
      scorecard: period ? scorecardsOf(snapshot, employee.id).find((item) => item.period === period) : latestScorecard(snapshot, employee.id),
    };
  }).filter((row) => includesText(`${row.employee.fullName} ${row.employee.employeeId}`, search)
    && (!position || row.employee.positionId === position) && (!department || row.employee.departmentId === department) && (!status || scorecardStatus(row.scorecard) === status))
    .sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName)), [snapshot, catalog, search, position, department, period, status]);

  return <>
    <PageHeader title="KPI Scorecard" subtitle="Five Core KPIs per position and period, weighted to 100%, with a total weighted score."
      actions={writer && <Button icon={<Plus className="size-4" />} onClick={() => setModalFor("")} data-testid="btn-add-scorecard">Add Scorecard</Button>} />
    <CatalogNotice />
    <FilterBar canReset={Boolean(search || position || department || period || status)} onReset={() => { setSearch(""); setPosition(""); setDepartment(""); setPeriod(""); setStatus(""); }}>
      <SearchInput value={search} onChange={setSearch} placeholder="Search name or ID" />
      <SelectFilter label="All positions" testId="all-positions" value={position} onChange={setPosition} options={snapshot.reference.positions.map((item) => ({ value: item.id, label: item.title }))} />
      <SelectFilter label="All departments" testId="all-departments" value={department} onChange={setDepartment} options={snapshot.reference.departments.map((item) => ({ value: item.id, label: item.name }))} />
      <SelectFilter label="All periods" testId="latest-period" value={period} onChange={setPeriod} options={periods.map((item) => ({ value: item, label: formatPeriod(item) }))} />
      <SelectFilter label="All status" testId="all-status" value={status} onChange={setStatus} options={["Completed", "Draft", "Not Evaluated"].map((item) => ({ value: item, label: statusLabel(item) }))} />
    </FilterBar>
    <DataTable<Row> rows={rows} noun="pegawai" rowKey={(row) => row.employee.id}
      emptyTitle="No matching employees" emptyText="Change the keyword or reset the filters."
      rowHref={(row) => row.scorecard ? `/kpi/${row.scorecard.id}` : `/kpi/history/${row.employee.id}`}
      columns={[
        { key: "employee", header: "Employee", cell: (row) => <PersonCell name={row.employee.fullName} code={row.employee.employeeId} /> },
        { key: "position", header: "Position", wrap: true, cell: (row) => row.position },
        { key: "department", header: "Department", wrap: true, cell: (row) => departmentOf(snapshot, row.employee)?.name ?? "—" },
        { key: "role", header: "KPI Role", wrap: true, cell: (row) => row.scorecard?.roleName ?? (row.hasKpi ? "—" : <span className="text-ink-3">Not in catalog {catalog?.version} yet</span>) },
        { key: "period", header: "Period", cell: (row) => formatPeriod(row.scorecard?.period) },
        { key: "total", header: "Total Score", className: "tabular-nums", cell: (row) => formatScore(row.scorecard?.overallScore) },
        { key: "status", header: "Status", cell: (row) => <StatusBadge status={scorecardStatus(row.scorecard)} /> },
      ]}
      actions={(row) => <RowActionMenu label={`Actions for ${row.employee.fullName}`} actions={[
        { label: "View History", testId: "view-history", icon: <History />, href: `/kpi/history/${row.employee.id}` },
        { label: "Open Evaluation", testId: "open-evaluation", icon: <ClipboardCheck />, href: `/performance/history/${row.employee.id}` },
      ]} />} />
    {modalFor !== null && <KpiFormModal employeeId={modalFor || undefined} onClose={() => setModalFor(null)} />}
  </>;
}

export function KpiDetailPage({ id }: { id: string }) {
  const snapshot = useSnapshot();
  const [adding, setAdding] = useState(false);
  const scorecard = (snapshot.kpiAssessments ?? []).find((item) => item.id === id);
  const employee = scorecard && employeeById(snapshot, scorecard.employeeId);
  if (!scorecard || !employee) return <NotFound what="KPI scorecard" backHref="/kpi" backLabel="Back to KPI Scorecard" />;
  const evaluation = evaluationsOf(snapshot, employee.id).find((item) => item.period === scorecard.period);
  const totalWeight = scorecard.lines.reduce((sum, line) => sum + line.weight_percent, 0);
  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "KPI Scorecard", href: "/kpi" }, { label: "Detail" }]} backHref="/kpi"
      name={employee.fullName} meta={[...employeeMeta(snapshot, employee), `Period ${formatPeriod(scorecard.period)}`]} status={scorecardStatus(scorecard)}
      actions={<><ButtonLink href={`/kpi/history/${employee.id}`} icon={<History className="size-4" />} testId="view-history">View History</ButtonLink>{canAssess(snapshot, employee.id) && <Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)} data-testid="btn-add-scorecard">Add Scorecard</Button>}</>} />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
      <Card title="Core KPI" padded={false}>
        <div className="overflow-x-auto">
          <table data-testid="kpi-detail-table" className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-app text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3"><tr><th className="px-5 py-2.5">No</th><th className="px-5 py-2.5">Core KPI</th><th className="px-5 py-2.5">Weight</th><th className="px-5 py-2.5">Target</th><th className="px-5 py-2.5">Actual</th><th className="px-5 py-2.5">Score</th><th className="px-5 py-2.5 text-right">Weighted</th><th className="px-5 py-2.5">Comment</th></tr></thead>
            <tbody>{scorecard.lines.map((line) => <tr key={line.indicator_order} data-testid={`kpi-line-${line.indicator_order}`} className="border-t border-line"><td className="px-5 py-3 text-ink-3">{line.indicator_order}</td><td className="px-5 py-3 font-semibold">{line.kpi_name}</td><td className="px-5 py-3 tabular-nums">{line.weight_percent}%</td><td className="px-5 py-3">{line.target || "—"}</td><td className="px-5 py-3">{line.actual || "—"}</td><td className="px-5 py-3 tabular-nums">{line.raw_score ?? "—"}</td><td className="px-5 py-3 text-right font-semibold tabular-nums">{weighted(line)?.toFixed(2) ?? "—"}</td><td data-testid={`kpi-comment-${line.indicator_order}`} className="px-5 py-3 text-ink-2">{line.comment || "—"}</td></tr>)}</tbody>
            <tfoot className="border-t border-line bg-app"><tr><td colSpan={2} className="px-5 py-3 font-semibold">Total</td><td className="px-5 py-3 font-semibold tabular-nums">{totalWeight}%</td><td colSpan={3} /><td className="px-5 py-3 text-right font-display font-semibold text-base tabular-nums">{formatScore(scorecard.overallScore)}</td><td /></tr></tfoot>
          </table>
        </div>
      </Card>
      <div className="space-y-6">
        <Card title="Scorecard summary" testId="scorecard-summary">
          <InfoGrid items={[
            { label: "KPI role", testId: "kpi-role", value: scorecard.roleName },
            { label: "Catalog", testId: "catalog", value: `KPI Scorecard ${scorecard.definitionVersion}` },
            { label: "Evaluation date", testId: "evaluation-date", value: formatDate(scorecard.evaluationDate) },
            { label: "Evaluator", testId: "evaluator", value: scorecard.evaluatorName || "—" },
            { label: "Total score", testId: "total-score", value: <strong className="font-display font-semibold text-lg">{formatScore(scorecard.overallScore)}</strong> },
            { label: "Recorded", testId: "recorded", value: `${scorecard.actor} · ${formatDate(scorecard.createdAt)}` },
          ]} />
          <p className="mt-5 text-xs text-ink-3">Total = Σ (weight × raw score). There is no achieved/not-achieved label because no official threshold exists yet.</p>
        </Card>
        <Card title="Notes & related" testId="notes-related">
          <p className="whitespace-pre-wrap text-sm text-ink-2">{scorecard.generalNotes || "No notes yet."}</p>
          <div className="mt-4">{evaluation ? <SourceChip label="Performance Evaluation" reference={formatPeriod(evaluation.period)} href={`/performance/${evaluation.id}`} /> : <p className="text-xs text-ink-3">No performance evaluation for this period yet.</p>}</div>
        </Card>
      </div>
    </div>
    {adding && <KpiFormModal employeeId={employee.id} onClose={() => setAdding(false)} />}
  </>;
}

export function KpiHistoryPage({ employeeId }: { employeeId: string }) {
  const snapshot = useSnapshot();
  const { catalog } = useD4();
  const [adding, setAdding] = useState(false);
  const employee = employeeById(snapshot, employeeId);
  if (!employee || !visibleEmployees(snapshot).some((item) => item.id === employeeId)) return <NotFound what="Employee" backHref="/kpi" backLabel="Back to KPI Scorecard" />;
  const scorecards = scorecardsOf(snapshot, employee.id);
  const title = positionOf(snapshot, employee)?.title;
  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "KPI Scorecard", href: "/kpi" }, { label: "History" }]} backHref="/kpi"
      name={employee.fullName} meta={[...employeeMeta(snapshot, employee), `${scorecards.length} ${scorecards.length === 1 ? "scorecard" : "scorecards"}`]}
      actions={canAssess(snapshot, employee.id) && <Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)} data-testid="btn-add-scorecard">Add Scorecard</Button>} />
    {title && catalog && !roleForPositionTitle(catalog, title) && <Notice tone="warning">{noKpiText(catalog.version)}</Notice>}
    <Card title="Scorecard history" testId="scorecard-history">
      <Timeline empty="This employee has no KPI scorecard yet." entries={scorecards.map((item) => ({
        id: item.id, date: `${formatPeriod(item.period)} · ${formatDate(item.evaluationDate || item.createdAt)}`,
        title: `${item.roleName} — ${formatScore(item.overallScore)}${revisionTag(scorecards, item)}`, status: scorecardStatus(item), actor: item.actor, href: `/kpi/${item.id}`,
        body: `Catalog ${item.definitionVersion} · Evaluator ${item.evaluatorName || "—"}`,
      }))} />
    </Card>
    {adding && <KpiFormModal employeeId={employee.id} onClose={() => setAdding(false)} />}
  </>;
}
