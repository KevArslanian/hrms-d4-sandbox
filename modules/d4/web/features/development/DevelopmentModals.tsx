"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { DevelopmentPriority, DevelopmentSourceType, DevelopmentStatus } from "../../../development/types";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { isDevelopmentRollback, openNeedFor } from "../../../shared/rules";
import { currentGap, developmentNeeds, employeeById, formatDate, formatPeriod, latestCurrentPositionAssessment, positionOf, scorecardsOf, sourceTypeLabel, today, trainings, visibleEmployees } from "../../data/selectors";
import { FormError, FormModal, ModalActions, ReadOnlyField, SearchSelectField, SelectField, TextAreaField, TextField } from "../../ui/forms";
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
    // Same rule as the server: gap-based needs come only after the assessment for the active position is saved.
    if (!latestCurrentPositionAssessment(snapshot, employee)) return [];
    const needs = developmentNeeds(snapshot);
    return (currentGap(snapshot, employee)?.findings ?? []).filter((item) => item.status === "Gap")
      .map((item) => ({ ref: item.requirementId, label: `${item.competencyName} · level ${item.actualLevel ?? "—"} of min. ${item.requiredLevel}`, covered: Boolean(openNeedFor(needs, employeeId, type, item.requirementId)) }));
  }
  if (type === "role_change") return snapshot.competency.filter((item) => item.employeeId === employeeId && item.context === "role-change")
    .map((item) => ({ ref: item.id, label: `Position change assessment · ${formatDate(item.effectiveDate)}` }));
  return scorecardsOf(snapshot, employeeId).filter((item) => item.status === "completed")
    .map((item) => ({ ref: item.id, label: `Penilaian Kinerja ${formatPeriod(item.period)} · ${item.evaluatorName || "—"}` }));
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
  const selectedEmployee = employeeById(snapshot, employee);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    const chosen = options.find((item) => item.ref === reference && !item.covered);
    if (!employee || !chosen || !objective.trim()) { setError("Lengkapi employee, source reference, dan development objective sebelum menyimpan."); return; }
    setError("");
    // The gap changes as competencies are updated; keep the level seen when the need was raised.
    const snapshotNote = type === "competency_gap" ? `Gap saat dibuat (${formatDate(today())}): ${chosen.label}` : "";
    const result = await run((source) => source.createDevelopment({ employeeId: employee, sourceType: type, sourceRef: reference, objective, priority, notes: [notes.trim(), snapshotNote].filter(Boolean).join("\n") }), "Development requirement tersimpan beserta referensi sumbernya.");
    if (result.ok) { onSaved?.(result.value); onClose(); } else setError(result.error);
  }

  return <FormModal title="Add Development Requirement" description="Setiap kebutuhan harus memiliki sumber yang dapat ditelusuri." onClose={onClose}
    footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save Requirement" />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        {employeeId ? <ReadOnlyField label="Employee" testId="employee" value={`${selectedEmployee?.fullName ?? "—"} · ${selectedEmployee?.employeeId ?? ""}`} className="sm:col-span-2" />
          : <SearchSelectField label="Employee" testId="employee" required value={employee} onChange={(value) => { setEmployee(value); setReference(""); setError(""); }} error={touched && !employee ? "Employee wajib diisi." : undefined} className="sm:col-span-2" placeholder="Select employee"
            options={visibleEmployees(snapshot).map((item) => ({ value: item.id, label: `${item.fullName} · ${item.employeeId}` }))} />}
        <ReadOnlyField label="Position" testId="position" value={positionOf(snapshot, selectedEmployee)?.title ?? "—"} />
        {sourceType ? <ReadOnlyField label="Source type" testId="source-type" value={sourceTypeLabel[type]} /> : <SelectField label="Source type" testId="source-type" required value={type} onChange={(event) => { setType(event.target.value as DevelopmentSourceType); setReference(""); }}>
          {(Object.keys(sourceTypeLabel) as DevelopmentSourceType[]).map((key) => <option key={key} value={key}>{sourceTypeLabel[key]}</option>)}
        </SelectField>}
        <SelectField label="Source reference" testId="source-reference" required value={reference} onChange={(event) => setReference(event.target.value)} className="sm:col-span-2"
          error={touched && !reference ? "Source reference wajib diisi." : undefined}>
          <option value="">{options.some((item) => !item.covered) ? "Select source reference" : "Belum ada sumber yang valid"}</option>
          {options.map((item) => <option key={item.ref} value={item.ref} disabled={item.covered}>{item.label}{item.covered ? " · sudah ada requirement yang terbuka" : ""}</option>)}
        </SelectField>
        {employee && options.length > 0 && options.every((item) => item.covered) && <div className="sm:col-span-2"><Notice tone="warning">Setiap gap kompetensi pegawai ini sudah memiliki development requirement yang belum selesai. Perbarui yang sudah ada di Development Requirement.</Notice></div>}
        {employee && !options.length && <div className="sm:col-span-2"><Notice tone="warning">{type === "competency_gap" && selectedEmployee && !latestCurrentPositionAssessment(snapshot, selectedEmployee)
          ? "Simpan dulu penilaian kompetensi untuk posisi aktif pegawai ini (Competency Gap → Save Assessment); development requirement dibuat dari gap yang sudah tersimpan."
          : <>Pegawai ini belum memiliki sumber bertipe {sourceTypeLabel[type]}. Development tidak dibuat hanya karena waktu sudah berlalu.</>}</Notice></div>}
        <TextField label="Development objective" testId="development-objective" required value={objective} onChange={(event) => setObjective(event.target.value)} error={touched && !objective.trim() ? "Development objective wajib diisi." : undefined} className="sm:col-span-2" />
        <SelectField label="Priority" testId="priority" value={priority} onChange={(event) => setPriority(event.target.value as DevelopmentPriority)}>
          {(["High", "Medium", "Low"] as const).map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
        </SelectField>
        <ReadOnlyField label="Created date" testId="created-date" value={formatDate(today())} />
      </div>
      <TextAreaField label="Notes" testId="notes" value={notes} onChange={(event) => setNotes(event.target.value)} helper="HR yang menentukan metode training akhir; gap tidak menentukannya secara otomatis." />
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
  // Same rule as the server: completing while training still runs needs a reason.
  const completingOpen = status === "Completed" && openTrainings.length > 0;
  const needsReason = rollback || completingOpen;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (rollback && !notes.trim()) { setError(`Alasan wajib diisi saat status mundur dari ${statusLabel(current?.status ?? "")} ke ${statusLabel(status)}.`); return; }
    if (completingOpen && !notes.trim()) { setError("Training untuk requirement ini masih Planned atau In Progress. Selesaikan atau batalkan dulu, atau jelaskan alasannya di Notes."); return; }
    const result = await run((source) => source.updateDevelopment(needId, status, notes), "Status development diperbarui sebagai revisi baru.");
    if (result.ok) onClose(); else setError(result.error);
  }
  return <FormModal title="Update Status" description={current?.objective} onClose={onClose} footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save Status" disabled={status === current?.status} />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <SelectField label="Status" required value={status} onChange={(event) => setStatus(event.target.value as DevelopmentStatus)}>
        {(["Identified", "Planned", "In Progress", "Completed"] as const).map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
      </SelectField>
      {status === "Completed" && openTrainings.length > 0 && <Notice tone="warning">Masih ada {openTrainings.length} training berstatus Planned/In Progress untuk requirement ini ({openTrainings.map((item) => item.activity).join(", ")}). Selesaikan atau batalkan terlebih dahulu, atau jelaskan alasannya di Notes.</Notice>}
      <TextAreaField label="Notes" testId="notes" required={needsReason} value={notes} onChange={(event) => setNotes(event.target.value)} helper={status === current?.status ? `Status sudah ${status}. Pilih status lain untuk menyimpan.` : rollback ? "Wajib: status mundur ke tahap sebelumnya." : completingOpen ? "Wajib: jelaskan mengapa requirement diselesaikan saat training masih berjalan." : undefined} />
      <Notice>Perubahan disimpan sebagai revisi baru; riwayat sebelumnya tetap tersedia. Status Completed tidak otomatis menutup gap kompetensi.</Notice>
    </form>
  </FormModal>;
}
