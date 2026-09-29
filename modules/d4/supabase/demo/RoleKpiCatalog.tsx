"use client";

import { useState } from "react";

export type RoleKpiRow = {
  role_order: number;
  role_name: string;
  indicator_order: number;
  kpi_name: string;
  target: string | null;
  weight_percent: number;
};

export function RoleKpiCatalog({ rows }: { rows: readonly RoleKpiRow[] }) {
  const roles = [...new Map(rows.map((row) => [row.role_order, row.role_name])).entries()];
  const [selected, setSelected] = useState(roles[0]?.[0] ?? 1);
  const indicators = rows.filter((row) => row.role_order === selected);
  const total = indicators.reduce((sum, row) => sum + row.weight_percent, 0);

  return <div className="mx-auto max-w-[1509px]">
    <a href="/demo?module=performance&view=list" className="mb-8 inline-flex h-10 items-center rounded-lg border border-[#e5eaf0] bg-white px-4 text-xs font-semibold text-[#172033]">Kembali ke Performance &amp; KPI</a>
    <section className="rounded-xl border border-[#e5eaf0] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-[#3b6ff5]">KPI Scorecard V3.1</p><h1 className="mt-2 text-2xl font-semibold text-[#1e3765]">KPI per Jabatan</h1><p className="mt-2 text-sm text-[#64748b]">Indikator dan bobot sesuai KPI Scorecard PT Andima Transportindo V3.1.</p></div>
        <label className="block min-w-[260px] text-xs font-semibold text-[#405371]">Jabatan
          <select value={selected} onChange={(event) => setSelected(Number(event.target.value))} className="mt-2 block h-11 w-full rounded-lg border border-[#dce3ee] bg-white px-3 text-sm font-normal text-[#172033]">
            {roles.map(([order, name]) => <option key={order} value={order}>{name}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-8 overflow-x-auto rounded-lg border border-[#e5eaf0]">
        <table className="w-full min-w-[650px] text-left text-sm text-[#172033]">
          <thead className="bg-[#f6f8fc] text-xs uppercase tracking-wide text-[#74849c]"><tr><th className="w-14 px-5 py-4">No</th><th className="px-5 py-4">Core KPI</th><th className="w-32 px-5 py-4">Target</th><th className="w-28 px-5 py-4 text-right">Bobot</th></tr></thead>
          <tbody>{indicators.map((row) => <tr key={row.indicator_order} className="border-t border-[#e5eaf0]"><td className="px-5 py-5">{row.indicator_order}</td><td className="px-5 py-5 font-medium">{row.kpi_name}</td><td className="px-5 py-5 text-[#64748b]">{row.target ?? "-"}</td><td className="px-5 py-5 text-right font-semibold">{row.weight_percent}%</td></tr>)}</tbody>
          <tfoot><tr className="border-t border-[#dce3ee] bg-[#f6f8fc] font-semibold"><td colSpan={3} className="px-5 py-4">Total bobot</td><td className="px-5 py-4 text-right">{total}%</td></tr></tfoot>
        </table>
      </div>
      <p className="mt-4 text-xs text-[#71829a]">Target yang kosong mengikuti kolom target pada workbook.</p>
    </section>
  </div>;
}
