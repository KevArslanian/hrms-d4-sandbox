"use client";

import { useState, type FormEvent } from "react";
import type { TrainingStatus } from "../../../training/types";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { developmentNeeds, employeeById, today, trainingById, visibleEmployees } from "../../data/selectors";
import { isTrainingRollback } from "../../../shared/rules";
import { FormError, FormModal, ModalActions, ReadOnlyField, SearchSelectField, SelectField, TextAreaField, TextField } from "../../ui/forms";
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
    if (missing.length) { setError(`Lengkapi ${missing.join(", ")} sebelum menyimpan.`); return; }
    if (futureDone) { setError("Training yang Completed tidak boleh bertanggal setelah hari ini."); return; }
    setError("");
    const saved = await run((source) => source.createTraining({ employeeId: employee, developmentNeedId: need, activity, date, status, result, notes }), "Training tersimpan dan terhubung ke development requirement-nya.");
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
          <option value="">{!employee ? "Select an employee first" : needs.length ? "Select development requirement" : "Pegawai belum memiliki development requirement yang terbuka"}</option>
          {needs.map((item) => <option key={item.needId} value={item.needId}>{item.objective} · {statusLabel(item.status)}</option>)}
        </SelectField>}
        <TextField label="Training / activity" testId="training-activity" required value={activity} onChange={(event) => setActivity(event.target.value)} error={touched && !activity.trim() ? "Nama aktivitas wajib diisi." : undefined} className="sm:col-span-2" />
        <TextField label="Date" testId="date" required type="date" max={status === "Completed" ? today() : undefined} value={date} onChange={(event) => setDate(event.target.value)} error={touched && futureDone ? "Tidak boleh lebih dari hari ini untuk training yang Completed." : undefined} />
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
    if (rollback && !notes.trim()) { setError(`Alasan wajib diisi saat status mundur dari ${statusLabel(record?.status ?? "")} ke ${statusLabel(status)}.`); return; }
    const saved = await run((source) => source.updateTraining(trainingId, status, result, notes), "Progres training tersimpan sebagai versi baru.");
    if (saved.ok) onClose(); else setError(saved.error);
  }
  return <FormModal title="Update Progress" description={record?.activity} onClose={onClose} footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save Progress" disabled={unchanged} />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <SelectField label="Status" required value={status} onChange={(event) => setStatus(event.target.value as TrainingStatus)}>{STATUSES.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</SelectField>
      <TextField label="Result" testId="result" required={status === "Completed"} value={result} onChange={(event) => setResult(event.target.value)} />
      <TextAreaField label={rollback ? "Reason for change" : "Update notes"} testId={rollback ? "alasan-perubahan" : "update-notes"} required={rollback} value={notes} onChange={(event) => setNotes(event.target.value)}
        error={touched && rollback && !notes.trim() ? "Alasan wajib diisi." : undefined}
        helper={rollback ? `Status mundur dari ${statusLabel(record?.status ?? "")}; alasannya disimpan di riwayat versi.` : undefined} />
      <Notice tone="warning">Menandai training Completed tidak otomatis menutup gap kompetensi; perlu penilaian ulang.</Notice>
    </form>
  </FormModal>;
}
