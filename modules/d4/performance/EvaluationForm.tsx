"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { d4ReferenceFixture } from "../shared/fixtures";
import { savePerformanceEvaluation } from "./service";
import type { EvaluationAspect, EvaluationInput, EvaluationStatus, PerformanceEvaluation } from "./types";

function initialInput(employeeId: string, initialEvaluation?: PerformanceEvaluation): EvaluationInput {
  if (initialEvaluation) return {
    employeeId: initialEvaluation.employeeId,
    period: initialEvaluation.period,
    evaluationDate: initialEvaluation.evaluationDate,
    evaluator: initialEvaluation.evaluator,
    status: initialEvaluation.status,
    reviewStatus: initialEvaluation.reviewStatus,
    overallScore: initialEvaluation.overallScore,
    aspects: initialEvaluation.aspects.map((aspect) => ({ ...aspect })),
    generalNotes: initialEvaluation.generalNotes,
    evidenceReference: initialEvaluation.evidenceReference,
  };
  return {
    employeeId,
    period: "2026-09",
    evaluationDate: new Date().toISOString().slice(0, 10),
    evaluator: "",
    status: "draft",
    reviewStatus: "Needs Review",
    overallScore: null,
    aspects: [
      { name: "Work Quality", weight: 20, score: null, notes: "" },
      { name: "Productivity", weight: 15, score: null, notes: "" },
      { name: "Accuracy", weight: 15, score: null, notes: "" },
      { name: "Team Collaboration", weight: 15, score: null, notes: "" },
      { name: "Initiative & Growth", weight: 10, score: null, notes: "" },
      { name: "Discipline", weight: 15, score: null, notes: "" },
      { name: "Attendance", weight: 10, score: null, notes: "" },
    ],
    generalNotes: "",
    evidenceReference: null,
  };
}

export function EvaluationForm({ employeeId, initialEvaluation, onClose, onSaved }: {
  employeeId: string;
  initialEvaluation?: PerformanceEvaluation;
  onClose: () => void;
  onSaved: (message: string, recordId: string) => void;
}) {
  const [input, setInput] = useState<EvaluationInput>(() => initialInput(employeeId, initialEvaluation));
  const [error, setError] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const employee = d4ReferenceFixture.employees.find((item) => item.id === input.employeeId);
  const position = d4ReferenceFixture.positions.find((item) => item.id === employee?.positionId);
  const department = d4ReferenceFixture.departments.find((item) => item.id === employee?.departmentId);
  const scorePercent = input.overallScore === null ? 0 : Math.max(0, Math.min(100, input.overallScore / 5 * 100));

  function updateAspect(index: number, patch: Partial<EvaluationAspect>) {
    setInput((current) => {
      const aspects = current.aspects.map((aspect, idx) => idx === index ? { ...aspect, ...patch } : aspect);
      const overallScore = aspects.every((aspect) => aspect.score !== null)
        ? Math.round(aspects.reduce((total, aspect) => total + (aspect.score ?? 0) * aspect.weight, 0)) / 100
        : null;
      return { ...current, aspects, overallScore };
    });
    setError("");
  }

  function save(status: EvaluationStatus) {
    if (!input.employeeId) { setError("Pilih employee sebelum menyimpan evaluasi."); return; }
    try {
      const record = savePerformanceEvaluation({ ...input, status });
      onSaved(`${status === "draft" ? "Draft" : "Evaluasi"} tersimpan sebagai riwayat baru untuk ${record.period}.`, record.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Evaluasi gagal disimpan.");
    }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="evaluation-form-title" className="max-h-[94vh] w-full max-w-[1480px] overflow-y-auto rounded-lg bg-white p-5 shadow-2xl sm:p-8 lg:p-10">
      <div className="mb-5 flex items-center justify-between">
        <div><h2 id="evaluation-form-title" className="sr-only">{initialEvaluation ? "Edit Performance Evaluation" : "Add Performance Evaluation"}</h2><p className="text-xs text-[#7e8da4]">{initialEvaluation ? "Edit Performance Evaluation, simpan sebagai riwayat baru" : "Add Performance Evaluation"}</p></div>
        <button type="button" aria-label="Tutup formulir" onClick={onClose} className="rounded-md p-2 text-[#6b7d96] hover:bg-[#f0f3f8]"><X size={18} /></button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-semibold text-[#4d607d]">Employee *<select value={input.employeeId} onChange={(event) => setInput({ ...input, employeeId: event.target.value })} className="mt-2 h-10 w-full rounded-lg border border-[#d5dde8] bg-white px-3 text-sm font-normal text-[#294269]"><option value="">Select Employee</option>{d4ReferenceFixture.employees.filter((item) => item.employeeId !== "FIX-D4-EMP-001").map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}</select></label>
        <label className="text-xs font-semibold text-[#4d607d]">Position<div className="mt-2 flex h-10 items-center rounded-lg border border-[#d5dde8] bg-[#eef2f7] px-3 text-sm font-normal text-[#486383]">{position?.title ?? "–"}</div></label>
        <label className="text-xs font-semibold text-[#4d607d]">Department<div className="mt-2 flex h-10 items-center rounded-lg border border-[#d5dde8] bg-[#eef2f7] px-3 text-sm font-normal text-[#486383]">{department?.name ?? "–"}</div></label>
        <label className="text-xs font-semibold text-[#4d607d]">Evaluation Period *<input type="month" value={input.period} onChange={(event) => setInput({ ...input, period: event.target.value })} className="mt-2 h-10 w-full rounded-lg border border-[#d5dde8] px-3 text-sm font-normal text-[#294269]" /></label>
        <label className="text-xs font-semibold text-[#4d607d]">Evaluation Date *<input type="date" value={input.evaluationDate} onChange={(event) => setInput({ ...input, evaluationDate: event.target.value })} className="mt-2 h-10 w-full rounded-lg border border-[#d5dde8] px-3 text-sm font-normal text-[#294269]" /></label>
        <label className="text-xs font-semibold text-[#4d607d]">Evaluator *<input value={input.evaluator} onChange={(event) => setInput({ ...input, evaluator: event.target.value })} placeholder="Nama evaluator" className="mt-2 h-10 w-full rounded-lg border border-[#d5dde8] px-3 text-sm font-normal text-[#294269]" /></label>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(260px,.9fr)]">
        <div className="overflow-x-auto rounded-lg border border-[#dce5f0]">
          <table className="w-full min-w-[610px] text-left text-xs">
            <thead className="bg-[#f2f5fc] text-[11px] font-bold uppercase tracking-wide text-[#445b80]"><tr><th className="px-4 py-4">Aspect</th><th className="px-4 py-4">Weight</th><th className="px-4 py-4">Score</th><th className="px-4 py-4">Comments</th></tr></thead>
            <tbody className="divide-y divide-[#e7ecf4]">{input.aspects.map((aspect, index) => <tr key={index}>
              <td className="px-4 py-3 font-medium text-[#324766]">{aspect.name}</td><td className="px-4 py-3 text-[#465b79]">{aspect.weight}%</td>
              <td className="px-4 py-3"><input aria-label={`Skor ${aspect.name}`} type="number" min="1" max="5" step="1" value={aspect.score ?? ""} onChange={(event) => updateAspect(index, { score: event.target.value === "" ? null : Number(event.target.value) })} className="h-8 w-16 rounded border border-[#d7dfeb] px-2" /></td>
              <td className="px-4 py-3"><input aria-label={`Komentar ${aspect.name}`} value={aspect.notes} onChange={(event) => updateAspect(index, { notes: event.target.value })} className="h-8 w-full rounded border border-[#d7dfeb] px-2" /></td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="flex flex-col items-center"><h3 className="text-center text-2xl font-bold text-[#1e3b6a]">Overall Score</h3>
          <div className="mt-6 flex size-56 items-center justify-center rounded-full" style={{ background: `conic-gradient(#2cbf7b ${scorePercent}%, #dbe3ef ${scorePercent}% 100%)` }}><div className="flex size-40 flex-col items-center justify-center rounded-full bg-white text-[#1e3b6a]"><strong className="text-3xl">{input.overallScore === null ? "" : input.overallScore.toFixed(1)}</strong>{input.overallScore !== null && <small className="text-xs">of 5.0</small>}</div></div>
          {input.overallScore !== null && input.overallScore >= 4 && <span className="mt-6 rounded-full border border-[#c9edda] bg-[#e8f7ed] px-5 py-2 text-xs font-semibold text-[#28845a]">Good Performance</span>}
          <p className="mt-3 max-w-[270px] text-center text-[11px] leading-relaxed text-[#7b8aa2]">{initialEvaluation ? "Skor tersimpan. Jika nilai aspek diubah, skor dihitung ulang sesuai bobot." : "Skor dihitung dari nilai tiap aspek sesuai bobot yang ditampilkan."}</p>
        </div>
      </div>

      <button type="button" aria-expanded={notesOpen} onClick={() => setNotesOpen(!notesOpen)} className="mt-4 text-xs font-semibold text-[#3764a4]">{notesOpen ? "Sembunyikan opsi tambahan" : "+ Opsi dan catatan tambahan"}</button>
      {notesOpen && <div className="mt-4 grid gap-4 sm:grid-cols-3"><label className="text-xs font-semibold text-[#4d607d]">Review Status<select value={input.reviewStatus} onChange={(event) => setInput({ ...input, reviewStatus: event.target.value as EvaluationInput["reviewStatus"] })} className="mt-2 h-10 w-full rounded-lg border border-[#d5dde8] bg-white px-3 text-sm font-normal text-[#294269]"><option>Needs Review</option><option>On Track</option><option>Needs Attention</option></select></label><label className="text-xs font-semibold text-[#4d607d]">General Notes<textarea value={input.generalNotes} onChange={(event) => setInput({ ...input, generalNotes: event.target.value })} rows={2} className="mt-2 w-full rounded-lg border border-[#d5dde8] p-3 text-sm font-normal text-[#294269]" /></label><label className="text-xs font-semibold text-[#4d607d]">Evidence Reference, optional<input value={input.evidenceReference ?? ""} onChange={(event) => setInput({ ...input, evidenceReference: event.target.value || null })} placeholder="Tautan atau nomor dokumen" className="mt-2 h-10 w-full rounded-lg border border-[#d5dde8] px-3 text-sm font-normal text-[#294269]" /></label></div>}
      {error && <p role="alert" className="mt-4 rounded-md bg-[#fff0f1] px-3 py-2 text-sm text-[#b43e48]">{error}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-end gap-3"><p className="mr-auto text-[11px] text-[#7b8aa2]">Pratinjau lokal, data tersimpan di browser ini.</p><button type="button" onClick={onClose} className="h-10 rounded-md border border-[#d2dbe8] px-5 text-xs font-semibold text-[#4d6482]">Cancel</button><button type="button" onClick={() => save("draft")} className="h-10 rounded-md border border-[#bdd1ec] bg-[#f4f8ff] px-5 text-xs font-semibold text-[#3164a8]">Save Draft</button><button type="button" onClick={() => save("completed")} className="h-10 rounded-md bg-[#1664c0] px-5 text-xs font-semibold text-white">{initialEvaluation ? "Save Revision" : "Submit"}</button></div>
    </section>
  </div>;
}
