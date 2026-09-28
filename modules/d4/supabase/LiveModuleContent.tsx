"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { compareCompetencies } from "../competency/service";
import type { DevelopmentSourceOption, DevelopmentSourceType, DevelopmentStatus } from "../development/types";
import { definitionsForPositionTitle } from "../kpi/templates";
import type { KpiLineInput } from "../kpi/types";
import type { EvaluationAspect, EvaluationInput } from "../performance/types";
import type { TrainingStatus } from "../training/types";
import { SupabaseD4Repository } from "./repository";
import { latestDevelopment, latestTraining, type D4LiveSnapshot } from "./types";

export const moduleLabels = {
  dashboard: "Dashboard", kpi: "KPI", performance: "Performance",
  competency: "Competency Gap", development: "Development", training: "Training",
} as const;
export type LiveModule = keyof typeof moduleLabels;

type Props = {
  module: LiveModule;
  snapshot: D4LiveSnapshot;
  busy: boolean;
  runWrite: (operation: (repo: SupabaseD4Repository, data: D4LiveSnapshot) => Promise<unknown>, success: string) => Promise<void>;
};
const field = "mt-1 w-full rounded-md border border-[#d4e0eb] bg-white px-3 py-2 text-sm text-[#284469]";
const primary = "rounded-md bg-[#087e69] px-4 py-2 text-xs font-bold text-white disabled:opacity-50";
const muted = "text-xs leading-relaxed text-[#7387a2]";

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-lg border border-[#dce5ef] bg-white p-4 shadow-sm sm:p-5"><h2 className="mb-4 text-base font-bold text-[#243f67]">{title}</h2>{children}</section>;
}
function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-md bg-[#f4f7fb] px-4 py-4 text-sm text-[#71849d]">{children}</p>;
}
function EmployeeSelect({ snapshot, value, onChange }: { snapshot: D4LiveSnapshot; value: string; onChange: (value: string) => void }) {
  return <label className="block text-xs font-semibold text-[#536c89]">Employee<select className={field} value={value} onChange={(event) => onChange(event.target.value)}><option value="">Pilih employee</option>{snapshot.reference.employees.map((item) => <option key={item.id} value={item.id}>{item.fullName} ({item.employeeId})</option>)}</select></label>;
}
function Person({ snapshot, id }: { snapshot: D4LiveSnapshot; id: string }) {
  return <>{snapshot.reference.employees.find((item) => item.id === id)?.fullName ?? "Employee tidak tersedia"}</>;
}
function Row({ columns }: { columns: ReactNode[] }) {
  return <div className="grid gap-2 border-t border-[#e6edf5] px-3 py-3 text-xs text-[#48617f] sm:grid-cols-4">{columns.map((column, index) => <span key={index}>{column}</span>)}</div>;
}
function canWrite(snapshot: D4LiveSnapshot) { return snapshot.role === "HR" || snapshot.role === "MANAGER"; }
function monthNow() { return new Date().toISOString().slice(0, 7); }
function dateNow() { return new Date().toISOString().slice(0, 10); }

function Dashboard({ snapshot }: { snapshot: D4LiveSnapshot }) {
  const development = latestDevelopment(snapshot);
  const training = latestTraining(snapshot);
  const cards = [
    ["Employee", snapshot.reference.employees.length], ["KPI scorecard", snapshot.kpi.length],
    ["Evaluasi", snapshot.performance.length], ["Assessment", snapshot.competency.length],
    ["Development need", development.length], ["Training", training.length],
  ] as const;
  return <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">{cards.map(([label, value]) => <div key={label} className="rounded-lg border border-[#dce5ef] bg-white p-4"><p className={muted}>{label}</p><p className="mt-2 text-2xl font-bold text-[#24477b]">{value}</p></div>)}</div><Panel title="Ringkasan employee">{snapshot.reference.employees.length ? snapshot.reference.employees.map((employee) => {
    const position = snapshot.reference.positions.find((item) => item.id === employee.positionId);
    const kpi = snapshot.kpi.find((item) => item.employeeId === employee.id);
    const performance = snapshot.performance.find((item) => item.employeeId === employee.id);
    const gap = employee.positionId ? compareCompetencies(employee.id, employee.positionId, snapshot.reference).findings.filter((item) => item.status === "Gap").length : 0;
    return <Row key={employee.id} columns={[<strong key="name">{employee.fullName}</strong>, position?.title ?? "Belum ada posisi", `KPI ${kpi?.totalScore ?? "-"} · Performance ${performance?.overallScore ?? "-"}`, `Gap ${gap} · Development ${development.filter((item) => item.employeeId === employee.id).length}`]} />;
  }) : <Empty>Belum ada employee yang dapat dilihat oleh akun ini.</Empty>}</Panel></div>;
}

function Kpi({ snapshot, busy, runWrite }: Props) {
  const [employeeId, setEmployeeId] = useState("");
  const employee = snapshot.reference.employees.find((item) => item.id === employeeId);
  const position = snapshot.reference.positions.find((item) => item.id === employee?.positionId);
  const definitions = position ? definitionsForPositionTitle(position.title) : [];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lines: KpiLineInput[] = definitions.map((definition) => ({
      definitionId: definition.id, target: String(form.get(`${definition.id}-target`) ?? ""),
      realization: String(form.get(`${definition.id}-realization`) ?? ""),
      rawScore: Number(form.get(`${definition.id}-score`)) || null,
    }));
    await runWrite((repo, data) => repo.saveKpi({ employeeId, period: String(form.get("period") ?? ""), lines }, data.reference), "KPI tersimpan sebagai scorecard baru.");
  }
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,.9fr)]"><Panel title="KPI V5.1"><div className="mb-4"><EmployeeSelect snapshot={snapshot} value={employeeId} onChange={setEmployeeId} /></div>{!employee ? <Empty>Pilih employee untuk melihat template KPI.</Empty> : definitions.length !== 5 ? <Empty>Template KPI V5.1 belum dipetakan ke posisi {position?.title ?? "ini"}. Posisi master tidak diubah, scorecard belum dapat disimpan.</Empty> : <form onSubmit={submit} className="space-y-3"><label className="block text-xs font-semibold text-[#536c89]">Periode<input name="period" type="month" defaultValue={monthNow()} required className={field} /></label>{definitions.map((definition) => <div key={definition.id} className="rounded-md border border-[#e1e9f2] p-3"><strong className="text-xs text-[#31547f]">{definition.name} · {definition.weight}%</strong><p className="mt-1 text-[11px] text-[#8192a9]">Contoh target: {definition.targetExample || "Tidak ditetapkan"}</p><div className="mt-2 grid gap-2 sm:grid-cols-3"><input name={`${definition.id}-target`} placeholder="Target" required className={field} /><input name={`${definition.id}-realization`} placeholder="Realisasi" required className={field} /><input name={`${definition.id}-score`} aria-label={`Skor ${definition.name}`} type="number" min="1" max="5" step="1" placeholder="Skor manual 1-5" required className={field} /></div></div>)}<button disabled={busy || !canWrite(snapshot)} className={primary}>Simpan KPI</button></form>}</Panel><Panel title="Riwayat scorecard">{snapshot.kpi.length ? snapshot.kpi.map((item) => <Row key={item.id} columns={[<Person key="name" snapshot={snapshot} id={item.employeeId} />, item.period, `${item.totalScore.toFixed(2)} / 5`, new Date(item.createdAt).toLocaleDateString("id-ID")]} />) : <Empty>Belum ada scorecard dari Supabase.</Empty>}</Panel></div>;
}

function Performance({ snapshot, busy, runWrite }: Props) {
  const [employeeId, setEmployeeId] = useState("");
  const [status, setStatus] = useState<"draft" | "completed">("draft");
  const [aspects, setAspects] = useState<EvaluationAspect[]>([{ name: "", weight: 100, score: null, notes: "" }]);
  function patchAspect(index: number, patch: Partial<EvaluationAspect>) { setAspects((previous) => previous.map((item, i) => i === index ? { ...item, ...patch } : item)); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rawScore = String(form.get("score") ?? "");
    const input: EvaluationInput = {
      employeeId, period: String(form.get("period") ?? ""), evaluationDate: String(form.get("date") ?? ""),
      evaluator: String(form.get("evaluator") ?? ""), status,
      reviewStatus: String(form.get("review") ?? "Needs Review") as EvaluationInput["reviewStatus"],
      overallScore: rawScore ? Number(rawScore) : null, aspects,
      generalNotes: String(form.get("notes") ?? ""), evidenceReference: String(form.get("evidence") ?? "") || null,
    };
    await runWrite((repo, data) => repo.savePerformance(input, data.reference), "Evaluasi tersimpan sebagai riwayat baru.");
  }
  return <div className="grid gap-5 xl:grid-cols-2"><Panel title="Tambah evaluasi"><form onSubmit={submit} className="space-y-3"><EmployeeSelect snapshot={snapshot} value={employeeId} onChange={setEmployeeId} /><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-[#536c89]">Periode<input name="period" type="month" defaultValue={monthNow()} required className={field} /></label><label className="text-xs font-semibold text-[#536c89]">Tanggal evaluasi<input name="date" type="date" defaultValue={dateNow()} className={field} /></label><label className="text-xs font-semibold text-[#536c89]">Evaluator<input name="evaluator" className={field} /></label><label className="text-xs font-semibold text-[#536c89]">Review<select name="review" className={field}><option>Needs Review</option><option>On Track</option><option>Needs Attention</option></select></label><label className="text-xs font-semibold text-[#536c89]">Status<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className={field}><option value="draft">Draft</option><option value="completed">Completed</option></select></label><label className="text-xs font-semibold text-[#536c89]">Skor keseluruhan manual 1-5<input name="score" type="number" min="1" max="5" step="0.01" className={field} /></label></div><div className="space-y-2"><p className="text-xs font-semibold text-[#536c89]">Aspek penilaian</p>{aspects.map((aspect, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_75px_75px_1fr]"><input aria-label={`Nama aspek ${index + 1}`} value={aspect.name} onChange={(event) => patchAspect(index, { name: event.target.value })} placeholder="Aspek" className={field} /><input aria-label={`Bobot aspek ${index + 1}`} type="number" min="0" max="100" value={aspect.weight} onChange={(event) => patchAspect(index, { weight: Number(event.target.value) })} className={field} /><input aria-label={`Skor aspek ${index + 1}`} type="number" min="1" max="5" value={aspect.score ?? ""} onChange={(event) => patchAspect(index, { score: event.target.value ? Number(event.target.value) : null })} className={field} /><input aria-label={`Catatan aspek ${index + 1}`} value={aspect.notes} onChange={(event) => patchAspect(index, { notes: event.target.value })} placeholder="Catatan" className={field} /></div>)}<button type="button" onClick={() => setAspects([...aspects, { name: "", weight: 0, score: null, notes: "" }])} className="text-xs font-semibold text-[#31729d]">+ Tambah aspek</button></div><textarea name="notes" placeholder="Catatan umum" rows={3} className={field} /><input name="evidence" placeholder="Referensi bukti, opsional" className={field} /><p className={muted}>Skor keseluruhan ditetapkan evaluator, tidak dihitung otomatis.</p><button disabled={busy || !employeeId || !canWrite(snapshot)} className={primary}>Simpan evaluasi</button></form></Panel><Panel title="Riwayat evaluasi">{snapshot.performance.length ? snapshot.performance.map((item) => <Row key={item.id} columns={[<Person key="name" snapshot={snapshot} id={item.employeeId} />, item.period, `${item.status} · ${item.overallScore ?? "-"}`, `${item.evaluator || "-"} · ${item.reviewStatus}`]} />) : <Empty>Belum ada evaluasi dari Supabase.</Empty>}</Panel></div>;
}

function Competency({ snapshot, busy, runWrite }: Props) {
  const [employeeId, setEmployeeId] = useState("");
  const [positionId, setPositionId] = useState("");
  const employee = snapshot.reference.employees.find((item) => item.id === employeeId);
  const targetPosition = positionId || employee?.positionId || "";
  const comparison = employeeId && targetPosition ? compareCompetencies(employeeId, targetPosition, snapshot.reference) : null;
  async function save() { await runWrite((repo, data) => repo.saveCompetency({ employeeId, positionId: targetPosition, effectiveDate: dateNow() }, data.reference), "Assessment kompetensi tersimpan."); }
  return <div className="grid gap-5 xl:grid-cols-2"><Panel title="Bandingkan kompetensi"><div className="grid gap-3 sm:grid-cols-2"><EmployeeSelect snapshot={snapshot} value={employeeId} onChange={(value) => { setEmployeeId(value); setPositionId(""); }} /><label className="text-xs font-semibold text-[#536c89]">Posisi tujuan<select className={field} value={targetPosition} onChange={(event) => setPositionId(event.target.value)}><option value="">Pilih posisi</option>{snapshot.reference.positions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></div>{comparison && <div className="mt-4 space-y-2"><p className="text-sm font-semibold text-[#385b83]">Hasil: {comparison.overallStatus}</p>{comparison.findings.length ? comparison.findings.map((item) => <div key={item.requirementId} className="rounded-md border border-[#e2e9f2] p-3 text-xs text-[#58718e]"><strong>{item.competencyName}</strong><span className="ml-2">{item.status}</span><p>Perlu {item.requiredLevel}, aktual {item.actualLevel ?? "-"}. Bukti: {item.evidenceNotes || "Belum tersedia"}</p></div>) : <Empty>Persyaratan kompetensi posisi ini belum tersedia pada master bersama.</Empty>}<button type="button" disabled={busy || !canWrite(snapshot) || !comparison.findings.length} onClick={save} className={primary}>Simpan assessment</button></div>}</Panel><Panel title="Riwayat assessment">{snapshot.competency.length ? snapshot.competency.map((item) => <Row key={item.id} columns={[<Person key="name" snapshot={snapshot} id={item.employeeId} />, item.effectiveDate, item.context, item.overallStatus]} />) : <Empty>Belum ada assessment dari Supabase.</Empty>}</Panel></div>;
}

function sourceOptions(snapshot: D4LiveSnapshot, employeeId: string, type: DevelopmentSourceType): DevelopmentSourceOption[] {
  const employee = snapshot.reference.employees.find((item) => item.id === employeeId);
  if (type === "competency_gap") return employee?.positionId ? compareCompetencies(employeeId, employee.positionId, snapshot.reference).findings.filter((item) => item.status === "Gap").map((item) => ({ type, ref: item.requirementId, label: item.competencyName })) : [];
  if (type === "role_change") return snapshot.competency.filter((item) => item.employeeId === employeeId && item.context === "role-change").map((item) => ({ type, ref: item.id, label: `Assessment ${item.effectiveDate}` }));
  return snapshot.performance.filter((item) => item.employeeId === employeeId && item.status === "completed").map((item) => ({ type, ref: item.id, label: `Evaluasi ${item.period}` }));
}

function Development({ snapshot, busy, runWrite }: Props) {
  const [employeeId, setEmployeeId] = useState("");
  const [sourceType, setSourceType] = useState<DevelopmentSourceType>("competency_gap");
  const sources = sourceOptions(snapshot, employeeId, sourceType);
  const needs = latestDevelopment(snapshot);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const input = { employeeId, sourceType, sourceRef: String(form.get("source") ?? ""), objective: String(form.get("objective") ?? ""), priority: String(form.get("priority") ?? "Medium") as "Low" | "Medium" | "High", notes: String(form.get("notes") ?? "") };
    await runWrite((repo, data) => repo.createDevelopment(input, data), "Development need tersimpan.");
  }
  return <div className="grid gap-5 xl:grid-cols-2"><Panel title="Tambah development need"><form onSubmit={submit} className="space-y-3"><EmployeeSelect snapshot={snapshot} value={employeeId} onChange={setEmployeeId} /><label className="block text-xs font-semibold text-[#536c89]">Sumber<select value={sourceType} onChange={(event) => setSourceType(event.target.value as DevelopmentSourceType)} className={field}><option value="competency_gap">Competency gap</option><option value="role_change">Role change</option><option value="performance_context">Performance context</option></select></label><label className="block text-xs font-semibold text-[#536c89]">Referensi<select name="source" required className={field}><option value="">Pilih referensi</option>{sources.map((item) => <option key={item.ref} value={item.ref}>{item.label}</option>)}</select></label>{employeeId && !sources.length && <Empty>Belum ada sumber yang memenuhi untuk employee ini.</Empty>}<input name="objective" required placeholder="Tujuan development" className={field} /><select name="priority" className={field}><option>Medium</option><option>High</option><option>Low</option></select><textarea name="notes" placeholder="Catatan awal" className={field} /><button disabled={busy || !canWrite(snapshot) || !employeeId || !sources.length} className={primary}>Simpan need</button></form></Panel><Panel title="Development needs">{needs.length ? needs.map((item) => <div key={item.needId} className="border-t border-[#e6edf5] px-3 py-3 text-xs text-[#526b89]"><div className="flex flex-wrap justify-between gap-2"><strong>{item.objective}</strong><span>{item.status} · {item.priority}</span></div><p className="my-2"><Person snapshot={snapshot} id={item.employeeId} /> · {item.sourceType} · revisi {item.revision}</p>{canWrite(snapshot) && <div className="flex gap-2"><select aria-label={`Status ${item.objective}`} defaultValue={item.status} id={`dev-status-${item.needId}`} className={field}><option>Identified</option><option>Planned</option><option>In Progress</option><option>Completed</option></select><input aria-label={`Catatan ${item.objective}`} id={`dev-notes-${item.needId}`} defaultValue={item.notes} placeholder="Catatan" className={field} /><button type="button" disabled={busy} onClick={() => { const element = document.getElementById(`dev-status-${item.needId}`) as HTMLSelectElement; const notes = (document.getElementById(`dev-notes-${item.needId}`) as HTMLInputElement).value; void runWrite((repo) => repo.updateDevelopment(item.needId, element.value as DevelopmentStatus, notes), "Status development diperbarui sebagai revisi baru."); }} className={primary}>Simpan status</button></div>}</div>) : <Empty>Belum ada development need dari Supabase.</Empty>}</Panel></div>;
}

function Training({ snapshot, busy, runWrite }: Props) {
  const [employeeId, setEmployeeId] = useState("");
  const needs = latestDevelopment(snapshot).filter((item) => item.employeeId === employeeId);
  const records = latestTraining(snapshot);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const input = { employeeId, developmentNeedId: String(form.get("need") ?? ""), activity: String(form.get("activity") ?? ""), date: String(form.get("date") ?? ""), status: String(form.get("status") ?? "Planned") as TrainingStatus, result: String(form.get("result") ?? ""), notes: String(form.get("notes") ?? "") };
    await runWrite((repo, data) => repo.createTraining(input, data), "Training tersimpan.");
  }
  return <div className="grid gap-5 xl:grid-cols-2"><Panel title="Tambah training"><form onSubmit={submit} className="space-y-3"><EmployeeSelect snapshot={snapshot} value={employeeId} onChange={setEmployeeId} /><label className="block text-xs font-semibold text-[#536c89]">Development need<select name="need" required className={field}><option value="">Pilih need</option>{needs.map((item) => <option key={item.needId} value={item.needId}>{item.objective}</option>)}</select></label>{employeeId && !needs.length && <Empty>Employee ini belum memiliki development need.</Empty>}<input name="activity" required placeholder="Aktivitas training" className={field} /><input name="date" type="date" defaultValue={dateNow()} required className={field} /><select name="status" className={field}><option>Planned</option><option>In Progress</option><option>Completed</option><option>Cancelled</option></select><input name="result" placeholder="Hasil, wajib jika completed" className={field} /><textarea name="notes" placeholder="Catatan" className={field} /><button disabled={busy || !canWrite(snapshot) || !needs.length} className={primary}>Simpan training</button></form></Panel><Panel title="Riwayat training">{records.length ? records.map((item) => <div key={item.trainingId} className="border-t border-[#e6edf5] px-3 py-3 text-xs text-[#526b89]"><div className="flex flex-wrap justify-between gap-2"><strong>{item.activity}</strong><span>{item.status}</span></div><p className="my-2"><Person snapshot={snapshot} id={item.employeeId} /> · {item.date} · revisi {item.revision}</p>{canWrite(snapshot) && <div className="flex flex-wrap gap-2"><select aria-label={`Status ${item.activity}`} id={`training-status-${item.trainingId}`} defaultValue={item.status} className={field}><option>Planned</option><option>In Progress</option><option>Completed</option><option>Cancelled</option></select><input aria-label={`Hasil ${item.activity}`} id={`training-result-${item.trainingId}`} defaultValue={item.result} placeholder="Hasil" className={field} /><input aria-label={`Catatan ${item.activity}`} id={`training-notes-${item.trainingId}`} defaultValue={item.notes} placeholder="Catatan" className={field} /><button type="button" disabled={busy} onClick={() => { const status = (document.getElementById(`training-status-${item.trainingId}`) as HTMLSelectElement).value as TrainingStatus; const result = (document.getElementById(`training-result-${item.trainingId}`) as HTMLInputElement).value; const notes = (document.getElementById(`training-notes-${item.trainingId}`) as HTMLInputElement).value; void runWrite((repo) => repo.updateTraining(item.trainingId, status, result, notes), "Status training diperbarui sebagai revisi baru."); }} className={primary}>Simpan status</button></div>}</div>) : <Empty>Belum ada training dari Supabase.</Empty>}</Panel></div>;
}

export function LiveModuleContent(props: Props) {
  if (props.module === "dashboard") return <Dashboard snapshot={props.snapshot} />;
  if (props.module === "kpi") return <Kpi {...props} />;
  if (props.module === "performance") return <Performance {...props} />;
  if (props.module === "competency") return <Competency {...props} />;
  if (props.module === "development") return <Development {...props} />;
  return <Training {...props} />;
}
