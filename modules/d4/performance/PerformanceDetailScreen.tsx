"use client";

import { ArrowLeft, BarChart3, Check, History, Star } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { getKpiStoredSnapshot, listKpiRecords, subscribeKpiRecords } from "../kpi/service";
import { d4ReferenceFixture } from "../shared/fixtures";
import { D4Shell } from "../shared/ui";
import { getPerformanceStoredSnapshot, listPerformanceEvaluations, subscribePerformance } from "./service";

function dateLabel(value: string) {
  if (!value) return "Belum diisi";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

export function PerformanceDetailScreen() {
  const params = useParams<{ id: string }>();
  const snapshot = useSyncExternalStore(subscribePerformance, getPerformanceStoredSnapshot, () => "");
  const kpiSnapshot = useSyncExternalStore(subscribeKpiRecords, getKpiStoredSnapshot, () => "");
  const records = useMemo(() => listPerformanceEvaluations(snapshot), [snapshot]);
  const kpiRecords = useMemo(() => listKpiRecords(kpiSnapshot), [kpiSnapshot]);
  const [tab, setTab] = useState("Summary");
  const [historyOpen, setHistoryOpen] = useState(false);
  const record = records.find((item) => item.id === params.id);

  if (!record) return <D4Shell><div className="rounded-xl border border-[#e0e6ef] p-10 text-center"><h1 className="text-xl font-bold">Evaluasi tidak ditemukan</h1><p className="mt-2 text-sm text-[#8190a8]">Record mungkin belum tersedia pada browser ini.</p><Link href="/performance" className="mt-5 inline-flex text-sm font-semibold text-[#2769b5]">Kembali ke daftar</Link></div></D4Shell>;

  const employee = d4ReferenceFixture.employees.find((item) => item.id === record.employeeId);
  const position = d4ReferenceFixture.positions.find((item) => item.id === employee?.positionId);
  const kpi = kpiRecords.find((item) => item.employeeId === record.employeeId && item.period === record.period);
  const history = records.filter((item) => item.employeeId === record.employeeId);
  const initials = employee?.fullName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() ?? "?";

  return <D4Shell>
    <div className="max-w-[1500px]">
      <Link href="/performance" className="mb-5 inline-flex h-8 items-center gap-2 rounded-md border border-[#e1e7ef] px-3 text-xs text-[#476282]"><ArrowLeft size={13} /> Back</Link>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-4"><div className="flex size-16 items-center justify-center rounded-full bg-[#53647e] text-2xl text-white">{initials}</div><div><h1 className="text-[27px] font-bold text-[#203b66]">{employee?.fullName ?? "Employee Demo"}</h1><p className="text-sm text-[#617897]">{position?.title ?? "Position unavailable"}</p><p className="mt-1 text-sm text-[#7e8fa9]">{employee?.employeeId}</p></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setHistoryOpen((value) => !value)} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#d5e2f7] bg-[#f4f7ff] px-3 text-xs font-semibold text-[#315588]"><History size={14} /> View History</button><Link href={`/kpi?employeeId=${record.employeeId}`} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#d5e2f7] bg-[#f4f7ff] px-3 text-xs font-semibold text-[#315588]"><BarChart3 size={14} /> KPI Scorecard</Link></div></header>
      <div className="mb-8 flex flex-wrap gap-1 rounded-lg border border-[#e4e9f0] p-2">{["Summary", "Evaluation Details", "Competency", "Comments"].map((item) => <button type="button" key={item} onClick={() => setTab(item)} className={`rounded-md px-3 py-2 text-[11px] font-semibold ${tab === item ? "bg-[#111c35] text-white" : "bg-[#f2f4fb] text-[#536784]"}`}>{item}</button>)}</div>
      <div className="mb-5 rounded-lg border border-[#cde5f7] bg-[#f2f9ff] px-4 py-3 text-xs text-[#326285]">Evaluasi ini adalah {record.source === "fixture" ? "fixture" : "catatan demo lokal"}. Nilai dan status review tidak membuat keputusan HR otomatis.</div>

      {tab === "Summary" && <div className="grid gap-5 xl:grid-cols-[230px_minmax(0,1fr)_250px]">
        <div className="space-y-4"><div className="flex h-28 items-center gap-3 rounded-xl bg-[#eaf2f8] p-4 shadow-[3px_4px_4px_rgba(0,0,0,.18)]"><span className="flex size-12 items-center justify-center rounded-full bg-[#dce7f1] text-[#274979]"><Star size={26} /></span><div><strong className="text-[27px] text-[#2b4775]">{record.overallScore?.toFixed(1) ?? "–"}<small className="text-base text-[#677994]"> / 5.0</small></strong><p className="text-xs text-[#6f819b]">Overall Performance</p></div></div><div className="flex h-28 items-center gap-3 rounded-xl bg-[#eaf2f8] p-4 shadow-[3px_4px_4px_rgba(0,0,0,.18)]"><span className="flex size-12 items-center justify-center rounded-full bg-[#dce7f1] text-[#274979]"><BarChart3 size={26} /></span><div><strong className="text-[27px] text-[#2b4775]">{kpi ? (kpi.totalScore / 5 * 100).toFixed(0) : "–"}<small className="text-base text-[#677994]"> /100</small></strong><p className="text-xs text-[#6f819b]">KPI Score</p></div></div><div className="flex h-28 items-center gap-3 rounded-xl bg-[#eaf2f8] p-4 shadow-[3px_4px_4px_rgba(0,0,0,.18)]"><span className="flex size-12 items-center justify-center rounded-full bg-[#dce7f1] text-[#274979]"><Check size={28} /></span><div><strong className="text-lg text-[#2b4775]">{record.status === "completed" ? "Completed" : "Draft"}</strong><p className="text-xs text-[#6f819b]">Evaluation Status</p></div></div></div>
        <div className="overflow-hidden rounded-xl border border-[#e6e9f0]"><table className="w-full text-left text-[12px]"><thead className="bg-[#f2f3fb] text-[10px] uppercase text-[#536987]"><tr><th className="px-3 py-4">Aspect</th><th className="px-3 py-4">Weight</th><th className="px-3 py-4">Score</th><th className="px-3 py-4">Result</th></tr></thead><tbody className="divide-y divide-[#edf0f4]">{record.aspects.map((aspect, index) => <tr key={`${aspect.name}-${index}`}><td className="px-3 py-4">{aspect.name}</td><td className="px-3 py-4">{aspect.weight}%</td><td className="px-3 py-4">{aspect.score ?? "–"}</td><td className="px-3 py-4">{aspect.notes || "–"}</td></tr>)}</tbody></table></div>
        <div className="rounded-xl border border-[#e6e9f0] p-5"><h2 className="mb-3 font-bold text-[#263958]">Evaluator Notes</h2><p className="text-xs leading-relaxed text-[#42556f]">{record.generalNotes || "Belum ada catatan."}</p></div>
      </div>}
      {tab === "Evaluation Details" && <section className="max-w-[850px] rounded-xl border border-[#e6e9f0] p-6"><h2 className="mb-5 font-bold">Evaluation Details</h2><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-[#8190a8]">Periode</dt><dd className="font-semibold">{record.period}</dd></div><div><dt className="text-[#8190a8]">Tanggal evaluasi</dt><dd className="font-semibold">{record.evaluationDate}</dd></div><div><dt className="text-[#8190a8]">Evaluator</dt><dd className="font-semibold">{record.evaluator || "Belum diisi"}</dd></div><div><dt className="text-[#8190a8]">Review status</dt><dd className="font-semibold">{record.reviewStatus}</dd></div><div><dt className="text-[#8190a8]">Dibuat</dt><dd className="font-semibold">{dateLabel(record.createdAt)}</dd></div><div><dt className="text-[#8190a8]">Aktor demo</dt><dd className="font-semibold">{record.actor}</dd></div><div className="sm:col-span-2"><dt className="text-[#8190a8]">Referensi evidence</dt><dd className="font-semibold">{record.evidenceReference || "Tidak ada"}</dd></div></dl></section>}
      {tab === "Competency" && <section className="rounded-xl border border-[#e6e9f0] p-6"><h2 className="font-bold">Competency</h2><p className="mt-2 text-sm text-[#71829a]">Perbandingan kompetensi menggunakan sumber data yang sama di modul Competency Needs.</p><Link href={`/competency?employeeId=${record.employeeId}`} className="mt-4 inline-flex text-sm font-semibold text-[#2867ab]">Buka Competency Needs</Link></section>}
      {tab === "Comments" && <section className="rounded-xl border border-[#e6e9f0] p-6"><h2 className="font-bold">Comments</h2><p className="mt-3 whitespace-pre-wrap text-sm text-[#536985]">{record.generalNotes || "Belum ada komentar."}</p></section>}

      {historyOpen && <section className="mt-6 rounded-xl border border-[#e6e9f0] bg-white p-5"><h2 className="mb-3 font-bold text-[#263958]">Evaluation History</h2><ul className="divide-y divide-[#edf0f4]">{history.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span><strong>{item.period}</strong><small className="ml-3 text-[#7e8da4]">{dateLabel(item.createdAt)} · {item.evaluator || "Draft"} · {item.source}</small></span><Link href={`/performance/${item.id}`} className="font-semibold text-[#2867ab]">Lihat detail</Link></li>)}</ul></section>}
    </div>
  </D4Shell>;
}
