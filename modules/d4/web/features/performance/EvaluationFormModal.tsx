"use client";

import { useState, type FormEvent } from "react";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { latestForPeriod } from "../../../shared/rules";
import { assessableEmployees, departmentOf, employeeById, formatDate, positionOf, thisMonth, today } from "../../data/selectors";
import { FormError, FormModal, ModalActions, ReadOnlyField, RevisionConfirm, SearchSelectField, TextAreaField, TextField } from "../../ui/forms";

/**
 * Employee, period, date, evaluator, notes, optional evidence. An evaluation is a written record only:
 * scores live in the KPI Scorecard, so the form asks for no result, aspects, weights or review labels.
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
  const [notes, setNotes] = useState("");
  const [evidence, setEvidence] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [revise, setRevise] = useState(false);
  const selected = employeeById(snapshot, employee);
  const existing = employee && period ? latestForPeriod(snapshot.performance, employee, period) : undefined;
  const missing = [!employee && "employee", !period && "period", !date && "date", date > today() && "a date no later than today", !notes.trim() && "evaluation notes", existing && !revise && "revision confirmation"].filter(Boolean);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (missing.length) { setError(`Complete ${missing.join(", ")} before saving.`); return; }
    setError("");
    const result = await run((source) => source.createEvaluation({
      employeeId: employee, period, evaluationDate: date, evaluator, status: "completed", reviewStatus: "Needs Review",
      overallScore: null, aspects: [], generalNotes: notes, evidenceReference: evidence.trim() || null, revisionOf: existing?.id ?? null,
    }), "Performance evaluation saved.");
    if (result.ok) { onSaved?.(result.value); onClose(); } else setError(result.error);
  }

  return <FormModal title="Add Evaluation" description="Record evaluation notes for the period. Scores are recorded in the KPI Scorecard; earlier evaluations are never overwritten." onClose={onClose}
    footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save Evaluation" />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SearchSelectField label="Employee" testId="employee" required value={employee} onChange={(value) => setEmployee(value)} error={touched && !employee ? "Employee is required." : undefined} className="sm:col-span-2" placeholder="Select employee"
          options={assessableEmployees(snapshot).map((item) => ({ value: item.id, label: `${item.fullName} · ${item.employeeId}` }))} />
        <ReadOnlyField label="Position" testId="position" value={positionOf(snapshot, selected)?.title ?? "—"} />
        <ReadOnlyField label="Department" testId="department" value={departmentOf(snapshot, selected)?.name ?? "—"} />
        <TextField label="Period" testId="period" required type="month" value={period} onChange={(event) => setPeriod(event.target.value)} error={touched && !period ? "Period is required." : undefined} />
        <TextField label="Evaluation date" testId="evaluation-date" required type="date" max={today()} value={date} onChange={(event) => setDate(event.target.value)} error={touched && !date ? "Date is required." : touched && date > today() ? "Cannot be later than today." : undefined} />
        <ReadOnlyField label="Evaluator" testId="evaluator" value={evaluator || "—"} />
      </div>
      {existing && <RevisionConfirm what="An evaluation" existing={`${existing.evaluator}, ${formatDate(existing.evaluationDate)}`} checked={revise} onChange={setRevise}
        error={touched && !revise ? "Tick to save as a revision, or choose another period." : undefined} />}
      <TextAreaField label="Evaluation notes" testId="catatan-evaluasi" required value={notes} onChange={(event) => setNotes(event.target.value)} error={touched && !notes.trim() ? "Evaluation notes are required." : undefined}
        helper="Include training recommendations or plans if any — they can serve as context for a Development Requirement." />
      <TextField label="Evidence / reference" testId="evidence-reference" value={evidence} onChange={(event) => setEvidence(event.target.value)} helper="Optional: a document number or evidence link." />
    </form>
  </FormModal>;
}
