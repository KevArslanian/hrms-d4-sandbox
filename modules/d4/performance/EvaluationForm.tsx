"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { d4ReferenceFixture } from "../shared/fixtures";
import { savePerformanceEvaluation } from "./service";
import type { EvaluationAspect, EvaluationInput, EvaluationStatus } from "./types";

function initialInput(employeeId: string): EvaluationInput {
  return {
    employeeId,
    period: "2026-09",
    evaluationDate: new Date().toISOString().slice(0, 10),
    evaluator: "",
    status: "draft",
    reviewStatus: "Needs Review",
    overallScore: null,
    aspects: [
      { name: "Work Quality", weight: 40, score: null, notes: "" },
      { name: "Accuracy", weight: 35, score: null, notes: "" },
      { name: "Discipline", weight: 25, score: null, notes: "" },
    ],
    generalNotes: "",
    evidenceReference: null,
  };
}

export function EvaluationForm({ employeeId, onClose, onSaved }: {
  employeeId: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [input, setInput] = useState<EvaluationInput>(() => initialInput(employeeId));
  const [error, setError] = useState("");
  const position = d4ReferenceFixture.positions.find((item) => item.id === d4ReferenceFixture.employees.find((employee) => employee.id === input.employeeId)?.positionId);

  function updateAspect(index: number, patch: Partial<EvaluationAspect>) {
    setInput((current) => ({ ...current, aspects: current.aspects.map((aspect, idx) => idx === index ? { ...aspect, ...patch } : aspect) }));
    setError("");
  }

  function save(status: EvaluationStatus) {
    try {
      const record = savePerformanceEvaluation({ ...input, status });
      onSaved(`${status === "draft" ? "Draft" : "Evaluasi"} tersimpan sebagai riwayat baru untuk ${record.period}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Evaluasi gagal disimpan.");
    }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="evaluation-form-title" className="max-h-[94vh] w-full max-w-[1040px] overflow-y-auto rounded-lg bg-white p-5 shadow-2xl sm:p-8">
      <div className="mb-5 flex items-center justify-between">
        <div><h2 id="evaluation-form-title" className="text-xl font-bold text-[#1d335b]">Add Performance Evaluation</h2><p className="mt-1 text-xs text-[#7e8da4]">Data demo lokal, setiap simpan menambah riwayat.</p></div>
        <button type="button" aria-label="Tutup formulir" onClick={onClose} className="rounded-md p-2 text-[#6b7d96] hover:bg-[#f0f3f8]"><X size={18} /></button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-semibold text-[#4d607d]">Employee *<select value={input.employeeId} onChange={(event) => setInput({ ...input, employeeId: event.target.value })} className="mt-2 h-10 w-full rounded-lg border border-[#d5dde8] bg-white px-3 text-sm font-normal text-[#294269]">{d4ReferenceFixture.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}</select></label>
        <label className="text-xs font-semibold text-[#4d607d]">Position<div className="mt-2 flex h-10 items-center rounded-lg border border-[#d5dde8] bg-[#eef2f7] px-3 text-sm font-normal text-[#486383]">{position?.title ?? "–"}</div></label>
        <label className="text-xs font-semibold text-[#4d607d]">Evaluation Period *<input type="month" value={input.period} onChange={(event) => setInput({ ...input, period: event.target.value })} className="mt-2 h-10 w-full rounded-lg border border-[#d5dde8] px-3 text-sm font-normal text-[#294269]" /></label>
        <label className="text-xs font-semibold text-[#4d607d]">Evaluation Date *<input type="date" value={input.evaluationDate} onChange={(event) => setInput({ ...input, evaluationDate: event.target.value })} className="mt-2 h-10 w-full rounded-lg border border-[#d5dde8] px-3 text-sm font-normal text-[#294269]" /></label>
        <label className="text-xs font-semibold text-[#4d607d]">Evaluator *<input value={input.evaluator} onChange={(event) => setInput({ ...input, evaluator: event.target.value })} placeholder="Nama evaluator" className="mt-2 h-10 w-full rounded-lg border border-[#d5dde8] px-3 text-sm font-normal text-[#294269]" /></label>
        <label className="text-xs font-semibold text-[#4d607d]">Review Status<select value={input.reviewStatus} onChange={(event) => setInput({ ...input, reviewStatus: event.target.value as EvaluationInput["reviewStatus"] })} className="mt-2 h-10 w-full rounded-lg border border-[#d5dde8] bg-white px-3 text-sm font-normal text-[#294269]"><option>Needs Review</option><option>On Track</option><option>Needs Attention</option></select></label>
      </div>

      <h3 className="mb-3 mt-6 text-lg font-bold text-[#22395d]">Performance Evaluation</h3>
      <div className="overflow-x-auto rounded-lg border border-[#dce5f0] shadow-[0_4px_10px_rgba(57,102,187,.12)]">
        <table className="w-full min-w-[650px] text-left text-xs"><thead className="bg-[#eaf1f8] text-[#2e4a73]"><tr><th className="px-3 py-3">Aspect</th><th className="px-3 py-3">Weight %</th><th className="px-3 py-3">Score 1–5</th><th className="px-3 py-3">Notes</th></tr></thead><tbody className="divide-y divide-[#e7ecf4]">{input.aspects.map((aspect, index) => <tr key={index}><td className="px-3 py-2"><input aria-label={`Aspek ${index + 1}`} value={aspect.name} onChange={(event) => updateAspect(index, { name: event.target.value })} className="w-full rounded-md border border-[#d7dfeb] px-2 py-1.5" /></td><td className="px-3 py-2"><input aria-label={`Bobot ${aspect.name}`} type="number" min="0" max="100" value={aspect.weight} onChange={(event) => updateAspect(index, { weight: Number(event.target.value) })} className="w-20 rounded-md border border-[#d7dfeb] px-2 py-1.5" /></td><td className="px-3 py-2"><input aria-label={`Skor ${aspect.name}`} type="number" min="1" max="5" step="1" value={aspect.score ?? ""} onChange={(event) => updateAspect(index, { score: event.target.value === "" ? null : Number(event.target.value) })} className="w-20 rounded-md border border-[#d7dfeb] px-2 py-1.5" /></td><td className="px-3 py-2"><input aria-label={`Catatan ${aspect.name}`} value={aspect.notes} onChange={(event) => updateAspect(index, { notes: event.target.value })} className="w-full rounded-md border border-[#d7dfeb] px-2 py-1.5" /></td></tr>)}</tbody></table>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e7ecf4] px-3 py-2"><button type="button" onClick={() => setInput({ ...input, aspects: [...input.aspects, { name: "", weight: 0, score: null, notes: "" }] })} className="inline-flex items-center gap-1 rounded-full border border-[#4a77b8] px-3 py-1.5 text-xs font-semibold text-[#3764a4]"><Plus size={12} /> Add Aspect</button><label className="flex items-center gap-2 text-xs font-semibold text-[#3c5477]">Overall Performance Score *<input type="number" min="1" max="5" step="0.01" value={input.overallScore ?? ""} onChange={(event) => setInput({ ...input, overallScore: event.target.value === "" ? null : Number(event.target.value) })} className="w-20 rounded-md border border-[#d7dfeb] px-2 py-1.5" /></label></div>
      </div>
      <p className="mt-2 text-[11px] text-[#7b8aa2]">Skor keseluruhan diisi evaluator. Rumus resmi dari skor aspek belum ditetapkan.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-[#4d607d]">General Notes *<textarea value={input.generalNotes} onChange={(event) => setInput({ ...input, generalNotes: event.target.value })} rows={3} className="mt-2 w-full rounded-lg border border-[#d5dde8] p-3 text-sm font-normal text-[#294269]" /></label><label className="text-xs font-semibold text-[#4d607d]">Evidence Reference, optional<input value={input.evidenceReference ?? ""} onChange={(event) => setInput({ ...input, evidenceReference: event.target.value || null })} placeholder="Tautan atau nomor dokumen" className="mt-2 h-10 w-full rounded-lg border border-[#d5dde8] px-3 text-sm font-normal text-[#294269]" /></label></div>
      {error && <p role="alert" className="mt-4 rounded-md bg-[#fff0f1] px-3 py-2 text-sm text-[#b43e48]">{error}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-2"><button type="button" onClick={onClose} className="h-9 rounded-md border border-[#d2dbe8] px-4 text-xs font-semibold text-[#4d6482]">Cancel</button><button type="button" onClick={() => save("draft")} className="h-9 rounded-md border border-[#bdd1ec] bg-[#f4f8ff] px-4 text-xs font-semibold text-[#3164a8]">Save Draft</button><button type="button" onClick={() => save("completed")} className="h-9 rounded-md bg-[#1664c0] px-4 text-xs font-semibold text-white">Submit Evaluation</button></div>
    </section>
  </div>;
}
