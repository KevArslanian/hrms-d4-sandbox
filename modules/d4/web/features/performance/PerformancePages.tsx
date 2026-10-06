"use client";

import { History, Plus, Target } from "lucide-react";
import { useMemo, useState } from "react";
import type { PerformanceEvaluation } from "../../../performance/types";
import type { EmployeeReference } from "../../../shared/types";
import { useSnapshot } from "../../data/D4DataProvider";
import { canAssess, canWrite, departmentOf, describeSource, developmentNeeds, employeeById, employeeMeta, evaluationsOf, formatDate, formatPeriod, formatScore, includesText, latestEvaluation, positionOf, revisionTag, SCORE_LABELS, scorecardsOf, visibleEmployees } from "../../data/selectors";
import { DataTable, PersonCell } from "../../ui/DataTable";
import { FilterBar, SearchInput, SelectFilter } from "../../ui/forms";
import { DetailHeader, NotFound, PageHeader, Timeline } from "../../ui/layout";
import { RowActionMenu } from "../../ui/RowActionMenu";
import { Button, ButtonLink, Card, InfoGrid, SourceChip, statusLabel, StatusBadge } from "../../ui/primitives";
import { EvaluationFormModal } from "./EvaluationFormModal";

const evaluationStatus = (evaluation?: PerformanceEvaluation) => !evaluation ? "Not Evaluated" : evaluation.status === "completed" ? "Completed" : "Draft";

type Row = { employee: EmployeeReference; position: string; evaluation?: PerformanceEvaluation };

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
    <PageHeader title="Performance Evaluation" subtitle="Record and trace performance evaluations per employee and period."
      actions={writer && <Button icon={<Plus className="size-4" />} onClick={() => setModalFor("")} data-testid="btn-add-evaluation">Add Evaluation</Button>} />
    <FilterBar canReset={Boolean(search || position || department || period || status)} onReset={() => { setSearch(""); setPosition(""); setDepartment(""); setPeriod(""); setStatus(""); }}>
      <SearchInput value={search} onChange={setSearch} placeholder="Search name or ID" />
      <SelectFilter label="All positions" testId="all-positions" value={position} onChange={setPosition} options={snapshot.reference.positions.map((item) => ({ value: item.id, label: item.title }))} />
      <SelectFilter label="All departments" testId="all-departments" value={department} onChange={setDepartment} options={snapshot.reference.departments.map((item) => ({ value: item.id, label: item.name }))} />
      <SelectFilter label="Latest period" testId="latest-period" value={period} onChange={setPeriod} options={periods.map((item) => ({ value: item, label: formatPeriod(item) }))} />
      <SelectFilter label="All status" testId="all-status" value={status} onChange={setStatus} options={statuses.map((item) => ({ value: item, label: statusLabel(item) }))} />
    </FilterBar>
    <DataTable<Row> rows={rows} noun="employees" rowKey={(row) => row.employee.id}
      emptyTitle="No matching employees" emptyText="Change the keyword or reset the filters to see all employees."
      rowHref={(row) => row.evaluation ? `/performance/${row.evaluation.id}` : `/performance/history/${row.employee.id}`}
      columns={[
        { key: "employee", header: "Employee", cell: (row) => <PersonCell name={row.employee.fullName} code={row.employee.employeeId} /> },
        { key: "position", header: "Position", wrap: true, cell: (row) => row.position },
        { key: "department", header: "Department", wrap: true, cell: (row) => departmentOf(snapshot, row.employee)?.name ?? "—" },
        { key: "period", header: "Period", cell: (row) => formatPeriod(row.evaluation?.period) },
        { key: "score", header: "Result", className: "tabular-nums", cell: (row) => formatScore(row.evaluation?.overallScore) },
        { key: "evaluator", header: "Evaluator", cell: (row) => row.evaluation?.evaluator || "—" },
        { key: "status", header: "Status", cell: (row) => <StatusBadge status={evaluationStatus(row.evaluation)} /> },
      ]}
      actions={(row) => <RowActionMenu label={`Actions for ${row.employee.fullName}`} actions={[
        { label: "View History", testId: "view-history", icon: <History />, href: `/performance/history/${row.employee.id}` },
        { label: "Open KPI Scorecard", testId: "open-kpi-scorecard", icon: <Target />, href: `/kpi/history/${row.employee.id}` },
      ]} />} />
    {modalFor !== null && <EvaluationFormModal employeeId={modalFor || undefined} onClose={() => setModalFor(null)} />}
  </>;
}

export function PerformanceDetailPage({ id }: { id: string }) {
  const snapshot = useSnapshot();
  const [adding, setAdding] = useState(false);
  const evaluation = snapshot.performance.find((item) => item.id === id);
  const employee = evaluation && employeeById(snapshot, evaluation.employeeId);
  if (!evaluation || !employee) return <NotFound what="Evaluation" backHref="/performance" backLabel="Back to Performance Evaluation" />;
  const scorecard = scorecardsOf(snapshot, employee.id).find((item) => item.period === evaluation.period);
  const needs = developmentNeeds(snapshot).filter((item) => item.sourceType === "performance_context" && item.sourceRef === evaluation.id);

  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "Performance Evaluation", href: "/performance" }, { label: "Detail" }]} backHref="/performance"
      name={employee.fullName} meta={[...employeeMeta(snapshot, employee), `Period ${formatPeriod(evaluation.period)}`]}
      status={evaluationStatus(evaluation)}
      actions={<>
        <ButtonLink href={`/performance/history/${employee.id}`} icon={<History className="size-4" />} testId="view-history">View History</ButtonLink>
        <ButtonLink href={scorecard ? `/kpi/${scorecard.id}` : `/kpi/history/${employee.id}`} icon={<Target className="size-4" />}>KPI Scorecard</ButtonLink>
        {canAssess(snapshot, employee.id) && <Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)} data-testid="btn-add-evaluation">Add Evaluation</Button>}
      </>} />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
      <Card title="Evaluation summary" testId="evaluation-summary">
        <InfoGrid columns={3} items={[
          { label: "Period", testId: "period", value: formatPeriod(evaluation.period) },
          { label: "Evaluation date", testId: "evaluation-date", value: formatDate(evaluation.evaluationDate) },
          { label: "Evaluator", testId: "evaluator", value: evaluation.evaluator || "—" },
          { label: "Evaluation result", testId: "hasil-evaluasi", value: <strong className="font-display font-semibold text-lg">{formatScore(evaluation.overallScore)}</strong> },
          { label: "Criteria", testId: "kriteria", value: evaluation.overallScore ? SCORE_LABELS[Math.round(evaluation.overallScore)] ?? "—" : "—" },
          { label: "Department", testId: "department", value: departmentOf(snapshot, employee)?.name ?? "—" },
        ]} />
        <h3 className="mb-2 mt-8 text-sm font-semibold text-ink-2">Evaluation notes</h3>
        <p className="whitespace-pre-wrap text-sm text-ink-2">{evaluation.generalNotes || "No evaluation notes yet."}</p>
      </Card>
      <div className="space-y-6">
        <Card title="Evidence" testId="evidence">
          <p className="text-sm text-ink-2">{evaluation.evidenceReference || "No evidence or reference yet."}</p>
          <p className="mt-1 text-xs text-ink-3">Recorded by {evaluation.actor} · {formatDate(evaluation.createdAt)}</p>
        </Card>
        <Card title="Related records" testId="related-records">
          <div className="flex flex-col items-start gap-2">
            {scorecard ? <SourceChip label="KPI Scorecard" reference={formatPeriod(scorecard.period)} href={`/kpi/${scorecard.id}`} /> : <p className="text-sm text-ink-3">No KPI scorecard for this period yet.</p>}
            {needs.map((need) => <SourceChip key={need.needId} label="Development Requirement" reference={need.objective} href={`/development/${need.needId}`} />)}
          </div>
          <p className="mt-4 text-xs text-ink-3">An evaluation can be context for development when relevant; no HR decision is made automatically from the score.</p>
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
  if (!employee || !visibleEmployees(snapshot).some((item) => item.id === employeeId)) return <NotFound what="Employee" backHref="/performance" backLabel="Back to Performance Evaluation" />;
  const evaluations = evaluationsOf(snapshot, employee.id);
  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "Performance Evaluation", href: "/performance" }, { label: "History" }]} backHref="/performance"
      name={employee.fullName} meta={[...employeeMeta(snapshot, employee), `${evaluations.length} ${evaluations.length === 1 ? "evaluation" : "evaluations"}`]}
      actions={<>
        <ButtonLink href={`/kpi/history/${employee.id}`} icon={<Target className="size-4" />}>KPI Scorecard</ButtonLink>
        {canAssess(snapshot, employee.id) && <Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)} data-testid="btn-add-evaluation">Add Evaluation</Button>}
      </>} />
    <Card title="Evaluation history" testId="evaluation-history">
      <Timeline empty="This employee has no performance evaluation yet." entries={evaluations.map((item) => ({
        id: item.id, date: `${formatPeriod(item.period)} · ${formatDate(item.evaluationDate || item.createdAt)}`,
        title: `Evaluation ${formatPeriod(item.period)} — ${formatScore(item.overallScore)}${revisionTag(evaluations, item)}`,
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
