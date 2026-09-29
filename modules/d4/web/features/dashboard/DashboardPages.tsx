"use client";

import Link from "next/link";
import { ArrowUpRight, GraduationCap, Target, UserRound } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { EmployeeReference } from "../../../shared/types";
import { useSnapshot } from "../../data/D4DataProvider";
import { currentGap, departmentOf, developmentNeeds, employeeById, evaluationsOf, formatDate, formatPeriod, formatScore, includesText, latestEvaluation, latestScorecard, positionOf, scorecardsOf, trainings, visibleEmployees } from "../../data/selectors";
import { DataTable, PersonCell } from "../../ui/DataTable";
import { FilterBar, SearchInput, SelectFilter } from "../../ui/forms";
import { DetailHeader, NotFound, PageHeader } from "../../ui/layout";
import { RowActionMenu } from "../../ui/RowActionMenu";
import { Card, MetricCard, StatusBadge } from "../../ui/primitives";
import { weighted } from "../kpi/KpiFormModal";

const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

type Row = { employee: EmployeeReference; position: string; kpi: number | null; kpiPeriod?: string; performance: number | null; performancePeriod?: string; gap: string; gaps: number; openNeeds: number; training?: string };

/**
 * Dashboard KPI Orang (FR-D4-006): a read-only summary of the other five features.
 * It reads the same snapshot as the detail pages, creates no data of its own, and shows
 * no achieved / not-achieved label because no official threshold exists yet.
 */
export function DashboardPage() {
  const snapshot = useSnapshot();
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("");
  const [period, setPeriod] = useState("");
  const periods = useMemo(() => [...new Set([...(snapshot.kpiAssessments ?? []), ...snapshot.performance].map((item) => item.period))].sort().reverse(), [snapshot]);

  const rows = useMemo<Row[]>(() => visibleEmployees(snapshot).map((employee) => {
    const scorecard = period ? scorecardsOf(snapshot, employee.id).find((item) => item.period === period && item.status === "completed") : scorecardsOf(snapshot, employee.id).find((item) => item.status === "completed");
    const evaluation = period ? evaluationsOf(snapshot, employee.id).find((item) => item.period === period && item.status === "completed") : evaluationsOf(snapshot, employee.id).find((item) => item.status === "completed");
    const gap = currentGap(snapshot, employee);
    const employeeTraining = trainings(snapshot).filter((item) => item.employeeId === employee.id);
    return {
      employee, position: positionOf(snapshot, employee)?.title ?? "—",
      kpi: scorecard?.overallScore ?? null, kpiPeriod: scorecard?.period,
      performance: evaluation?.overallScore ?? null, performancePeriod: evaluation?.period,
      gap: gap?.overallStatus ?? "Belum Ada Persyaratan", gaps: gap?.findings.filter((item) => item.status === "Gap").length ?? 0,
      openNeeds: developmentNeeds(snapshot).filter((item) => item.employeeId === employee.id && item.status !== "Completed").length,
      training: employeeTraining[0]?.status,
    };
  }).filter((row) => includesText(`${row.employee.fullName} ${row.employee.employeeId}`, search) && (!position || row.employee.positionId === position))
    .sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName)), [snapshot, search, position, period]);

  const kpiAvg = average(rows.flatMap((row) => row.kpi === null ? [] : [row.kpi]));
  const perfAvg = average(rows.flatMap((row) => row.performance === null ? [] : [row.performance]));
  const ids = new Set(rows.map((row) => row.employee.id));
  const activeTraining = trainings(snapshot).filter((item) => ids.has(item.employeeId) && item.status === "In Progress").length;

  return <>
    <PageHeader title="People Dashboard" subtitle="Ringkasan KPI, performance, competency gap, development, dan training per employee (FR-D4-006). Setiap angka dapat dibuka ke sumbernya." />
    <FilterBar canReset={Boolean(search || position || period)} onReset={() => { setSearch(""); setPosition(""); setPeriod(""); }}>
      <SearchInput value={search} onChange={setSearch} placeholder="Search employee name or ID" />
      <SelectFilter label="All positions" value={position} onChange={setPosition} options={snapshot.reference.positions.map((item) => ({ value: item.id, label: item.title }))} />
      <SelectFilter label="Latest period" value={period} onChange={setPeriod} options={periods.map((item) => ({ value: item, label: formatPeriod(item) }))} />
    </FilterBar>
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
      <MetricCard label="Employees" value={String(rows.length)} helper="Sesuai filter" />
      <MetricCard label="Avg KPI total" value={formatScore(kpiAvg)} helper={`${rows.filter((row) => row.kpi !== null).length} scorecard selesai`} href="/kpi" />
      <MetricCard label="Avg performance" value={formatScore(perfAvg)} helper={`${rows.filter((row) => row.performance !== null).length} evaluasi selesai`} href="/performance" />
      <MetricCard label="Open gaps" value={String(rows.reduce((sum, row) => sum + row.gaps, 0))} helper="Requirement di bawah level" href="/competency" />
      <MetricCard label="Open development" value={String(rows.reduce((sum, row) => sum + row.openNeeds, 0))} helper="Belum Completed" href="/development" />
      <MetricCard label="Training in progress" value={String(activeTraining)} href="/training" />
    </div>
    <DataTable<Row> rows={rows} noun="employees" rowKey={(row) => row.employee.id} rowHref={(row) => `/dashboard/employee/${row.employee.id}`}
      emptyTitle="Tidak ada employee yang cocok" emptyText="Ubah kata kunci atau reset filter."
      columns={[
        { key: "employee", header: "Employee", cell: (row) => <PersonCell name={row.employee.fullName} code={row.employee.employeeId} /> },
        { key: "position", header: "Position", wrap: true, cell: (row) => row.position },
        { key: "kpi", header: "KPI total", className: "tabular-nums", cell: (row) => <ScoreCell score={row.kpi} period={row.kpiPeriod} /> },
        { key: "performance", header: "Performance", className: "tabular-nums", cell: (row) => <ScoreCell score={row.performance} period={row.performancePeriod} /> },
        { key: "gap", header: "Competency", cell: (row) => <StatusBadge status={row.gap} /> },
        { key: "needs", header: "Open dev.", className: "tabular-nums", cell: (row) => row.openNeeds || "—" },
        { key: "training", header: "Training", cell: (row) => row.training ? <StatusBadge status={row.training} /> : "—" },
      ]}
      actions={(row) => <RowActionMenu label={`Aksi untuk ${row.employee.fullName}`} actions={[
        { label: "Open Employee Profile", icon: <UserRound />, href: `/dashboard/employee/${row.employee.id}` },
        { label: "View KPI", icon: <Target />, href: `/kpi/history/${row.employee.id}` },
        { label: "View Trainings", icon: <GraduationCap />, href: `/training` },
      ]} />} />
  </>;
}

/** Score with the period it comes from, so an unfiltered table never mixes periods silently. */
function ScoreCell({ score, period }: { score: number | null; period?: string }) {
  return <><span className="font-semibold text-ink">{formatScore(score)}</span>{period && <span className="block text-xs text-ink-3">{formatPeriod(period)}</span>}</>;
}

function SourceLink({ href, children = "View source" }: { href: string; children?: ReactNode }) {
  return <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:underline">{children}<ArrowUpRight aria-hidden="true" className="size-4" /></Link>;
}

export function EmployeeProfilePage({ employeeId }: { employeeId: string }) {
  const snapshot = useSnapshot();
  const employee = employeeById(snapshot, employeeId);
  if (!employee || !visibleEmployees(snapshot).some((item) => item.id === employeeId)) return <NotFound what="Employee" backHref="/dashboard" backLabel="Kembali ke People Dashboard" />;
  const scorecard = latestScorecard(snapshot, employee.id);
  const evaluation = latestEvaluation(snapshot, employee.id);
  const gap = currentGap(snapshot, employee);
  const needs = developmentNeeds(snapshot).filter((item) => item.employeeId === employee.id);
  const employeeTraining = trainings(snapshot).filter((item) => item.employeeId === employee.id);

  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "People Dashboard", href: "/dashboard" }, { label: "Employee" }]} backHref="/dashboard"
      name={employee.fullName} meta={[positionOf(snapshot, employee)?.title ?? "", employee.employeeId, departmentOf(snapshot, employee)?.name ?? ""]} />
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
      <MetricCard label="KPI total" value={formatScore(scorecard?.overallScore)} helper={scorecard ? `${scorecard.roleName} · ${formatPeriod(scorecard.period)}` : "Belum ada scorecard"} href={scorecard ? `/kpi/${scorecard.id}` : `/kpi/history/${employee.id}`} />
      <MetricCard label="Performance" value={formatScore(evaluation?.overallScore)} helper={evaluation ? `${evaluation.reviewStatus} · ${formatPeriod(evaluation.period)}` : "Belum ada evaluasi"} href={evaluation ? `/performance/${evaluation.id}` : `/performance/history/${employee.id}`} />
      <MetricCard label="Open gaps" value={String(gap?.findings.filter((item) => item.status === "Gap").length ?? 0)} helper={gap ? `${gap.findings.length} requirement` : "Belum ada position"} href={`/competency/${employee.id}`} />
      <MetricCard label="Training" value={String(employeeTraining.length)} helper={`${employeeTraining.filter((item) => item.status === "Completed").length} completed`} href="/training" />
    </div>
    <div className="grid gap-6 xl:grid-cols-2">
      <Card title="KPI scorecard" actions={<SourceLink href={scorecard ? `/kpi/${scorecard.id}` : `/kpi/history/${employee.id}`} />} padded={false}>
        {scorecard ? <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-app text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3"><tr><th className="px-5 py-2.5">Core KPI</th><th className="px-5 py-2.5">Bobot</th><th className="px-5 py-2.5">Target</th><th className="px-5 py-2.5">Realisasi</th><th className="px-5 py-2.5">Skor</th><th className="px-5 py-2.5 text-right">Terbobot</th></tr></thead>
          <tbody>{scorecard.lines.map((line) => <tr key={line.indicator_order} className="border-t border-line"><td className="px-5 py-2.5 font-semibold">{line.kpi_name}</td><td className="px-5 py-2.5 tabular-nums">{line.weight_percent}%</td><td className="px-5 py-2.5">{line.target || "—"}</td><td className="px-5 py-2.5">{line.actual || "—"}</td><td className="px-5 py-2.5 tabular-nums">{line.raw_score ?? "—"}</td><td className="px-5 py-2.5 text-right tabular-nums">{weighted(line)?.toFixed(2) ?? "—"}</td></tr>)}</tbody>
          <tfoot className="border-t border-line bg-app"><tr><td colSpan={5} className="px-5 py-2.5 font-semibold">Total ({formatPeriod(scorecard.period)})</td><td className="px-5 py-2.5 text-right font-display tabular-nums">{formatScore(scorecard.overallScore)}</td></tr></tfoot>
        </table></div> : <p className="px-6 pb-6 text-sm text-ink-3">Belum ada KPI scorecard.</p>}
      </Card>
      <Card title="Performance evaluation" actions={<SourceLink href={evaluation ? `/performance/${evaluation.id}` : `/performance/history/${employee.id}`} />}>
        {evaluation ? <><p className="font-display text-2xl text-ink">{formatScore(evaluation.overallScore)}</p><p className="mt-1 text-sm text-ink-2">{formatPeriod(evaluation.period)} · Evaluator {evaluation.evaluator || "—"}</p><div className="mt-3"><StatusBadge status={evaluation.reviewStatus} /></div><p className="mt-4 line-clamp-3 text-sm text-ink-2">{evaluation.generalNotes || "—"}</p></>
          : <p className="text-sm text-ink-3">Belum ada evaluasi kinerja.</p>}
      </Card>
      <Card title="Competency gap" actions={<SourceLink href={`/competency/${employee.id}`} />}>
        {gap?.findings.length ? <ul className="space-y-2.5">{gap.findings.map((item) => <li key={item.requirementId} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{item.competencyName} <span className="text-ink-3">· level {item.actualLevel ?? "—"} / min. {item.requiredLevel}</span></span><StatusBadge status={item.status} /></li>)}</ul>
          : <p className="text-sm text-ink-3">Belum ada requirement untuk position ini.</p>}
      </Card>
      <Card title="Development & training" actions={<SourceLink href="/development" />}>
        {needs.length ? <ul className="space-y-3">{needs.map((need) => {
          const linked = employeeTraining.filter((item) => item.developmentNeedId === need.needId);
          return <li key={need.needId} className="rounded-xl border border-line p-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><Link href={`/development/${need.needId}`} className="text-sm font-semibold hover:text-primary-600 hover:underline">{need.objective}</Link><StatusBadge status={need.status} /></div>
            <p className="mt-1.5 text-xs text-ink-3">{linked.length ? linked.map((item) => `${item.activity} (${item.status}, ${formatDate(item.date)})`).join(" · ") : "Belum ada training"}</p>
          </li>;
        })}</ul> : <p className="text-sm text-ink-3">Belum ada development requirement.</p>}
      </Card>
    </div>
  </>;
}
