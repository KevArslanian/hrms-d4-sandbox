"use client";

import { useState, type FormEvent } from "react";
import type { TrainingStatus } from "../../../training/types";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { developmentNeeds, today, trainingById, visibleEmployees } from "../../data/selectors";
import { isTrainingRollback } from "../../../shared/rules";
import { FormError, FormModal, ModalActions, SelectField, TextAreaField, TextField } from "../../ui/forms";
import { Notice } from "../../ui/primitives";

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

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!employee || !needOpen || !activity.trim() || !date || (status === "Completed" && !result.trim())) { setError("Lengkapi field wajib. Hasil wajib diisi bila status Completed."); return; }
    setError("");
    const saved = await run((source) => source.createTraining({ employeeId: employee, developmentNeedId: need, activity, date, status, result, notes }), "Training tersimpan dan terhubung ke development requirement.");
    if (saved.ok) onClose(); else setError(saved.error);
  }

  return <FormModal title="Add Training" description="Training selalu terhubung ke development requirement sumber (FR-D4-003)." onClose={onClose}
    footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save Training" />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Employee" required value={employee} onChange={(event) => { setEmployee(event.target.value); setNeed(""); }} error={touched && !employee ? "Employee wajib dipilih." : undefined} className="sm:col-span-2">
          <option value="">Select employee</option>
          {visibleEmployees(snapshot).map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.employeeId}</option>)}
        </SelectField>
        <SelectField label="Source requirement" required value={need} onChange={(event) => setNeed(event.target.value)} error={touched && !needOpen ? "Pilih development requirement yang masih terbuka." : undefined} className="sm:col-span-2"
          helper="Requirement berstatus Completed tidak ditampilkan.">
          <option value="">{needs.length ? "Select development requirement" : "Employee belum memiliki development requirement yang terbuka"}</option>
          {needs.map((item) => <option key={item.needId} value={item.needId}>{item.objective} · {item.status}</option>)}
        </SelectField>
        <TextField label="Training / activity" required value={activity} onChange={(event) => setActivity(event.target.value)} error={touched && !activity.trim() ? "Nama aktivitas wajib diisi." : undefined} className="sm:col-span-2" />
        <TextField label="Date" required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <SelectField label="Status" required value={status} onChange={(event) => setStatus(event.target.value as TrainingStatus)}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</SelectField>
        <TextField label="Result" required={status === "Completed"} value={result} onChange={(event) => setResult(event.target.value)} error={touched && status === "Completed" && !result.trim() ? "Hasil wajib diisi saat Completed." : undefined} className="sm:col-span-2" />
      </div>
      <TextAreaField label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
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
  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (status === "Completed" && !result.trim()) { setError("Hasil wajib diisi saat training Completed."); return; }
    if (rollback && !notes.trim()) { setError(`Alasan perubahan wajib diisi saat status kembali dari ${record?.status} ke ${status}.`); return; }
    const saved = await run((source) => source.updateTraining(trainingId, status, result, notes), "Progress training disimpan sebagai versi baru.");
    if (saved.ok) onClose(); else setError(saved.error);
  }
  return <FormModal title="Update Progress" description={record?.activity} onClose={onClose} footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save Progress" />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <SelectField label="Status" required value={status} onChange={(event) => setStatus(event.target.value as TrainingStatus)}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</SelectField>
      <TextField label="Result" required={status === "Completed"} value={result} onChange={(event) => setResult(event.target.value)} />
      <TextAreaField label={rollback ? "Alasan perubahan" : "Update notes"} required={rollback} value={notes} onChange={(event) => setNotes(event.target.value)}
        error={touched && rollback && !notes.trim() ? "Alasan wajib diisi." : undefined}
        helper={rollback ? `Status mundur dari ${record?.status}; alasan tersimpan di riwayat versi.` : undefined} />
      <Notice tone="warning">Menandai training Completed tidak menutup competency gap secara otomatis; perlu reassessment.</Notice>
    </form>
  </FormModal>;
}
