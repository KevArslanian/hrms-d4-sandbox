"use client";

import { ClipboardCheck, History, Plus } from "lucide-react";
import { useState } from "react";
import { catalogFor } from "../../../kpi/catalog";
import type { KpiAssessment } from "../../../supabase/types";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { canAssess, employeeById, employeeMeta, evaluationsOf, formatDate, formatPeriod, formatScore, thisMonth } from "../../data/selectors";
import { DetailHeader, NotFound } from "../../ui/layout";
import { Button, ButtonLink, Card, InfoGrid, Notice, SourceChip } from "../../ui/primitives";
import { KpiFormModal, weighted } from "./KpiFormModal";

export const scorecardStatus = (item?: KpiAssessment) => !item ? "Not Evaluated" : item.status === "completed" ? "Completed" : "Draft";

export function CatalogNotice() {
  const { catalog } = useD4();
  if (!catalog || catalogFor(catalog, thisMonth())) return null;
  return <Notice tone="warning">Belum ada katalog KPI yang berlaku untuk bulan ini. HR perlu menetapkan versi katalog dan periode mulai berlakunya.</Notice>;
}

export function KpiDetailPage({ id }: { id: string }) {
  const snapshot = useSnapshot();
  const [adding, setAdding] = useState(false);
  const scorecard = (snapshot.kpiAssessments ?? []).find((item) => item.id === id);
  const employee = scorecard && employeeById(snapshot, scorecard.employeeId);
  if (!scorecard || !employee) return <NotFound what="KPI scorecard" backHref="/performance" backLabel="Back to Performance & KPI" />;
  const evaluation = evaluationsOf(snapshot, employee.id).find((item) => item.period === scorecard.period);
  const totalWeight = scorecard.lines.reduce((sum, line) => sum + line.weight_percent, 0);
  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "Performance & KPI", href: "/performance" }, { label: "KPI Scorecard" }]} backHref={`/performance/history/${employee.id}`}
      name={employee.fullName} meta={[...employeeMeta(snapshot, employee), `Period ${formatPeriod(scorecard.period)}`]} status={scorecardStatus(scorecard)}
      actions={<><ButtonLink href={`/performance/history/${employee.id}`} icon={<History className="size-4" />} testId="view-history">View History</ButtonLink>
        <ButtonLink href={evaluation ? `/performance/${evaluation.id}` : `/performance/history/${employee.id}`} icon={<ClipboardCheck className="size-4" />} testId="open-evaluation">Evaluation</ButtonLink>
        {canAssess(snapshot, employee.id) && <Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)} data-testid="btn-add-scorecard">Add Scorecard</Button>}</>} />
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
          <p className="mt-5 text-xs text-ink-3">Total = Σ (bobot × skor mentah). Belum ada label tercapai/tidak tercapai karena belum ada batas resmi.</p>
        </Card>
        <Card title="Notes & related" testId="notes-related">
          <p className="whitespace-pre-wrap text-sm text-ink-2">{scorecard.generalNotes || "Belum ada catatan."}</p>
          <div className="mt-4">{evaluation ? <SourceChip label="Performance Evaluation" reference={formatPeriod(evaluation.period)} href={`/performance/${evaluation.id}`} /> : <p className="text-xs text-ink-3">Belum ada evaluasi performance untuk periode ini.</p>}</div>
        </Card>
      </div>
    </div>
    {adding && <KpiFormModal employeeId={employee.id} onClose={() => setAdding(false)} />}
  </>;
}
