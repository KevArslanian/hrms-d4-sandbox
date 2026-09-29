"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { EvaluationAspect, ReviewStatus } from "../../../performance/types";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { employeeById, positionOf, thisMonth, today, visibleEmployees } from "../../data/selectors";
import { FormError, FormModal, ModalActions, ReadOnlyField, SelectField, TextAreaField, TextField } from "../../ui/forms";
import { Button } from "../../ui/primitives";

const DEFAULT_ASPECTS: readonly EvaluationAspect[] = [
  { name: "Work Quality", weight: 20, score: null, notes: "" },
  { name: "Productivity", weight: 15, score: null, notes: "" },
  { name: "Accuracy", weight: 15, score: null, notes: "" },
  { name: "Team Collaboration", weight: 15, score: null, notes: "" },
  { name: "Initiative & Growth", weight: 10, score: null, notes: "" },
  { name: "Discipline", weight: 15, score: null, notes: "" },
  { name: "Attendance", weight: 10, score: null, notes: "" },
];

const REVIEW: ReviewStatus[] = ["Needs Review", "On Track", "Needs Attention"];

/** Weighted mean of the aspect scores (aspect weights are part of this form, not a KPI formula). */
function overall(aspects: readonly EvaluationAspect[]): number | null {
  if (aspects.some((item) => item.score === null)) return null;
  const weight = aspects.reduce((sum, item) => sum + item.weight, 0);
  return weight ? Math.round(aspects.reduce((sum, item) => sum + item.weight * (item.score ?? 0), 0) / weight * 100) / 100 : null;
}

export function EvaluationFormModal({ employeeId, onClose, onSaved }: { employeeId?: string; onClose: () => void; onSaved?: (id: string) => void }) {
  const snapshot = useSnapshot();
  const { run, busy } = useD4();
  const actor = employeeById(snapshot, snapshot.actorEmployeeId);
  const [employee, setEmployee] = useState(employeeId ?? "");
  const [period, setPeriod] = useState(thisMonth());
  const [date, setDate] = useState(today());
  const [evaluator, setEvaluator] = useState(actor?.fullName ?? "");
  const [review, setReview] = useState<ReviewStatus>("Needs Review");
  const [aspects, setAspects] = useState<EvaluationAspect[]>(DEFAULT_ASPECTS.map((item) => ({ ...item })));
  const [notes, setNotes] = useState("");
  const [evidence, setEvidence] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const score = useMemo(() => overall(aspects), [aspects]);
  const position = positionOf(snapshot, employeeById(snapshot, employee));

  function setAspect(index: number, patch: Partial<EvaluationAspect>) {
    setAspects((items) => items.map((item, at) => at === index ? { ...item, ...patch } : item));
  }

  async function save(status: "draft" | "completed") {
    setTouched(true);
    if (!employee) { setError("Pilih employee yang dievaluasi."); return; }
    if (status === "completed" && (score === null || !date || !evaluator.trim())) { setError("Lengkapi tanggal, evaluator, dan skor 1–5 untuk semua aspek sebelum menyimpan evaluasi final."); return; }
    setError("");
    const result = await run((source) => source.createEvaluation({
      employeeId: employee, period, evaluationDate: date, evaluator, status, reviewStatus: review,
      overallScore: score, aspects, generalNotes: notes, evidenceReference: evidence.trim() || null,
    }), status === "draft" ? "Draft evaluasi tersimpan." : "Evaluasi kinerja tersimpan.");
    if (result.ok) { onSaved?.(result.value); onClose(); } else setError(result.error);
  }

  function submit(event: FormEvent) { event.preventDefault(); void save("completed"); }

  return <FormModal title="Add Evaluation" description="Evaluasi baru disimpan sebagai riwayat periode; evaluasi periode sebelumnya tidak ditimpa." onClose={onClose}
    footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save Evaluation" secondary={<Button variant="ghost" disabled={busy} onClick={() => void save("draft")}>Save Draft</Button>} />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Employee" required value={employee} onChange={(event) => setEmployee(event.target.value)} error={touched && !employee ? "Employee wajib dipilih." : undefined} className="sm:col-span-2">
          <option value="">Select employee</option>
          {visibleEmployees(snapshot).map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.employeeId}</option>)}
        </SelectField>
        <ReadOnlyField label="Position" value={position?.title ?? "—"} />
        <TextField label="Period" required type="month" value={period} onChange={(event) => setPeriod(event.target.value)} />
        <TextField label="Evaluation date" required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <TextField label="Evaluator" required value={evaluator} onChange={(event) => setEvaluator(event.target.value)} error={touched && !evaluator.trim() ? "Evaluator wajib diisi." : undefined} />
        <SelectField label="Review status" required value={review} onChange={(event) => setReview(event.target.value as ReviewStatus)} helper="Label tinjauan manual oleh evaluator — bukan keputusan HR otomatis." className="sm:col-span-2">
          {REVIEW.map((item) => <option key={item}>{item}</option>)}
        </SelectField>
      </div>
      <fieldset className="rounded-2xl border border-line">
        <legend className="ml-4 px-1 text-sm font-semibold text-ink-2">Aspek penilaian (skor 1–5)</legend>
        <div className="divide-y divide-line">
          {aspects.map((aspect, index) => <div key={aspect.name} className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_64px_96px_minmax(0,1.2fr)]">
            <span className="text-sm font-semibold text-ink">{aspect.name}</span>
            <span className="text-xs text-ink-3">{aspect.weight}%</span>
            <label className="sr-only" htmlFor={`aspect-${index}`}>Skor {aspect.name}</label>
            <select id={`aspect-${index}`} value={aspect.score ?? ""} onChange={(event) => setAspect(index, { score: event.target.value ? Number(event.target.value) : null })}
              aria-invalid={touched && aspect.score === null} className="h-9 rounded-lg border border-line-strong bg-surface px-2 text-sm aria-[invalid=true]:border-danger">
              <option value="">—</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <input aria-label={`Catatan ${aspect.name}`} value={aspect.notes} onChange={(event) => setAspect(index, { notes: event.target.value })} placeholder="Catatan (opsional)" className="h-9 rounded-lg border border-line-strong px-3 text-sm" />
          </div>)}
        </div>
        <div className="flex items-center justify-between border-t border-line bg-app px-4 py-3 text-sm"><span className="font-semibold text-ink-2">Skor keseluruhan (rata-rata berbobot aspek)</span><strong className="font-display text-lg text-ink">{score === null ? "—" : `${score.toFixed(2)} / 5`}</strong></div>
      </fieldset>
      <TextAreaField label="Catatan evaluasi" value={notes} onChange={(event) => setNotes(event.target.value)} />
      <TextField label="Evidence / reference" value={evidence} onChange={(event) => setEvidence(event.target.value)} helper="Opsional: nomor dokumen atau tautan bukti." />
    </form>
  </FormModal>;
}
