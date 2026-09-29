"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { indicatorsFor, roleForPositionTitle, rolesOf } from "../../../kpi/catalog";
import type { KpiAssessmentLine } from "../../../supabase/types";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { employeeById, positionOf, thisMonth, today, visibleEmployees } from "../../data/selectors";
import { FormError, FormModal, ModalActions, SelectField, TextAreaField, TextField } from "../../ui/forms";
import { Button, cx } from "../../ui/primitives";

const validScore = (value: number | null) => value !== null && Number.isInteger(value) && value >= 1 && value <= 5;

/** Weighted = weight × raw score (FR-02.5); total = Σ weighted (FR-02.6). Target/realisation never produce the raw score (FR-02.12). */
export function weighted(line: Pick<KpiAssessmentLine, "weight_percent" | "raw_score">) {
  return validScore(line.raw_score) ? line.weight_percent * (line.raw_score ?? 0) / 100 : null;
}

export function KpiFormModal({ employeeId, onClose, onSaved }: { employeeId?: string; onClose: () => void; onSaved?: (id: string) => void }) {
  const snapshot = useSnapshot();
  const { catalog, run, busy } = useD4();
  const roles = useMemo(() => catalog ? rolesOf(catalog) : [], [catalog]);
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
  const [evaluator, setEvaluator] = useState(actor?.fullName ?? "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  const totalWeight = lines.reduce((sum, line) => sum + line.weight_percent, 0);
  const allScored = lines.length === 5 && lines.every((line) => validScore(line.raw_score));
  const total = allScored ? Math.round(lines.reduce((sum, line) => sum + (weighted(line) ?? 0), 0) * 100) / 100 : null;
  const position = positionOf(snapshot, employeeById(snapshot, employee));

  function chooseEmployee(id: string) { setEmployee(id); const role = suggest(id); setRoleOrder(role); setLines(linesFor(role)); }
  function chooseRole(order: number) { setRoleOrder(order); setLines(linesFor(order)); }
  function setLine(index: number, patch: Partial<KpiAssessmentLine>) { setLines((items) => items.map((line, at) => at === index ? { ...line, ...patch } : line)); }

  async function save(status: "draft" | "completed") {
    setTouched(true);
    if (!employee || !roleOrder || lines.length !== 5 || totalWeight !== 100) { setError("Pilih employee dan jabatan KPI dengan lima indikator dan total bobot 100%."); return; }
    if (status === "completed" && (!allScored || !date || !evaluator.trim())) { setError("Lengkapi tanggal, penilai, dan skor 1–5 untuk kelima KPI sebelum menyelesaikan scorecard."); return; }
    setError("");
    const result = await run((source) => source.createKpiAssessment({ employeeId: employee, roleOrder, period, evaluationDate: date, evaluatorName: evaluator, status, lines, generalNotes: notes }),
      status === "draft" ? "Draft KPI scorecard tersimpan." : "KPI scorecard tersimpan.");
    if (result.ok) { onSaved?.(result.value); onClose(); } else setError(result.error);
  }

  function submit(event: FormEvent) { event.preventDefault(); void save("completed"); }

  return <FormModal size="lg" title="KPI Scorecard" description={`Lima Core KPI dan bobot mengikuti KPI Scorecard ${catalog?.version ?? ""} sesuai position employee.`} onClose={onClose}
    footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Complete Scorecard" secondary={<Button variant="ghost" disabled={busy} onClick={() => void save("draft")}>Save Draft</Button>} />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField label="Employee" required value={employee} onChange={(event) => chooseEmployee(event.target.value)} error={touched && !employee ? "Employee wajib dipilih." : undefined} className="sm:col-span-2">
          <option value="">Select employee</option>
          {visibleEmployees(snapshot).map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.employeeId}</option>)}
        </SelectField>
        <TextField label="Period" required type="month" value={period} onChange={(event) => setPeriod(event.target.value)} />
        <SelectField label="KPI role" required value={roleOrder} onChange={(event) => chooseRole(Number(event.target.value))} className="sm:col-span-2"
          helper={position ? `Position HR: ${position.title}${roleOrder && suggest(employee) === roleOrder ? " (dipetakan otomatis)" : ""}` : undefined}
          error={touched && !roleOrder ? "Jabatan KPI wajib dipilih." : undefined}>
          <option value={0}>Select KPI role</option>
          {roles.map((role) => <option key={role.order} value={role.order}>{role.name}</option>)}
        </SelectField>
        <TextField label="Evaluation date" required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <TextField label="Evaluator" required value={evaluator} onChange={(event) => setEvaluator(event.target.value)} className="sm:col-span-3" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-app text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
            <tr><th className="w-10 px-3 py-2.5">No</th><th className="px-3 py-2.5">Core KPI</th><th className="w-20 px-3 py-2.5">Bobot</th><th className="w-36 px-3 py-2.5">Target</th><th className="w-36 px-3 py-2.5">Realisasi</th><th className="w-24 px-3 py-2.5">Skor 1–5</th><th className="w-24 px-3 py-2.5 text-right">Terbobot</th></tr>
          </thead>
          <tbody>
            {lines.map((line, index) => <tr key={`${roleOrder}-${line.indicator_order}`} className="border-t border-line align-middle">
              <td className="px-3 py-2.5 text-ink-3">{line.indicator_order}</td>
              <td className="px-3 py-2.5 font-semibold leading-5">{line.kpi_name}</td>
              <td className="px-3 py-2.5 tabular-nums">{line.weight_percent}%</td>
              <td className="px-3 py-2"><input aria-label={`Target ${line.kpi_name}`} value={line.target} onChange={(event) => setLine(index, { target: event.target.value })} className="h-9 w-full rounded-lg border border-line-strong px-2 text-sm" /></td>
              <td className="px-3 py-2"><input aria-label={`Realisasi ${line.kpi_name}`} value={line.actual} onChange={(event) => setLine(index, { actual: event.target.value })} className="h-9 w-full rounded-lg border border-line-strong px-2 text-sm" /></td>
              <td className="px-3 py-2"><select aria-label={`Skor ${line.kpi_name}`} aria-invalid={touched && !validScore(line.raw_score)} value={line.raw_score ?? ""} onChange={(event) => setLine(index, { raw_score: event.target.value ? Number(event.target.value) : null })} className="h-9 w-full rounded-lg border border-line-strong px-2 text-sm aria-[invalid=true]:border-danger"><option value="">—</option>{[1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}</select></td>
              <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{weighted(line)?.toFixed(2) ?? "—"}</td>
            </tr>)}
          </tbody>
          <tfoot className="border-t border-line bg-app">
            <tr><td colSpan={2} className="px-3 py-3 font-semibold">Total</td>
              <td className="px-3 py-3"><span className={cx("inline-flex items-center gap-1 text-xs font-semibold", totalWeight === 100 ? "text-success" : "text-danger")}>{totalWeight === 100 ? <CheckCircle2 className="size-3.5" /> : <CircleAlert className="size-3.5" />}{lines.length ? `${totalWeight}%` : "—"}</span></td>
              <td colSpan={3} className="px-3 py-3 text-xs text-ink-3">{lines.length ? (totalWeight === 100 ? "Total bobot 100%" : "Total bobot harus 100%") : "Pilih jabatan KPI untuk menampilkan indikator."}</td>
              <td className="px-3 py-3 text-right font-display text-base tabular-nums">{total === null ? "—" : `${total.toFixed(2)} / 5`}</td></tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-ink-3">Skala: 1 Sangat Kurang · 2 Kurang · 3 Cukup · 4 Baik · 5 Sangat Baik. Skor mentah diisi penilai; sistem tidak mengonversi realisasi menjadi skor dan tidak memberi label tercapai/tidak tercapai.</p>
      <TextAreaField label="Catatan / rekomendasi atasan" value={notes} onChange={(event) => setNotes(event.target.value)} />
    </form>
  </FormModal>;
}
