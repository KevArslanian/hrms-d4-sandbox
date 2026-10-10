"use client";

import { useState, type FormEvent } from "react";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { latestForPeriod } from "../../../shared/rules";
import { assessableEmployees, departmentOf, employeeById, formatDate, positionOf, SCORE_LABELS, thisMonth, today } from "../../data/selectors";
import { FormError, FormModal, ModalActions, ReadOnlyField, RevisionConfirm, SearchSelectField, SelectField, TextAreaField, TextField } from "../../ui/forms";

/**
 * Employee, period, date, evaluator, notes, optional evidence. An evaluation is a written record only:
 * Evaluation Result (UC-D4-001 BF-6/BF-8) is the evaluator's own 1–5 score, same scale as the KPI Scorecard;
 * it is required (E-1) and triggers no automatic HR decision. No aspects, weights or review labels.
 */
export function EvaluationFormModal({ employeeId, onClose, onSaved }: { employeeId?: string; onClose: () => void; onSaved?: (id: string) => void }) {
  const snapshot = useSnapshot();
  const { run, busy } = useD4();
  const actor = employeeById(snapshot, snapshot.actorEmployeeId);
  const [employee, setEmployee] = useState(employeeId ?? "");
  const [period, setPeriod] = useState(thisMonth());
  const [date, setDate] = useState(today());
  // The evaluator is the signed-in user; the server stores that name and ignores the form value.
  const evaluator = actor?.fullName ?? "";
  const [score, setScore] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [evidence, setEvidence] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [revise, setRevise] = useState(false);
  const selected = employeeById(snapshot, employee);
  const existing = employee && period ? latestForPeriod(snapshot.performance, employee, period) : undefined;
  const missing = [!employee && "employee", !period && "period", !date && "date", date > today() && "a date no later than today", score === null && "Evaluation Result", !notes.trim() && "evaluation notes", existing && !revise && "revision confirmation"].filter(Boolean);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (missing.length) { setError(`Lengkapi ${missing.join(", ")} sebelum menyimpan.`); return; }
    setError("");
    const result = await run((source) => source.createEvaluation({
      employeeId: employee, period, evaluationDate: date, evaluator, status: "completed", reviewStatus: "Needs Review",
      overallScore: score, aspects: [], generalNotes: notes, evidenceReference: evidence.trim() || null, revisionOf: existing?.id ?? null,
    }), "Evaluasi performance tersimpan.");
    if (result.ok) { onSaved?.(result.value); onClose(); } else setError(result.error);
  }

  return <FormModal title="Add Evaluation" description="Catat Evaluation Result (skor 1–5) dan catatan evaluasi untuk periode ini; evaluasi sebelumnya tidak pernah ditimpa." onClose={onClose}
    footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save Evaluation" />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SearchSelectField label="Employee" testId="employee" required value={employee} onChange={(value) => setEmployee(value)} error={touched && !employee ? "Employee wajib diisi." : undefined} className="sm:col-span-2" placeholder="Select employee"
          options={assessableEmployees(snapshot).map((item) => ({ value: item.id, label: `${item.fullName} · ${item.employeeId}` }))} />
        <ReadOnlyField label="Position" testId="position" value={positionOf(snapshot, selected)?.title ?? "—"} />
        <ReadOnlyField label="Department" testId="department" value={departmentOf(snapshot, selected)?.name ?? "—"} />
        <TextField label="Period" testId="period" required type="month" value={period} onChange={(event) => setPeriod(event.target.value)} error={touched && !period ? "Period wajib diisi." : undefined} />
        <TextField label="Evaluation date" testId="evaluation-date" required type="date" max={today()} value={date} onChange={(event) => setDate(event.target.value)} error={touched && !date ? "Date wajib diisi." : touched && date > today() ? "Cannot be later than today." : undefined} />
        <ReadOnlyField label="Evaluator" testId="evaluator" value={evaluator || "—"} />
        <SelectField label="Evaluation Result" testId="hasil-evaluasi" required value={score ?? ""} onChange={(event) => setScore(event.target.value ? Number(event.target.value) : null)}
          error={touched && score === null ? "Evaluation Result wajib diisi." : undefined} helper="Skor 1–5 dari penilai, skala sama dengan KPI Scorecard; tidak memicu keputusan HR otomatis.">
          <option value="">Select result</option>
          {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} · {SCORE_LABELS[value]}</option>)}
        </SelectField>
      </div>
      {existing && <RevisionConfirm what="An evaluation" existing={`${existing.evaluator}, ${formatDate(existing.evaluationDate)}`} checked={revise} onChange={setRevise}
        error={touched && !revise ? "Centang untuk menyimpan sebagai revisi, atau pilih periode lain." : undefined} />}
      <TextAreaField label="Evaluation notes" testId="catatan-evaluasi" required value={notes} onChange={(event) => setNotes(event.target.value)} error={touched && !notes.trim() ? "Catatan evaluasi wajib diisi." : undefined}
        helper="Tuliskan rekomendasi atau rencana training bila ada — bisa menjadi dasar Development Requirement." />
      <TextField label="Evidence / reference" testId="evidence-reference" value={evidence} onChange={(event) => setEvidence(event.target.value)} helper="Opsional: nomor dokumen atau tautan bukti." />
    </form>
  </FormModal>;
}
