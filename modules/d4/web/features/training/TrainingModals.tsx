"use client";

import { useState, type FormEvent } from "react";
import type { CompetencyFinding } from "../../../competency/types";
import type { TrainingStatus } from "../../../training/types";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { developmentById, developmentNeeds, employeeById, reassessmentFor, sourceFinding, today, trainingById, trainingDecision, trainingHistory, visibleEmployees } from "../../data/selectors";
import { followUpOf, isTrainingRollback, meetsBlockedReason, TRAINING_RESULTS, type TrainingCompletion, type TrainingDecision } from "../../../shared/rules";
import { FormError, FormModal, ModalActions, RadioField, ReadOnlyField, SearchSelectField, SelectField, TextAreaField, TextField } from "../../ui/forms";
import { Notice, statusLabel } from "../../ui/primitives";

const STATUSES: TrainingStatus[] = ["Planned", "In Progress", "Completed", "Cancelled"];

/**
 * Passed / Not Passed, shown only for a completed training. `hint`: where the decision is recorded afterwards, for
 * Add Training; Update Progress asks for the decision right below instead.
 */
function ResultField({ value, onChange, error, hint = true }: { value: string; onChange: (value: string) => void; error?: string; hint?: boolean }) {
  return <>
    <SelectField label="Result" testId="result" required value={value} onChange={(event) => onChange(event.target.value)} error={error} className="sm:col-span-2"
      helper="Detail hasil (nilai, sertifikat, catatan trainer) ditulis di Notes.">
      <option value="">Select result</option>
      {TRAINING_RESULTS.map((item) => <option key={item} value={item}>{item}</option>)}
    </SelectField>
    {hint && value && <div className="sm:col-span-2"><Notice>Setelah disimpan, catat {value === "Passed" ? "hasil reassessment" : "tindak lanjutnya"} dari Next step di detail training ini.</Notice></div>}
  </>;
}

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
  const missing = [!employee && "employee", !needOpen && "source requirement", !activity.trim() && "training/activity", !date && "date", status === "Completed" && !result && "result"].filter(Boolean);
  // Opened from a requirement or employee page: that context is fixed, not re-pickable.
  const lockedEmployee = employeeId ? employeeById(snapshot, employeeId) : undefined;
  const lockedNeed = developmentNeedId ? needs.find((item) => item.needId === developmentNeedId) : undefined;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (missing.length) { setError(`Lengkapi ${missing.join(", ")} sebelum menyimpan.`); return; }
    if (futureDone) { setError("Training yang Completed tidak boleh bertanggal setelah hari ini."); return; }
    setError("");
    const saved = await run((source) => source.createTraining({ employeeId: employee, developmentNeedId: need, activity, date, status, result: status === "Completed" ? result : "", notes }), "Training tersimpan dan terhubung ke development requirement-nya.");
    if (saved.ok) onClose(); else setError(saved.error);
  }

  return <FormModal title="Add Training" description="Training selalu terhubung ke development requirement sebagai sumbernya." onClose={onClose}
    footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save Training" />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        {lockedEmployee ? <ReadOnlyField label="Employee" testId="employee" value={`${lockedEmployee.fullName} · ${lockedEmployee.employeeId}`} className="sm:col-span-2" />
          : <SearchSelectField label="Employee" testId="employee" required value={employee} onChange={(value) => { setEmployee(value); setNeed(""); }} error={touched && !employee ? "Employee wajib diisi." : undefined} className="sm:col-span-2" placeholder="Select employee"
            options={visibleEmployees(snapshot).map((item) => ({ value: item.id, label: `${item.fullName} · ${item.employeeId}` }))} />}
        {lockedNeed ? <ReadOnlyField label="Source requirement" testId="source-requirement" value={`${lockedNeed.objective} · ${statusLabel(lockedNeed.status)}`} className="sm:col-span-2" /> :
        <SelectField label="Source requirement" testId="source-requirement" required value={need} onChange={(event) => setNeed(event.target.value)} error={touched && employee && !needOpen ? "Pilih development requirement yang masih terbuka." : undefined} className="sm:col-span-2"
          helper="Requirement yang sudah Completed tidak ditampilkan.">
          <option value="">{!employee ? "Pilih pegawai terlebih dahulu" : needs.length ? "Select development requirement" : "Pegawai belum memiliki development requirement yang terbuka"}</option>
          {needs.map((item) => <option key={item.needId} value={item.needId}>{item.objective} · {statusLabel(item.status)}</option>)}
        </SelectField>}
        <TextField label="Training / activity" testId="training-activity" required maxLength={200} value={activity} onChange={(event) => setActivity(event.target.value)} error={touched && !activity.trim() ? "Nama aktivitas wajib diisi." : undefined} className="sm:col-span-2" />
        <TextField label="Date" testId="date" required type="date" max={status === "Completed" ? today() : undefined} value={date} onChange={(event) => setDate(event.target.value)} error={touched && futureDone ? "Tidak boleh lebih dari hari ini untuk training yang Completed." : undefined} />
        <SelectField label="Status" required value={status} onChange={(event) => setStatus(event.target.value as TrainingStatus)}>{STATUSES.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</SelectField>
        {status === "Completed" && <ResultField value={result} onChange={setResult} error={touched && !result ? "Result wajib dipilih bila status Completed." : undefined} />}
      </div>
      <TextAreaField label="Notes" testId="notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
    </form>
  </FormModal>;
}

const FOLLOW_UP_OPTIONS = [
  { value: "Retraining", label: "Retraining", description: "Training ulang untuk requirement yang sama, dibuat dengan status Planned." },
  { value: "Other follow-up", label: "Other follow-up", description: "Coaching, rotasi, atau eskalasi ke atasan. Catatan wajib." },
];
const LATER = "Decide later";

/** The line under a gap-based decision: the live level of the requirement the training was for. */
export function LevelLine({ finding }: { finding: CompetencyFinding }) {
  return <Notice tone={finding.status === "Terpenuhi" ? "info" : "warning"}>
    <span data-testid="level-now">Competency Gap sekarang · {finding.competencyName}: required {finding.requiredLevel}, current {finding.actualLevel ?? "belum tercatat"} ({statusLabel(finding.status)}).</span>
  </Notice>;
}

/**
 * The one place a training is finished (Training Tracking). Picking Completed asks for the result and, in the same
 * save, HR's decision: Passed → Meets requirement (closes the requirement), Retraining or Decide later; Not Passed →
 * Retraining or Other follow-up (Q16). A training saved Completed without a decision reopens here from its Next step.
 */
export function TrainingProgressModal({ trainingId, onClose }: { trainingId: string; onClose: () => void }) {
  const snapshot = useSnapshot();
  const { run, busy } = useD4();
  const record = trainingById(snapshot, trainingId);
  const need = record && developmentById(snapshot, record.developmentNeedId);
  const [status, setStatus] = useState<TrainingStatus>(record?.status ?? "Planned");
  // Results saved before Passed/Not Passed existed are free text; they must be re-picked on completion.
  const [result, setResult] = useState((TRAINING_RESULTS as readonly string[]).includes(record?.result ?? "") ? record!.result : "");
  const [decision, setDecision] = useState("");
  const [activity, setActivity] = useState(record?.activity ?? "");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  if (!record) return null;
  const pending = trainingDecision(snapshot, record);
  // A recorded decision fixes the result; changing it starts with a status change (a rollback with a reason).
  const decided = record.status === "Completed" && (TRAINING_RESULTS as readonly string[]).includes(record.result) && !pending;
  const deciding = status === "Completed" && !decided && Boolean(result);
  // Moving back (e.g. Completed → In Progress) or reopening a cancelled training needs a reason.
  const rollback = isTrainingRollback(record.status, status);
  const finding = need && sourceFinding(snapshot, need);
  const blocked = meetsBlockedReason(finding);
  const retraining = deciding && decision === "Retraining", other = deciding && decision === "Other follow-up";
  const later = deciding && decision === LATER;
  const options = result === "Passed" ? [
    { value: "Meets requirement", label: "Meets requirement", description: blocked ? "Belum bisa: level di D3 belum memenuhi." : "Gap tertutup. Requirement ditutup (Completed).", testId: "meets-requirement", disabled: Boolean(blocked) },
    { value: "Retraining", label: "Retraining", description: "Gap belum tertutup. Requirement dibuka lagi dan training ulang dibuat (Planned)." },
    { value: LATER, label: LATER, description: "Level di D3 belum diperbarui. Keputusan dicatat nanti dari detail training ini.", testId: "decide-later" },
  ] : FOLLOW_UP_OPTIONS;
  const saveResult = status === "Completed" ? result : "";
  const sameResult = status === record.status && saveResult === record.result;
  const unchanged = sameResult && !notes.trim() && (!deciding || !decision || later);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (status === "Completed" && !result) { setError("Result wajib dipilih bila status Completed: Passed atau Not Passed."); return; }
    if (rollback && !notes.trim()) { setError(`Alasan wajib diisi saat status mundur dari ${statusLabel(record!.status)} ke ${statusLabel(status)}.`); return; }
    if (deciding && !decision) { setError(result === "Passed" ? "Pilih hasil reassessment: Meets requirement, Retraining, atau Decide later." : "Pilih tindak lanjut: Retraining atau Other follow-up."); return; }
    const missing = [retraining && !activity.trim() && "training/activity", retraining && !date && "date", other && !notes.trim() && "notes"].filter(Boolean);
    if (missing.length) { setError(`Lengkapi ${missing.join(", ")} sebelum menyimpan.`); return; }
    setError("");
    const saved = deciding && !later
      ? await run((source) => source.completeTraining(trainingId, { result: result as TrainingCompletion["result"], decision: decision as TrainingDecision, notes, ...(retraining ? { activity, date } : {}) }), DONE[`${result} · ${decision}`])
      : await run((source) => source.updateTraining(trainingId, status, saveResult, notes), later ? "Training Completed (Passed). Catat hasil reassessment dari detail training setelah level di D3 diperbarui." : "Progres training tersimpan sebagai versi baru.");
    if (saved.ok) onClose(); else setError(saved.error);
  }

  return <FormModal title="Update Progress" description={record.activity} onClose={onClose} footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save Progress" disabled={unchanged} />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <SelectField label="Status" required value={status} onChange={(event) => setStatus(event.target.value as TrainingStatus)}>{STATUSES.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</SelectField>
      {status === "Completed" && (decided
        ? <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnlyField label="Result" testId="result" value={record.result} />
            <ReadOnlyField label="Decision" testId="decision" value={followUpOf(trainingHistory(snapshot, record.trainingId)) ?? reassessmentFor(snapshot, record.developmentNeedId) ?? "—"} />
          </div>
        : <ResultField value={result} onChange={(value) => { setResult(value); setDecision(""); }} error={touched && !result ? "Result wajib dipilih." : undefined} hint={false} />)}
      {deciding && <>
        {result === "Passed" && finding && <LevelLine finding={finding} />}
        <RadioField label={result === "Passed" ? "Reassessment result" : "Follow-up"} testId={result === "Passed" ? "reassessment" : "follow-up"} required value={decision}
          onChange={(value) => { setDecision(value); setError(""); }} options={options}
          error={touched && !decision ? (result === "Passed" ? "Hasil reassessment wajib dipilih." : "Pilih tindak lanjut.") : undefined} />
        {retraining && <div className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Source requirement" testId="retraining-source" value={need ? need.objective : "—"} className="sm:col-span-2" />
          <TextField label="Training / activity" testId="retraining-activity" required maxLength={200} value={activity} onChange={(event) => setActivity(event.target.value)} className="sm:col-span-2"
            error={touched && !activity.trim() ? "Nama training wajib diisi." : undefined} />
          <TextField label="Date" testId="retraining-date" required type="date" value={date} onChange={(event) => setDate(event.target.value)} error={touched && !date ? "Tanggal wajib diisi." : undefined} />
          <ReadOnlyField label="Status" testId="retraining-status" value={statusLabel("Planned")} />
        </div>}
      </>}
      <TextAreaField label={rollback ? "Reason for change" : "Update notes"} testId={rollback ? "alasan-perubahan" : "update-notes"} required={rollback || other} value={notes} onChange={(event) => setNotes(event.target.value)}
        error={touched && (rollback || other) && !notes.trim() ? "Catatan wajib diisi." : undefined}
        helper={rollback ? `Status mundur dari ${statusLabel(record.status)}; alasannya disimpan di riwayat versi.` : other ? "Tulis langkahnya (coaching, rotasi, atau eskalasi ke atasan), siapa, dan kapan." : retraining ? "Disalin juga ke catatan training ulang." : undefined} />
    </form>
  </FormModal>;
}

const DONE: Record<string, string> = {
  "Passed · Meets requirement": "Training Completed. Requirement ditutup: Meets requirement.",
  "Passed · Retraining": "Training Completed. Requirement dibuka lagi; training ulang dibuat dengan status Planned.",
  "Not Passed · Retraining": "Training Not Passed tercatat; training ulang dibuat dengan status Planned.",
  "Not Passed · Other follow-up": "Training Not Passed dan tindak lanjutnya tercatat.",
};
