"use client";

import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, Target } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { EmployeeReference } from "../../../shared/types";
import type { D4LiveSnapshot, KpiAssessment } from "../../../supabase/types";
import { useSnapshot } from "../../data/D4DataProvider";
import { currentCompetencyStatus, currentGap, departmentOf, developmentNeeds, employeeById, employeeMeta, evaluationsOf, formatDate, formatPeriod, formatScore, includesText, positionOf, scorecardsOf, trainings, visibleEmployees } from "../../data/selectors";
import { DataTable, PersonCell } from "../../ui/DataTable";
import { FilterBar, SearchInput, SelectFilter } from "../../ui/forms";
import { DetailHeader, NotFound, PageHeader } from "../../ui/layout";
import { RowActionMenu } from "../../ui/RowActionMenu";
import { Card, Notice, statusLabel, StatusBadge } from "../../ui/primitives";
import { weighted } from "../kpi/KpiFormModal";

type Row = { employee: EmployeeReference; position: string; period?: string; scorecard?: KpiAssessment; performance: string; gap: string; openNeeds: number; training?: string };

/** FR-06.9 validation state: a scorecard is only summarised when it has five KPIs whose weights total 100%. */
const validScorecard = (item: KpiAssessment) => item.lines.length === 5 && item.lines.reduce((sum, line) => sum + line.weight_percent, 0) === 100;

/** One period per employee: the selected period, else the latest completed scorecard, else the latest evaluation (FR-06.1). */
function periodData(snapshot: D4LiveSnapshot, employeeId: string, period: string) {
  const scorecards = scorecardsOf(snapshot, employeeId).filter((item) => item.status === "completed");
  const evaluations = evaluationsOf(snapshot, employeeId).filter((item) => item.status === "completed");
  const selected = period || scorecards[0]?.period || evaluations[0]?.period;
  return { period: selected, scorecard: scorecards.find((item) => item.period === selected), evaluation: evaluations.find((item) => item.period === selected) };
}

/**
 * Dashboard KPI Orang (FR-D4-004): a read-only per-employee summary of the other five features.
 * It reads the same snapshot as the detail pages (FR-06.8), creates no data of its own, adds no
 * aggregate management metrics (out of scope #12) and shows no achieved label (FR-06.10).
 */
export function DashboardPage() {
  const snapshot = useSnapshot();
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [period, setPeriod] = useState("");
  const periods = useMemo(() => [...new Set([...(snapshot.kpiAssessments ?? []), ...snapshot.performance].map((item) => item.period))].sort().reverse(), [snapshot]);

  const rows = useMemo<Row[]>(() => visibleEmployees(snapshot).map((employee) => {
    // Every row shows the same period: the chosen one, else the latest period in the data (bug 20).
    const data = periodData(snapshot, employee.id, period || periods[0] || "");
    return {
      employee, position: positionOf(snapshot, employee)?.title ?? "—", period: data.period, scorecard: data.scorecard,
      // Evaluations are notes only, so the dashboard shows whether one exists for the period, not a score.
      performance: data.evaluation ? "Completed" : "Not Evaluated",
      gap: currentCompetencyStatus(snapshot, employee),
      openNeeds: developmentNeeds(snapshot).filter((item) => item.employeeId === employee.id && item.status !== "Completed").length,
      training: trainings(snapshot).find((item) => item.employeeId === employee.id)?.status,
    };
  }).filter((row) => includesText(`${row.employee.fullName} ${row.employee.employeeId}`, search) && (!position || row.employee.positionId === position) && (!department || row.employee.departmentId === department))
    .sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName)), [snapshot, search, position, department, period, periods]);

  const profileHref = (row: Row) => `/dashboard/employee/${row.employee.id}${row.period ? `?period=${row.period}` : ""}`;

  return <>
    <PageHeader title="People Dashboard" subtitle="KPI, performance, competency gap, development, and training per employee for the same period." />
    <FilterBar canReset={Boolean(search || position || department || period)} onReset={() => { setSearch(""); setPosition(""); setDepartment(""); setPeriod(""); }}>
      <SearchInput value={search} onChange={setSearch} placeholder="Search name or ID" />
      <SelectFilter label="All positions" testId="all-positions" value={position} onChange={setPosition} options={snapshot.reference.positions.map((item) => ({ value: item.id, label: item.title }))} />
      <SelectFilter label="All departments" testId="all-departments" value={department} onChange={setDepartment} options={snapshot.reference.departments.map((item) => ({ value: item.id, label: item.name }))} />
      {/* The dashboard always shows one period, so there is no "All periods" choice; it starts on the latest one. */}
      <SelectFilter label="Period" testId="latest-period" emptyOption={false} value={period || periods[0] || ""} onChange={setPeriod} options={periods.map((item) => ({ value: item, label: formatPeriod(item) }))} />
    </FilterBar>
    <DataTable<Row> rows={rows} noun="employees" rowKey={(row) => row.employee.id} rowHref={profileHref}
      emptyTitle="No matching employees" emptyText="Change the keyword, position, department, or period, then try again."
      columns={[
        { key: "employee", header: "Employee", cell: (row) => <PersonCell name={row.employee.fullName} code={row.employee.employeeId} /> },
        // Position and department share one column so the nine summary columns fit at 1440px.
        { key: "position", header: "Position / Department", wrap: true, secondary: true, cell: (row) => <><span className="block">{row.position}</span><span className="block text-xs text-ink-3">{departmentOf(snapshot, row.employee)?.name ?? "—"}</span></> },
        { key: "period", header: "Period", cell: (row) => formatPeriod(row.period) },
        { key: "kpi", header: "Total KPI", className: "tabular-nums", cell: (row) => <ScoreCell scorecard={row.scorecard} /> },
        { key: "performance", header: "Evaluation", cell: (row) => <StatusBadge status={row.performance} /> },
        { key: "gap", header: "Competency", cell: (row) => <StatusBadge status={row.gap} /> },
        { key: "needs", header: "Open dev.", className: "tabular-nums", secondary: true, cell: (row) => row.openNeeds || "—" },
        { key: "training", header: "Training", cell: (row) => row.training ? <StatusBadge status={row.training} /> : "—" },
      ]}
      actions={(row) => <RowActionMenu label={`Actions for ${row.employee.fullName}`} actions={[
        { label: "View KPI Scorecard", testId: "view-kpi-scorecard", icon: <Target />, href: row.scorecard ? `/kpi/${row.scorecard.id}` : `/kpi/history/${row.employee.id}` },
        { label: "View Evaluation", testId: "view-evaluation", icon: <ClipboardCheck />, href: `/performance/history/${row.employee.id}` },
      ]} />} />
  </>;
}

function ScoreCell({ scorecard }: { scorecard?: KpiAssessment }) {
  if (!scorecard) return <>—</>;
  if (!validScorecard(scorecard)) return <span className="text-xs font-semibold text-danger">Invalid data</span>;
  return <span className="font-semibold text-ink">{formatScore(scorecard.overallScore)}</span>;
}

function SourceLink({ href, children = "View source" }: { href: string; children?: ReactNode }) {
  return <Link href={href} data-testid="link-view-source" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:underline">{children}<ArrowUpRight aria-hidden="true" className="size-4" /></Link>;
}

export function EmployeeProfilePage({ employeeId, initialPeriod = "" }: { employeeId: string; initialPeriod?: string }) {
  const snapshot = useSnapshot();
  const [period, setPeriod] = useState(initialPeriod);
  const employee = employeeById(snapshot, employeeId);
  if (!employee || !visibleEmployees(snapshot).some((item) => item.id === employeeId)) return <NotFound what="Employee" backHref="/dashboard" backLabel="Back to People Dashboard" />;
  const { period: shown, scorecard, evaluation } = periodData(snapshot, employee.id, period);
  const periods = [...new Set([...scorecardsOf(snapshot, employee.id), ...evaluationsOf(snapshot, employee.id)].filter((item) => item.status === "completed").map((item) => item.period))].sort().reverse();
  const gap = currentGap(snapshot, employee);
  const needs = developmentNeeds(snapshot).filter((item) => item.employeeId === employee.id);
  const employeeTraining = trainings(snapshot).filter((item) => item.employeeId === employee.id);

  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "People Dashboard", href: "/dashboard" }, { label: "Employee" }]} backHref="/dashboard"
      name={employee.fullName} meta={employeeMeta(snapshot, employee)} />
    <FilterBar>
      <SelectFilter label="Period" testId="latest-period" emptyOption={false} value={shown ?? ""} onChange={setPeriod} options={periods.map((item) => ({ value: item, label: formatPeriod(item) }))} />
      <p className="text-sm text-ink-3">Showing period <strong className="text-ink">{formatPeriod(shown)}</strong> for KPI and performance.</p>
    </FilterBar>
    {scorecard && !validScorecard(scorecard) && <Notice tone="warning">This period’s scorecard does not have five KPIs with a total weight of 100%. Check the data on the KPI Scorecard page before using it.</Notice>}
    <div className="grid gap-6 xl:grid-cols-2">
      {/* Full width on xl: five KPI rows with six columns do not fit half a 1440 px layout. */}
      <Card title="KPI scorecard" className="xl:col-span-2" actions={<SourceLink href={scorecard ? `/kpi/${scorecard.id}` : `/kpi/history/${employee.id}`} />} padded={false}>
        {scorecard ? <div className="overflow-x-auto"><table data-testid="dashboard-kpi-table" className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-app text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3"><tr><th className="py-2.5 pl-5 pr-2.5">Core KPI</th><th className="px-2.5 py-2.5">Weight</th><th className="px-2.5 py-2.5">Target</th><th className="px-2.5 py-2.5">Actual</th><th className="px-2.5 py-2.5">Score</th><th className="py-2.5 pl-2.5 pr-5 text-right">Weighted</th></tr></thead>
          <tbody>{scorecard.lines.map((line) => <tr key={line.indicator_order} data-testid={`kpi-line-${line.indicator_order}`} className="border-t border-line"><td className="py-2.5 pl-5 pr-2.5 font-semibold">{line.kpi_name}</td><td className="px-2.5 py-2.5 tabular-nums">{line.weight_percent}%</td><td className="px-2.5 py-2.5">{line.target || "—"}</td><td className="px-2.5 py-2.5">{line.actual || "—"}</td><td className="px-2.5 py-2.5 tabular-nums">{line.raw_score ?? "—"}</td><td className="py-2.5 pl-2.5 pr-5 text-right tabular-nums">{weighted(line)?.toFixed(2) ?? "—"}</td></tr>)}</tbody>
          <tfoot className="border-t border-line bg-app"><tr><td colSpan={5} className="py-2.5 pl-5 pr-2.5 font-semibold">Total ({formatPeriod(scorecard.period)})</td><td className="whitespace-nowrap py-2.5 pl-2.5 pr-5 text-right font-display font-semibold tabular-nums">{formatScore(scorecard.overallScore)}</td></tr></tfoot>
        </table></div> : <p className="px-6 pb-6 text-sm text-ink-3">No KPI scorecard for this period yet.</p>}
      </Card>
      <Card title="Performance evaluation" testId="performance-evaluation" actions={<SourceLink href={evaluation ? `/performance/${evaluation.id}` : `/performance/history/${employee.id}`} />}>
        {evaluation ? <><p className="text-sm text-ink-2">{formatPeriod(evaluation.period)} · {formatDate(evaluation.evaluationDate)} · Evaluator {evaluation.evaluator || "—"}</p><p className="mt-3 line-clamp-6 whitespace-pre-wrap text-sm text-ink">{evaluation.generalNotes || "—"}</p></>
          : <p className="text-sm text-ink-3">No performance evaluation for this period yet.</p>}
      </Card>
      <Card title="Competency gap" testId="competency-gap" actions={<SourceLink href={`/competency/${employee.id}`} />}>
        {gap?.findings.length ? <ul className="space-y-2.5">{gap.findings.map((item) => <li key={item.requirementId} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{item.competencyName} <span className="text-ink-3">· level {item.actualLevel ?? "—"} / min. {item.requiredLevel}</span></span><StatusBadge status={item.status} /></li>)}</ul>
          : <p className="text-sm text-ink-3">No requirements for this position yet.</p>}
      </Card>
      <Card title="Development & training" actions={<SourceLink href="/development" />}>
        {needs.length ? <ul className="space-y-3">{needs.map((need) => {
          const linked = employeeTraining.filter((item) => item.developmentNeedId === need.needId);
          return <li key={need.needId} className="rounded-xl border border-line p-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><Link href={`/development/${need.needId}`} data-testid={`dev-need-${need.needId}`} className="text-sm font-semibold hover:text-primary-600 hover:underline">{need.objective}</Link><StatusBadge status={need.status} /></div>
            <p className="mt-1.5 text-xs text-ink-3">{linked.length ? linked.map((item) => `${item.activity} (${statusLabel(item.status)}, ${formatDate(item.date)})`).join(" · ") : "No training yet"}</p>
          </li>;
        })}</ul> : <p className="text-sm text-ink-3">No development requirement yet.</p>}
      </Card>
    </div>
  </>;
}
