"use client";

import { useState, type FormEvent } from "react";
import type { TrainingStatus } from "../../../training/types";
import { TRAINING_RESULTS, type TrainingCompletion, type TrainingDecision } from "../../../shared/rules";
import { addTrainingToNeeds, bulkSummary, DECIDE_LATER, progressTargets, requireSome, updateTrainings, type BulkFailure, type BulkNeed, type BulkOutcome, type BulkProgress, type BulkTraining } from "../../data/bulk";
import { useD4 } from "../../data/D4DataProvider";
import { includesText, today } from "../../data/selectors";
import { DateField, FormError, FormModal, ModalActions, RadioField, SelectField, TextAreaField, TextField } from "../../ui/forms";
import { cx, Notice, statusLabel } from "../../ui/primitives";
import { BACKGROUND, PASSED_HELPER } from "./TrainingModals";

// TextAreaField's default limit, the server limit of notes.
const NOTES_MAX = 2000;
const saveLabel = (count: number) => `Save ${count} Training${count === 1 ? "" : "s"}`;

/** Who the bulk action is for: the first names, then a count, so a list of 32 does not push the form off screen. */
function TargetList({ items, noun }: { items: readonly { key: string; label: string }[]; noun: string }) {
  const shown = items.slice(0, 5);
  return <div data-testid="bulk-targets" className="rounded-xl bg-muted px-4 py-3 text-sm text-ink">
    <p className="font-semibold">{items.length} {noun}</p>
    <ul className="mt-1.5 space-y-0.5 text-xs text-ink-2">{shown.map((item) => <li key={item.key} className="break-words">{item.label}</li>)}</ul>
    {items.length > shown.length && <p className="mt-1 text-xs text-ink-2">dan {items.length - shown.length} lainnya</p>}
  </div>;
}

/** Rows a bulk save refused, with the reason the single-row save gives; they stay selected for another try. */
function FailureList({ failures }: { failures: readonly BulkFailure[] }) {
  if (!failures.length) return null;
  return <div role="alert" data-testid="bulk-failures" className="rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">
    <p className="font-semibold">{failures.length} tidak tersimpan dan masih dipilih. Perbaiki lalu simpan lagi, atau pilih keputusan lain:</p>
    <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs">{failures.map((item) => <li key={item.key} className="break-words"><strong>{item.label}</strong>: {item.message}</li>)}</ul>
  </div>;
}

/**
 * Open requirements to put on one training, picked in the form itself: Add Training on Training Tracking and Add
 * Participants on a training (PST 2, "kalau temennya mau ikut"). A training always belongs to a requirement, so a
 * colleague without an open one is not listed and needs Add Requirement first.
 */
function NeedPicker({ choices, picked, onChange, error }: { choices: readonly BulkNeed[]; picked: ReadonlySet<string>; onChange: (picked: Set<string>) => void; error?: string }) {
  const [query, setQuery] = useState("");
  const shown = choices.filter((item) => includesText(item.label, query));
  const toggle = (key: string) => onChange(new Set(picked.has(key) ? [...picked].filter((item) => item !== key) : [...picked, key]));
  if (!choices.length) return <Notice tone="warning">Belum ada development requirement terbuka yang bisa diberi training. Pegawai yang mau ikut perlu requirement dulu: buat lewat Add Requirement di Development Requirement.</Notice>;
  return <fieldset data-testid="need-picker" className="min-w-0">
    <legend className="mb-1.5 block text-sm font-semibold text-ink-2">Requirements<span className="text-danger"> *</span></legend>
    <TextField label="Search requirement" testId="need-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or requirement" />
    <ul className="mt-2 max-h-56 divide-y divide-line overflow-y-auto rounded-xl border border-line">
      {shown.map((item) => <li key={item.key}><label className="flex cursor-pointer items-start gap-2.5 px-3 py-2.5 text-sm hover:bg-muted">
        <input type="checkbox" checked={picked.has(item.key)} onChange={() => toggle(item.key)} data-testid={`pick-need-${item.key}`} className="mt-0.5 size-4 shrink-0 accent-primary-600" />
        <span className="min-w-0 break-words text-ink">{item.label}</span>
      </label></li>)}
      {!shown.length && <li className="px-3 py-2.5 text-sm text-ink-3">Tidak ada requirement yang cocok.</li>}
    </ul>
    <p className={cx("mt-1.5 text-xs", error ? "text-danger" : "text-ink-3")}>{error ?? `${picked.size} dipilih. Pegawai tanpa requirement terbuka tidak ada di daftar; buat dulu lewat Add Requirement.`}</p>
  </fieldset>;
}

/**
 * Add Training for several requirements at once: one training each, with the same activity and date. The requirements
 * come selected from Development Requirement (`needs`) or are picked in the form (`choices`); `initial` copies the
 * training a colleague joins. A Completed training needs a result and HR's decision per person, so bulk creation is
 * Planned or In Progress.
 */
export function BulkTrainingModal({ needs, choices, initial, title = "Add Training", onClose, onDone }: {
  needs?: readonly BulkNeed[]; choices?: readonly BulkNeed[]; initial?: { activity: string; date: string; status: TrainingStatus }; title?: string;
  onClose: () => void; onDone?: (outcome: BulkOutcome) => void;
}) {
  const { run, busy } = useD4();
  const [activity, setActivity] = useState(initial?.activity ?? "");
  const [date, setDate] = useState(initial?.date ?? today());
  const [status, setStatus] = useState<TrainingStatus>(initial?.status === "In Progress" ? "In Progress" : "Planned");
  const [notes, setNotes] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [failures, setFailures] = useState<BulkFailure[]>([]);
  const [touched, setTouched] = useState(false);
  const targets = needs ?? (choices ?? []).filter((item) => picked.has(item.key));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    const missing = [!targets.length && "requirement", !activity.trim() && "training/activity", !date && "date"].filter(Boolean);
    if (missing.length) { setError(`Lengkapi ${missing.join(", ")} sebelum menyimpan.`); return; }
    setError("");
    let outcome: BulkOutcome | undefined;
    const saved = await run(async (source) => requireSome(outcome = await addTrainingToNeeds(source, targets, { activity, date, status, notes })), (value) => bulkSummary(value, "training"));
    settle(saved.ok ? saved.value : outcome, saved.ok ? "" : saved.error);
  }
  /** Every refused row is listed with its reason, also when none was saved; a write error without rows is shown as is. */
  function settle(outcome: BulkOutcome | undefined, message: string) {
    if (outcome) {
      onDone?.(outcome);
      // Picked here: what was saved leaves the selection, what was refused stays for another try.
      setPicked((current) => new Set([...current].filter((key) => !outcome.done.includes(key))));
    }
    setFailures(outcome?.failed ?? []);
    setError(outcome?.failed.length ? "" : message);
    if (outcome && !outcome.failed.length) onClose();
  }

  return <FormModal title={title} description={choices
      ? "Pilih requirement setiap peserta. Training yang sama dibuat untuk masing-masing dan tetap terhubung ke requirement-nya."
      : "Satu training untuk setiap requirement yang dipilih, masing-masing tetap terhubung ke requirement-nya."} onClose={onClose}
    footer={<ModalActions onCancel={onClose} busy={busy} submitLabel={saveLabel(targets.length)} disabled={!needs && !choices?.length} />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <FailureList failures={failures} />
      {choices ? <NeedPicker choices={choices} picked={picked} onChange={setPicked} error={touched && !targets.length ? "Pilih minimal satu requirement." : undefined} />
        : <TargetList items={targets} noun="requirement dipilih" />}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Training / activity" testId="bulk-training-activity" required maxLength={200} value={activity} onChange={(event) => setActivity(event.target.value)}
          error={touched && !activity.trim() ? "Nama aktivitas wajib diisi." : undefined} className="sm:col-span-2" />
        <DateField label="Date" testId="bulk-training-date" required value={date} onChange={(event) => setDate(event.target.value)} error={touched && !date ? "Tanggal wajib diisi." : undefined} />
        <SelectField label="Status" testId="bulk-training-status" required value={status} onChange={(event) => setStatus(event.target.value as TrainingStatus)}
          helper="Completed dicatat per training lewat Update Progress, karena hasil dan keputusannya per orang.">
          {(["Planned", "In Progress"] as const).map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
        </SelectField>
      </div>
      <TextAreaField label="Notes" testId="bulk-training-notes" maxLength={NOTES_MAX} value={notes} onChange={(event) => setNotes(event.target.value)} helper={`${notes.length}/${NOTES_MAX}`} />
    </form>
  </FormModal>;
}

const PASSED_OPTIONS = [
  { value: "Meets requirement", label: "Gap closed: Meets requirement", description: "Gap tertutup. Untuk requirement dari Competency Gap, hanya tersimpan bila level di data kompetensi (D3) sudah memenuhi.", testId: "meets-requirement" },
  // Retraining after a pass waits for the reassessment (interview 14 Oct, part 2, 00:53:31), so it is not offered here.
  { value: DECIDE_LATER, label: DECIDE_LATER, description: "Hasil Passed disimpan sekarang. Setelah kompetensinya dinilai ulang di Competency Gap, pilih Meets requirement atau Retraining dari Next step.", testId: "decide-later" },
];
const NOT_PASSED_OPTIONS = [
  { value: "Retraining", label: "Retraining", description: "Training ulang untuk requirement yang sama, dibuat dengan status Planned." },
  { value: "Other follow-up", label: "Other follow-up", description: "Coaching, rotasi, atau eskalasi ke atasan. Catatan wajib." },
];

/**
 * Training Tracking → Update Progress for the selected trainings: In Progress, or Completed with one result and one
 * decision for all of them (interview 13 Nov 2026: 32 field agents cannot be completed one by one). Rows the single
 * Update Progress would refuse are refused here with the same message and stay selected.
 */
export function BulkProgressModal({ trainings, onClose, onDone }: { trainings: readonly BulkTraining[]; onClose: () => void; onDone: (outcome: BulkOutcome) => void }) {
  const { run, busy } = useD4();
  const [status, setStatus] = useState<BulkProgress["status"]>("Completed");
  const [result, setResult] = useState("");
  const [decision, setDecision] = useState("");
  const [activity, setActivity] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [failures, setFailures] = useState<BulkFailure[]>([]);
  const [touched, setTouched] = useState(false);
  const completing = status === "Completed";
  const targets = progressTargets(trainings, { status });
  const skipped = trainings.length - targets.length;
  const retraining = completing && decision === "Retraining", other = completing && decision === "Other follow-up";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (completing && !result) { setError("Result wajib dipilih bila status Completed: Passed atau Not Passed."); return; }
    if (completing && !decision) { setError(result === "Passed" ? "Pilih Competency after training: Gap closed atau Decide later." : "Pilih tindak lanjut: Retraining atau Other follow-up."); return; }
    const missing = [retraining && !activity.trim() && "training/activity", retraining && !date && "date", other && !notes.trim() && "notes"].filter(Boolean);
    if (missing.length) { setError(`Lengkapi ${missing.join(", ")} sebelum menyimpan.`); return; }
    setError("");
    const change: BulkProgress = completing
      ? { status, result: result as TrainingCompletion["result"], decision: decision as TrainingDecision | typeof DECIDE_LATER, notes, ...(retraining ? { activity, date } : {}) }
      : { status, notes };
    let outcome: BulkOutcome | undefined;
    const saved = await run(async (source) => requireSome(outcome = await updateTrainings(source, trainings, change)), (value) => bulkSummary(value, "training"), BACKGROUND);
    settle(saved.ok ? saved.value : outcome, saved.ok ? "" : saved.error);
  }
  /** Same as in BulkTrainingModal: refused rows stay listed and selected, a fully saved batch closes the form. */
  function settle(outcome: BulkOutcome | undefined, message: string) {
    if (outcome) onDone(outcome);
    setFailures(outcome?.failed ?? []);
    setError(outcome?.failed.length ? "" : message);
    if (outcome && !outcome.failed.length) onClose();
  }

  return <FormModal title="Update Progress" description="Satu perubahan untuk semua training yang dipilih; setiap training tetap disimpan sebagai versi barunya sendiri." onClose={onClose}
    footer={<ModalActions onCancel={onClose} busy={busy} submitLabel={saveLabel(targets.length)} disabled={!targets.length} />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <FailureList failures={failures} />
      <TargetList items={trainings} noun="training dipilih" />
      <SelectField label="Status" testId="bulk-progress-status" required value={status} onChange={(event) => { setStatus(event.target.value as BulkProgress["status"]); setError(""); }}>
        {(["In Progress", "Completed"] as const).map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
      </SelectField>
      {skipped > 0 && <Notice>{targets.length ? `${skipped} training sudah In Progress dan tidak diubah.` : "Semua training yang dipilih sudah In Progress."}</Notice>}
      {completing && <>
        <SelectField label="Result" testId="bulk-progress-result" required value={result} onChange={(event) => { setResult(event.target.value); setDecision(""); setError(""); }}
          error={touched && !result ? "Result wajib dipilih." : undefined} helper="Hasil yang sama untuk semua training yang dipilih. Detail per orang ditulis di Notes training masing-masing.">
          <option value="">Select result</option>
          {TRAINING_RESULTS.map((item) => <option key={item} value={item}>{item}</option>)}
        </SelectField>
        {result && <RadioField label={result === "Passed" ? "Competency after training" : "Follow-up"} testId={result === "Passed" ? "bulk-reassessment" : "bulk-follow-up"} required value={decision}
          helper={result === "Passed" ? PASSED_HELPER : undefined}
          onChange={(value) => { setDecision(value); setError(""); }} options={result === "Passed" ? PASSED_OPTIONS : NOT_PASSED_OPTIONS}
          error={touched && !decision ? (result === "Passed" ? "Hasil reassessment wajib dipilih." : "Pilih tindak lanjut.") : undefined} />}
        {retraining && <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Retraining / activity" testId="bulk-retraining-activity" required maxLength={200} value={activity} onChange={(event) => setActivity(event.target.value)} className="sm:col-span-2"
            error={touched && !activity.trim() ? "Nama training wajib diisi." : undefined} />
          <DateField label="Date" testId="bulk-retraining-date" required value={date} onChange={(event) => setDate(event.target.value)} error={touched && !date ? "Tanggal wajib diisi." : undefined} />
        </div>}
      </>}
      <TextAreaField label="Update notes" testId="bulk-progress-notes" required={other} maxLength={NOTES_MAX} value={notes} onChange={(event) => setNotes(event.target.value)}
        error={touched && other && !notes.trim() ? "Catatan wajib diisi." : undefined}
        helper={`${other ? "Tulis langkahnya (coaching, rotasi, atau eskalasi ke atasan), siapa, dan kapan. " : ""}${notes.length}/${NOTES_MAX}`} />
    </form>
  </FormModal>;
}
