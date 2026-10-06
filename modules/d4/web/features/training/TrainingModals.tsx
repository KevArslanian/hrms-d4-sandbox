"use client";

import { useState, type FormEvent } from "react";
import type { TrainingStatus } from "../../../training/types";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { developmentNeeds, employeeById, today, trainingById, visibleEmployees } from "../../data/selectors";
import { isTrainingRollback } from "../../../shared/rules";
import { FormError, FormModal, ModalActions, ReadOnlyField, SelectField, TextAreaField, TextField } from "../../ui/forms";
import { Notice, statusLabel } from "../../ui/primitives";

const STATUSES: TrainingStatus[] = ["Planned", "In Progress", "Completed", "Cancelled"];

export function TrainingFormModal({ employeeId, developmentNeedId, onClose }: { employeeId?: string; developmentNeedId?: string; onClose: () => void }) {
  const snapshot = useSnapshot();
  const { run, busy } = useD4();
  const [employee, setEmployee] = useState(employeeId ?? "");
  const [need, setNeed] = useState(developmentNeedId ?? "");
  const [activity, setActivity] = useState("");
  const [date, setDate] = useState(today());
  const [status, setStatus] = useState<TrainingStatus>("Planned");
  const [result, setResult] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  // A completed requirement takes no new training; a new need is raised if the gap remains.
  const needs = developmentNeeds(snapshot).filter((item) => item.employeeId === employee && item.status !== "Completed");
  const needOpen = needs.some((item) => item.needId === need);
  const futureDone = status === "Completed" && date > today();
  const missing = [!employee && "employee", !needOpen && "source requirement", !activity.trim() && "training/activity", !date && "date", status === "Completed" && !result.trim() && "result"].filter(Boolean);
  // Opened from a requirement or employee page: that context is fixed, not re-pickable.
  const lockedEmployee = employeeId ? employeeById(snapshot, employeeId) : undefined;
  const lockedNeed = developmentNeedId ? needs.find((item) => item.needId === developmentNeedId) : undefined;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (missing.length) { setError(`Complete ${missing.join(", ")} before saving.`); return; }
    if (futureDone) { setError("A completed training cannot have a date later than today."); return; }
    setError("");
    const saved = await run((source) => source.createTraining({ employeeId: employee, developmentNeedId: need, activity, date, status, result, notes }), "Training saved and linked to its development requirement.");
    if (saved.ok) onClose(); else setError(saved.error);
  }

  return <FormModal title="Add Training" description="Training is always linked to a source development requirement." onClose={onClose}
    footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save Training" />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        {lockedEmployee ? <ReadOnlyField label="Employee" testId="employee" value={`${lockedEmployee.fullName} · ${lockedEmployee.employeeId}`} className="sm:col-span-2" />
          : <SelectField label="Employee" testId="employee" required value={employee} onChange={(event) => { setEmployee(event.target.value); setNeed(""); }} error={touched && !employee ? "Employee is required." : undefined} className="sm:col-span-2">
            <option value="">Select employee</option>
            {visibleEmployees(snapshot).map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.employeeId}</option>)}
          </SelectField>}
        {lockedNeed ? <ReadOnlyField label="Source requirement" testId="source-requirement" value={`${lockedNeed.objective} · ${statusLabel(lockedNeed.status)}`} className="sm:col-span-2" /> :
        <SelectField label="Source requirement" testId="source-requirement" required value={need} onChange={(event) => setNeed(event.target.value)} error={touched && employee && !needOpen ? "Select a development requirement that is still open." : undefined} className="sm:col-span-2"
          helper="Completed requirements are not listed.">
          <option value="">{!employee ? "Select an employee first" : needs.length ? "Select development requirement" : "The employee has no open development requirement"}</option>
          {needs.map((item) => <option key={item.needId} value={item.needId}>{item.objective} · {statusLabel(item.status)}</option>)}
        </SelectField>}
        <TextField label="Training / activity" testId="training-activity" required value={activity} onChange={(event) => setActivity(event.target.value)} error={touched && !activity.trim() ? "Activity name is required." : undefined} className="sm:col-span-2" />
        <TextField label="Date" testId="date" required type="date" max={status === "Completed" ? today() : undefined} value={date} onChange={(event) => setDate(event.target.value)} error={touched && futureDone ? "Cannot be later than today for a completed training." : undefined} />
        <SelectField label="Status" required value={status} onChange={(event) => setStatus(event.target.value as TrainingStatus)}>{STATUSES.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</SelectField>
        <TextField label="Result" testId="result" required={status === "Completed"} value={result} onChange={(event) => setResult(event.target.value)} error={touched && status === "Completed" && !result.trim() ? "Result is required when the status is Completed." : undefined} className="sm:col-span-2" />
      </div>
      <TextAreaField label="Notes" testId="notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
    </form>
  </FormModal>;
}

export function TrainingProgressModal({ trainingId, onClose }: { trainingId: string; onClose: () => void }) {
  const snapshot = useSnapshot();
  const { run, busy } = useD4();
  const record = trainingById(snapshot, trainingId);
  const [status, setStatus] = useState<TrainingStatus>(record?.status ?? "Planned");
  const [result, setResult] = useState(record?.result ?? "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  // Moving back (e.g. Completed → In Progress) or reopening a cancelled training needs a reason.
  const rollback = record ? isTrainingRollback(record.status, status) : false;
  const unchanged = status === record?.status && result === (record?.result ?? "") && !notes.trim();
  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (status === "Completed" && !result.trim()) { setError("Result is required when the status is Completed."); return; }
    if (rollback && !notes.trim()) { setError(`A reason is required when the status moves back from ${statusLabel(record?.status ?? "")} to ${statusLabel(status)}.`); return; }
    const saved = await run((source) => source.updateTraining(trainingId, status, result, notes), "Training progress saved as a new version.");
    if (saved.ok) onClose(); else setError(saved.error);
  }
  return <FormModal title="Update Progress" description={record?.activity} onClose={onClose} footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save Progress" disabled={unchanged} />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <SelectField label="Status" required value={status} onChange={(event) => setStatus(event.target.value as TrainingStatus)}>{STATUSES.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</SelectField>
      <TextField label="Result" testId="result" required={status === "Completed"} value={result} onChange={(event) => setResult(event.target.value)} />
      <TextAreaField label={rollback ? "Reason for change" : "Update notes"} testId={rollback ? "alasan-perubahan" : "update-notes"} required={rollback} value={notes} onChange={(event) => setNotes(event.target.value)}
        error={touched && rollback && !notes.trim() ? "A reason is required." : undefined}
        helper={rollback ? `The status is moving back from ${statusLabel(record?.status ?? "")}; the reason is kept in the version history.` : undefined} />
      <Notice tone="warning">Marking a training Completed does not close the competency gap automatically; it needs a reassessment.</Notice>
    </form>
  </FormModal>;
}
