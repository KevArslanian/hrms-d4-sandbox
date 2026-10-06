"use client";

import { useState, type FormEvent } from "react";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { latestForPeriod } from "../../../shared/rules";
import { assessableEmployees, departmentOf, employeeById, formatDate, positionOf, SCORE_LABELS, thisMonth, today } from "../../data/selectors";
import { FormError, FormModal, ModalActions, ReadOnlyField, RevisionConfirm, SelectField, TextAreaField, TextField } from "../../ui/forms";

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
  const missing = [!employee && "employee", !period && "period", !date && "date", date > today() && "a date no later than today", score === null && "evaluation result", !notes.trim() && "evaluation notes", existing && !revise && "revision confirmation"].filter(Boolean);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (missing.length) { setError(`Complete ${missing.join(", ")} before saving.`); return; }
    setError("");
    const result = await run((source) => source.createEvaluation({
      employeeId: employee, period, evaluationDate: date, evaluator, status: "completed", reviewStatus: "Needs Review",
      overallScore: score, aspects: [], generalNotes: notes, evidenceReference: evidence.trim() || null, revisionOf: existing?.id ?? null,
    }), "Performance evaluation saved.");
    if (result.ok) { onSaved?.(result.value); onClose(); } else setError(result.error);
  }

  return <FormModal title="Add Evaluation" description="A new evaluation is saved to the period history; earlier evaluations are never overwritten." onClose={onClose}
    footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save Evaluation" />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Employee" testId="employee" required value={employee} onChange={(event) => setEmployee(event.target.value)} error={touched && !employee ? "Employee is required." : undefined} className="sm:col-span-2">
          <option value="">Select employee</option>
          {assessableEmployees(snapshot).map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.employeeId}</option>)}
        </SelectField>
        <ReadOnlyField label="Position" testId="position" value={positionOf(snapshot, selected)?.title ?? "—"} />
        <ReadOnlyField label="Department" testId="department" value={departmentOf(snapshot, selected)?.name ?? "—"} />
        <TextField label="Period" testId="period" required type="month" value={period} onChange={(event) => setPeriod(event.target.value)} error={touched && !period ? "Period is required." : undefined} />
        <TextField label="Evaluation date" testId="evaluation-date" required type="date" max={today()} value={date} onChange={(event) => setDate(event.target.value)} error={touched && !date ? "Date is required." : touched && date > today() ? "Cannot be later than today." : undefined} />
        <ReadOnlyField label="Evaluator" testId="evaluator" value={evaluator || "—"} />
        <SelectField label="Evaluation result" testId="hasil-evaluasi" required value={score ?? ""} onChange={(event) => setScore(event.target.value ? Number(event.target.value) : null)}
          error={touched && score === null ? "Evaluation result is required." : undefined} helper="Set by the evaluator; it does not trigger any automatic HR decision.">
          <option value="">Select result</option>
          {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} · {SCORE_LABELS[value]}</option>)}
        </SelectField>
      </div>
      {existing && <RevisionConfirm what="An evaluation" existing={`${existing.evaluator}, ${formatDate(existing.evaluationDate)}`} checked={revise} onChange={setRevise}
        error={touched && !revise ? "Tick to save as a revision, or choose another period." : undefined} />}
      <TextAreaField label="Evaluation notes" testId="catatan-evaluasi" required value={notes} onChange={(event) => setNotes(event.target.value)} error={touched && !notes.trim() ? "Evaluation notes are required." : undefined}
        helper="Include training recommendations or plans if any — they can serve as context for a Development Requirement." />
      <TextField label="Evidence / reference" testId="evidence-reference" value={evidence} onChange={(event) => setEvidence(event.target.value)} helper="Optional: a document number or evidence link." />
    </form>
  </FormModal>;
}
