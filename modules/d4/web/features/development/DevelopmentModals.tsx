"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { DevelopmentPriority, DevelopmentSourceType, DevelopmentStatus } from "../../../development/types";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { isDevelopmentRollback, openNeedFor, passedTrainingCount, retrainedAt } from "../../../shared/rules";
import { assessableEmployees, currentGap, DEFAULT_SOURCE_TYPE, developmentById, developmentHistory, developmentNeeds, employeeById, formatDate, formatPeriod, latestCurrentPositionAssessment, objectiveFromFinding, objectiveWithMethod, positionOf, scorecardsOf, sourceTypeLabel, today, trainings } from "../../data/selectors";
import { FormError, FormModal, ModalActions, ReadOnlyField, SearchSelectField, SelectField, SuggestField, TextAreaField, TextField } from "../../ui/forms";
import { Notice, statusLabel } from "../../ui/primitives";
import { picOptions } from "./rows";

/** `objective`: suggested text for a gap source (competency and target level), still editable. */
type SourceOption = { ref: string; label: string; covered?: boolean; objective?: string };

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
      .map((item) => ({ ref: item.requirementId, label: `${item.competencyName} · level ${item.actualLevel ?? "—"} of min. ${item.requiredLevel}`, covered: Boolean(openNeedFor(needs, employeeId, type, item.requirementId)), objective: objectiveFromFinding(item) }));
  }
  if (type === "role_change") return snapshot.competency.filter((item) => item.employeeId === employeeId && item.context === "role-change")
    .map((item) => ({ ref: item.id, label: `Position change assessment · ${formatDate(item.effectiveDate)}` }));
  return scorecardsOf(snapshot, employeeId).filter((item) => item.status === "completed")
    .map((item) => ({ ref: item.id, label: `Performance Review ${formatPeriod(item.period)} · ${item.evaluatorName || "—"}` }));
}

// B12 (interview D4, 14 Oct 2026): internal/external training, certification, coaching. Free text stays allowed.
const DEVELOPMENT_METHODS = ["Internal training", "External training", "Certification", "Coaching"];
// TextAreaField's default limit, the server limit of notes.
const NOTES_MAX = 2000;
const OBJECTIVE_HINT = "Tulis kompetensi yang kurang, level targetnya, dan cara menutup gap.";
const OBJECTIVE_EXAMPLE = "Contoh: Naikkan Perencanaan Strategi & Anggaran dari level 3 ke 4 melalui External training";

function MethodField({ value, onChange, helper }: { value: string; onChange: (value: string) => void; helper?: string }) {
  return <SuggestField label="Method" testId="method" maxLength={120} value={value} onChange={onChange} suggestions={DEVELOPMENT_METHODS} helper={helper} />;
}

/** Q13: the PIC (penanggung jawab) is picked from the employee list and stored by name. B13: it is required. */
function PicField({ value, onChange, current, error }: { value: string; onChange: (value: string) => void; current?: string; error?: string }) {
  const snapshot = useSnapshot();
  return <SearchSelectField label="PIC" testId="pic" required value={value} onChange={onChange} placeholder="Select PIC" options={picOptions(snapshot, current)} error={error}
    helper="Penanggung jawab yang menindaklanjuti requirement ini, dipilih dari daftar pegawai." />;
}

function PrioritySelect({ value, onChange }: { value: DevelopmentPriority; onChange: (value: DevelopmentPriority) => void }) {
  return <SelectField label="Priority" testId="priority" value={value} onChange={(event) => onChange(event.target.value as DevelopmentPriority)}>
    {(["High", "Medium", "Low"] as const).map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
  </SelectField>;
}

export function DevelopmentFormModal({ employeeId, sourceType, sourceRef, onClose, onSaved }: { employeeId?: string; sourceType?: DevelopmentSourceType; sourceRef?: string; onClose: () => void; onSaved?: (id: string) => void }) {
  const snapshot = useSnapshot();
  const { run, busy } = useD4();
  const [employee, setEmployee] = useState(employeeId ?? "");
  const [type, setType] = useState<DevelopmentSourceType>(sourceType ?? DEFAULT_SOURCE_TYPE);
  const [reference, setReference] = useState(sourceRef ?? "");
  // A gap source fills the objective in; the user's own text is never overwritten, only the last suggestion.
  const [suggested, setSuggested] = useState(() => sourceRef && employeeId ? sourceOptions(snapshot, employeeId, sourceType ?? DEFAULT_SOURCE_TYPE).find((item) => item.ref === sourceRef)?.objective ?? "" : "");
  const [objective, setObjective] = useState(suggested);
  const [priority, setPriority] = useState<DevelopmentPriority>("Medium");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState("");
  const [pic, setPic] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const options = useMemo(() => sourceOptions(snapshot, employee, type), [snapshot, employee, type]);
  const selectedEmployee = employeeById(snapshot, employee);
  const suggestion = objectiveWithMethod(suggested, method);
  function pickReference(ref: string) {
    setReference(ref);
    const next = options.find((item) => item.ref === ref)?.objective ?? "";
    if (!objective.trim() || objective === suggestion) setObjective(objectiveWithMethod(next, method));
    setSuggested(next);
  }
  function chooseMethod(value: string) {
    if (suggested && objective === suggestion) setObjective(objectiveWithMethod(suggested, value));
    setMethod(value);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    const chosen = options.find((item) => item.ref === reference && !item.covered);
    // PW1: name only the fields that are actually empty, and take the user to the first one.
    const missing = [!employee && ["employee", "input-employee"], !chosen && ["source reference", "input-source-reference"], !objective.trim() && ["development objective", "input-development-objective"], !pic.trim() && ["PIC", "input-pic"]].filter((item) => item !== false);
    if (!chosen || missing.length) {
      setError(`Lengkapi ${missing.map(([field]) => field).join(", ")} sebelum menyimpan.`);
      document.querySelector<HTMLElement>(`[data-testid="${missing[0][1]}"]`)?.focus();
      return;
    }
    setError("");
    // The gap changes as competencies are updated; keep the level seen when the need was raised.
    const snapshotNote = type === "competency_gap" ? `Gap saat dibuat (${formatDate(today())}): ${chosen.label}` : "";
    const result = await run((source) => source.createDevelopment({ employeeId: employee, sourceType: type, sourceRef: reference, objective, priority, method, pic, notes: [notes.trim(), snapshotNote].filter(Boolean).join("\n") }), "Development requirement tersimpan beserta referensi sumbernya.");
    if (result.ok) { onSaved?.(result.value); onClose(); } else setError(result.error);
  }

  return <FormModal title="Add Development Requirement" description="Setiap kebutuhan harus memiliki sumber yang dapat ditelusuri." onClose={onClose}
    footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save Requirement" />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        {employeeId ? <ReadOnlyField label="Employee" testId="employee" value={`${selectedEmployee?.fullName ?? "—"} · ${selectedEmployee?.employeeId ?? ""}`} className="sm:col-span-2" />
          : <SearchSelectField label="Employee" testId="employee" required value={employee} onChange={(value) => { setEmployee(value); pickReference(""); setError(""); }} error={touched && !employee ? "Employee wajib diisi." : undefined} className="sm:col-span-2" placeholder="Select employee"
            options={assessableEmployees(snapshot).map((item) => ({ value: item.id, label: `${item.fullName} · ${item.employeeId}` }))} />}
        <ReadOnlyField label="Position" testId="position" value={positionOf(snapshot, selectedEmployee)?.title ?? "—"} />
        {sourceType ? <ReadOnlyField label="Source type" testId="source-type" value={sourceTypeLabel[type]} /> : <SelectField label="Source type" testId="source-type" required value={type} onChange={(event) => { setType(event.target.value as DevelopmentSourceType); pickReference(""); }}>
          {(Object.keys(sourceTypeLabel) as DevelopmentSourceType[]).map((key) => <option key={key} value={key}>{sourceTypeLabel[key]}</option>)}
        </SelectField>}
        <SelectField label="Source reference" testId="source-reference" required value={reference} onChange={(event) => pickReference(event.target.value)} className="sm:col-span-2"
          error={touched && !reference ? "Source reference wajib diisi." : undefined}>
          <option value="">{options.some((item) => !item.covered) ? "Select source reference" : "Belum ada sumber yang valid"}</option>
          {options.map((item) => <option key={item.ref} value={item.ref} disabled={item.covered}>{item.label}{item.covered ? " · sudah ada requirement yang terbuka" : ""}</option>)}
        </SelectField>
        {employee && options.length > 0 && options.every((item) => item.covered) && <div className="sm:col-span-2"><Notice tone="warning">Setiap gap kompetensi pegawai ini sudah memiliki development requirement yang belum selesai. Perbarui yang sudah ada di Development Requirement.</Notice></div>}
        {employee && !options.length && <div className="sm:col-span-2"><Notice tone="warning">{type === "competency_gap" && selectedEmployee && !latestCurrentPositionAssessment(snapshot, selectedEmployee)
          ? "Simpan dulu penilaian kompetensi untuk posisi aktif pegawai ini (Competency Gap → Save Assessment); development requirement dibuat dari gap yang sudah tersimpan."
          : <>Pegawai ini belum memiliki sumber bertipe {sourceTypeLabel[type]}. Development tidak dibuat hanya karena waktu sudah berlalu.</>}</Notice></div>}
        <TextField label="Development objective" testId="development-objective" required maxLength={500} value={objective} onChange={(event) => setObjective(event.target.value)} placeholder={OBJECTIVE_EXAMPLE}
          error={touched && !objective.trim() ? "Development objective wajib diisi." : undefined} className="sm:col-span-2"
          helper={`${suggested && objective === suggestion ? `Diisi dari gap kompetensi${method.trim() ? " dan Method" : ""}; boleh diubah. ${OBJECTIVE_HINT}` : `${OBJECTIVE_HINT} ${OBJECTIVE_EXAMPLE}.`} ${objective.length}/500`} />
        <PrioritySelect value={priority} onChange={setPriority} />
        <ReadOnlyField label="Created date" testId="created-date" value={formatDate(today())} />
        <MethodField value={method} onChange={chooseMethod} helper="Opsional, tetapi bila sudah diketahui akan ikut masuk ke objective sebagai cara menutup gap." />
        <PicField value={pic} onChange={setPic} error={touched && !pic.trim() ? "PIC wajib diisi." : undefined} />
      </div>
      <TextAreaField label="Notes" testId="notes" value={notes} onChange={(event) => setNotes(event.target.value)} helper={`HR yang menentukan metode training akhir; gap tidak menentukannya secara otomatis. ${notes.length}/${NOTES_MAX}`} />
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
  // After a Retraining only trainings passed since then count, as on the server.
  const since = retrainedAt(developmentHistory(snapshot, needId));
  const passed = passedTrainingCount(trainings(snapshot), needId, since);
  const rollback = current ? isDevelopmentRollback(current.status, status) : false;
  // Same rules as the server: completing while training still runs, or without a passed training, needs a reason.
  const completingOpen = status === "Completed" && openTrainings.length > 0;
  const completingUnpassed = status === "Completed" && passed === 0;
  const needsReason = rollback || completingOpen || completingUnpassed;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (rollback && !notes.trim()) { setError(`Alasan wajib diisi saat status mundur dari ${statusLabel(current?.status ?? "")} ke ${statusLabel(status)}.`); return; }
    if (completingOpen && !notes.trim()) { setError("Training untuk requirement ini masih Planned atau In Progress. Selesaikan atau batalkan dulu, atau jelaskan alasannya di Notes."); return; }
    if (completingUnpassed && !notes.trim()) { setError("Belum ada training berhasil Passed untuk requirement ini. Jelaskan di Notes mengapa requirement tetap diselesaikan."); return; }
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
      {completingUnpassed && <Notice tone="warning">Belum ada training dengan hasil Passed untuk requirement ini{since ? " sejak Retraining terakhir" : ""}. Jika gap ditutup dengan cara lain (misalnya coaching), jelaskan di Notes.</Notice>}
      <TextAreaField label="Notes" testId="notes" required={needsReason} value={notes} onChange={(event) => setNotes(event.target.value)} helper={`${status === current?.status ? `Status sudah ${status}. Pilih status lain untuk menyimpan. ` : rollback ? "Wajib: status mundur ke tahap sebelumnya. " : completingOpen ? "Wajib: jelaskan mengapa requirement diselesaikan saat training masih berjalan. " : completingUnpassed ? "Wajib: belum ada training yang Passed. " : ""}${notes.length}/${NOTES_MAX}`} />
      <Notice>Perubahan disimpan sebagai revisi baru; riwayat sebelumnya tetap tersedia. Status Completed tidak otomatis menutup gap kompetensi.</Notice>
    </form>
  </FormModal>;
}

/** Priority, method and PIC change after creation (interview D4: priority follows context, e.g. a tax policy change). */
export function DevelopmentEditModal({ needId, onClose }: { needId: string; onClose: () => void }) {
  const snapshot = useSnapshot();
  const { run, busy } = useD4();
  const current = developmentById(snapshot, needId);
  const [priority, setPriority] = useState<DevelopmentPriority>(current?.priority ?? "Medium");
  const [method, setMethod] = useState(current?.method ?? "");
  const [pic, setPic] = useState(current?.pic ?? "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  if (!current) return null;
  const unchanged = priority === current.priority && method.trim() === (current.method ?? "") && pic.trim() === (current.pic ?? "");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!current || unchanged) return;
    if (!pic.trim()) { setError("PIC wajib diisi."); return; }
    const result = await run((source) => source.updateDevelopment(needId, current.status, notes, { priority, method, pic }), "Requirement diperbarui sebagai revisi baru.");
    if (result.ok) onClose(); else setError(result.error);
  }
  return <FormModal title="Edit Requirement" description={current.objective} onClose={onClose} footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save Changes" disabled={unchanged} />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <PrioritySelect value={priority} onChange={setPriority} />
        <ReadOnlyField label="Status" testId="status" value={statusLabel(current.status)} />
        <MethodField value={method} onChange={setMethod} />
        <PicField value={pic} onChange={setPic} current={current.pic} />
      </div>
      <TextAreaField label="Reason for change" testId="alasan-perubahan" value={notes} onChange={(event) => setNotes(event.target.value)}
        helper={`${unchanged ? "Belum ada perubahan. Ubah Priority, Method, atau PIC untuk menyimpan." : "Opsional. Contoh: kebijakan pajak berubah, sertifikasi pajak dinaikkan ke High."} ${notes.length}/${NOTES_MAX}`} />
      <Notice>Perubahan disimpan sebagai revisi baru; nilai sebelumnya tetap ada di riwayat.</Notice>
    </form>
  </FormModal>;
}
