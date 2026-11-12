"use client";

import { useState, type FormEvent } from "react";
import { catalogFor, KPI_TARGET } from "../../../kpi/catalog";
import { finalizeDate, scorecardLinesFromDaily, type DailyCompilation } from "../../../kpi/daily";
import { performanceBand, scaleMaxOf } from "../../../kpi/scale";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { employeeById, formatDate, formatGap, formatPeriod, formatScore, thisMonth } from "../../data/selectors";
import { FormError, FormModal, ModalActions, ReadOnlyField, TextAreaField, TextField } from "../../ui/forms";
import { StatusBadge } from "../../ui/primitives";
import { COMPILED_RULE } from "../daily/entry";

/**
 * B6 (client: manual input per period is a step back): the period score is compiled from Daily KPI and HR only
 * finalizes it. Scores are read-only here; HR adds Notes and Reference (Q12) and saves it as the period's scorecard.
 * Adjusting a score stays possible through Add Performance Review.
 */
export function FinalizeDailyModal({ employeeId, period, compiled, onClose }: { employeeId: string; period: string; compiled: DailyCompilation; onClose: () => void }) {
  const snapshot = useSnapshot();
  const { catalog: catalogSet, run, busy } = useD4();
  const [notes, setNotes] = useState("");
  const [evidence, setEvidence] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const employee = employeeById(snapshot, employeeId);
  const catalog = catalogSet && catalogFor(catalogSet, period);
  const lines = catalog?.version === compiled.definitionVersion ? scorecardLinesFromDaily(catalog, compiled) : [];
  const max = scaleMaxOf(compiled.definitionVersion);
  const band = performanceBand(compiled.total, compiled.definitionVersion);
  const date = finalizeDate(period);
  // W2: entries saved after finalizing no longer count, so finalizing a month that is still running is confirmed first.
  const running = period === thisMonth();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (lines.length !== 5) { setError("KPI pegawai ini tidak lagi sesuai katalog periode ini. Pakai Add Performance Review."); return; }
    const missing = [!notes.trim() && ["Notes", "input-catatan-evaluasi"], !evidence.trim() && ["Reference", "input-evidence-reference"], running && !confirmed && ["konfirmasi periode berjalan", "checkbox-finalize-running"]].filter((item) => item !== false);
    if (missing.length) {
      setError(`Lengkapi ${missing.map(([field]) => field).join(", ")} sebelum finalisasi.`);
      document.querySelector<HTMLElement>(`[data-testid="${missing[0][1]}"]`)?.focus();
      return;
    }
    setError("");
    const result = await run((source) => source.createKpiAssessment({ employeeId, roleOrder: compiled.roleOrder, period, evaluationDate: date, evaluatorName: "", status: "completed", lines, generalNotes: notes, evidenceReference: evidence.trim(), revisionOf: null }),
      "Performance Review difinalisasi dari Daily KPI.");
    if (result.ok) onClose(); else setError(result.error);
  }

  return <FormModal size="lg" title="Finalize from Daily KPI" description={`Skor ${formatPeriod(period)} dikompilasi dari ${compiled.days.length} entri Daily KPI ${employee?.fullName ?? ""}. Skor tidak diubah di sini; tambahkan Notes dan Reference lalu simpan.`} onClose={onClose}
    footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Finalize" />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-3">
        <ReadOnlyField label="Period" testId="finalize-period" value={formatPeriod(period)} />
        <ReadOnlyField label="Evaluation date" testId="finalize-date" value={formatDate(date)} />
        <ReadOnlyField label="Days compiled" testId="finalize-days" value={compiled.days.length} />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table data-testid="finalize-lines" className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-app text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3"><tr><th className="px-4 py-2.5">Core KPI</th><th className="px-4 py-2.5">Weight</th><th className="px-4 py-2.5">Compiled 1–{max}</th><th className="px-4 py-2.5">Gap</th></tr></thead>
          <tbody>{lines.map((line) => <tr key={line.indicator_order} className="border-t border-line"><td className="px-4 py-2.5 font-semibold">{line.kpi_name}</td><td className="px-4 py-2.5 tabular-nums">{line.weight_percent}%</td><td className="px-4 py-2.5 tabular-nums">{line.raw_score}</td><td className="px-4 py-2.5 tabular-nums text-ink-2">{formatGap(line.raw_score, compiled.definitionVersion)}</td></tr>)}</tbody>
          <tfoot className="border-t border-line bg-app"><tr><td colSpan={2} className="px-4 py-3 font-semibold">Total</td><td colSpan={2} className="px-4 py-3 font-display text-base font-semibold tabular-nums">{formatScore(compiled.total, max)}
            {max === 100 && <span className="ml-2 font-sans text-xs font-normal text-ink-3">gap {formatGap(compiled.total, compiled.definitionVersion)} dari target {KPI_TARGET}</span>}
            {band && <span className="ml-2 inline-block align-middle"><StatusBadge status={band} /></span>}</td></tr></tfoot>
        </table>
      </div>
      <p data-testid="compiled-rule" className="text-xs leading-5 text-ink-3">{COMPILED_RULE}</p>
      <TextAreaField label="Notes" testId="catatan-evaluasi" required maxLength={4000} value={notes} onChange={(event) => setNotes(event.target.value)} error={touched && !notes.trim() ? "Notes wajib diisi." : undefined}
        helper={`Kekuatan, hal yang perlu diperbaiki, dan rekomendasi pelatihan. ${notes.length}/4000`} />
      <TextField label="Reference" testId="evidence-reference" required maxLength={500} value={evidence} onChange={(event) => setEvidence(event.target.value)} error={touched && !evidence.trim() ? "Reference wajib diisi." : undefined} helper={`Nomor dokumen, tautan laporan, atau lokasi dokumen pencapaian KPI. ${evidence.length}/500`} />
      {running && <div className="rounded-xl bg-warning-bg px-4 py-3 text-xs leading-5 text-warning">
        <p>{formatPeriod(period)} masih berjalan. Entri Daily KPI yang disimpan setelah finalisasi tidak lagi masuk ke skor ini.</p>
        <label className="mt-2 flex items-center gap-2 font-semibold text-ink">
          <input type="checkbox" data-testid="checkbox-finalize-running" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} aria-invalid={touched && !confirmed}
            aria-describedby={touched && !confirmed ? "finalize-running-error" : undefined} className="size-4 accent-primary-600" />
          Finalize now anyway
        </label>
      </div>}
      {/* On white, not on the warning tint: danger text on the tint stays under 4.5:1. */}
      {running && touched && !confirmed && <p id="finalize-running-error" className="-mt-3 text-xs text-danger">Centang dulu untuk memfinalisasi periode yang masih berjalan.</p>}
    </form>
  </FormModal>;
}
