"use client";

import { ClipboardCheck, History, Plus, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { roleForPositionTitle, rolesOf } from "../../../kpi/catalog";
import type { PerformanceEvaluation } from "../../../performance/types";
import type { EmployeeReference } from "../../../shared/types";
import type { KpiAssessment } from "../../../supabase/types";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { canAssess, canWrite, departmentOf, describeSource, developmentNeeds, employeeById, employeeMeta, evaluationsOf, formatDate, formatPeriod, formatScore, includesText, latestEvaluation, latestScorecard, positionOf, revisionTag, scorecardsOf, visibleEmployees } from "../../data/selectors";
import { DataTable, PersonCell } from "../../ui/DataTable";
import { FilterBar, SearchInput, SelectFilter } from "../../ui/forms";
import { DetailHeader, NotFound, PageHeader, Timeline } from "../../ui/layout";
import { RowActionMenu } from "../../ui/RowActionMenu";
import { Button, ButtonLink, Card, InfoGrid, Notice, SourceChip, StatusBadge } from "../../ui/primitives";
import { noKpiText, KpiFormModal } from "../kpi/KpiFormModal";
import { CatalogNotice, scorecardStatus } from "../kpi/KpiPages";
import { EvaluationFormModal } from "./EvaluationFormModal";

const evaluationStatus = (evaluation?: PerformanceEvaluation) => !evaluation ? "Not Evaluated" : evaluation.status === "completed" ? "Completed" : "Draft";

/** Which half of a period is recorded; one filter instead of separate KPI and evaluation status filters. */
const PROGRESS = [
  { value: "complete", label: "KPI & evaluation recorded" },
  { value: "kpi-missing", label: "KPI scorecard missing" },
  { value: "evaluation-missing", label: "Evaluation missing" },
] as const;

type Row = { employee: EmployeeReference; position: string; hasKpi: boolean; roleName?: string; scorecard?: KpiAssessment; evaluation?: PerformanceEvaluation };
type Adding = { kind: "scorecard" | "evaluation"; employeeId?: string } | null;

/**
 * Performance & KPI: one row per employee with the KPI scorecard (scores) and the performance evaluation (written
 * record) side by side. Both records keep their own form, detail page and history; only the entry point is shared.
 */
export function PerformanceListPage() {
  const snapshot = useSnapshot();
  const { catalog } = useD4();
  const writer = canWrite(snapshot);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [period, setPeriod] = useState("");
  const [progress, setProgress] = useState("");
  const [adding, setAdding] = useState<Adding>(null);

  const periods = useMemo(() => [...new Set([...(snapshot.kpiAssessments ?? []), ...snapshot.performance].map((item) => item.period))].sort().reverse(), [snapshot]);
  const rows = useMemo<Row[]>(() => visibleEmployees(snapshot).map((employee) => {
    const title = positionOf(snapshot, employee)?.title;
    const roleOrder = catalog && title ? roleForPositionTitle(catalog, title) : 0;
    return {
      employee, position: title ?? "—", hasKpi: !catalog || !title || roleOrder > 0,
      roleName: catalog && roleOrder ? rolesOf(catalog).find((role) => role.order === roleOrder)?.name : undefined,
      scorecard: period ? scorecardsOf(snapshot, employee.id).find((item) => item.period === period) : latestScorecard(snapshot, employee.id),
      evaluation: period ? evaluationsOf(snapshot, employee.id).find((item) => item.period === period) : latestEvaluation(snapshot, employee.id),
    };
  }).filter((row) => includesText(`${row.employee.fullName} ${row.employee.employeeId}`, search)
    && (!position || row.employee.positionId === position) && (!department || row.employee.departmentId === department)
    && (!progress || (progress === "complete" ? Boolean(row.scorecard && row.evaluation) : progress === "kpi-missing" ? !row.scorecard : !row.evaluation)))
    .sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName)), [snapshot, catalog, search, position, department, period, progress]);

  return <>
    <PageHeader title="Performance & KPI" subtitle="KPI Scorecard (skor lima Core KPI) dan Performance Evaluation (catatan evaluasi) per pegawai dan periode dalam satu tempat."
      actions={writer && <>
        <Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => setAdding({ kind: "evaluation" })} data-testid="btn-add-evaluation">Add Evaluation</Button>
        <Button icon={<Plus className="size-4" />} onClick={() => setAdding({ kind: "scorecard" })} data-testid="btn-add-scorecard">Add Scorecard</Button>
      </>} />
    <CatalogNotice />
    <FilterBar canReset={Boolean(search || position || department || period || progress)} onReset={() => { setSearch(""); setPosition(""); setDepartment(""); setPeriod(""); setProgress(""); }}>
      <SearchInput value={search} onChange={setSearch} placeholder="Search name or ID" />
      {snapshot.role !== "EMPLOYEE" && <SelectFilter label="All positions" testId="all-positions" value={position} onChange={setPosition} options={snapshot.reference.positions.map((item) => ({ value: item.id, label: item.title }))} />}
      {snapshot.role !== "EMPLOYEE" && <SelectFilter label="All departments" testId="all-departments" value={department} onChange={setDepartment} options={snapshot.reference.departments.map((item) => ({ value: item.id, label: item.name }))} />}
      <SelectFilter label="All periods" testId="latest-period" value={period} onChange={setPeriod} options={periods.map((item) => ({ value: item, label: formatPeriod(item) }))} />
      <SelectFilter label="All status" testId="all-status" value={progress} onChange={setProgress} options={PROGRESS.map((item) => ({ value: item.value, label: item.label }))} />
    </FilterBar>
    <DataTable<Row> rows={rows} noun="pegawai" rowKey={(row) => row.employee.id}
      emptyTitle="Tidak ada pegawai yang cocok" emptyText="Ubah kata kunci atau reset filter untuk melihat semua pegawai."
      columns={[
        { key: "employee", header: "Employee", cell: (row) => <PersonCell name={row.employee.fullName} code={row.employee.employeeId} /> },
        { key: "position", header: "Position / Department", wrap: true, cell: (row) => <><span className="block">{row.position}</span><span className="block text-xs text-ink-3">{departmentOf(snapshot, row.employee)?.name ?? "—"}</span></> },
        { key: "role", header: "KPI Role", wrap: true, secondary: true, cell: (row) => row.scorecard?.roleName ?? row.roleName ?? (row.hasKpi ? "—" : <span className="text-ink-3">Not in catalog {catalog?.version} yet</span>) },
        { key: "total", header: "KPI Score", className: "tabular-nums", cell: (row) => row.scorecard
          ? <><span className="block font-semibold">{formatScore(row.scorecard.overallScore)}</span><span className="block text-xs text-ink-3">{formatPeriod(row.scorecard.period)}</span></>
          : <StatusBadge status={scorecardStatus()} /> },
        { key: "status", header: "Evaluation", cell: (row) => <><StatusBadge status={evaluationStatus(row.evaluation)} />{row.evaluation && <span className="mt-1 block text-xs text-ink-3">{formatPeriod(row.evaluation.period)} · {row.evaluation.evaluator || "—"}</span>}</> },
        { key: "notes", header: "Evaluation notes", wrap: true, secondary: true, className: "max-w-[280px]", cell: (row) => row.evaluation?.generalNotes ? <span className="line-clamp-2">{row.evaluation.generalNotes}</span> : "—" },
      ]}
      actions={(row) => <RowActionMenu label={`Actions for ${row.employee.fullName}`} actions={[
        { label: "View History", testId: "view-history", icon: <History />, href: `/performance/history/${row.employee.id}` },
        { label: "Open KPI Scorecard", testId: "open-kpi-scorecard", icon: <Target />, href: row.scorecard && `/performance/scorecard/${row.scorecard.id}`, hidden: !row.scorecard },
        { label: "Open Evaluation", testId: "open-evaluation", icon: <ClipboardCheck />, href: row.evaluation && `/performance/${row.evaluation.id}`, hidden: !row.evaluation },
        { label: "Add Scorecard", testId: "add-scorecard", icon: <Plus />, onSelect: () => setAdding({ kind: "scorecard", employeeId: row.employee.id }), hidden: !canAssess(snapshot, row.employee.id) },
        { label: "Add Evaluation", testId: "add-evaluation", icon: <Plus />, onSelect: () => setAdding({ kind: "evaluation", employeeId: row.employee.id }), hidden: !canAssess(snapshot, row.employee.id) },
      ]} />} />
    {adding?.kind === "scorecard" && <KpiFormModal employeeId={adding.employeeId} onClose={() => setAdding(null)} />}
    {adding?.kind === "evaluation" && <EvaluationFormModal employeeId={adding.employeeId} onClose={() => setAdding(null)} />}
  </>;
}

export function PerformanceDetailPage({ id }: { id: string }) {
  const snapshot = useSnapshot();
  const [adding, setAdding] = useState(false);
  const evaluation = snapshot.performance.find((item) => item.id === id);
  const employee = evaluation && employeeById(snapshot, evaluation.employeeId);
  if (!evaluation || !employee) return <NotFound what="Evaluation" backHref="/performance" backLabel="Back to Performance & KPI" />;
  const scorecard = scorecardsOf(snapshot, employee.id).find((item) => item.period === evaluation.period);
  const needs = developmentNeeds(snapshot).filter((item) => item.sourceType === "performance_context" && item.sourceRef === evaluation.id);

  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "Performance & KPI", href: "/performance" }, { label: "Evaluation" }]} backHref={`/performance/history/${employee.id}`}
      name={employee.fullName} meta={[...employeeMeta(snapshot, employee), `Period ${formatPeriod(evaluation.period)}`]}
      status={evaluationStatus(evaluation)}
      actions={<>
        <ButtonLink href={`/performance/history/${employee.id}`} icon={<History className="size-4" />} testId="view-history">View History</ButtonLink>
        <ButtonLink href={scorecard ? `/performance/scorecard/${scorecard.id}` : `/performance/history/${employee.id}`} icon={<Target className="size-4" />}>KPI Scorecard</ButtonLink>
        {canAssess(snapshot, employee.id) && <Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)} data-testid="btn-add-evaluation">Add Evaluation</Button>}
      </>} />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
      <Card title="Evaluation summary" testId="evaluation-summary">
        <InfoGrid columns={3} items={[
          { label: "Period", testId: "period", value: formatPeriod(evaluation.period) },
          { label: "Evaluation date", testId: "evaluation-date", value: formatDate(evaluation.evaluationDate) },
          { label: "Evaluator", testId: "evaluator", value: evaluation.evaluator || "—" },
          { label: "Department", testId: "department", value: departmentOf(snapshot, employee)?.name ?? "—" },
        ]} />
        <h3 className="mb-2 mt-8 text-sm font-semibold text-ink-2">Evaluation notes</h3>
        <p className="whitespace-pre-wrap text-sm text-ink-2">{evaluation.generalNotes || "Belum ada catatan evaluasi."}</p>
      </Card>
      <div className="space-y-6">
        <Card title="Evidence" testId="evidence">
          <p className="text-sm text-ink-2">{evaluation.evidenceReference || "Belum ada bukti atau referensi."}</p>
          <p className="mt-1 text-xs text-ink-3">Recorded by {evaluation.actor} · {formatDate(evaluation.createdAt)}</p>
        </Card>
        <Card title="Related records" testId="related-records">
          <div className="flex flex-col items-start gap-2">
            {scorecard ? <SourceChip label="KPI Scorecard" reference={formatPeriod(scorecard.period)} href={`/performance/scorecard/${scorecard.id}`} /> : <p className="text-sm text-ink-3">Belum ada KPI scorecard untuk periode ini.</p>}
            {needs.map((need) => <SourceChip key={need.needId} label="Development Requirement" reference={need.objective} href={`/development/${need.needId}`} />)}
          </div>
          <p className="mt-4 text-xs text-ink-3">Evaluasi dapat menjadi dasar development bila relevan; tidak ada keputusan HR yang dibuat otomatis dari skor.</p>
        </Card>
      </div>
    </div>
    {adding && <EvaluationFormModal employeeId={employee.id} onClose={() => setAdding(false)} />}
  </>;
}

export function PerformanceHistoryPage({ employeeId }: { employeeId: string }) {
  const snapshot = useSnapshot();
  const { catalog } = useD4();
  const [adding, setAdding] = useState<Adding>(null);
  const employee = employeeById(snapshot, employeeId);
  if (!employee || !visibleEmployees(snapshot).some((item) => item.id === employeeId)) return <NotFound what="Employee" backHref="/performance" backLabel="Back to Performance & KPI" />;
  const scorecards = scorecardsOf(snapshot, employee.id);
  const evaluations = evaluationsOf(snapshot, employee.id);
  const title = positionOf(snapshot, employee)?.title;
  const linkedNeeds = developmentNeeds(snapshot).filter((need) => need.employeeId === employee.id && need.sourceType === "performance_context");
  const assess = canAssess(snapshot, employee.id);
  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "Performance & KPI", href: "/performance" }, { label: "History" }]} backHref="/performance"
      name={employee.fullName} meta={[...employeeMeta(snapshot, employee), `${scorecards.length} ${scorecards.length === 1 ? "scorecard" : "scorecards"}`, `${evaluations.length} ${evaluations.length === 1 ? "evaluation" : "evaluations"}`]}
      actions={assess && <>
        <Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => setAdding({ kind: "evaluation", employeeId: employee.id })} data-testid="btn-add-evaluation">Add Evaluation</Button>
        <Button icon={<Plus className="size-4" />} onClick={() => setAdding({ kind: "scorecard", employeeId: employee.id })} data-testid="btn-add-scorecard">Add Scorecard</Button>
      </>} />
    {title && catalog && !roleForPositionTitle(catalog, title) && <Notice tone="warning">{noKpiText(catalog.version)}</Notice>}
    <div className="grid gap-6 xl:grid-cols-2">
      <Card title="KPI scorecard history" testId="scorecard-history">
        <Timeline empty="Pegawai ini belum memiliki KPI scorecard." entries={scorecards.map((item) => ({
          id: item.id, date: `${formatPeriod(item.period)} · ${formatDate(item.evaluationDate || item.createdAt)}`,
          title: `${item.roleName} — ${formatScore(item.overallScore)}${revisionTag(scorecards, item)}`, status: scorecardStatus(item), actor: item.actor, href: `/performance/scorecard/${item.id}`,
          body: `Catalog ${item.definitionVersion} · Evaluator ${item.evaluatorName || "—"}`,
        }))} />
      </Card>
      <Card title="Evaluation history" testId="evaluation-history">
        <Timeline empty="Pegawai ini belum memiliki evaluasi performance." entries={evaluations.map((item) => ({
          id: item.id, date: `${formatPeriod(item.period)} · ${formatDate(item.evaluationDate || item.createdAt)}`,
          title: `Evaluation ${formatPeriod(item.period)}${revisionTag(evaluations, item)}`,
          status: evaluationStatus(item), actor: item.actor, href: `/performance/${item.id}`,
          body: <>Evaluator: {item.evaluator || "—"}{item.generalNotes ? ` · ${item.generalNotes}` : ""}</>,
        }))} />
      </Card>
    </div>
    {linkedNeeds.length > 0 && <Card title="Development linked to evaluations" testId="development-linked-to-evaluations">
      <div className="flex flex-wrap gap-2">{linkedNeeds.map((need) => <SourceChip key={need.needId} label={describeSource(snapshot, need).label} reference={need.objective} href={`/development/${need.needId}`} />)}</div>
    </Card>}
    {adding?.kind === "scorecard" && <KpiFormModal employeeId={employee.id} onClose={() => setAdding(null)} />}
    {adding?.kind === "evaluation" && <EvaluationFormModal employeeId={employee.id} onClose={() => setAdding(null)} />}
  </>;
}
