"use client";

import { useState, type FormEvent } from "react";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { departmentOf, employeeById, positionOf, SCORE_LABELS, thisMonth, today, visibleEmployees } from "../../data/selectors";
import { FormError, FormModal, ModalActions, ReadOnlyField, SelectField, TextAreaField, TextField } from "../../ui/forms";

/**
 * FR-01.2: employee, period, result or notes, date, evaluator, optional evidence. The result is the
 * evaluator's own 1–5 score (same scale as the KPI scorecard); the form adds no aspects, weights or
 * review labels because FR-D4-001 defines none.
 */
export function EvaluationFormModal({ employeeId, onClose, onSaved }: { employeeId?: string; onClose: () => void; onSaved?: (id: string) => void }) {
  const snapshot = useSnapshot();
  const { run, busy } = useD4();
  const actor = employeeById(snapshot, snapshot.actorEmployeeId);
  const [employee, setEmployee] = useState(employeeId ?? "");
  const [period, setPeriod] = useState(thisMonth());
  const [date, setDate] = useState(today());
  const [evaluator, setEvaluator] = useState(actor?.fullName ?? "");
  const [score, setScore] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [evidence, setEvidence] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const selected = employeeById(snapshot, employee);
  const missing = [!employee && "employee", !period && "periode", !date && "tanggal", !evaluator.trim() && "evaluator", score === null && "hasil evaluasi", !notes.trim() && "catatan evaluasi"].filter(Boolean);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (missing.length) { setError(`Lengkapi ${missing.join(", ")} sebelum menyimpan.`); return; }
    setError("");
    const result = await run((source) => source.createEvaluation({
      employeeId: employee, period, evaluationDate: date, evaluator, status: "completed", reviewStatus: "Needs Review",
      overallScore: score, aspects: [], generalNotes: notes, evidenceReference: evidence.trim() || null,
    }), "Evaluasi kinerja tersimpan.");
    if (result.ok) { onSaved?.(result.value); onClose(); } else setError(result.error);
  }

  return <FormModal title="Add Evaluation" description="Evaluasi baru disimpan sebagai riwayat periode; evaluasi periode sebelumnya tidak ditimpa." onClose={onClose}
    footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save Evaluation" />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Employee" required value={employee} onChange={(event) => setEmployee(event.target.value)} error={touched && !employee ? "Employee wajib dipilih." : undefined} className="sm:col-span-2">
          <option value="">Select employee</option>
          {visibleEmployees(snapshot).map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.employeeId}</option>)}
        </SelectField>
        <ReadOnlyField label="Position" value={positionOf(snapshot, selected)?.title ?? "—"} />
        <ReadOnlyField label="Department" value={departmentOf(snapshot, selected)?.name ?? "—"} />
        <TextField label="Period" required type="month" value={period} onChange={(event) => setPeriod(event.target.value)} error={touched && !period ? "Periode wajib dipilih." : undefined} />
        <TextField label="Evaluation date" required type="date" value={date} onChange={(event) => setDate(event.target.value)} error={touched && !date ? "Tanggal wajib diisi." : undefined} />
        <TextField label="Evaluator" required value={evaluator} onChange={(event) => setEvaluator(event.target.value)} error={touched && !evaluator.trim() ? "Evaluator wajib diisi." : undefined} />
        <SelectField label="Hasil evaluasi" required value={score ?? ""} onChange={(event) => setScore(event.target.value ? Number(event.target.value) : null)}
          error={touched && score === null ? "Hasil evaluasi wajib dipilih." : undefined} helper="Diisi evaluator; tidak memicu keputusan HR otomatis.">
          <option value="">Select result</option>
          {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} · {SCORE_LABELS[value]}</option>)}
        </SelectField>
      </div>
      <TextAreaField label="Catatan evaluasi" required value={notes} onChange={(event) => setNotes(event.target.value)} error={touched && !notes.trim() ? "Catatan evaluasi wajib diisi." : undefined}
        helper="Termasuk rekomendasi/rencana pelatihan bila ada — dapat dipakai sebagai konteks Development Requirement." />
      <TextField label="Evidence / reference" value={evidence} onChange={(event) => setEvidence(event.target.value)} helper="Opsional: nomor dokumen atau tautan bukti." />
    </form>
  </FormModal>;
}
