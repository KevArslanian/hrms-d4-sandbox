"use client";

import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, Eye } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { EmployeeReference } from "../../../shared/types";
import type { PerformanceEvaluation } from "../../../performance/types";
import type { D4LiveSnapshot } from "../../../supabase/types";
import { useSnapshot } from "../../data/D4DataProvider";
import { currentCompetencyStatus, currentGap, departmentOf, developmentNeeds, employeeById, employeeMeta, evaluationsOf, formatDate, formatPeriod, formatScore, includesText, needsOf, positionOf, trainings, trainingsOf, visibleEmployees } from "../../data/selectors";
import { DataTable, PersonCell } from "../../ui/DataTable";
import { FilterBar, SearchInput, SelectFilter } from "../../ui/forms";
import { DetailHeader, NotFound, PageHeader } from "../../ui/layout";
import { RowActionMenu } from "../../ui/RowActionMenu";
import { Card, statusLabel, StatusBadge } from "../../ui/primitives";
import { KpiTable } from "../performance/PerformancePages";

type Row = { employee: EmployeeReference; position: string; period?: string; evaluation?: PerformanceEvaluation; gap: string; openNeeds: number; training?: string };

/** FR-06.9 validation state: a Total KPI is only summarised when the assessment has five KPIs whose weights total 100%. */
const validKpi = (item: PerformanceEvaluation) => item.lines.length === 5 && item.lines.reduce((sum, line) => sum + line.weight_percent, 0) === 100;

/** One period per employee: the selected period, else the latest completed Penilaian Kinerja (FR-06.1). */
function periodData(snapshot: D4LiveSnapshot, employeeId: string, period: string) {
  const evaluations = evaluationsOf(snapshot, employeeId).filter((item) => item.status === "completed");
  const selected = period || evaluations[0]?.period;
  return { period: selected, evaluation: evaluations.find((item) => item.period === selected) };
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
  const periods = useMemo(() => [...new Set(snapshot.performance.map((item) => item.period))].sort().reverse(), [snapshot]);

  const rows = useMemo<Row[]>(() => visibleEmployees(snapshot).map((employee) => {
    // Every row shows the same period: the chosen one, else the latest period in the data (bug 20).
    const data = periodData(snapshot, employee.id, period || periods[0] || "");
    return {
      employee, position: positionOf(snapshot, employee)?.title ?? "—", period: data.period, evaluation: data.evaluation,
      gap: currentCompetencyStatus(snapshot, employee),
      openNeeds: needsOf(snapshot, employee.id).filter((item) => item.status !== "Completed").length,
      training: trainingsOf(snapshot, employee.id)[0]?.status,
    };
  }).filter((row) => includesText(`${row.employee.fullName} ${row.employee.employeeId}`, search) && (!position || row.employee.positionId === position) && (!department || row.employee.departmentId === department))
    .sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName)), [snapshot, search, position, department, period, periods]);

  const profileHref = (row: Row) => `/dashboard/employee/${row.employee.id}${row.period ? `?period=${row.period}` : ""}`;

  return <>
    <PageHeader title="People Dashboard" subtitle="Total KPI, gap kompetensi, development, dan training per pegawai untuk periode yang sama." />
    <FilterBar canReset={Boolean(search || position || department || period)} onReset={() => { setSearch(""); setPosition(""); setDepartment(""); setPeriod(""); }}>
      <SearchInput value={search} onChange={setSearch} placeholder="Search name or ID" />
      {snapshot.role !== "EMPLOYEE" && <SelectFilter label="All positions" testId="all-positions" value={position} onChange={setPosition} options={snapshot.reference.positions.map((item) => ({ value: item.id, label: item.title }))} />}
      {snapshot.role !== "EMPLOYEE" && <SelectFilter label="All departments" testId="all-departments" value={department} onChange={setDepartment} options={snapshot.reference.departments.map((item) => ({ value: item.id, label: item.name }))} />}
      {/* The dashboard always shows one period, so there is no "All periods" choice; it starts on the latest one. */}
      <SelectFilter label="Period" testId="latest-period" emptyOption={false} value={period || periods[0] || ""} onChange={setPeriod} options={periods.map((item) => ({ value: item, label: formatPeriod(item) }))} />
    </FilterBar>
    <DataTable<Row> rows={rows} noun="pegawai" rowKey={(row) => row.employee.id}
      emptyTitle="Tidak ada pegawai yang cocok" emptyText="Ubah kata kunci, posisi, departemen, atau periode, lalu coba lagi."
      columns={[
        { key: "employee", header: "Employee", cell: (row) => <PersonCell name={row.employee.fullName} code={row.employee.employeeId} /> },
        // Position and department share one column so the nine summary columns fit at 1440px.
        { key: "position", header: "Position / Department", wrap: true, secondary: true, cell: (row) => <><span className="block">{row.position}</span><span className="block text-xs text-ink-3">{departmentOf(snapshot, row.employee)?.name ?? "—"}</span></> },
        { key: "period", header: "Period", cell: (row) => formatPeriod(row.period) },
        { key: "kpi", header: "Total KPI", className: "tabular-nums", cell: (row) => <ScoreCell evaluation={row.evaluation} /> },
        { key: "gap", header: "Competency", cell: (row) => <StatusBadge status={row.gap} /> },
        { key: "needs", header: "Open dev.", className: "tabular-nums", secondary: true, cell: (row) => row.openNeeds || "—" },
        { key: "training", header: "Training", cell: (row) => row.training ? <StatusBadge status={row.training} /> : "—" },
      ]}
      actions={(row) => <RowActionMenu label={`Actions for ${row.employee.fullName}`} actions={[
        { label: "View Detail", testId: "view-detail", icon: <Eye />, href: profileHref(row) },
        { label: "View Evaluation", testId: "view-evaluation", icon: <ClipboardCheck />, href: row.evaluation ? `/performance/${row.evaluation.id}` : `/performance/history/${row.employee.id}` },
      ]} />} />
  </>;
}

function ScoreCell({ evaluation }: { evaluation?: PerformanceEvaluation }) {
  if (!evaluation) return <>—</>;
  if (!validKpi(evaluation)) return <span className="text-xs text-ink-3">No KPI</span>;
  return <span className="font-semibold text-ink">{formatScore(evaluation.overallScore)}</span>;
}

function SourceLink({ href, children = "View source" }: { href: string; children?: ReactNode }) {
  return <Link href={href} data-testid="link-view-source" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:underline">{children}<ArrowUpRight aria-hidden="true" className="size-4" /></Link>;
}

export function EmployeeProfilePage({ employeeId, initialPeriod = "" }: { employeeId: string; initialPeriod?: string }) {
  const snapshot = useSnapshot();
  const [period, setPeriod] = useState(initialPeriod);
  const employee = employeeById(snapshot, employeeId);
  if (!employee || !visibleEmployees(snapshot).some((item) => item.id === employeeId)) return <NotFound what="Employee" backHref="/dashboard" backLabel="Back to People Dashboard" />;
  const { period: shown, evaluation } = periodData(snapshot, employee.id, period);
  const periods = [...new Set(evaluationsOf(snapshot, employee.id).filter((item) => item.status === "completed").map((item) => item.period))].sort().reverse();
  const gap = currentGap(snapshot, employee);
  const needs = developmentNeeds(snapshot).filter((item) => item.employeeId === employee.id);
  const employeeTraining = trainings(snapshot).filter((item) => item.employeeId === employee.id);

  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "People Dashboard", href: "/dashboard" }, { label: "Employee" }]} backHref="/dashboard"
      name={employee.fullName} meta={employeeMeta(snapshot, employee)} />
    <FilterBar>
      <SelectFilter label="Period" testId="latest-period" emptyOption={false} value={shown ?? ""} onChange={setPeriod} options={periods.map((item) => ({ value: item, label: formatPeriod(item) }))} />
      <p className="text-sm text-ink-3">Menampilkan periode <strong className="text-ink">{formatPeriod(shown)}</strong> untuk Penilaian Kinerja.</p>
    </FilterBar>
    <div className="grid gap-6 xl:grid-cols-2">
      {/* Full width on xl: five KPI rows with eight columns do not fit half a 1440 px layout. */}
      <Card title="Penilaian Kinerja" testId="performance-evaluation" className="xl:col-span-2" actions={<SourceLink href={evaluation ? `/performance/${evaluation.id}` : `/performance/history/${employee.id}`} />} padded={false}>
        {evaluation ? <>
          <KpiTable lines={evaluation.lines} total={evaluation.overallScore} period={evaluation.period} testId="dashboard-kpi-table" />
          <div className="px-6 py-5">
            <p className="text-sm text-ink-2">{formatPeriod(evaluation.period)} · {formatDate(evaluation.evaluationDate)} · Evaluator {evaluation.evaluator || "—"}</p>
            <p className="mt-3 line-clamp-6 whitespace-pre-wrap text-sm text-ink">{evaluation.generalNotes || "—"}</p>
          </div>
        </> : <p className="px-6 pb-6 text-sm text-ink-3">Belum ada penilaian kinerja untuk periode ini.</p>}
      </Card>
      <Card title="Competency gap" testId="competency-gap" actions={<SourceLink href={`/competency/${employee.id}`} />}>
        {gap?.findings.length ? <ul className="space-y-2.5">{gap.findings.map((item) => <li key={item.requirementId} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{item.competencyName} <span className="text-ink-3">· level {item.actualLevel ?? "—"} / min. {item.requiredLevel}</span></span><StatusBadge status={item.status} /></li>)}</ul>
          : <p className="text-sm text-ink-3">Belum ada persyaratan untuk posisi ini.</p>}
      </Card>
      <Card title="Development & training" actions={<SourceLink href="/development" />}>
        {needs.length ? <ul className="space-y-3">{needs.map((need) => {
          const linked = employeeTraining.filter((item) => item.developmentNeedId === need.needId);
          return <li key={need.needId} className="rounded-xl border border-line p-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><Link href={`/development/${need.needId}`} data-testid={`dev-need-${need.needId}`} className="text-sm font-semibold hover:text-primary-600 hover:underline">{need.objective}</Link><StatusBadge status={need.status} /></div>
            <p className="mt-1.5 text-xs text-ink-3">{linked.length ? linked.map((item) => `${item.activity} (${statusLabel(item.status)}, ${formatDate(item.date)})`).join(" · ") : "Belum ada training"}</p>
          </li>;
        })}</ul> : <p className="text-sm text-ink-3">Belum ada development requirement.</p>}
      </Card>
    </div>
  </>;
}
