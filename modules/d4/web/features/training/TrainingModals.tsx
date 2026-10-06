"use client";

import { useState, type FormEvent } from "react";
import type { TrainingStatus } from "../../../training/types";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { developmentNeeds, today, trainingById, visibleEmployees } from "../../data/selectors";
import { isTrainingRollback } from "../../../shared/rules";
import { FormError, FormModal, ModalActions, SelectField, TextAreaField, TextField } from "../../ui/forms";
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
  const missing = [!employee && "karyawan", !needOpen && "requirement sumber", !activity.trim() && "training/aktivitas", !date && "tanggal", status === "Completed" && !result.trim() && "hasil"].filter(Boolean);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (missing.length) { setError(`Lengkapi ${missing.join(", ")} sebelum menyimpan.`); return; }
    setError("");
    const saved = await run((source) => source.createTraining({ employeeId: employee, developmentNeedId: need, activity, date, status, result, notes }), "Training tersimpan dan terhubung ke development requirement.");
    if (saved.ok) onClose(); else setError(saved.error);
  }

  return <FormModal title="Tambah Training" description="Training selalu terhubung ke development requirement sumber." onClose={onClose}
    footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Simpan Training" />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Karyawan" testId="employee" required value={employee} onChange={(event) => { setEmployee(event.target.value); setNeed(""); }} error={touched && !employee ? "Karyawan wajib dipilih." : undefined} className="sm:col-span-2">
          <option value="">Pilih karyawan</option>
          {visibleEmployees(snapshot).map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.employeeId}</option>)}
        </SelectField>
        <SelectField label="Requirement sumber" testId="source-requirement" required value={need} onChange={(event) => setNeed(event.target.value)} error={touched && employee && !needOpen ? "Pilih development requirement yang masih terbuka." : undefined} className="sm:col-span-2"
          helper="Requirement berstatus Selesai tidak ditampilkan.">
          <option value="">{!employee ? "Pilih karyawan terlebih dahulu" : needs.length ? "Pilih development requirement" : "Karyawan belum memiliki development requirement yang terbuka"}</option>
          {needs.map((item) => <option key={item.needId} value={item.needId}>{item.objective} · {statusLabel(item.status)}</option>)}
        </SelectField>
        <TextField label="Training / aktivitas" testId="training-activity" required value={activity} onChange={(event) => setActivity(event.target.value)} error={touched && !activity.trim() ? "Nama aktivitas wajib diisi." : undefined} className="sm:col-span-2" />
        <TextField label="Tanggal" testId="date" required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <SelectField label="Status" required value={status} onChange={(event) => setStatus(event.target.value as TrainingStatus)}>{STATUSES.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</SelectField>
        <TextField label="Hasil" testId="result" required={status === "Completed"} value={result} onChange={(event) => setResult(event.target.value)} error={touched && status === "Completed" && !result.trim() ? "Hasil wajib diisi bila status Selesai." : undefined} className="sm:col-span-2" />
      </div>
      <TextAreaField label="Catatan" testId="notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
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
    if (status === "Completed" && !result.trim()) { setError("Hasil wajib diisi bila status Selesai."); return; }
    if (rollback && !notes.trim()) { setError(`Alasan perubahan wajib diisi saat status kembali dari ${statusLabel(record?.status ?? "")} ke ${statusLabel(status)}.`); return; }
    const saved = await run((source) => source.updateTraining(trainingId, status, result, notes), "Progress training disimpan sebagai versi baru.");
    if (saved.ok) onClose(); else setError(saved.error);
  }
  return <FormModal title="Perbarui Progress" description={record?.activity} onClose={onClose} footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Simpan Progress" disabled={unchanged} />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <SelectField label="Status" required value={status} onChange={(event) => setStatus(event.target.value as TrainingStatus)}>{STATUSES.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</SelectField>
      <TextField label="Hasil" testId="result" required={status === "Completed"} value={result} onChange={(event) => setResult(event.target.value)} />
      <TextAreaField label={rollback ? "Alasan perubahan" : "Catatan update"} testId={rollback ? "alasan-perubahan" : "update-notes"} required={rollback} value={notes} onChange={(event) => setNotes(event.target.value)}
        error={touched && rollback && !notes.trim() ? "Alasan wajib diisi." : undefined}
        helper={rollback ? `Status mundur dari ${statusLabel(record?.status ?? "")}; alasan tersimpan di riwayat versi.` : undefined} />
      <Notice tone="warning">Menandai training Selesai tidak menutup competency gap secara otomatis; perlu reassessment.</Notice>
    </form>
  </FormModal>;
}
