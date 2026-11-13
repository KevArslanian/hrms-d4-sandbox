"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { catalogFor, indicatorsFor, KPI_TARGET, roleForPosition, targetOf, type KpiCatalog, type KpiCatalogSet } from "../../../kpi/catalog";
import { compileDaily, type DailyCompilation } from "../../../kpi/daily";
import { aboveScale, HIGH_ABOVE, performanceBand, scaleMaxOf, UNDER_BELOW } from "../../../kpi/scale";
import type { KpiAssessmentLine } from "../../../supabase/types";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { latestForPeriod, periodDateError } from "../../../shared/rules";
import { assessableEmployees, departmentOf, employeeById, formatDate, formatGap, formatPeriod, positionOf, SCORE_LABELS, thisMonth, today } from "../../data/selectors";
import { DateField, FormError, FormModal, ModalActions, ReadOnlyField, RevisionConfirm, SearchSelectField, TextAreaField, TextField } from "../../ui/forms";
import { cx, Notice, StatusBadge } from "../../ui/primitives";

/** FR-02.11: positions without a KPI role in the catalog get no scorecard; no mapping is invented for them. */
export const noKpiText = (version?: string) => version ? `Posisi ini belum memiliki KPI di katalog ${version}. Hubungi HR.` : "Belum ada katalog KPI yang berlaku untuk periode ini. Hubungi HR.";

/** K6: the fixed target 85 is on the 1–100 scale, so a 1–5 scorecard (V3.1/V5.1) shows no target instead of "85". */
export const targetLabel = (target: string | null | undefined, definitionVersion?: string | null) => scaleMaxOf(definitionVersion) === 100 && target ? target : "—";

/** Integer raw score within the scale of the catalog version: 1–5 (V3.1, V5.1) or 1–100 (V6 onward). */
const validScore = (value: number | null, max = 5) => value !== null && Number.isInteger(value) && value >= 1 && value <= max;

/** Weighted = weight × raw score (FR-02.5); total = Σ weighted (FR-02.6). The raw score is the number typed in Actual (Q4). */
export function weighted(line: Pick<KpiAssessmentLine, "weight_percent" | "raw_score">, max = 5) {
  return validScore(line.raw_score, max) ? line.weight_percent * (line.raw_score ?? 0) / 100 : null;
}

/** Total of five scored lines, rounded to 2 decimals like the trigger d4_calculate_kpi_assessment; null until all five are valid. */
export function scorecardTotal(lines: readonly Pick<KpiAssessmentLine, "weight_percent" | "raw_score">[], max = 5) {
  if (lines.length !== 5 || !lines.every((line) => validScore(line.raw_score, max))) return null;
  return Math.round(lines.reduce((sum, line) => sum + (weighted(line, max) ?? 0), 0) * 100) / 100;
}

/**
 * Q4 (20 Oct 2026): Actual is the only value input and its number is the raw score, so the Actual and Score columns
 * are one. `actual` keeps the same number as text; realisation notes go to Comment. Empty or not a number = not scored.
 */
export function actualInput(value: string): Pick<KpiAssessmentLine, "actual" | "raw_score"> {
  const score = value.trim() ? Number(value) : NaN;
  return Number.isFinite(score) ? { actual: String(score), raw_score: score } : { actual: "", raw_score: null };
}

/** Realisation text from the old Actual column (scorecards saved before Q4); a newer line holds its own score there. */
export function legacyRealisation(line: Pick<KpiAssessmentLine, "actual" | "raw_score">) {
  const text = String(line.actual ?? "").trim();
  return text && text !== String(line.raw_score) ? text : "";
}

/** Comment cell of a saved line; old realisation text stays readable here instead of in a separate column. */
export function LineComment({ line }: { line: KpiAssessmentLine }) {
  const realisation = legacyRealisation(line);
  if (!realisation) return <>{line.comment || "—"}</>;
  return <><span data-testid={`kpi-realisation-${line.indicator_order}`} title="Teks realisasi dari kolom Actual lama, sebelum Actual menjadi skor." className="block">Realisation: {realisation}</span>{line.comment && <span className="block">{line.comment}</span>}</>;
}

/** Blank lines of a KPI role in a catalog version; the evaluator fills Actual (the score) and Comment. */
const blankLines = (at: KpiCatalog | null, roleOrder: number): KpiAssessmentLine[] => at ? indicatorsFor(at, roleOrder).map((row) => ({
  indicator_order: row.indicator_order, kpi_name: row.kpi_name, weight_percent: row.weight_percent, target: targetOf(row), actual: "", raw_score: null, comment: "",
})) : [];

/** Actual of each line set from the rounded daily averages; HR still reviews every value before saving. */
export const withDaily = (lines: KpiAssessmentLine[], compiled: DailyCompilation | null) =>
  compiled ? lines.map((line, index) => ({ ...line, ...actualInput(String(compiled.scores[index])) })) : lines;

/**
 * Form changes when the period changes. A period under another catalog version reloads the employee's KPI set, since
 * its lines and scale may differ (1–5 or 1–100). A message from an earlier Save is cleared, as it may name the old
 * scale (D4-UI-04), the same as when another employee is chosen.
 */
export function periodChange(catalogSet: KpiCatalogSet | null, from: string, to: string, employee?: { positionId?: string | null }) {
  const versionOf = (value: string) => catalogSet && value ? catalogFor(catalogSet, value) : null;
  const next = versionOf(to);
  if (!employee || next?.version === versionOf(from)?.version) return { error: "" };
  const roleOrder = next ? roleForPosition(next, employee.positionId) : 0;
  return { error: "", roleOrder, lines: blankLines(next, roleOrder) };
}

const FUTURE_PERIOD = "Period belum dimulai. Performance Review hanya untuk periode yang sudah berjalan.";

/** The saved score under an Actual field: "Saved: 78", or "78 → 80" once it differs, in words and not only in colour. */
export function SavedScore({ before, now, testId }: { before: number | null; now: number | null; testId: string }) {
  const changed = before !== now;
  return <span data-testid={testId} data-changed={changed || undefined} className={cx("mt-1 block text-xs tabular-nums", changed ? "font-semibold text-ink" : "text-ink-3")}>
    {changed ? `${before ?? "—"} → ${now ?? "—"}` : `Saved: ${before ?? "—"}`}
  </span>;
}

/**
 * Saved total against the new one (R2): the evaluator sees at once whether the revision lowers the score, the worry the
 * lecturer named ("jangan sampai nilai saya yang baru lebih rendah"). Direction is written out, not shown by colour only.
 */
export function totalComparison(saved: number, now: number | null) {
  if (now === null) return `Saved total ${saved.toFixed(2)}. Isi kelima Actual untuk melihat total baru.`;
  const diff = Math.round((now - saved) * 100) / 100;
  if (diff === 0) return `Saved total ${saved.toFixed(2)} · New total ${now.toFixed(2)} · sama dengan yang tersimpan`;
  return `Saved total ${saved.toFixed(2)} · New total ${now.toFixed(2)} · ${diff < 0 ? `Lower than saved (${diff.toFixed(2)})` : `Higher than saved (+${diff.toFixed(2)})`}`;
}

// Field label above the value on phones, where each KPI line is a card instead of a table row.
const mobileLabel = "max-md:p-0 max-md:before:mb-1 max-md:before:block max-md:before:text-[11px] max-md:before:font-semibold max-md:before:uppercase max-md:before:tracking-[0.04em] max-md:before:text-ink-3 max-md:before:content-[attr(data-label)]";
const inputStyle = "h-9 w-full rounded-2xl border border-ink-3 px-3 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 text-sm";

/** Performance Review (FR-D4-001 v3.1): five Core KPI, notes and evidence in one form with one Save. */
export function KpiFormModal({ employeeId, onClose, onSaved }: { employeeId?: string; onClose: () => void; onSaved?: (id: string) => void }) {
  const snapshot = useSnapshot();
  const { catalog: catalogSet, run, busy } = useD4();
  const actor = employeeById(snapshot, snapshot.actorEmployeeId);
  const [period, setPeriod] = useState(thisMonth());
  // The KPI set follows the catalog version in force for the chosen period.
  const catalog = catalogSet && period ? catalogFor(catalogSet, period) : null;
  const max = scaleMaxOf(catalog?.version);
  const suggest = (id: string) => catalog ? roleForPosition(catalog, employeeById(snapshot, id)?.positionId) : 0;
  const linesFor = (roleOrder: number) => blankLines(catalog, roleOrder);
  // The employee's daily entries of the period, only when they were scored on the same KPI set as this scorecard.
  const compiledFor = (id: string, at: string, role: number) => {
    const compiled = id && at ? compileDaily(snapshot.kpiDaily ?? [], id, at) : null;
    const version = catalogSet && at ? catalogFor(catalogSet, at)?.version : undefined;
    return compiled && compiled.roleOrder === role && compiled.definitionVersion === version ? compiled : null;
  };

  // R2 (dosen, 10 Nov 2026): a Performance Review that already exists for the period opens with its saved values, so the
  // evaluator changes only what differs and always sees the value before the change. Only when it used the same KPI set.
  const savedFor = (id: string, at: string, role: number) => {
    const saved = id && at ? latestForPeriod(snapshot.kpiAssessments ?? [], id, at) : undefined;
    const version = catalogSet && at ? catalogFor(catalogSet, at)?.version : undefined;
    return saved && saved.roleOrder === role && saved.definitionVersion === version && saved.lines.length === 5 ? saved : undefined;
  };
  const startSaved = employeeId ? savedFor(employeeId, thisMonth(), suggest(employeeId)) : undefined;

  const [employee, setEmployee] = useState(employeeId ?? "");
  const [roleOrder, setRoleOrder] = useState(() => employeeId ? suggest(employeeId) : 0);
  const [daily, setDaily] = useState(() => employeeId && !startSaved ? compiledFor(employeeId, thisMonth(), suggest(employeeId)) : null);
  const [lines, setLines] = useState<KpiAssessmentLine[]>(() => startSaved ? startSaved.lines.map((line) => ({ ...line })) : withDaily(linesFor(employeeId ? suggest(employeeId) : 0), daily));
  const [date, setDate] = useState(today());
  // The evaluator is the signed-in user; the server stores that name and ignores the form value.
  const evaluator = actor?.fullName ?? "";
  const [notes, setNotes] = useState(startSaved?.generalNotes ?? "");
  const [evidence, setEvidence] = useState(startSaved?.evidenceReference ?? "");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [revise, setRevise] = useState(false);
  const existing = employee && period ? latestForPeriod(snapshot.kpiAssessments ?? [], employee, period) : undefined;
  // The saved version the form was loaded from; its scores are shown next to the new ones.
  const basis = savedFor(employee, period, roleOrder);
  const savedTotal = basis ? basis.overallScore ?? scorecardTotal(basis.lines, max) : null;

  const totalWeight = lines.reduce((sum, line) => sum + line.weight_percent, 0);
  const total = scorecardTotal(lines, max);
  const allScored = total !== null;
  const band = performanceBand(total, catalog?.version);
  const selected = employeeById(snapshot, employee);
  const position = positionOf(snapshot, selected);
  const roleName = roleOrder && catalog ? indicatorsFor(catalog, roleOrder)[0]?.role_name : undefined;

  /** Loads the saved version of this employee and period, or clears what an earlier saved version left in the form. */
  function loadSaved(id: string, at: string, role: number, blank: KpiAssessmentLine[]) {
    const saved = savedFor(id, at, role);
    setRevise(false);
    if (saved) {
      setDaily(null); setLines(saved.lines.map((line) => ({ ...line })));
      setNotes(saved.generalNotes ?? ""); setEvidence(saved.evidenceReference ?? "");
      return true;
    }
    if (basis) { setLines(blank); setNotes(""); setEvidence(""); }
    return false;
  }
  function chooseEmployee(id: string) {
    setEmployee(id); setError("");
    const role = suggest(id), compiled = compiledFor(id, period, role);
    setRoleOrder(role);
    if (loadSaved(id, period, role, linesFor(role))) return;
    setDaily(compiled); setLines(withDaily(linesFor(role), compiled));
  }
  function choosePeriod(value: string) {
    const change = periodChange(catalogSet, period, value, selected);
    setPeriod(value); setError(change.error);
    const role = change.lines ? change.roleOrder : roleOrder, compiled = compiledFor(employee, value, role);
    if (change.lines) setRoleOrder(change.roleOrder);
    if (loadSaved(employee, value, role, change.lines ?? linesFor(role))) return;
    if (change.lines) setLines(withDaily(change.lines, compiled));
    // Replaces a previous pre-fill; scores HR typed without daily data involved stay as they are.
    else if (daily || compiled || basis) setLines(withDaily(linesFor(role), compiled));
    setDaily(compiled);
  }
  function setLine(index: number, patch: Partial<KpiAssessmentLine>) { setLines((items) => items.map((line, at) => at === index ? { ...line, ...patch } : line)); }

  // FR-02.1/FR-02.11: the KPI set follows the employee's position; HR cannot pick another position's KPI.
  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!employee) { setError("Lengkapi employee sebelum menyimpan."); return; }
    if (!roleOrder || lines.length !== 5 || totalWeight !== 100) { setError("KPI untuk posisi ini belum tersedia di katalog; penilaian tidak dapat disimpan."); return; }
    if (lines.some((line) => !line.kpi_name.trim())) { setError("Setiap Core KPI wajib diberi nama."); return; }
    if (!allScored || !period || !date) { setError(`Lengkapi periode, tanggal evaluasi, dan Actual 1–${max} untuk kelima KPI.`); return; }
    if (period > thisMonth()) { setError(FUTURE_PERIOD); return; }
    if (!notes.trim()) { setError("Notes wajib diisi."); return; }
    if (!evidence.trim()) { setError("Reference wajib diisi."); return; }
    if (date > today()) { setError("Tanggal evaluasi tidak boleh lebih dari hari ini."); return; }
    if (periodDateError(period, date)) { setError(periodDateError(period, date)); return; }
    if (existing && !revise) { setError("Performance Review untuk periode ini sudah ada. Centang “Save as revision” atau pilih periode lain."); return; }
    setError("");
    const result = await run((source) => source.createKpiAssessment({ employeeId: employee, roleOrder, period, evaluationDate: date, evaluatorName: evaluator, status: "completed", lines, generalNotes: notes, evidenceReference: evidence.trim() || null, revisionOf: existing?.id ?? null }),
      "Performance Review tersimpan.");
    if (result.ok) { onSaved?.(result.value); onClose(); } else setError(result.error);
  }

  return <FormModal size="lg" title="Performance Review" description={`Lima Core KPI dari katalog ${catalog?.version ?? ""} sesuai posisi pegawai (nama bisa diubah, bobot dan target tetap), lalu Notes dan Reference, disimpan sekaligus dengan Save.`} onClose={onClose}
    footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save" disabled={Boolean(employee) && !lines.length} />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-3">
        <SearchSelectField label="Employee" testId="employee" required value={employee} onChange={(value) => chooseEmployee(value)} error={touched && !employee ? "Employee wajib diisi." : undefined} className="sm:col-span-2" placeholder="Select employee"
          options={assessableEmployees(snapshot).map((item) => ({ value: item.id, label: `${item.fullName} · ${item.employeeId}` }))} />
        <DateField label="Period" testId="period" required month max={thisMonth()} value={period} onChange={(event) => choosePeriod(event.target.value)} error={touched && !period ? "Period wajib diisi." : touched && period > thisMonth() ? FUTURE_PERIOD : undefined} />
        <ReadOnlyField label="Position" testId="position" value={position?.title ?? "—"} />
        <ReadOnlyField label="Department" testId="department" value={departmentOf(snapshot, selected)?.name ?? "—"} />
        <ReadOnlyField label="Position KPI" testId="kpi-jabatan" value={!employee ? "—" : roleName ?? (catalog ? `Not in catalog ${catalog.version} yet` : "No KPI catalog for this period")} />
        <DateField label="Evaluation date" testId="evaluation-date" required min={period ? `${period}-01` : undefined} max={today()} value={date} onChange={(event) => setDate(event.target.value)} error={touched && !date ? "Date wajib diisi." : touched && date > today() ? "Tidak boleh lebih dari hari ini." : touched && periodDateError(period, date) || undefined} />
        <ReadOnlyField label="Evaluator" testId="evaluator" value={evaluator || "—"} className="sm:col-span-2" />
      </div>
      {daily && <div data-testid="daily-prefill"><Notice>Actual diisi dari rata-rata {daily.days.length} entri Daily KPI pegawai ini ({formatPeriod(period)}), dibulatkan. Periksa dan ubah bila perlu sebelum menyimpan.</Notice></div>}

      {employee && !lines.length ? <Notice tone="warning">{position ? noKpiText(catalog?.version) : "Pegawai belum memiliki posisi aktif, jadi KPI-nya belum bisa ditentukan."}</Notice> : <div className="overflow-x-auto rounded-2xl border border-line">
        <table data-testid="kpi-lines-table" className="w-full text-left text-sm max-md:block md:min-w-[640px]">
          <thead className="bg-app text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3 max-md:hidden">
            <tr><th className="w-10 px-3 py-2.5">No</th><th className="px-3 py-2.5">Core KPI</th><th className="w-20 px-3 py-2.5">Weight</th><th className="w-28 px-3 py-2.5 whitespace-nowrap">{`Actual 1–${max}`}</th>{max === 100 && <th className="w-24 px-3 py-2.5 whitespace-nowrap">{`Gap vs ${KPI_TARGET}`}</th>}<th className="w-24 px-3 py-2.5 text-right">Weighted</th></tr>
          </thead>
          {/* V1: Comment gets its own full-width row under each KPI, so the KPI name and the comment both have room. */}
          {lines.map((line, index) => <tbody key={`${roleOrder}-${line.indicator_order}`} data-testid={`kpi-line-${line.indicator_order}`} className="border-t border-line max-md:grid max-md:grid-cols-2 max-md:gap-3 max-md:p-4">
            <tr className="align-middle max-md:contents">
              <td data-label="No" className={cx("px-3 pt-2.5 text-ink-3", mobileLabel)}>{line.indicator_order}</td>
              <td data-label="Core KPI" className={cx("px-3 pt-2", mobileLabel, "max-md:col-span-2")}><input data-testid={`input-core-kpi-${line.indicator_order}`} aria-label={`Core KPI ${line.indicator_order}`} aria-invalid={touched && !line.kpi_name.trim()} maxLength={200} value={line.kpi_name} onChange={(event) => setLine(index, { kpi_name: event.target.value })} className={cx(inputStyle, "font-semibold aria-[invalid=true]:border-danger")} /></td>
              <td data-label="Weight" className={cx("px-3 pt-2.5 tabular-nums", mobileLabel)}>{line.weight_percent}%</td>
              <td data-label={`Actual 1–${max}`} className={cx("px-3 pt-2", mobileLabel)}><input type="number" inputMode="numeric" min={1} max={max} step={1} data-testid={`input-realisasi-${line.indicator_order}`} aria-label={`Actual ${line.kpi_name}`} aria-invalid={touched && !validScore(line.raw_score, max)} value={line.raw_score ?? ""} onChange={(event) => { if (!aboveScale(event.target.value, max)) setLine(index, actualInput(event.target.value)); }} className={cx(inputStyle, "tabular-nums aria-[invalid=true]:border-danger")} />
                {basis?.lines[index] && <SavedScore before={basis.lines[index].raw_score} now={line.raw_score} testId={`saved-score-${line.indicator_order}`} />}</td>
              {max === 100 && <td data-label={`Gap vs ${KPI_TARGET}`} data-testid={`kpi-gap-${line.indicator_order}`} className={cx("px-3 pt-2.5 tabular-nums text-ink-2", mobileLabel)}>{validScore(line.raw_score, max) ? formatGap(line.raw_score, catalog?.version) : "—"}</td>}
              <td data-label="Weighted" className={cx("px-3 pt-2.5 text-right font-semibold tabular-nums", mobileLabel, "max-md:text-left")}>{weighted(line, max)?.toFixed(2) ?? "—"}</td>
            </tr>
            <tr className="max-md:contents">
              <td aria-hidden="true" className="max-md:hidden" />
              <td colSpan={max === 100 ? 5 : 4} data-label="Comment" className={cx("px-3 pb-2.5 pt-2", mobileLabel, "max-md:col-span-2")}><input data-testid={`input-komentar-${line.indicator_order}`} aria-label={`Comment ${line.kpi_name}`} maxLength={500} placeholder="Comment: catatan realisasi" value={line.comment} onChange={(event) => setLine(index, { comment: event.target.value })} className={inputStyle} /></td>
            </tr>
          </tbody>)}
          <tfoot className="border-t border-line bg-app max-md:block">
            <tr className="max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-x-3"><td colSpan={2} className="px-3 py-3 font-semibold">Total <span className="ml-2 text-xs font-normal text-ink-3">{lines.length ? (totalWeight === 100 ? "Total bobot 100%" : "Total bobot harus 100%") : "Pilih pegawai untuk menampilkan KPI posisinya."}</span></td>
              <td className="px-3 py-3"><span className={cx("inline-flex items-center gap-1 text-xs font-semibold", totalWeight === 100 ? "text-success" : "text-danger")}>{totalWeight === 100 ? <CheckCircle2 className="size-3.5" /> : <CircleAlert className="size-3.5" />}{lines.length ? `${totalWeight}%` : "—"}</span></td>
              <td className="max-md:hidden" />
              {max === 100 && <td data-testid="kpi-gap-total" className="px-3 py-3 text-xs font-semibold tabular-nums text-ink-2">{total === null ? "" : `Gap ${formatGap(total, catalog?.version)}`}</td>}
              <td className="px-3 py-3 text-right font-display font-semibold text-base tabular-nums">{total === null ? "—" : `${total.toFixed(2)} / ${max}`}{band && <span data-testid="performance-band" className="mt-1 block text-right"><StatusBadge status={band} /></span>}</td></tr>
            {savedTotal !== null && <tr className="max-md:block"><td colSpan={max === 100 ? 6 : 5} data-testid="total-compare" className="px-3 pb-3 text-right text-xs text-ink-2 max-md:block max-md:text-left">
              {totalComparison(savedTotal, total)}
            </td></tr>}
          </tfoot>
        </table>
      </div>}
      <p className="text-xs text-ink-3">{max === 5
        ? `Actual diisi skor 1–5: ${[1, 2, 3, 4, 5].map((value) => `${value} ${SCORE_LABELS[value]}`).join(" · ")}. Skor terbobot = bobot × Actual; total = jumlah skor terbobot. Catatan realisasi ditulis di Comment. Tidak ada label tercapai/tidak tercapai.`
        : `Actual diisi skor 1–100 dengan target ${KPI_TARGET}. Di bawah ${UNDER_BELOW} = Under Performance, ${UNDER_BELOW}–${HIGH_ABOVE} = Average Performance, di atas ${HIGH_ABOVE} = High Performance. Skor terbobot = bobot × Actual; total = jumlah skor terbobot. Catatan realisasi ditulis di Comment.`}</p>
      <TextAreaField label="Notes" testId="catatan-evaluasi" required maxLength={4000} value={notes} onChange={(event) => setNotes(event.target.value)} error={touched && !notes.trim() ? "Notes wajib diisi." : undefined}
        helper="Kekuatan, hal yang perlu diperbaiki, dan rekomendasi pelatihan. Bisa menjadi dasar Development Requirement." />
      <TextField label="Reference" testId="evidence-reference" required maxLength={500} value={evidence} onChange={(event) => setEvidence(event.target.value)} error={touched && !evidence.trim() ? "Reference wajib diisi." : undefined} helper="Nomor dokumen, tautan laporan, atau lokasi dokumen pencapaian KPI." />
      {/* Last thing before Save: the evaluator confirms the revision after seeing what changed, not before filling the form. */}
      {existing && <RevisionConfirm what="Performance Review" existing={`${existing.evaluatorName}, ${formatDate(existing.evaluationDate)}`} checked={revise} onChange={setRevise}
        error={touched && !revise ? "Centang untuk menyimpan sebagai revisi, atau pilih periode lain." : undefined} />}
    </form>
  </FormModal>;
}
