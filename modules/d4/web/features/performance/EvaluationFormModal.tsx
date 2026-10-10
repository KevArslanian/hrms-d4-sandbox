"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ACTIVE_KPI_VERSION, indicatorsFor, kpiTotal, roleForPositionTitle, weighted } from "../../../kpi/catalog";
import type { KpiAssessmentLine } from "../../../supabase/types";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { latestForPeriod } from "../../../shared/rules";
import { assessableEmployees, departmentOf, employeeById, formatDate, positionOf, SCORE_LABELS, thisMonth, today } from "../../data/selectors";
import { FormError, FormModal, ModalActions, ReadOnlyField, RevisionConfirm, SearchSelectField, TextAreaField, TextField } from "../../ui/forms";
import { cx, Notice } from "../../ui/primitives";

/** FR-01.16: positions without a KPI role in the catalog cannot be assessed; no mapping is invented for them. */
export const noKpiText = (version = ACTIVE_KPI_VERSION) => `Posisi ini belum memiliki KPI di katalog ${version} — hubungi HR.`;

const validScore = (value: number | null) => value !== null && Number.isInteger(value) && value >= 1 && value <= 5;
// Mobile: each KPI row becomes a card with the column name above every value.
const cell = "px-3 py-2 max-md:p-0 max-md:before:mb-1 max-md:before:block max-md:before:text-[11px] max-md:before:font-semibold max-md:before:uppercase max-md:before:tracking-[0.04em] max-md:before:text-ink-3 max-md:before:content-[attr(data-label)]";
const input = "h-9 w-full rounded-lg border border-line-strong px-2 text-sm aria-[invalid=true]:border-danger";

/**
 * Penilaian Kinerja (FR-D4-001 v3.0): one form, one Save button. The five Core KPI and their weights come
 * read-only from the catalog role of the employee's position; the evaluator fills target, actual, a 1–5 score
 * and an optional comment per KPI, then the required evaluation notes. The result is the Total KPI
 * (Σ weight × score); there is no separate evaluation score and no automatic HR decision.
 */
export function EvaluationFormModal({ employeeId, onClose, onSaved }: { employeeId?: string; onClose: () => void; onSaved?: (id: string) => void }) {
  const snapshot = useSnapshot();
  const { catalog, run, busy } = useD4();
  const actor = employeeById(snapshot, snapshot.actorEmployeeId);
  const roleOf = (id: string) => catalog ? roleForPositionTitle(catalog, positionOf(snapshot, employeeById(snapshot, id))?.title) : 0;
  const linesFor = (id: string): KpiAssessmentLine[] => catalog && id ? indicatorsFor(catalog, roleOf(id)).map((row) => ({
    indicator_order: row.indicator_order, kpi_name: row.kpi_name, weight_percent: row.weight_percent, target: row.target ?? "", actual: "", raw_score: null, comment: "",
  })) : [];

  const [employee, setEmployee] = useState(employeeId ?? "");
  const [lines, setLines] = useState<KpiAssessmentLine[]>(() => linesFor(employeeId ?? ""));
  const [period, setPeriod] = useState(thisMonth());
  const [date, setDate] = useState(today());
  // The evaluator is the signed-in user; the server stores that name and ignores the form value.
  const evaluator = actor?.fullName ?? "";
  const [notes, setNotes] = useState("");
  const [evidence, setEvidence] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [revise, setRevise] = useState(false);
  const selected = employeeById(snapshot, employee);
  const position = positionOf(snapshot, selected);
  const roleName = catalog && employee ? indicatorsFor(catalog, roleOf(employee))[0]?.role_name : undefined;
  const existing = employee && period ? latestForPeriod(snapshot.performance, employee, period) : undefined;
  const totalWeight = lines.reduce((sum, line) => sum + line.weight_percent, 0);
  const total = kpiTotal(lines);

  function chooseEmployee(id: string) { setEmployee(id); setLines(linesFor(id)); }
  function setLine(index: number, patch: Partial<KpiAssessmentLine>) { setLines((items) => items.map((line, at) => at === index ? { ...line, ...patch } : line)); }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!employee) { setError("Lengkapi employee sebelum menyimpan."); return; }
    if (lines.length !== 5 || totalWeight !== 100) { setError("KPI untuk posisi ini belum tersedia di katalog, jadi penilaian tidak dapat disimpan."); return; }
    const missing = [!period && "period", !date && "evaluation date", date > today() && "tanggal yang tidak melebihi hari ini", total === null && "skor 1–5 untuk kelima KPI", !notes.trim() && "catatan evaluasi", existing && !revise && "konfirmasi revisi"].filter(Boolean);
    if (missing.length) { setError(`Lengkapi ${missing.join(", ")} sebelum menyimpan.`); return; }
    setError("");
    const result = await run((source) => source.createEvaluation({
      employeeId: employee, period, evaluationDate: date, status: "completed", lines,
      generalNotes: notes, evidenceReference: evidence.trim() || null, revisionOf: existing?.id ?? null,
    }), "Penilaian kinerja tersimpan.");
    if (result.ok) { onSaved?.(result.value); onClose(); } else setError(result.error);
  }

  return <FormModal size="lg" title="Add Evaluation" description={`Satu penilaian berisi lima Core KPI sesuai posisi (KPI Scorecard ${catalog?.version ?? ACTIVE_KPI_VERSION}) dan catatan evaluasi. Hasilnya Total KPI; penilaian sebelumnya tidak pernah ditimpa.`} onClose={onClose}
    footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save" disabled={Boolean(employee) && !lines.length} />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-3">
        <SearchSelectField label="Employee" testId="employee" required value={employee} onChange={chooseEmployee} error={touched && !employee ? "Employee wajib diisi." : undefined} className="sm:col-span-2" placeholder="Select employee"
          options={assessableEmployees(snapshot).map((item) => ({ value: item.id, label: `${item.fullName} · ${item.employeeId}` }))} />
        <TextField label="Period" testId="period" required type="month" value={period} onChange={(event) => setPeriod(event.target.value)} error={touched && !period ? "Period wajib diisi." : undefined} />
        <ReadOnlyField label="Position" testId="position" value={position?.title ?? "—"} />
        <ReadOnlyField label="Department" testId="department" value={departmentOf(snapshot, selected)?.name ?? "—"} />
        <ReadOnlyField label="Position KPI" testId="kpi-jabatan" value={!employee ? "—" : roleName ?? `Not in catalog ${catalog?.version ?? ACTIVE_KPI_VERSION} yet`} />
        <TextField label="Evaluation date" testId="evaluation-date" required type="date" max={today()} value={date} onChange={(event) => setDate(event.target.value)} error={touched && !date ? "Date wajib diisi." : touched && date > today() ? "Tidak boleh melebihi hari ini." : undefined} />
        <ReadOnlyField label="Evaluator" testId="evaluator" value={evaluator || "—"} className="sm:col-span-2" />
      </div>
      {existing && <RevisionConfirm what="Penilaian kinerja" existing={`${existing.evaluator}, ${formatDate(existing.evaluationDate)}`} checked={revise} onChange={setRevise}
        error={touched && !revise ? "Centang untuk menyimpan sebagai revisi, atau pilih periode lain." : undefined} />}

      {employee && !lines.length ? <Notice tone="warning">{position ? noKpiText(catalog?.version) : "Pegawai belum memiliki posisi aktif, jadi KPI-nya belum bisa ditentukan."}</Notice> : <div className="overflow-x-auto rounded-2xl border border-line">
        <table data-testid="kpi-lines-table" className="w-full text-left text-sm max-md:block md:min-w-[1060px]">
          <thead className="bg-app text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3 max-md:hidden">
            <tr><th className="w-10 px-3 py-2.5">No</th><th className="min-w-[240px] px-3 py-2.5">Core KPI</th><th className="w-20 px-3 py-2.5">Weight</th><th className="w-36 px-3 py-2.5">Target</th><th className="w-36 px-3 py-2.5">Actual</th><th className="w-24 px-3 py-2.5">Score 1–5</th><th className="w-24 px-3 py-2.5 text-right">Weighted</th><th className="w-44 px-3 py-2.5">Comment</th></tr>
          </thead>
          <tbody className="max-md:block">
            {lines.map((line, index) => <tr key={`${employee}-${line.indicator_order}`} data-testid={`kpi-line-${line.indicator_order}`} className="border-t border-line align-middle max-md:grid max-md:grid-cols-2 max-md:gap-3 max-md:p-4">
              <td data-label="No" className={cx(cell, "text-ink-3")}>{line.indicator_order}</td>
              <td data-label="Core KPI" data-testid={`core-kpi-${line.indicator_order}`} className={cx(cell, "font-semibold max-md:col-span-2")}>{line.kpi_name}</td>
              <td data-label="Weight" className={cx(cell, "tabular-nums")}>{line.weight_percent}%</td>
              <td data-label="Target" className={cell}><input data-testid={`input-target-${line.indicator_order}`} aria-label={`Target ${line.kpi_name}`} maxLength={200} value={line.target} onChange={(event) => setLine(index, { target: event.target.value })} className={input} /></td>
              <td data-label="Actual" className={cell}><input data-testid={`input-realisasi-${line.indicator_order}`} aria-label={`Actual ${line.kpi_name}`} maxLength={200} value={line.actual} onChange={(event) => setLine(index, { actual: event.target.value })} className={input} /></td>
              <td data-label="Score 1–5" className={cell}><select data-testid={`input-skor-${line.indicator_order}`} aria-label={`Score ${line.kpi_name}`} aria-invalid={touched && !validScore(line.raw_score)} value={line.raw_score ?? ""} onChange={(event) => setLine(index, { raw_score: event.target.value ? Number(event.target.value) : null })} className={input}><option value="">—</option>{[1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}</select></td>
              <td data-label="Weighted" className={cx(cell, "text-right font-semibold tabular-nums max-md:text-left")}>{weighted(line)?.toFixed(2) ?? "—"}</td>
              <td data-label="Comment" className={cx(cell, "max-md:col-span-2")}><input data-testid={`input-komentar-${line.indicator_order}`} aria-label={`Comment ${line.kpi_name}`} maxLength={500} value={line.comment} onChange={(event) => setLine(index, { comment: event.target.value })} className={input} /></td>
            </tr>)}
          </tbody>
          <tfoot className="border-t border-line bg-app max-md:block">
            <tr className="max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-x-3"><td colSpan={2} className="px-3 py-3 font-semibold">Total KPI</td>
              <td className="px-3 py-3"><span className={cx("inline-flex items-center gap-1 text-xs font-semibold", totalWeight === 100 ? "text-success" : "text-danger")}>{totalWeight === 100 ? <CheckCircle2 className="size-3.5" /> : <CircleAlert className="size-3.5" />}{lines.length ? `${totalWeight}%` : "—"}</span></td>
              <td colSpan={3} className="px-3 py-3 text-xs text-ink-3">{lines.length ? (totalWeight === 100 ? "Total bobot 100%" : "Total bobot harus 100%") : "Pilih pegawai untuk menampilkan KPI posisinya."}</td>
              <td data-testid="total-kpi" className="px-3 py-3 text-right font-display font-semibold text-base tabular-nums">{total === null ? "—" : `${total.toFixed(2)} / 5`}</td><td /></tr>
          </tfoot>
        </table>
      </div>}
      <p className="text-xs text-ink-3">Kriteria skor: {[1, 2, 3, 4, 5].map((value) => `${value} ${SCORE_LABELS[value]}`).join(" · ")}. Nama KPI dan bobot mengikuti katalog posisi dan tidak dapat diubah. Skor terbobot = bobot × skor; Total KPI = jumlah skor terbobot. Sistem tidak mengubah realisasi menjadi skor dan tidak memberi label tercapai/tidak tercapai.</p>
      <TextAreaField label="Evaluation notes" testId="catatan-evaluasi" required value={notes} onChange={(event) => setNotes(event.target.value)} error={touched && !notes.trim() ? "Catatan evaluasi wajib diisi." : undefined}
        helper="Kekuatan, hal yang perlu diperbaiki, dan rekomendasi pelatihan — bisa menjadi dasar Development Requirement." />
      <TextField label="Evidence / reference" testId="evidence-reference" maxLength={500} value={evidence} onChange={(event) => setEvidence(event.target.value)} helper="Opsional: nomor dokumen atau tautan bukti." />
    </form>
  </FormModal>;
}
