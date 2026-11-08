"use client";

import { Eye } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { compileDaily, dailyEntriesOf, type DailyCompilation } from "../../../kpi/daily";
import { catalogFor, indicatorsFor, KPI_TARGET, roleForPosition, targetOf } from "../../../kpi/catalog";
import { performanceBand, scaleMaxOf } from "../../../kpi/scale";
import { canFillDaily } from "../../../shared/rules";
import type { EmployeeReference } from "../../../shared/types";
import type { KpiDailyEntry } from "../../../supabase/types";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { departmentOf, employeeById, employeeMeta, employeeSearchText, formatDate, formatGap, formatPeriod, formatScore, includesText, positionOf, thisMonth, today, visibleEmployees } from "../../data/selectors";
import { DataTable, PersonCell } from "../../ui/DataTable";
import { FilterBar, FormError, ReadOnlyField, SearchInput, SelectFilter, TextField } from "../../ui/forms";
import { DetailHeader, NotFound, PageHeader } from "../../ui/layout";
import { RowActionMenu } from "../../ui/RowActionMenu";
import { Button, Card, InfoGrid, Notice, StatusBadge } from "../../ui/primitives";
import { noKpiText, scorecardTotal } from "../kpi/KpiFormModal";

const NOT_READY = "Daily KPI belum tersedia karena database belum diperbarui (migrasi 20261108130000). Menu lain tetap bisa dipakai.";
const input = "h-9 w-full rounded-lg border border-line-strong px-2 text-sm aria-[invalid=true]:border-danger";

/** Daily KPI: employees score their own five Core KPI per day; HR, managers and management follow who filled them. */
export function DailyKpiPage() {
  const snapshot = useSnapshot();
  const team = snapshot.role !== "EMPLOYEE";
  return <>
    <PageHeader title="Daily KPI" subtitle={team
      ? "Skor harian lima Core KPI per pegawai. Rata-rata periode menjadi titik awal Performance Review."
      : "Isi skor lima Core KPI Anda untuk hari ini. Rata-rata sebulan menjadi titik awal Performance Review dari HR."} />
    {!snapshot.kpiDaily ? <Notice tone="warning">{NOT_READY}</Notice> : <div className="space-y-6">
      {canFillDaily(snapshot.role, snapshot.actorEmployeeId) && <MyDailyKpi team={team} />}
      {team && <TeamDailyKpi />}
    </div>}
  </>;
}

function MyDailyKpi({ team }: { team: boolean }) {
  const snapshot = useSnapshot();
  const { catalog: catalogSet, run, busy } = useD4();
  const me = employeeById(snapshot, snapshot.actorEmployeeId);
  const period = thisMonth();
  const [date, setDate] = useState(today());
  const catalog = catalogSet ? catalogFor(catalogSet, period) : null;
  const roleOrder = catalog ? roleForPosition(catalog, me?.positionId) : 0;
  const indicators = catalog ? indicatorsFor(catalog, roleOrder) : [];
  const max = scaleMaxOf(catalog?.version);
  const days = dailyEntriesOf(snapshot.kpiDaily ?? [], snapshot.actorEmployeeId, period);
  // A day that already has an entry opens with its scores, so a correction starts from what was saved.
  const savedFor = (day: string) => days.find((entry) => entry.entryDate === day);
  const linesOf = (entry?: KpiDailyEntry) => Array.from({ length: 5 }, (_, index) => ({ score: entry?.lines[index]?.raw_score?.toString() ?? "", comment: entry?.lines[index]?.comment ?? "" }));
  const [lines, setLines] = useState(() => linesOf(savedFor(date)));
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");

  // HR or a manager without a KPI role has nothing to fill; only an employee needs to be told why.
  if ((!catalog || indicators.length !== 5) && team) return null;
  if (!catalog || indicators.length !== 5) return <Card title="My KPI today" testId="my-daily-kpi"><Notice tone="warning">{positionOf(snapshot, me) ? noKpiText(catalog?.version) : "Akun Anda belum memiliki posisi aktif, jadi KPI-nya belum bisa ditentukan. Hubungi HR."}</Notice></Card>;

  const scores = lines.map((line) => line.score.trim() ? Number(line.score) : null);
  const valid = (score: number | null) => score !== null && Number.isInteger(score) && score >= 1 && score <= max;
  const total = scorecardTotal(indicators.map((row, index) => ({ weight_percent: row.weight_percent, raw_score: scores[index] })), max);
  const existing = savedFor(date);

  function chooseDate(value: string) { setDate(value); setLines(linesOf(savedFor(value))); setTouched(false); setError(""); }
  function setLine(index: number, patch: Partial<{ score: string; comment: string }>) { setLines((items) => items.map((line, at) => at === index ? { ...line, ...patch } : line)); }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!date || date > today() || !date.startsWith(period)) { setError(`Pilih hari ini atau hari sebelumnya di periode ${formatPeriod(period)}.`); return; }
    if (!scores.every(valid)) { setError(`Isi skor 1–${max} untuk kelima KPI.`); return; }
    setError("");
    const result = await run((source) => source.createDailyKpi({ entryDate: date, lines: lines.map((line, index) => ({ raw_score: scores[index], comment: line.comment })) }), existing ? "Koreksi Daily KPI tersimpan." : "Daily KPI tersimpan.");
    if (result.ok) setTouched(false); else setError(result.error);
  }

  const compiled = compileDaily(snapshot.kpiDaily ?? [], snapshot.actorEmployeeId, period);
  return <>
    <Card title="My KPI today" testId="my-daily-kpi">
      <form onSubmit={submit} noValidate className="space-y-5">
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Date" testId="daily-date" required type="date" min={`${period}-01`} max={today()} value={date} onChange={(event) => chooseDate(event.target.value)} />
          <ReadOnlyField label="Position KPI" testId="daily-role" value={indicators[0].role_name} />
          <ReadOnlyField label="Catalog" testId="daily-catalog" value={`KPI Scorecard ${catalog.version} · skala 1–${max}`} />
        </div>
        {existing && <Notice>Tanggal ini sudah diisi (total {formatScore(existing.overallScore, max)}). Menyimpan lagi mencatat koreksi; entri terbaru yang dipakai.</Notice>}
        <ol className="divide-y divide-line rounded-2xl border border-line">
          {indicators.map((row, index) => <li key={row.indicator_order} data-testid={`daily-line-${row.indicator_order}`} className="grid grid-cols-[minmax(0,1fr)_72px] gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_96px_72px_minmax(0,220px)] sm:items-center">
            <div className="col-span-2 min-w-0 sm:col-span-1">
              <p className="text-sm font-semibold text-ink">{row.indicator_order}. {row.kpi_name}</p>
              <p className="text-xs text-ink-3">Weight {row.weight_percent}% · Target {targetOf(row)}</p>
            </div>
            <label className="block text-xs font-semibold text-ink-3">Score
              <input type="number" inputMode="numeric" min={1} max={max} step={1} data-testid={`input-daily-score-${row.indicator_order}`} aria-label={`Score ${row.kpi_name}`}
                aria-invalid={touched && !valid(scores[index])} value={lines[index].score} onChange={(event) => setLine(index, { score: event.target.value })} className={`mt-1 tabular-nums ${input}`} />
            </label>
            <p className="text-xs font-semibold text-ink-3">Gap<span data-testid={`daily-gap-${row.indicator_order}`} className="mt-1 block text-sm tabular-nums text-ink-2">{valid(scores[index]) ? formatGap(scores[index], catalog.version) : "—"}</span></p>
            <label className="col-span-2 block text-xs font-semibold text-ink-3 sm:col-span-1">Comment
              <input data-testid={`input-daily-comment-${row.indicator_order}`} maxLength={500} placeholder="Catatan singkat (opsional)" value={lines[index].comment} onChange={(event) => setLine(index, { comment: event.target.value })} className={`mt-1 ${input}`} />
            </label>
          </li>)}
        </ol>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p data-testid="daily-total" className="text-sm text-ink-2">Total <strong className="font-display text-lg font-semibold tabular-nums text-ink">{formatScore(total, max)}</strong>
            {total !== null && max === 100 && <span className="ml-2 tabular-nums">gap {formatGap(total, catalog.version)} dari target {KPI_TARGET}</span>}</p>
          <Button type="submit" disabled={busy} data-testid="btn-save-daily">{existing ? "Save correction" : "Save"}</Button>
        </div>
      </form>
    </Card>
    <Card title={`This period · ${formatPeriod(period)}`} testId="my-daily-period">
      <DailySummary compiled={compiled} />
      <div className="mt-5"><DailyEntriesTable entries={[...days].reverse()} /></div>
    </Card>
  </>;
}

function DailySummary({ compiled }: { compiled: DailyCompilation | null }) {
  const band = compiled && performanceBand(compiled.total, compiled.definitionVersion);
  return <InfoGrid columns={3} items={[
    { label: "Days filled", testId: "days-filled", value: compiled ? compiled.days.length : 0 },
    { label: "Compiled score", testId: "compiled-score", value: compiled ? <><strong className="font-display text-lg font-semibold tabular-nums">{formatScore(compiled.total, scaleMaxOf(compiled.definitionVersion))}</strong>{band && <span className="mt-1 block"><StatusBadge status={band} /></span>}</> : "—" },
    { label: `Gap vs target ${KPI_TARGET}`, testId: "compiled-gap", value: compiled ? formatGap(compiled.total, compiled.definitionVersion) : "—" },
  ]} />;
}

function DailyEntriesTable({ entries }: { entries: KpiDailyEntry[] }) {
  return <DataTable<KpiDailyEntry> rows={entries} noun="days" rowKey={(entry) => entry.id}
    emptyTitle="Belum ada entri" emptyText="Belum ada skor harian di periode ini."
    columns={[
      { key: "date", header: "Date", cell: (entry) => formatDate(entry.entryDate) },
      { key: "total", header: "Total", className: "tabular-nums", cell: (entry) => <span className="font-semibold">{formatScore(entry.overallScore, scaleMaxOf(entry.definitionVersion))}</span> },
      { key: "gap", header: `Gap vs ${KPI_TARGET}`, className: "tabular-nums", cell: (entry) => formatGap(entry.overallScore, entry.definitionVersion) },
      { key: "scores", header: "Scores (KPI 1–5)", className: "tabular-nums", cell: (entry) => entry.lines.map((line) => line.raw_score ?? "—").join(" · ") },
      { key: "comments", header: "Comments", wrap: true, secondary: true, cell: (entry) => entry.lines.map((line) => line.comment).filter(Boolean).join("; ") || "—" },
    ]} />;
}

type TeamRow = { employee: EmployeeReference; position: string; compiled: DailyCompilation | null; last?: string };

function TeamDailyKpi() {
  const snapshot = useSnapshot();
  const { catalog: catalogSet } = useD4();
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState(thisMonth());
  const periods = useMemo(() => [...new Set([thisMonth(), ...(snapshot.kpiDaily ?? []).map((entry) => entry.period)])].sort().reverse(), [snapshot]);
  const catalog = catalogSet && catalogFor(catalogSet, period);
  const rows = useMemo<TeamRow[]>(() => visibleEmployees(snapshot)
    // Employees whose position has no KPI role have nothing to fill, unless they already have entries.
    .filter((employee) => (catalog && roleForPosition(catalog, employee.positionId)) || (snapshot.kpiDaily ?? []).some((entry) => entry.employeeId === employee.id && entry.period === period))
    .filter((employee) => includesText(employeeSearchText(snapshot, employee), search))
    .map((employee) => {
      const compiled = compileDaily(snapshot.kpiDaily ?? [], employee.id, period);
      return { employee, position: positionOf(snapshot, employee)?.title ?? "—", compiled, last: compiled?.days.at(-1)?.entryDate };
    }).sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName)), [snapshot, catalog, period, search]);

  return <section aria-label="Team daily KPI" className="space-y-4">
    <h2 className="font-display text-lg font-semibold text-ink">Team · {formatPeriod(period)}</h2>
    <FilterBar canReset={Boolean(search || period !== thisMonth())} onReset={() => { setSearch(""); setPeriod(thisMonth()); }}>
      <SearchInput value={search} onChange={setSearch} placeholder="Search name or position" />
      <SelectFilter label="Period" testId="daily-period" value={period} onChange={(value) => setPeriod(value || thisMonth())} emptyOption={false} options={periods.map((item) => ({ value: item, label: formatPeriod(item) }))} />
    </FilterBar>
    <DataTable<TeamRow> rows={rows} noun="employees" rowKey={(row) => row.employee.id}
      emptyTitle="Tidak ada pegawai yang cocok" emptyText="Ubah kata kunci atau periode. Hanya pegawai dengan KPI di katalog yang tampil."
      columns={[
        { key: "employee", header: "Employee", cell: (row) => <PersonCell name={row.employee.fullName} code={row.employee.employeeId} /> },
        { key: "position", header: "Position / Department", wrap: true, cell: (row) => <><span className="block">{row.position}</span><span className="block text-xs text-ink-3">{departmentOf(snapshot, row.employee)?.name ?? "—"}</span></> },
        { key: "days", header: "Days filled", className: "tabular-nums", cell: (row) => row.compiled?.days.length ?? 0 },
        { key: "last", header: "Last entry", cell: (row) => formatDate(row.last) },
        { key: "score", header: "Compiled score", className: "tabular-nums", cell: (row) => row.compiled ? <span className="font-semibold">{formatScore(row.compiled.total, scaleMaxOf(row.compiled.definitionVersion))}</span> : "—" },
        { key: "gap", header: `Gap vs ${KPI_TARGET}`, className: "tabular-nums", cell: (row) => row.compiled ? formatGap(row.compiled.total, row.compiled.definitionVersion) : "—" },
        { key: "status", header: "Status", cell: (row) => <StatusBadge status={!row.compiled ? "No entries" : performanceBand(row.compiled.total, row.compiled.definitionVersion) ?? "Filled"} /> },
      ]}
      actions={(row) => <RowActionMenu label={`Actions for ${row.employee.fullName}`} actions={[
        { label: "View entries", testId: "view-entries", icon: <Eye />, href: `/daily-kpi/${row.employee.id}` },
      ]} />} />
  </section>;
}

/** Every daily entry of one employee, a period at a time (newest period first). */
export function DailyKpiEmployeePage({ employeeId }: { employeeId: string }) {
  const snapshot = useSnapshot();
  const employee = employeeById(snapshot, employeeId);
  const periods = [...new Set([thisMonth(), ...(snapshot.kpiDaily ?? []).filter((entry) => entry.employeeId === employeeId).map((entry) => entry.period)])].sort().reverse();
  const [period, setPeriod] = useState(periods[0]);
  if (!employee || !visibleEmployees(snapshot).some((item) => item.id === employeeId)) return <NotFound what="Employee" backHref="/daily-kpi" backLabel="Back to Daily KPI" />;
  const entries = dailyEntriesOf(snapshot.kpiDaily ?? [], employeeId, period).reverse();
  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "Daily KPI", href: "/daily-kpi" }, { label: "Entries" }]} backHref="/daily-kpi"
      name={employee.fullName} meta={[...employeeMeta(snapshot, employee), `Period ${formatPeriod(period)}`]} />
    {!snapshot.kpiDaily ? <Notice tone="warning">{NOT_READY}</Notice> : <Card title="Daily entries" testId="daily-entries"
      actions={<div className="w-48"><SelectFilter label="Period" testId="daily-period" value={period} onChange={(value) => setPeriod(value || periods[0])} emptyOption={false} options={periods.map((item) => ({ value: item, label: formatPeriod(item) }))} /></div>}>
      <DailySummary compiled={compileDaily(snapshot.kpiDaily, employeeId, period)} />
      <div className="mt-5"><DailyEntriesTable entries={entries} /></div>
    </Card>}
  </>;
}
