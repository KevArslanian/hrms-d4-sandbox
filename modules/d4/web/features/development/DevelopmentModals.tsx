"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { DevelopmentPriority, DevelopmentSourceType, DevelopmentStatus } from "../../../development/types";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { currentGap, employeeById, formatDate, formatPeriod, positionOf, sourceTypeLabel, today, visibleEmployees } from "../../data/selectors";
import { FormError, FormModal, ModalActions, ReadOnlyField, SelectField, TextAreaField, TextField } from "../../ui/forms";
import { Notice } from "../../ui/primitives";

/** Valid sources for a development need, same rules the repository enforces. */
function sourceOptions(snapshot: ReturnType<typeof useSnapshot>, employeeId: string, type: DevelopmentSourceType) {
  const employee = employeeById(snapshot, employeeId);
  if (!employee) return [];
  if (type === "competency_gap") return (currentGap(snapshot, employee)?.findings ?? []).filter((item) => item.status === "Gap")
    .map((item) => ({ ref: item.requirementId, label: `${item.competencyName} · level ${item.actualLevel ?? "—"} dari min. ${item.requiredLevel}` }));
  if (type === "role_change") return snapshot.competency.filter((item) => item.employeeId === employeeId && item.context === "role-change")
    .map((item) => ({ ref: item.id, label: `Assessment perubahan posisi · ${formatDate(item.effectiveDate)}` }));
  return snapshot.performance.filter((item) => item.employeeId === employeeId && item.status === "completed")
    .map((item) => ({ ref: item.id, label: `Evaluasi kinerja ${formatPeriod(item.period)}` }));
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
    if (!employee || !options.some((item) => item.ref === reference) || !objective.trim()) { setError("Lengkapi employee, referensi sumber, dan development objective."); return; }
    setError("");
    const result = await run((source) => source.createDevelopment({ employeeId: employee, sourceType: type, sourceRef: reference, objective, priority, notes }), "Development requirement tersimpan dengan referensi sumber.");
    if (result.ok) { onSaved?.(result.value); onClose(); } else setError(result.error);
  }

  return <FormModal title="Add Development Requirement" description="Setiap kebutuhan wajib punya sumber yang dapat ditelusuri (FR-D4-004, FR-D4-007)." onClose={onClose}
    footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save Requirement" />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Employee" required value={employee} onChange={(event) => { setEmployee(event.target.value); setReference(""); }} error={touched && !employee ? "Employee wajib dipilih." : undefined} className="sm:col-span-2">
          <option value="">Select employee</option>
          {visibleEmployees(snapshot).map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.employeeId}</option>)}
        </SelectField>
        <ReadOnlyField label="Position" value={positionOf(snapshot, employeeById(snapshot, employee))?.title ?? "—"} />
        <SelectField label="Source type" required value={type} onChange={(event) => { setType(event.target.value as DevelopmentSourceType); setReference(""); }}>
          {(Object.keys(sourceTypeLabel) as DevelopmentSourceType[]).map((key) => <option key={key} value={key}>{sourceTypeLabel[key]}</option>)}
        </SelectField>
        <SelectField label="Source reference" required value={reference} onChange={(event) => setReference(event.target.value)} className="sm:col-span-2"
          error={touched && !reference ? "Referensi sumber wajib dipilih." : undefined}>
          <option value="">{options.length ? "Select source reference" : "Belum ada sumber yang valid"}</option>
          {options.map((item) => <option key={item.ref} value={item.ref}>{item.label}</option>)}
        </SelectField>
        {employee && !options.length && <div className="sm:col-span-2"><Notice tone="warning">Employee ini belum memiliki sumber bertipe {sourceTypeLabel[type]}. Development tidak dibuat hanya karena periode waktu berlalu.</Notice></div>}
        <TextField label="Development objective" required value={objective} onChange={(event) => setObjective(event.target.value)} error={touched && !objective.trim() ? "Objective wajib diisi." : undefined} className="sm:col-span-2" />
        <SelectField label="Priority" value={priority} onChange={(event) => setPriority(event.target.value as DevelopmentPriority)}>
          {(["High", "Medium", "Low"] as const).map((item) => <option key={item}>{item}</option>)}
        </SelectField>
        <ReadOnlyField label="Created date" value={formatDate(today())} />
      </div>
      <TextAreaField label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} helper="Metode training akhir dipilih HR; tidak ditentukan otomatis oleh gap." />
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
  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await run((source) => source.updateDevelopment(needId, status, notes), "Status development diperbarui sebagai revisi baru.");
    if (result.ok) onClose(); else setError(result.error);
  }
  return <FormModal title="Update Status" description={current?.objective} onClose={onClose} footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save Status" />}>
    <form id="d4-modal-form" onSubmit={submit} className="space-y-5">
      <FormError message={error} />
      <SelectField label="Status" required value={status} onChange={(event) => setStatus(event.target.value as DevelopmentStatus)}>
        {(["Identified", "Planned", "In Progress", "Completed"] as const).map((item) => <option key={item}>{item}</option>)}
      </SelectField>
      <TextAreaField label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      <Notice>Perubahan disimpan sebagai revisi baru; riwayat sebelumnya tetap tersedia. Status Completed tidak menutup competency gap secara otomatis.</Notice>
    </form>
  </FormModal>;
}
