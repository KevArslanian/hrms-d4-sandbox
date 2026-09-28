"use client";

import { ArrowLeft, BookOpen, GraduationCap } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { getCompetencyStoredSnapshot, subscribeCompetency } from "../competency/service";
import { getDevelopmentStoredSnapshot, subscribeDevelopment } from "../development/service";
import { getKpiStoredSnapshot, subscribeKpiRecords } from "../kpi/service";
import { getPerformanceStoredSnapshot, subscribePerformance } from "../performance/service";
import { D4Shell } from "../shared/ui";
import { getTrainingStoredSnapshot, subscribeTraining } from "../training/service";
import { EmployeeDetail } from "./DashboardScreen";
import { buildDashboardRows, dashboardPeriods } from "./service";

export function EmployeeScreen({ employeeId, initialPeriod }: { employeeId: string; initialPeriod?: string }) {
  const kpi = useSyncExternalStore(subscribeKpiRecords, getKpiStoredSnapshot, () => "");
  const performance = useSyncExternalStore(subscribePerformance, getPerformanceStoredSnapshot, () => "");
  const competency = useSyncExternalStore(subscribeCompetency, getCompetencyStoredSnapshot, () => "");
  const development = useSyncExternalStore(subscribeDevelopment, getDevelopmentStoredSnapshot, () => "");
  const training = useSyncExternalStore(subscribeTraining, getTrainingStoredSnapshot, () => "");
  const snapshots = useMemo(() => ({ kpi, performance, competency, development, training }), [kpi, performance, competency, development, training]);
  const periods = useMemo(() => dashboardPeriods(snapshots), [snapshots]);
  const [period, setPeriod] = useState(initialPeriod && /^\d{4}-\d{2}$/.test(initialPeriod) ? initialPeriod : "2026-09");
  const result = useMemo(() => {
    try { return { row: buildDashboardRows(period, snapshots).find((item) => item.employee.id === employeeId), error: "" }; }
    catch (cause) { return { row: undefined, error: cause instanceof Error ? cause.message : "Ringkasan employee gagal dimuat." }; }
  }, [employeeId, period, snapshots]);
  const row = result.row;

  return <D4Shell><div className="max-w-[1250px]"><Link href="/dashboard" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-[#5076a0]"><ArrowLeft size={13} /> Back to Dashboard</Link>{result.error ? <p role="alert" className="rounded-md bg-[#fff0f1] p-4 text-sm text-[#a7434c]">{result.error}</p> : !row ? <p className="rounded-md border border-[#e2e8f0] bg-white p-8 text-sm text-[#8393a8]">Employee tidak ditemukan pada data sandbox.</p> : <><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-[27px] font-bold text-[#1d335b]">View Employee</h1><p className="mt-1 text-sm text-[#7788a0]">{row.employee.fullName} · {row.position?.title ?? "Tanpa posisi"}</p></div><select aria-label="Periode employee" value={period} onChange={(event) => setPeriod(event.target.value)} className="h-9 rounded-md border border-[#d6e0ec] bg-white px-3 text-xs">{!periods.includes(period) && <option value={period}>{period}</option>}{periods.map((item) => <option key={item}>{item}</option>)}</select></div><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_430px]"><div className="space-y-5"><section className="rounded-xl border border-[#dfe7f0] bg-white p-5"><h2 className="text-base font-bold text-[#2a456c]">Development Needs</h2>{row.development.length === 0 ? <p className="mt-3 text-xs text-[#8798ad]">Belum ada kebutuhan pengembangan.</p> : <ul className="mt-3 space-y-3">{row.development.map((item) => <li key={item.needId} className="rounded-lg bg-[#f5f8fc] p-3 text-xs"><div className="flex items-start gap-2 text-[#3f648b]"><BookOpen size={15} className="shrink-0" /><strong>{item.objective}</strong></div><p className="mt-1 pl-6 text-[#7389a3]">{item.status} · {item.priority} · {item.sourceType}</p></li>)}</ul>}<Link href={`/development?employeeId=${encodeURIComponent(employeeId)}`} className="mt-4 inline-block text-xs font-semibold text-[#2c6e9f]">View Development</Link></section><section className="rounded-xl border border-[#dfe7f0] bg-white p-5"><h2 className="text-base font-bold text-[#2a456c]">Training Tracking</h2>{row.training.length === 0 ? <p className="mt-3 text-xs text-[#8798ad]">Belum ada training terkait.</p> : <ul className="mt-3 space-y-3">{row.training.map((item) => <li key={item.trainingId} className="rounded-lg bg-[#f5f8fc] p-3 text-xs"><div className="flex items-start gap-2 text-[#3f648b]"><GraduationCap size={15} className="shrink-0" /><strong>{item.activity}</strong></div><p className="mt-1 pl-6 text-[#7389a3]">{item.date} · {item.status} · {item.result || "Hasil belum dicatat"}</p></li>)}</ul>}<Link href={`/training?employeeId=${encodeURIComponent(employeeId)}`} className="mt-4 inline-block text-xs font-semibold text-[#2c6e9f]">View Training</Link></section></div><EmployeeDetail row={row} showFullLink={false} /></div></>}</div></D4Shell>;
}
