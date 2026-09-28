"use client";

import { ArrowLeft, CheckCircle2, Clock3, History, Save, Target } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { d4ReferenceFixture } from "../shared/fixtures";
import { D4Shell } from "../shared/ui";
import { definitionsForPosition, getKpiStoredSnapshot, listKpiRecords, saveKpiRecord, subscribeKpiRecords } from "./service";
import type { KpiLineInput, KpiRecord } from "./types";

const defaultEmployeeId = "d4000000-0000-4000-8000-000000000009";

function inputsForRecord(record?: KpiRecord): KpiLineInput[] {
  return record?.lines.map(({ definitionId, target, realization, rawScore }) => ({ definitionId, target, realization, rawScore })) ?? [];
}

function inputsForPosition(positionId: string): KpiLineInput[] {
  return definitionsForPosition(positionId).map((item) => ({
    definitionId: item.id,
    target: item.targetExample,
    realization: "",
    rawScore: null,
  }));
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

export function KpiScreen({ initialEmployeeId, initialPeriod }: { initialEmployeeId?: string; initialPeriod?: string }) {
  const [employeeId, setEmployeeId] = useState(
    d4ReferenceFixture.employees.some((item) => item.id === initialEmployeeId) ? initialEmployeeId! : defaultEmployeeId,
  );
  const [period, setPeriod] = useState(initialPeriod && /^\d{4}-(0[1-9]|1[0-2])$/.test(initialPeriod) ? initialPeriod : "2026-09");
  const storedSnapshot = useSyncExternalStore(subscribeKpiRecords, getKpiStoredSnapshot, () => "");
  const records = useMemo(() => listKpiRecords(storedSnapshot), [storedSnapshot]);
  const [draft, setDraft] = useState<{ key: string; lines: KpiLineInput[] } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const employee = d4ReferenceFixture.employees.find((item) => item.id === employeeId);
  const position = d4ReferenceFixture.positions.find((item) => item.id === employee?.positionId);
  const definitions = useMemo(() => definitionsForPosition(position?.id ?? ""), [position?.id]);
  const matchingRecords = records.filter((item) => item.employeeId === employeeId && item.period === period);
  const latestRecord = matchingRecords[0];
  const draftKey = `${employeeId}:${period}:${latestRecord?.id ?? "new"}`;
  const lines = draft?.key === draftKey
    ? draft.lines
    : latestRecord ? inputsForRecord(latestRecord) : inputsForPosition(position?.id ?? "");
  const scoreComplete = definitions.length === 5 && definitions.every((definition) => {
    const score = lines.find((item) => item.definitionId === definition.id)?.rawScore;
    return typeof score === "number" && Number.isInteger(score) && score >= 1 && score <= 5;
  });
  const previewScore = scoreComplete
    ? definitions.reduce((sum, definition) => sum + definition.weight / 100 * (lines.find((item) => item.definitionId === definition.id)?.rawScore ?? 0), 0)
    : null;
  const displayScore = previewScore ?? latestRecord?.totalScore ?? null;
  const ringPercent = Math.max(0, Math.min(100, (displayScore ?? 0) / 5 * 100));

  function selectEmployee(nextId: string) {
    setEmployeeId(nextId);
    setDraft(null);
    setMessage("");
    setError("");
  }

  function selectPeriod(nextPeriod: string) {
    setPeriod(nextPeriod);
    setDraft(null);
    setMessage("");
    setError("");
  }

  function updateLine(id: string, patch: Partial<KpiLineInput>) {
    setDraft({ key: draftKey, lines: lines.map((line) => line.definitionId === id ? { ...line, ...patch } : line) });
    setMessage("");
    setError("");
  }

  function handleSave() {
    try {
      const saved = saveKpiRecord({ employeeId, period, lines });
      setDraft(null);
      setMessage(`Skor KPI tersimpan sebagai riwayat baru pada ${dateLabel(saved.createdAt)}.`);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Skor KPI gagal disimpan.");
      setMessage("");
    }
  }

  return (
    <D4Shell>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-[12px] font-medium text-[#8190a8]">Performance & KPI / KPI Scorecard</p>
          <h1 className="text-[27px] font-bold tracking-tight text-[#1d335b]">KPI Scorecard</h1>
          <p className="mt-1 text-sm text-[#70809b]">Lima indikator per posisi, dengan skor mentah yang diisi manual.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/performance" className="inline-flex h-9 items-center gap-2 rounded-md border border-[#d9e2f1] px-3 text-xs font-semibold text-[#2b4774]"><ArrowLeft size={14} /> Performance</Link>
          <button type="button" onClick={() => setHistoryOpen((value) => !value)} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#cbdaf2] bg-[#f5f8ff] px-3 text-xs font-semibold text-[#26477d]"><History size={14} /> View History</button>
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-[#cde5f7] bg-[#f2f9ff] px-4 py-3 text-xs text-[#326285]">
        Data employee dan scorecard di halaman ini adalah fixture lokal. Definisi lima KPI serta bobot Finance & Administration dan Sales & Marketing mengacu pada V5.1. Hanya target Finance yang memiliki contoh di workbook.
      </div>

      <section className="mb-5 grid gap-4 rounded-xl border border-[#e3e8f0] bg-white p-5 shadow-[0_1px_4px_rgba(19,44,80,.05)] md:grid-cols-[1fr_1fr_180px]">
        <label className="text-xs font-semibold text-[#536684]">Employee
          <select value={employeeId} onChange={(event) => selectEmployee(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-[#d5dfed] bg-white px-3 text-sm font-normal text-[#20375c] outline-none focus:border-[#3c75b8]">
            {d4ReferenceFixture.employees.map((item) => <option key={item.id} value={item.id}>{item.fullName} ({item.employeeId})</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-[#536684]">Position
          <div className="mt-2 flex h-10 items-center rounded-lg border border-[#d5dfed] bg-[#f5f7fa] px-3 text-sm font-normal text-[#20375c]">{position?.title ?? "Posisi tidak tersedia"}</div>
        </label>
        <label className="text-xs font-semibold text-[#536684]">Period
          <input type="month" value={period} onChange={(event) => selectPeriod(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-[#d5dfed] bg-white px-3 text-sm font-normal text-[#20375c] outline-none focus:border-[#3c75b8]" />
        </label>
      </section>

      {definitions.length === 0 ? (
        <section className="rounded-xl border border-dashed border-[#ccd7e7] bg-[#fafcff] px-6 py-12 text-center">
          <Target className="mx-auto mb-3 text-[#89a0bf]" size={30} />
          <h2 className="font-semibold">Definisi KPI posisi belum tersedia</h2>
          <p className="mt-2 text-sm text-[#7586a0]">Definisi V5.1 tersedia untuk Finance & Administration dan Sales & Marketing. Posisi lain belum dipetakan ke nama posisi resmi pada workbook.</p>
        </section>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
          <section className="overflow-hidden rounded-xl border border-[#e3e8f0] bg-white shadow-[0_2px_8px_rgba(19,44,80,.05)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e7ecf4] px-5 py-4">
              <div><h2 className="font-bold text-[#223b65]">KPI Details</h2><p className="text-xs text-[#8a99af]">Definisi V5.1, bobot total 100%</p></div>
              <span className="rounded-full bg-[#e7f4ed] px-3 py-1 text-xs font-semibold text-[#20795d]">{position?.title}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-[12px]">
                <thead className="bg-[#f3f6fb] text-[10px] uppercase tracking-wide text-[#657a9d]"><tr><th className="px-4 py-3">KPI</th><th className="px-3 py-3">Weight</th><th className="px-3 py-3">Target</th><th className="px-3 py-3">Realisasi</th><th className="px-3 py-3">Skor 1–5</th><th className="px-3 py-3">Terbobot</th></tr></thead>
                <tbody className="divide-y divide-[#edf0f5]">
                  {definitions.map((definition) => {
                    const item = lines.find((line) => line.definitionId === definition.id);
                    const weighted = item?.rawScore ? definition.weight / 100 * item.rawScore : null;
                    return <tr key={definition.id} className="align-middle hover:bg-[#fbfcff]">
                      <td className="max-w-[245px] px-4 py-3 font-semibold text-[#344b6d]">{definition.name}</td>
                      <td className="px-3 py-3 text-[#476080]">{definition.weight}%</td>
                      <td className="px-3 py-3"><input aria-label={`Target ${definition.name}`} value={item?.target ?? ""} onChange={(event) => updateLine(definition.id, { target: event.target.value })} placeholder="Isi target periode" className="w-[150px] rounded-md border border-[#dce4ef] px-2 py-1.5 text-[#4e6685] outline-none focus:border-[#6b9bd0]" /></td>
                      <td className="px-3 py-3"><input aria-label={`Realisasi ${definition.name}`} value={item?.realization ?? ""} onChange={(event) => updateLine(definition.id, { realization: event.target.value })} placeholder="Isi realisasi" className="w-[130px] rounded-md border border-[#dce4ef] px-2 py-1.5 text-[#4e6685] outline-none focus:border-[#6b9bd0]" /></td>
                      <td className="px-3 py-3"><input aria-label={`Skor mentah ${definition.name}`} type="number" min="1" max="5" step="1" value={item?.rawScore ?? ""} onChange={(event) => updateLine(definition.id, { rawScore: event.target.value === "" ? null : Number(event.target.value) })} className="w-16 rounded-md border border-[#dce4ef] px-2 py-1.5 text-[#4e6685] outline-none focus:border-[#6b9bd0]" /></td>
                      <td className="px-3 py-3 font-semibold text-[#314f7b]">{weighted === null ? "–" : weighted.toFixed(2)}</td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e7ecf4] bg-[#fbfcff] px-5 py-4">
              <p className="text-xs text-[#6e7f99]">Skor mentah tidak dihitung otomatis dari realisasi. Simpan membuat catatan riwayat baru.</p>
              <button type="button" onClick={handleSave} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#078a62] px-4 text-xs font-bold text-white hover:bg-[#067553]"><Save size={14} /> Simpan Scorecard</button>
            </div>
            {(message || error) && <p role="status" className={`px-5 pb-4 text-sm ${error ? "text-[#b5444c]" : "text-[#13795d]"}`}>{error || message}</p>}
          </section>

          <aside className="space-y-4">
            <section className="rounded-xl border border-[#e3e8f0] bg-white p-5 text-center shadow-[0_2px_8px_rgba(19,44,80,.05)]">
              <div className="mx-auto mb-3 flex size-36 items-center justify-center rounded-full" style={{ background: `conic-gradient(#159d77 ${ringPercent}%, #e7edf4 ${ringPercent}% 100%)` }}>
                <div className="flex size-[108px] flex-col items-center justify-center rounded-full bg-white"><strong className="text-3xl text-[#203b66]">{displayScore === null ? "--" : displayScore.toFixed(2)}</strong><small className="text-[#8998ac]">dari 5</small></div>
              </div>
              <h2 className="font-bold text-[#203b66]">Skor KPI Berbobot</h2>
              <p className="mt-1 text-xs text-[#8392a9]">{scoreComplete ? "Pratinjau dari input saat ini" : latestRecord ? "Riwayat terbaru pada periode ini" : "Belum ada skor pada periode ini"}</p>
              <div className="mt-4 rounded-lg bg-[#e9f7f2] px-3 py-2 text-sm font-bold text-[#147957]">{displayScore === null ? "Belum ada skor" : `${(displayScore / 5 * 100).toFixed(0)}% dari skor maksimum`}</div>
              <p className="mt-3 text-[11px] leading-relaxed text-[#8290a6]">Angka ini bukan status tercapai. Ambang pencapaian belum ditetapkan oleh dokumen kebutuhan.</p>
            </section>
            <section className="rounded-xl border border-[#e3e8f0] bg-white p-4 text-xs text-[#637690]"><div className="flex items-center gap-2 font-bold text-[#2a4772]"><CheckCircle2 size={15} /> Snapshot posisi dan bobot</div><p className="mt-2 leading-relaxed">Setiap penyimpanan mencatat posisi, versi V5.1, target, realisasi, skor, dan bobot. Riwayat lama tidak diubah.</p></section>
          </aside>
        </div>
      )}

      {historyOpen && <section className="mt-5 rounded-xl border border-[#e3e8f0] bg-white p-5 shadow-[0_2px_8px_rgba(19,44,80,.05)]">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-[#203b66]"><Clock3 size={17} /> History {employee?.fullName} · {period}</h2>
        {matchingRecords.length === 0 ? <p className="text-sm text-[#8392a9]">Belum ada scorecard pada periode ini.</p> : <ul className="divide-y divide-[#e9edf4]">{matchingRecords.map((record) => <li key={record.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span><strong className="text-[#2a4772]">{record.totalScore.toFixed(2)} / 5</strong><small className="ml-3 text-[#8492a6]">{record.definitionVersion} · {dateLabel(record.createdAt)} · {record.actor}</small></span><span className="rounded-full bg-[#eef4fa] px-2 py-1 text-[11px] text-[#627b9d]">{record.source === "fixture" ? "Fixture" : "Demo lokal"}</span></li>)}</ul>}
      </section>}
    </D4Shell>
  );
}
