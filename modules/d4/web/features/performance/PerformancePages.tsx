"use client";

import { CheckCircle2, Eye, History, Plus, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { catalogFor, roleForPosition } from "../../../kpi/catalog";
import type { DailyCompilation } from "../../../kpi/daily";
import { scaleMaxOf } from "../../../kpi/scale";
import type { PerformanceEvaluation } from "../../../performance/types";
import type { EmployeeReference } from "../../../shared/types";
import type { KpiAssessment } from "../../../supabase/types";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { canAssess, canWrite, departmentOf, describeSource, developmentNeeds, employeeById, employeeMeta, employeeSearchText, evaluationsOf, formatDate, formatGap, formatPeriod, byProgress, formatScore, formatScorecard, includesText, latestScorecard, pendingCompilation, positionOf, revisionTag, scorecardsOf, thisMonth, visibleEmployees } from "../../data/selectors";
import { DataTable, PersonCell } from "../../ui/DataTable";
import { FilterBar, SearchInput, SelectFilter } from "../../ui/forms";
import { DetailHeader, NotFound, PageHeader, Timeline } from "../../ui/layout";
import { RowActionMenu } from "../../ui/RowActionMenu";
import { Button, ButtonLink, Card, InfoGrid, Notice, SourceChip, StatusBadge } from "../../ui/primitives";
import { FinalizeDailyModal } from "../kpi/FinalizeDailyModal";
import { noKpiText, KpiFormModal } from "../kpi/KpiFormModal";
import { CatalogNotice, scorecardStatus } from "../kpi/KpiPages";

const evaluationStatus = (evaluation?: PerformanceEvaluation) => !evaluation ? "Not Evaluated" : evaluation.status === "completed" ? "Completed" : "Draft";

// Same words as the Status badge in the table, so a filter choice matches what the rows show.
const STATUS_FILTER = ["Completed", "Compiled", "Not Evaluated"]; // FR-D4-002 has no draft scorecard.

type Row = { employee: EmployeeReference; position: string; hasKpi: boolean; scorecard?: KpiAssessment; evaluation?: PerformanceEvaluation; compiled: DailyCompilation | null; period?: string };

/** "Compiled": Daily KPI gave the period a score that HR has not finalized yet (B6). */
const rowStatus = (row: Row) => row.compiled ? "Compiled" : scorecardStatus(row.scorecard);
// Ready to finalize, then still to assess, then done; a position without KPI cannot be assessed, so it goes last.
const performanceRank = (row: Row) => row.compiled ? 0 : !row.scorecard ? (row.hasKpi ? 1 : 3) : 2;

/**
 * Performance Review (FR-D4-001 v3.1): one row per employee with the Total KPI, evaluation notes and evaluator of one
 * assessment. Rows do not open on click; detail and history come from the Actions menu.
 */
export function PerformanceListPage() {
  const snapshot = useSnapshot();
  const { catalog: catalogSet } = useD4();
  const writer = canWrite(snapshot);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [period, setPeriod] = useState("");
  const [progress, setProgress] = useState("");
  const [adding, setAdding] = useState<{ employeeId?: string } | null>(null);
  const [finalizing, setFinalizing] = useState<Row | null>(null);

  const periods = useMemo(() => [...new Set([...(snapshot.kpiAssessments ?? []), ...(snapshot.kpiDaily ?? [])].map((item) => item.period))].sort().reverse(), [snapshot]);
  // KPI role per the catalog in force for the filtered period, or this month when no period is chosen.
  const catalog = useMemo(() => catalogSet && catalogFor(catalogSet, period || thisMonth()), [catalogSet, period]);
  const rows = useMemo<Row[]>(() => visibleEmployees(snapshot).map((employee) => {
    const title = positionOf(snapshot, employee)?.title;
    const scorecard = period ? scorecardsOf(snapshot, employee.id).find((item) => item.period === period) : latestScorecard(snapshot, employee.id);
    // Without a period filter the running period's compilation wins over an older scorecard: it is the newer state.
    const at = period || thisMonth();
    const pending = pendingCompilation(snapshot, employee.id, at);
    const compiled = pending && (!scorecard || scorecard.period < at) ? pending : null;
    return {
      employee, position: title ?? "—", hasKpi: !catalogSet || !title || Boolean(catalog && roleForPosition(catalog, employee.positionId)),
      scorecard: compiled ? undefined : scorecard, compiled, period: compiled ? at : scorecard?.period,
      // Older records kept the notes in a separate evaluation; show them until the period is assessed again.
      evaluation: scorecard && !compiled ? evaluationsOf(snapshot, employee.id).find((item) => item.period === scorecard.period) : undefined,
    };
  }).filter((row) => includesText(employeeSearchText(snapshot, row.employee), search)
    && (!position || row.employee.positionId === position) && (!department || row.employee.departmentId === department)
    && (!progress || rowStatus(row) === progress))
    .sort(byProgress(performanceRank, (row) => row.employee.fullName)), [snapshot, catalog, catalogSet, search, position, department, period, progress]);

  return <>
    <PageHeader title="Performance Review" subtitle="Lima Core KPI dan Notes per pegawai dan periode, dalam satu penilaian."
      actions={writer && <Button icon={<Plus className="size-4" />} onClick={() => setAdding({})} data-testid="btn-add-penilaian">Add Performance Review</Button>} />
    <CatalogNotice />
    <FilterBar canReset={Boolean(search || position || department || period || progress)} onReset={() => { setSearch(""); setPosition(""); setDepartment(""); setPeriod(""); setProgress(""); }}>
      <SearchInput value={search} onChange={setSearch} placeholder="Search name or position" />
      {snapshot.role !== "EMPLOYEE" && <SelectFilter label="All positions" testId="all-positions" value={position} onChange={setPosition} options={snapshot.reference.positions.map((item) => ({ value: item.id, label: item.title }))} />}
      {snapshot.role !== "EMPLOYEE" && <SelectFilter label="All departments" testId="all-departments" value={department} onChange={setDepartment} options={snapshot.reference.departments.map((item) => ({ value: item.id, label: item.name }))} />}
      <SelectFilter label="All periods" testId="latest-period" value={period} onChange={setPeriod} options={periods.map((item) => ({ value: item, label: formatPeriod(item) }))} />
      <SelectFilter label="All status" testId="all-status" value={progress} onChange={setProgress} options={STATUS_FILTER.map((item) => ({ value: item, label: item }))} />
    </FilterBar>
    <DataTable<Row> rows={rows} noun="employees" rowKey={(row) => row.employee.id}
      emptyTitle="Tidak ada pegawai yang cocok" emptyText="Ubah kata kunci atau reset filter untuk melihat semua pegawai."
      columns={[
        { key: "employee", header: "Employee", cell: (row) => <PersonCell name={row.employee.fullName} code={row.employee.employeeId} /> },
        { key: "position", header: "Position / Department", wrap: true, optional: true, cell: (row) => <><span className="block">{row.position}</span><span className="block text-xs text-ink-3">{departmentOf(snapshot, row.employee)?.name ?? "—"}</span></> },
        { key: "period", header: "Period", cell: (row) => formatPeriod(row.period) },
        { key: "total", header: "Total KPI", className: "tabular-nums", cell: (row) => row.scorecard ? <span className="font-semibold">{formatScorecard(row.scorecard)}</span>
          : row.compiled ? <><span className="block font-semibold">{formatScore(row.compiled.total, scaleMaxOf(row.compiled.definitionVersion))}</span><span data-testid="compiled-days" className="block whitespace-normal text-xs text-ink-3">from {row.compiled.days.length} daily {row.compiled.days.length === 1 ? "entry" : "entries"}</span></>
          // The small lines may wrap (the score stays on one line), so they do not widen the table past the Status badge.
          : row.hasKpi ? "—" : <span className="whitespace-normal text-xs text-ink-3">Not in catalog {catalog?.version} yet</span> },
        { key: "gap", header: "Gap vs 85", className: "tabular-nums", optional: true, cell: (row) => row.scorecard ? formatGap(row.scorecard.overallScore, row.scorecard.definitionVersion)
          : row.compiled ? formatGap(row.compiled.total, row.compiled.definitionVersion) : "—" },
        // The evaluator sits under the notes, as Department sits under Position: as a column of its own it pushed the
        // Status badge under the ⋮ column at 1400–1500 px.
        { key: "notes", header: "Notes / Penilai", wrap: true, secondary: true, className: "max-w-[280px]", cell: (row) => {
          const notes = row.scorecard?.generalNotes || row.evaluation?.generalNotes;
          return <>{notes ? <span className="line-clamp-2">{notes}</span> : "—"}
            {row.scorecard?.evaluatorName && <span data-testid="cell-evaluator" className="mt-0.5 block text-xs text-ink-3">{row.scorecard.evaluatorName}</span>}</>;
        } },
        { key: "status", header: "Status", cell: (row) => <StatusBadge status={rowStatus(row)} /> },
      ]}
      actions={(row) => <RowActionMenu label={`Actions for ${row.employee.fullName}`} actions={[
        { label: "View Detail", testId: "view-detail", icon: <Eye />, href: row.scorecard && `/performance/scorecard/${row.scorecard.id}`, hidden: !row.scorecard },
        { label: "View History", testId: "view-history", icon: <History />, href: `/performance/history/${row.employee.id}` },
        { label: "Finalize from Daily KPI", testId: "finalize-daily", icon: <CheckCircle2 />, onSelect: () => setFinalizing(row), hidden: !row.compiled || !canAssess(snapshot, row.employee.id) },
        { label: "Add Performance Review", testId: "add-penilaian", icon: <Plus />, onSelect: () => setAdding({ employeeId: row.employee.id }), hidden: !canAssess(snapshot, row.employee.id) },
      ]} />} />
    {adding && <KpiFormModal employeeId={adding.employeeId} onClose={() => setAdding(null)} />}
    {finalizing?.compiled && finalizing.period && <FinalizeDailyModal employeeId={finalizing.employee.id} period={finalizing.period} compiled={finalizing.compiled} onClose={() => setFinalizing(null)} />}
  </>;
}

/** An evaluation saved before FR-D4-001 v3.1 merged it into the Performance Review; read-only history. */
export function PerformanceDetailPage({ id }: { id: string }) {
  const snapshot = useSnapshot();
  const evaluation = snapshot.performance.find((item) => item.id === id);
  const employee = evaluation && employeeById(snapshot, evaluation.employeeId);
  if (!evaluation || !employee) return <NotFound what="Evaluation" backHref="/performance" backLabel="Back to Performance Review" />;
  const scorecard = scorecardsOf(snapshot, employee.id).find((item) => item.period === evaluation.period);
  const needs = developmentNeeds(snapshot).filter((item) => item.sourceType === "performance_context" && item.sourceRef === evaluation.id);

  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "Performance Review", href: "/performance" }, { label: "Evaluasi lama" }]} backHref={`/performance/history/${employee.id}`}
      name={employee.fullName} meta={[...employeeMeta(snapshot, employee), `Period ${formatPeriod(evaluation.period)}`]}
      status={evaluationStatus(evaluation)}
      actions={<>
        <ButtonLink href={`/performance/history/${employee.id}`} icon={<History className="size-4" />} testId="view-history">View History</ButtonLink>
        {scorecard && <ButtonLink href={`/performance/scorecard/${scorecard.id}`} icon={<Target className="size-4" />}>Performance Review</ButtonLink>}
      </>} />
    <Notice tone="info">Evaluasi ini dicatat sebelum KPI dan Notes digabung menjadi satu Performance Review. Data lama hanya dapat dibaca.</Notice>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
      <Card title="Evaluation summary" testId="evaluation-summary">
        <InfoGrid columns={3} items={[
          { label: "Period", testId: "period", value: formatPeriod(evaluation.period) },
          { label: "Evaluation date", testId: "evaluation-date", value: formatDate(evaluation.evaluationDate) },
          { label: "Evaluator", testId: "evaluator", value: evaluation.evaluator || "—" },
          { label: "Department", testId: "department", value: departmentOf(snapshot, employee)?.name ?? "—" },
        ]} />
        <h3 className="mb-2 mt-8 text-sm font-semibold text-ink-2">Notes</h3>
        <p className="whitespace-pre-wrap break-words text-sm text-ink-2">{evaluation.generalNotes || "Belum ada notes."}</p>
      </Card>
      <div className="space-y-6">
        <Card title="Reference" testId="evidence">
          <p className="text-sm text-ink-2">{evaluation.evidenceReference || "Belum ada reference."}</p>
          <p className="mt-1 text-xs text-ink-3">Recorded by {evaluation.actor} · {formatDate(evaluation.createdAt)}</p>
        </Card>
        {needs.length > 0 && <Card title="Related records" testId="related-records">
          <div className="flex flex-col items-start gap-2">
            {needs.map((need) => <SourceChip key={need.needId} label="Development Requirement" reference={need.objective} href={`/development/${need.needId}`} />)}
          </div>
        </Card>}
      </div>
    </div>
  </>;
}

export function PerformanceHistoryPage({ employeeId }: { employeeId: string }) {
  const snapshot = useSnapshot();
  const { catalog: catalogSet } = useD4();
  const [adding, setAdding] = useState(false);
  const employee = employeeById(snapshot, employeeId);
  const catalog = catalogSet && catalogFor(catalogSet, thisMonth());
  if (!employee || !visibleEmployees(snapshot).some((item) => item.id === employeeId)) return <NotFound what="Employee" backHref="/performance" backLabel="Back to Performance Review" />;
  const scorecards = scorecardsOf(snapshot, employee.id);
  const evaluations = evaluationsOf(snapshot, employee.id);
  const title = positionOf(snapshot, employee)?.title;
  const linkedNeeds = developmentNeeds(snapshot).filter((need) => need.employeeId === employee.id && need.sourceType === "performance_context");
  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "Performance Review", href: "/performance" }, { label: "History" }]} backHref="/performance"
      name={employee.fullName} meta={[...employeeMeta(snapshot, employee), `${scorecards.length} penilaian`]}
      actions={canAssess(snapshot, employee.id) && <Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)} data-testid="btn-add-penilaian">Add Performance Review</Button>} />
    {title && catalogSet && !(catalog && roleForPosition(catalog, employee.positionId)) && <Notice tone="warning">{noKpiText(catalog?.version)}</Notice>}
    <Card title="Riwayat Performance Review" testId="scorecard-history">
      <Timeline empty="Pegawai ini belum memiliki Performance Review." entries={scorecards.map((item) => ({
        id: item.id, date: `${formatPeriod(item.period)} · ${formatDate(item.evaluationDate || item.createdAt)}`,
        title: `${item.roleName} — ${formatScorecard(item)}${revisionTag(scorecards, item)}`, status: scorecardStatus(item), actor: item.actor, href: `/performance/scorecard/${item.id}`,
        body: `Catalog ${item.definitionVersion} · Penilai ${item.evaluatorName || "—"}${item.generalNotes ? ` · ${item.generalNotes}` : ""}`,
      }))} />
    </Card>
    {evaluations.length > 0 && <Card title="Evaluasi lama (sebelum digabung)" testId="evaluation-history">
      <Timeline empty="" entries={evaluations.map((item) => ({
        id: item.id, date: `${formatPeriod(item.period)} · ${formatDate(item.evaluationDate || item.createdAt)}`,
        title: `Evaluation ${formatPeriod(item.period)}${revisionTag(evaluations, item)}`,
        status: evaluationStatus(item), actor: item.actor, href: `/performance/${item.id}`,
        body: <>Evaluator: {item.evaluator || "—"}{item.generalNotes ? ` · ${item.generalNotes}` : ""}</>,
      }))} />
    </Card>}
    {linkedNeeds.length > 0 && <Card title="Development dari Performance Review" testId="development-linked-to-evaluations">
      <div className="flex flex-wrap gap-2">{linkedNeeds.map((need) => <SourceChip key={need.needId} label={describeSource(snapshot, need).label} reference={need.objective} href={`/development/${need.needId}`} />)}</div>
    </Card>}
    {adding && <KpiFormModal employeeId={employee.id} onClose={() => setAdding(false)} />}
  </>;
}
