"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ACTIVE_KPI_VERSION, indicatorsFor, roleForPositionTitle } from "../../../kpi/catalog";
import type { KpiAssessmentLine } from "../../../supabase/types";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { latestForPeriod } from "../../../shared/rules";
import { assessableEmployees, departmentOf, employeeById, formatDate, positionOf, SCORE_LABELS, thisMonth, today } from "../../data/selectors";
import { FormError, FormModal, ModalActions, ReadOnlyField, RevisionConfirm, SearchSelectField, TextAreaField, TextField } from "../../ui/forms";
import { cx, Notice } from "../../ui/primitives";

/** FR-02.11: positions without a KPI role in the catalog get no scorecard; no mapping is invented for them. */
export const noKpiText = (version = ACTIVE_KPI_VERSION) => `This position has no KPI in catalog ${version} yet — contact HR.`;

const validScore = (value: number | null) => value !== null && Number.isInteger(value) && value >= 1 && value <= 5;

/** Weighted = weight × raw score (FR-02.5); total = Σ weighted (FR-02.6). Target/realisation never produce the raw score (FR-02.12). */
export function weighted(line: Pick<KpiAssessmentLine, "weight_percent" | "raw_score">) {
  return validScore(line.raw_score) ? line.weight_percent * (line.raw_score ?? 0) / 100 : null;
}

export function KpiFormModal({ employeeId, onClose, onSaved }: { employeeId?: string; onClose: () => void; onSaved?: (id: string) => void }) {
  const snapshot = useSnapshot();
  const { catalog, run, busy } = useD4();
  const actor = employeeById(snapshot, snapshot.actorEmployeeId);
  const suggest = (id: string) => catalog ? roleForPositionTitle(catalog, positionOf(snapshot, employeeById(snapshot, id))?.title) : 0;
  const linesFor = (roleOrder: number): KpiAssessmentLine[] => catalog ? indicatorsFor(catalog, roleOrder).map((row) => ({
    indicator_order: row.indicator_order, kpi_name: row.kpi_name, weight_percent: row.weight_percent, target: row.target ?? "", actual: "", raw_score: null, comment: "",
  })) : [];

  const [employee, setEmployee] = useState(employeeId ?? "");
  const [roleOrder, setRoleOrder] = useState(() => employeeId ? suggest(employeeId) : 0);
  const [lines, setLines] = useState<KpiAssessmentLine[]>(() => linesFor(employeeId ? suggest(employeeId) : 0));
  const [period, setPeriod] = useState(thisMonth());
  const [date, setDate] = useState(today());
  // The evaluator is the signed-in user; the server stores that name and ignores the form value.
  const evaluator = actor?.fullName ?? "";
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [revise, setRevise] = useState(false);
  const existing = employee && period ? latestForPeriod(snapshot.kpiAssessments ?? [], employee, period) : undefined;

  const totalWeight = lines.reduce((sum, line) => sum + line.weight_percent, 0);
  const allScored = lines.length === 5 && lines.every((line) => validScore(line.raw_score));
  const total = allScored ? Math.round(lines.reduce((sum, line) => sum + (weighted(line) ?? 0), 0) * 100) / 100 : null;
  const selected = employeeById(snapshot, employee);
  const position = positionOf(snapshot, selected);
  const roleName = roleOrder && catalog ? indicatorsFor(catalog, roleOrder)[0]?.role_name : undefined;

  function chooseEmployee(id: string) { setEmployee(id); const role = suggest(id); setRoleOrder(role); setLines(linesFor(role)); }
  function setLine(index: number, patch: Partial<KpiAssessmentLine>) { setLines((items) => items.map((line, at) => at === index ? { ...line, ...patch } : line)); }

  // FR-02.1/FR-02.11: the KPI set follows the employee's position; HR cannot pick another position's KPI.
  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!employee) { setError("Complete employee before saving."); return; }
    if (!roleOrder || lines.length !== 5 || totalWeight !== 100) { setError("KPIs for this position are not available in the KPI Scorecard yet; the scorecard cannot be saved."); return; }
    if (lines.some((line) => !line.kpi_name.trim())) { setError("Every Core KPI needs a name."); return; }
    if (!allScored || !period || !date) { setError("Complete the period, evaluation date, and a 1–5 score for all five KPIs."); return; }
    if (date > today()) { setError("The evaluation date cannot be later than today."); return; }
    if (existing && !revise) { setError("A scorecard for this period already exists. Tick “Save as revision” or choose another period."); return; }
    setError("");
    const result = await run((source) => source.createKpiAssessment({ employeeId: employee, roleOrder, period, evaluationDate: date, evaluatorName: evaluator, status: "completed", lines, generalNotes: notes, revisionOf: existing?.id ?? null }),
      "KPI scorecard saved.");
    if (result.ok) { onSaved?.(result.value); onClose(); } else setError(result.error);
  }

  return <FormModal size="lg" title="Add Scorecard" description={`The five Core KPIs start from KPI Scorecard ${catalog?.version ?? ""} for the employee's position and can be renamed; weights stay as in the catalog.`} onClose={onClose}
    footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save Scorecard" disabled={Boolean(employee) && !lines.length} />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-3">
        <SearchSelectField label="Employee" testId="employee" required value={employee} onChange={(value) => chooseEmployee(value)} error={touched && !employee ? "Employee is required." : undefined} className="sm:col-span-2" placeholder="Select employee"
          options={assessableEmployees(snapshot).map((item) => ({ value: item.id, label: `${item.fullName} · ${item.employeeId}` }))} />
        <TextField label="Period" testId="period" required type="month" value={period} onChange={(event) => setPeriod(event.target.value)} error={touched && !period ? "Period is required." : undefined} />
        <ReadOnlyField label="Position" testId="position" value={position?.title ?? "—"} />
        <ReadOnlyField label="Department" testId="department" value={departmentOf(snapshot, selected)?.name ?? "—"} />
        <ReadOnlyField label="Position KPI" testId="kpi-jabatan" value={!employee ? "—" : roleName ?? `Not in catalog ${catalog?.version ?? ACTIVE_KPI_VERSION} yet`} />
        <TextField label="Evaluation date" testId="evaluation-date" required type="date" max={today()} value={date} onChange={(event) => setDate(event.target.value)} error={touched && !date ? "Date is required." : touched && date > today() ? "Cannot be later than today." : undefined} />
        <ReadOnlyField label="Evaluator" testId="evaluator" value={evaluator || "—"} className="sm:col-span-2" />
      </div>
      {existing && <RevisionConfirm what="Scorecard" existing={`${existing.evaluatorName}, ${formatDate(existing.evaluationDate)}`} checked={revise} onChange={setRevise}
        error={touched && !revise ? "Tick to save as a revision, or choose another period." : undefined} />}

      {employee && !lines.length ? <Notice tone="warning">{position ? noKpiText(catalog?.version) : "The employee has no active position, so their KPIs cannot be determined yet."}</Notice> : <div className="overflow-x-auto rounded-2xl border border-line">
        <table data-testid="kpi-lines-table" className="w-full text-left text-sm max-md:block md:min-w-[1100px]">
          <thead className="bg-app text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3 max-md:hidden">
            <tr><th className="w-10 px-3 py-2.5">No</th><th className="min-w-[260px] px-3 py-2.5">Core KPI</th><th className="w-20 px-3 py-2.5">Weight</th><th className="w-36 px-3 py-2.5">Target</th><th className="w-36 px-3 py-2.5">Actual</th><th className="w-24 px-3 py-2.5">Score 1–5</th><th className="w-24 px-3 py-2.5 text-right">Weighted</th><th className="w-44 px-3 py-2.5">Comment</th></tr>
          </thead>
          <tbody className="max-md:block">
            {lines.map((line, index) => <tr key={`${roleOrder}-${line.indicator_order}`} data-testid={`kpi-line-${line.indicator_order}`} className="border-t border-line align-middle max-md:grid max-md:grid-cols-2 max-md:gap-3 max-md:p-4">
              <td data-label="No" className="px-3 py-2.5 text-ink-3 max-md:p-0 max-md:before:mb-1 max-md:before:block max-md:before:text-[11px] max-md:before:font-semibold max-md:before:uppercase max-md:before:tracking-[0.04em] max-md:before:text-ink-3 max-md:before:content-[attr(data-label)]">{line.indicator_order}</td>
              <td data-label="Core KPI" className="px-3 py-2 max-md:p-0 max-md:before:mb-1 max-md:before:block max-md:before:text-[11px] max-md:before:font-semibold max-md:before:uppercase max-md:before:tracking-[0.04em] max-md:before:text-ink-3 max-md:before:content-[attr(data-label)] max-md:col-span-2"><input data-testid={`input-core-kpi-${line.indicator_order}`} aria-label={`Core KPI ${line.indicator_order}`} aria-invalid={touched && !line.kpi_name.trim()} maxLength={200} value={line.kpi_name} onChange={(event) => setLine(index, { kpi_name: event.target.value })} className="h-9 w-full rounded-lg border border-line-strong px-2 text-sm font-semibold aria-[invalid=true]:border-danger" /></td>
              <td data-label="Weight" className="px-3 py-2.5 tabular-nums max-md:p-0 max-md:before:mb-1 max-md:before:block max-md:before:text-[11px] max-md:before:font-semibold max-md:before:uppercase max-md:before:tracking-[0.04em] max-md:before:text-ink-3 max-md:before:content-[attr(data-label)]">{line.weight_percent}%</td>
              <td data-label="Target" className="px-3 py-2 max-md:p-0 max-md:before:mb-1 max-md:before:block max-md:before:text-[11px] max-md:before:font-semibold max-md:before:uppercase max-md:before:tracking-[0.04em] max-md:before:text-ink-3 max-md:before:content-[attr(data-label)]"><input data-testid={`input-target-${line.indicator_order}`} aria-label={`Target ${line.kpi_name}`} value={line.target} onChange={(event) => setLine(index, { target: event.target.value })} className="h-9 w-full rounded-lg border border-line-strong px-2 text-sm" /></td>
              <td data-label="Actual" className="px-3 py-2 max-md:p-0 max-md:before:mb-1 max-md:before:block max-md:before:text-[11px] max-md:before:font-semibold max-md:before:uppercase max-md:before:tracking-[0.04em] max-md:before:text-ink-3 max-md:before:content-[attr(data-label)]"><input data-testid={`input-realisasi-${line.indicator_order}`} aria-label={`Actual ${line.kpi_name}`} value={line.actual} onChange={(event) => setLine(index, { actual: event.target.value })} className="h-9 w-full rounded-lg border border-line-strong px-2 text-sm" /></td>
              <td data-label="Score 1–5" className="px-3 py-2 max-md:p-0 max-md:before:mb-1 max-md:before:block max-md:before:text-[11px] max-md:before:font-semibold max-md:before:uppercase max-md:before:tracking-[0.04em] max-md:before:text-ink-3 max-md:before:content-[attr(data-label)]"><select data-testid={`input-skor-${line.indicator_order}`} aria-label={`Score ${line.kpi_name}`} aria-invalid={touched && !validScore(line.raw_score)} value={line.raw_score ?? ""} onChange={(event) => setLine(index, { raw_score: event.target.value ? Number(event.target.value) : null })} className="h-9 w-full rounded-lg border border-line-strong px-2 text-sm aria-[invalid=true]:border-danger"><option value="">—</option>{[1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}</select></td>
              <td data-label="Weighted" className="px-3 py-2.5 text-right font-semibold tabular-nums max-md:p-0 max-md:before:mb-1 max-md:before:block max-md:before:text-[11px] max-md:before:font-semibold max-md:before:uppercase max-md:before:tracking-[0.04em] max-md:before:text-ink-3 max-md:before:content-[attr(data-label)] max-md:text-left">{weighted(line)?.toFixed(2) ?? "—"}</td>
              <td data-label="Comment" className="px-3 py-2 max-md:p-0 max-md:before:mb-1 max-md:before:block max-md:before:text-[11px] max-md:before:font-semibold max-md:before:uppercase max-md:before:tracking-[0.04em] max-md:before:text-ink-3 max-md:before:content-[attr(data-label)] max-md:col-span-2"><input data-testid={`input-komentar-${line.indicator_order}`} aria-label={`Comment ${line.kpi_name}`} maxLength={500} value={line.comment} onChange={(event) => setLine(index, { comment: event.target.value })} className="h-9 w-full rounded-lg border border-line-strong px-2 text-sm" /></td>
            </tr>)}
          </tbody>
          <tfoot className="border-t border-line bg-app max-md:block">
            <tr className="max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-x-3"><td colSpan={2} className="px-3 py-3 font-semibold">Total</td>
              <td className="px-3 py-3"><span className={cx("inline-flex items-center gap-1 text-xs font-semibold", totalWeight === 100 ? "text-success" : "text-danger")}>{totalWeight === 100 ? <CheckCircle2 className="size-3.5" /> : <CircleAlert className="size-3.5" />}{lines.length ? `${totalWeight}%` : "—"}</span></td>
              <td colSpan={3} className="px-3 py-3 text-xs text-ink-3">{lines.length ? (totalWeight === 100 ? "Total bobot 100%" : "Total bobot harus 100%") : "Pilih pegawai untuk menampilkan KPI posisinya."}</td>
              <td className="px-3 py-3 text-right font-display font-semibold text-base tabular-nums">{total === null ? "—" : `${total.toFixed(2)} / 5`}</td><td /></tr>
          </tfoot>
        </table>
      </div>}
      <p className="text-xs text-ink-3">Kriteria skor: {[1, 2, 3, 4, 5].map((value) => `${value} ${SCORE_LABELS[value]}`).join(" · ")}. Skor terbobot = bobot × skor mentah; total = jumlah skor terbobot. Penilai mengisi skor mentah; sistem tidak mengubah realisasi menjadi skor dan tidak memberi label tercapai/tidak tercapai.</p>
      <TextAreaField label="Notes / manager recommendation" testId="catatan-rekomendasi-atasan" value={notes} onChange={(event) => setNotes(event.target.value)} />
    </form>
  </FormModal>;
}
