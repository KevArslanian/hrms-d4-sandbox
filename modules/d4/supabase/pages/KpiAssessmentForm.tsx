"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { createD4BrowserClient } from "../client";
import type { SupabaseD4Repository } from "../repository";
import type { D4LiveSnapshot, KpiAssessmentLine } from "../types";
import type { RoleKpiRow } from "../RoleKpiCatalog";

type Props = {
  snapshot: D4LiveSnapshot;
  employeeId?: string;
  busy: boolean;
  runWrite: (operation: (repo: SupabaseD4Repository, data: D4LiveSnapshot) => Promise<unknown>, success: string) => Promise<void>;
  navigate: (url: string) => void;
};

const inputClass = "h-10 w-full rounded-lg border border-[#dce3ee] bg-white px-3 text-sm text-[#172033] outline-none focus:border-[#3b6ff5]";

function linesForRole(catalog: readonly RoleKpiRow[], roleOrder: number): KpiAssessmentLine[] {
  return catalog.filter((item) => item.role_order === roleOrder).map((item) => ({
    indicator_order: item.indicator_order, kpi_name: item.kpi_name,
    weight_percent: item.weight_percent, target: item.target ?? "", actual: "", raw_score: null, comment: "",
  }));
}

function suggestedRole(snapshot: D4LiveSnapshot, employeeId: string, catalog: readonly RoleKpiRow[]): number {
  const employee = snapshot.reference.employees.find((item) => item.id === employeeId);
  const title = snapshot.reference.positions.find((item) => item.id === employee?.positionId)?.title;
  return catalog.find((item) => item.role_name.toLocaleLowerCase() === title?.toLocaleLowerCase())?.role_order ?? 0;
}

export function KpiAssessmentForm({ snapshot, employeeId, busy, runWrite, navigate }: Props) {
  const [initialSnapshot] = useState(snapshot);
  const [catalog, setCatalog] = useState<RoleKpiRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(employeeId ?? "");
  const [roleOrder, setRoleOrder] = useState(0);
  const [lines, setLines] = useState<KpiAssessmentLine[]>([]);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [evaluationDate, setEvaluationDate] = useState(new Date().toISOString().slice(0, 10));
  const [evaluatorName, setEvaluatorName] = useState(snapshot.reference.employees.find((item) => item.id === snapshot.actorEmployeeId)?.fullName ?? "");
  const [generalNotes, setGeneralNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void createD4BrowserClient().from("d4_kpi_role_catalog")
      .select("role_order,role_name,indicator_order,kpi_name,target,weight_percent")
      .order("role_order").order("indicator_order")
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setCatalogError(queryError.message);
        else {
          const next = (data ?? []) as RoleKpiRow[];
          setCatalog(next);
          const role = suggestedRole(initialSnapshot, employeeId ?? "", next);
          setRoleOrder(role);
          setLines(linesForRole(next, role));
        }
        setCatalogLoading(false);
      });
    return () => { active = false; };
  }, [initialSnapshot, employeeId]);

  const roles = useMemo(() => [...new Map(catalog.map((item) => [item.role_order, item.role_name])).entries()], [catalog]);
  const roleName = roles.find(([order]) => order === roleOrder)?.[1] ?? "";
  const weights = lines.reduce((sum, item) => sum + item.weight_percent, 0);
  const allScored = lines.length === 5 && weights === 100 && lines.every((item) => item.raw_score !== null && Number.isInteger(item.raw_score) && item.raw_score >= 1 && item.raw_score <= 5);
  const total = allScored ? Math.round(lines.reduce((sum, item) => sum + item.weight_percent * (item.raw_score ?? 0) / 100, 0) * 100) / 100 : null;

  function selectEmployee(value: string) {
    setSelectedEmployee(value);
    const role = suggestedRole(snapshot, value, catalog);
    setRoleOrder(role);
    setLines(linesForRole(catalog, role));
    setError("");
  }

  function selectRole(value: number) {
    setRoleOrder(value);
    setLines(linesForRole(catalog, value));
    setError("");
  }

  function updateLine(index: number, patch: Partial<KpiAssessmentLine>) {
    setLines((previous) => previous.map((item, at) => at === index ? { ...item, ...patch } : item));
    setError("");
  }

  async function save(status: "draft" | "completed") {
    if (!selectedEmployee || !roleOrder || lines.length !== 5 || weights !== 100) {
      setError("Pilih pegawai dan jabatan KPI yang memiliki lima indikator dengan total bobot 100%.");
      return;
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) { setError("Pilih periode penilaian."); return; }
    if (status === "completed" && (!allScored || !evaluationDate || !evaluatorName.trim())) {
      setError("Lengkapi tanggal, penilai, dan skor 1 sampai 5 untuk semua indikator.");
      return;
    }
    setError("");
    let savedId = "";
    await runWrite(async (repo) => {
      savedId = await repo.saveKpiAssessment({
        employeeId: selectedEmployee, roleOrder, roleName, period, evaluationDate,
        evaluatorName, status, lines, generalNotes,
      });
    }, status === "draft" ? "Draft KPI tersimpan di Supabase." : "Penilaian KPI tersimpan di Supabase.");
    if (savedId) navigate(`/live?${new URLSearchParams({ module: "performance", view: "scorecard", employee: selectedEmployee, assessment: savedId })}`);
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-3 lg:pl-[285px] lg:pr-6" role="presentation">
    <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 bg-black/75 lg:left-[261px] lg:top-16" />
    <section role="dialog" aria-modal="true" aria-labelledby="kpi-form-title" className="relative max-h-[94vh] w-full max-w-[1485px] overflow-y-auto rounded-xl bg-white p-5 shadow-2xl sm:p-8 lg:p-10">
      <button type="button" aria-label="Tutup formulir" onClick={() => navigate("/live?module=performance&view=list")} className="absolute right-4 top-4 rounded p-1 text-[#7c8da5] hover:bg-[#f4f6fa]"><X size={18} /></button>
      <h1 id="kpi-form-title" className="text-2xl font-semibold text-[#1e3765]">Penilaian KPI Andima</h1>
      <p className="mt-1 text-sm text-[#64748b]">Lima indikator dan bobot mengikuti KPI Scorecard V3.1.</p>
      <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <label className="text-xs font-semibold text-[#45556c]">Pegawai *<select value={selectedEmployee} onChange={(event) => selectEmployee(event.target.value)} className={`mt-2 ${inputClass}`}><option value="">Pilih pegawai</option>{snapshot.reference.employees.map((item) => <option key={item.id} value={item.id}>{item.fullName} | {item.employeeId}</option>)}</select></label>
        <label className="text-xs font-semibold text-[#45556c]">Jabatan KPI *<select value={roleOrder} onChange={(event) => selectRole(Number(event.target.value))} disabled={catalogLoading || !!catalogError} className={`mt-2 ${inputClass}`}><option value={0}>Pilih jabatan dari Excel</option>{roles.map(([order, name]) => <option key={order} value={order}>{name}</option>)}</select></label>
        <label className="text-xs font-semibold text-[#45556c]">Periode *<input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className={`mt-2 ${inputClass}`} /></label>
        <label className="text-xs font-semibold text-[#45556c]">Tanggal penilaian *<input type="date" value={evaluationDate} onChange={(event) => setEvaluationDate(event.target.value)} className={`mt-2 ${inputClass}`} /></label>
        <label className="text-xs font-semibold text-[#45556c]">Penilai *<input value={evaluatorName} onChange={(event) => setEvaluatorName(event.target.value)} className={`mt-2 ${inputClass}`} /></label>
      </div>
      {catalogLoading && <p role="status" className="mt-6 text-sm text-[#64748b]">Memuat indikator dari Supabase...</p>}
      {catalogError && <p role="alert" className="mt-6 text-sm text-red-600">Indikator KPI gagal dimuat: {catalogError}</p>}
      <div className="mt-8 grid min-w-0 gap-8 2xl:grid-cols-[minmax(0,1fr)_270px]">
        <div className="min-w-0 overflow-x-auto rounded-xl border border-[#dce3ee]">
          <table className="w-full min-w-[1040px] table-fixed text-left text-xs text-[#172033]">
            <colgroup><col className="w-[5%]" /><col className="w-[28%]" /><col className="w-[8%]" /><col className="w-[11%]" /><col className="w-[11%]" /><col className="w-[10%]" /><col className="w-[11%]" /><col className="w-[16%]" /></colgroup>
            <thead className="bg-[#f5f7fb] text-[11px] font-semibold uppercase tracking-wide text-[#8090aa]"><tr>{["No", "Core KPI", "Bobot", "Target", "Realisasi", "Skor 1-5", "Terbobot", "Komentar"].map((head) => <th key={head} className="px-3 py-4">{head}</th>)}</tr></thead>
            <tbody>{lines.map((item, index) => <tr key={`${roleOrder}-${item.indicator_order}`} className="border-t border-[#e5eaf0] align-top"><td className="px-3 py-4">{item.indicator_order}</td><td className="px-3 py-4 pr-5 font-medium leading-5">{item.kpi_name}</td><td className="py-4 pl-4 pr-2">{item.weight_percent}%</td><td className="px-2 py-3"><input aria-label={`Target ${item.kpi_name}`} value={item.target} onChange={(event) => updateLine(index, { target: event.target.value })} className={inputClass} /></td><td className="px-2 py-3"><input aria-label={`Realisasi ${item.kpi_name}`} value={item.actual} onChange={(event) => updateLine(index, { actual: event.target.value })} className={inputClass} /></td><td className="px-2 py-3"><input aria-label={`Skor ${item.kpi_name}`} type="number" min="1" max="5" step="1" value={item.raw_score ?? ""} onChange={(event) => updateLine(index, { raw_score: event.target.value === "" ? null : Number(event.target.value) })} className={`${inputClass} text-center`} /></td><td className="px-3 py-4 font-semibold">{item.raw_score === null || !Number.isInteger(item.raw_score) || item.raw_score < 1 || item.raw_score > 5 ? "-" : (item.weight_percent * item.raw_score / 100).toFixed(2)}</td><td className="px-2 py-3"><input aria-label={`Komentar ${item.kpi_name}`} value={item.comment} onChange={(event) => updateLine(index, { comment: event.target.value })} className={inputClass} /></td></tr>)}</tbody>
            <tfoot><tr className="border-t border-[#dce3ee] bg-[#f5f7fb] font-semibold"><td colSpan={2} className="px-3 py-4">TOTAL</td><td className="px-3 py-4">{weights ? `${weights}%` : "-"}</td><td colSpan={3} /><td className="px-3 py-4">{total === null ? "-" : `${total.toFixed(2)} / 5`}</td><td /></tr></tfoot>
          </table>
          {!lines.length && !catalogLoading && <p className="p-5 text-sm text-[#64748b]">Pilih jabatan KPI untuk menampilkan indikator penilaian.</p>}
        </div>
        <div className="flex flex-col items-center rounded-xl border border-[#e5eaf0] bg-white px-4 py-6">
          <h2 className="text-center text-2xl font-semibold text-[#1e3765]">Total KPI</h2>
          <div role="img" aria-label={total === null ? "Total KPI belum dihitung" : `Total KPI ${total.toFixed(2)} dari 5`} className="mt-5 flex size-[220px] items-center justify-center rounded-full" style={{ background: `conic-gradient(#27bf78 ${total === null ? 0 : total / 5 * 100}%, #dce3ee 0)` }}><div className="flex size-[166px] flex-col items-center justify-center rounded-full bg-white"><strong className="text-[47px] font-semibold leading-none text-[#1e3765]">{total?.toFixed(2) ?? "-"}</strong><span className="mt-2 text-sm text-[#6b7e9e]">dari 5.00</span></div></div>
          <p className="mt-4 rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-4 py-1.5 text-xs font-semibold text-[#3b6ff5]">{total === null ? "Belum dihitung" : "Skor tertimbang"}</p>
          <p className="mt-4 text-center text-xs text-[#71829a]">Total = jumlah (bobot × skor mentah)</p>
        </div>
      </div>
      <label className="mt-7 block text-xs font-semibold text-[#45556c]">Catatan / rekomendasi atasan<textarea value={generalNotes} onChange={(event) => setGeneralNotes(event.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-[#dce3ee] p-3 text-sm font-normal text-[#172033] outline-none focus:border-[#3b6ff5]" /></label>
      <p className="mt-3 text-xs text-[#71829a]">Skala penilaian: 1 Sangat Kurang, 2 Kurang, 3 Cukup, 4 Baik, 5 Sangat Baik.</p>
      {error && <p role="alert" className="mt-4 rounded-lg bg-[#fff0f1] p-3 text-sm text-[#b43e48]">{error}</p>}
      <div className="mt-8 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => navigate("/live?module=performance&view=list")} className="h-11 rounded-lg border border-[#dce3ee] px-5 text-sm font-semibold text-[#45556c]">Batal</button><button type="button" disabled={busy || catalogLoading || !!catalogError} onClick={() => void save("draft")} className="h-11 rounded-lg border border-[#bfdbfe] bg-[#eff6ff] px-5 text-sm font-semibold text-[#3b6ff5] disabled:opacity-40">Simpan Draft</button><button type="button" disabled={busy || catalogLoading || !!catalogError} onClick={() => void save("completed")} className="h-11 rounded-lg bg-[#3b6ff5] px-5 text-sm font-semibold text-white disabled:opacity-40">Selesaikan Penilaian</button></div>
    </section>
  </div>;
}
