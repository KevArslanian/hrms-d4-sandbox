"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { DevelopmentPriority, DevelopmentSourceType, DevelopmentStatus } from "../../../development/types";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { isDevelopmentRollback, openNeedFor } from "../../../shared/rules";
import { currentGap, developmentNeeds, employeeById, formatDate, formatPeriod, positionOf, sourceTypeLabel, today, trainings, visibleEmployees } from "../../data/selectors";
import { FormError, FormModal, ModalActions, ReadOnlyField, SelectField, TextAreaField, TextField } from "../../ui/forms";
import { Notice, statusLabel } from "../../ui/primitives";

type SourceOption = { ref: string; label: string; covered?: boolean };

/**
 * Valid sources for a development need, same rules the repository enforces. A gap that already has an
 * unfinished need is listed but disabled, so the same gap is not raised twice.
 */
export function sourceOptions(snapshot: ReturnType<typeof useSnapshot>, employeeId: string, type: DevelopmentSourceType): SourceOption[] {
  const employee = employeeById(snapshot, employeeId);
  if (!employee) return [];
  if (type === "competency_gap") {
    const needs = developmentNeeds(snapshot);
    return (currentGap(snapshot, employee)?.findings ?? []).filter((item) => item.status === "Gap")
      .map((item) => ({ ref: item.requirementId, label: `${item.competencyName} · level ${item.actualLevel ?? "—"} of min. ${item.requiredLevel}`, covered: Boolean(openNeedFor(needs, employeeId, type, item.requirementId)) }));
  }
  if (type === "role_change") return snapshot.competency.filter((item) => item.employeeId === employeeId && item.context === "role-change")
    .map((item) => ({ ref: item.id, label: `Position change assessment · ${formatDate(item.effectiveDate)}` }));
  return snapshot.performance.filter((item) => item.employeeId === employeeId && item.status === "completed")
    .map((item) => ({ ref: item.id, label: `Performance evaluation ${formatPeriod(item.period)}` }));
}

export function DevelopmentFormModal({ employeeId, sourceType, sourceRef, onClose, onSaved }: { employeeId?: string; sourceType?: DevelopmentSourceType; sourceRef?: string; onClose: () => void; onSaved?: (id: string) => void }) {
  const snapshot = useSnapshot();
  const { run, busy } = useD4();
  const [employee, setEmployee] = useState(employeeId ?? "");
  const [type, setType] = useState<DevelopmentSourceType>(sourceType ?? "competency_gap");
  const [reference, setReference] = useState(sourceRef ?? "");
  const [objective, setObjective] = useState("");
  const [priority, setPriority] = useState<DevelopmentPriority>("Medium");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const options = useMemo(() => sourceOptions(snapshot, employee, type), [snapshot, employee, type]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    const chosen = options.find((item) => item.ref === reference && !item.covered);
    if (!employee || !chosen || !objective.trim()) { setError("Complete employee, source reference, and development objective before saving."); return; }
    setError("");
    // The gap changes as competencies are updated; keep the level seen when the need was raised.
    const snapshotNote = type === "competency_gap" ? `Gap when created (${formatDate(today())}): ${chosen.label}` : "";
    const result = await run((source) => source.createDevelopment({ employeeId: employee, sourceType: type, sourceRef: reference, objective, priority, notes: [notes.trim(), snapshotNote].filter(Boolean).join("\n") }), "Development requirement saved with its source reference.");
    if (result.ok) { onSaved?.(result.value); onClose(); } else setError(result.error);
  }

  return <FormModal title="Add Development Requirement" description="Every need must have a traceable source." onClose={onClose}
    footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save Requirement" />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Employee" testId="employee" required value={employee} onChange={(event) => { setEmployee(event.target.value); setReference(""); }} error={touched && !employee ? "Employee is required." : undefined} className="sm:col-span-2">
          <option value="">Select employee</option>
          {visibleEmployees(snapshot).map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.employeeId}</option>)}
        </SelectField>
        <ReadOnlyField label="Position" testId="position" value={positionOf(snapshot, employeeById(snapshot, employee))?.title ?? "—"} />
        <SelectField label="Source type" testId="source-type" required value={type} onChange={(event) => { setType(event.target.value as DevelopmentSourceType); setReference(""); }}>
          {(Object.keys(sourceTypeLabel) as DevelopmentSourceType[]).map((key) => <option key={key} value={key}>{sourceTypeLabel[key]}</option>)}
        </SelectField>
        <SelectField label="Source reference" testId="source-reference" required value={reference} onChange={(event) => setReference(event.target.value)} className="sm:col-span-2"
          error={touched && !reference ? "Source reference is required." : undefined}>
          <option value="">{options.some((item) => !item.covered) ? "Select source reference" : "No valid source yet"}</option>
          {options.map((item) => <option key={item.ref} value={item.ref} disabled={item.covered}>{item.label}{item.covered ? " · already has an open requirement" : ""}</option>)}
        </SelectField>
        {employee && options.length > 0 && options.every((item) => item.covered) && <div className="sm:col-span-2"><Notice tone="warning">Every competency gap of this employee already has an unfinished development requirement. Update the existing one in Development Requirement.</Notice></div>}
        {employee && !options.length && <div className="sm:col-span-2"><Notice tone="warning">This employee has no source of type {sourceTypeLabel[type]} yet. Development is not created just because time has passed.</Notice></div>}
        <TextField label="Development objective" testId="development-objective" required value={objective} onChange={(event) => setObjective(event.target.value)} error={touched && !objective.trim() ? "Development objective is required." : undefined} className="sm:col-span-2" />
        <SelectField label="Priority" testId="priority" value={priority} onChange={(event) => setPriority(event.target.value as DevelopmentPriority)}>
          {(["High", "Medium", "Low"] as const).map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
        </SelectField>
        <ReadOnlyField label="Created date" testId="created-date" value={formatDate(today())} />
      </div>
      <TextAreaField label="Notes" testId="notes" value={notes} onChange={(event) => setNotes(event.target.value)} helper="HR chooses the final training method; a gap does not decide it automatically." />
    </form>
  </FormModal>;
}

export function DevelopmentStatusModal({ needId, onClose }: { needId: string; onClose: () => void }) {
  const snapshot = useSnapshot();
  const { run, busy } = useD4();
  const current = snapshot.developmentVersions.filter((item) => item.needId === needId).sort((a, b) => b.revision - a.revision)[0];
  const [status, setStatus] = useState<DevelopmentStatus>(current?.status ?? "Identified");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const openTrainings = trainings(snapshot).filter((item) => item.developmentNeedId === needId && (item.status === "Planned" || item.status === "In Progress"));
  const rollback = current ? isDevelopmentRollback(current.status, status) : false;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (rollback && !notes.trim()) { setError(`A reason is required when the status moves back from ${statusLabel(current?.status ?? "")} to ${statusLabel(status)}.`); return; }
    const result = await run((source) => source.updateDevelopment(needId, status, notes), "Development status updated as a new revision.");
    if (result.ok) onClose(); else setError(result.error);
  }
  return <FormModal title="Update Status" description={current?.objective} onClose={onClose} footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save Status" disabled={status === current?.status} />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <SelectField label="Status" required value={status} onChange={(event) => setStatus(event.target.value as DevelopmentStatus)}>
        {(["Identified", "Planned", "In Progress", "Completed"] as const).map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
      </SelectField>
      {status === "Completed" && openTrainings.length > 0 && <Notice tone="warning">There {openTrainings.length === 1 ? "is" : "are"} still {openTrainings.length} Planned/In Progress training{openTrainings.length === 1 ? "" : "s"} for this requirement ({openTrainings.map((item) => item.activity).join(", ")}). Complete or cancel them first, or explain why in Notes.</Notice>}
      <TextAreaField label="Notes" testId="notes" required={rollback} value={notes} onChange={(event) => setNotes(event.target.value)} helper={status === current?.status ? `The status is already ${status}. Choose another status to save.` : rollback ? "Required: the status is moving back to an earlier stage." : undefined} />
      <Notice>Changes are saved as a new revision; earlier history stays available. A Completed status does not close the competency gap automatically.</Notice>
    </form>
  </FormModal>;
}
