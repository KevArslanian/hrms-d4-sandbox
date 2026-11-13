"use client";

import { CheckCircle2, Eye } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { compileDaily, dailyEntriesOf, type DailyCompilation } from "../../../kpi/daily";
import { catalogFor, indicatorsFor, KPI_TARGET, roleForPosition, targetOf } from "../../../kpi/catalog";
import { aboveScale, performanceBand, scaleMaxOf } from "../../../kpi/scale";
import { canFillDaily } from "../../../shared/rules";
import type { EmployeeReference } from "../../../shared/types";
import type { KpiAssessment, KpiDailyEntry } from "../../../supabase/types";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { byProgress, canAssess, departmentOf, employeeById, employeeMeta, employeeSearchText, formatDate, formatGap, formatPeriod, formatScore, includesText, positionOf, scorecardsOf, thisMonth, today, visibleEmployees } from "../../data/selectors";
import { DataTable, PersonCell } from "../../ui/DataTable";
import { DateField, FilterBar, FormError, PeriodFilter, ReadOnlyField, SearchInput } from "../../ui/forms";
import { DetailHeader, NotFound, PageHeader } from "../../ui/layout";
import { RowActionMenu } from "../../ui/RowActionMenu";
import { Button, Card, InfoGrid, Notice, SavedNotice, StatusBadge } from "../../ui/primitives";
import { FinalizeDailyModal } from "../kpi/FinalizeDailyModal";
import { noKpiText, scorecardTotal } from "../kpi/KpiFormModal";
import { COMPILED_RULE, correctionsByDay, isDirty, scoreProblem, workingDaysSoFar } from "./entry";

const NOT_READY = "Daily KPI belum tersedia karena database belum diperbarui (migrasi 20261108130000). Menu lain tetap bisa dipakai.";
const input = "h-9 w-full rounded-2xl border border-ink-3 px-3 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 text-sm aria-[invalid=true]:border-danger";

/** Daily KPI: employees score their own five Core KPI per day; HR, managers and management follow who filled them. */
export function DailyKpiPage() {
  const snapshot = useSnapshot();
  const team = snapshot.role !== "EMPLOYEE";
  return <>
    <PageHeader title="Daily KPI" subtitle={team
      ? "Skor harian lima Core KPI per pegawai. Compiled score periode menjadi titik awal Performance Review."
      : "Isi skor lima Core KPI Anda untuk hari ini. Compiled score sebulan menjadi titik awal Performance Review dari HR."} />
    {!snapshot.kpiDaily ? <Notice tone="warning">{NOT_READY}</Notice> : <div className="space-y-6">
      {canFillDaily(snapshot.role, snapshot.actorEmployeeId) && <MyDailyKpi team={team} />}
      {team && <TeamDailyKpi />}
    </div>}
  </>;
}

function MyDailyKpi({ team }: { team: boolean }) {
  const snapshot = useSnapshot();
  const { catalog: catalogSet, run, busy } = useD4();
  const router = useRouter();
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
  // A date pick or a link that would throw typed scores away waits here for the user's answer. `back` gets focus
  // again afterwards: the calendar day that was clicked no longer exists, so the dialog cannot restore it itself.
  const [discarding, setDiscarding] = useState<({ date: string } | { href: string }) & { back: HTMLElement | null } | null>(null);
  const scoreInputs = useRef<(HTMLInputElement | null)[]>([]);
  const dirty = isDirty(lines, linesOf(savedFor(date)));
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    // Next's <Link> navigates without beforeunload, so in-app links are stopped before React handles the click.
    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      setDiscarding({ href: `${url.pathname}${url.search}`, back: link });
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onClick, true);
    return () => { window.removeEventListener("beforeunload", onUnload); document.removeEventListener("click", onClick, true); };
  }, [dirty]);

  // HR or a manager without a KPI role has nothing to fill; only an employee needs to be told why.
  if ((!catalog || indicators.length !== 5) && team) return null;
  if (!catalog || indicators.length !== 5) return <Card title="My KPI today" testId="my-daily-kpi"><Notice tone="warning">{positionOf(snapshot, me) ? noKpiText(catalog?.version) : "Akun Anda belum memiliki posisi aktif, jadi KPI-nya belum bisa ditentukan. Hubungi HR."}</Notice></Card>;

  const problems = lines.map((line) => scoreProblem(line.score, max));
  const scores = lines.map((line, index) => problems[index] ? null : Number(line.score.trim()));
  const total = scorecardTotal(indicators.map((row, index) => ({ weight_percent: row.weight_percent, raw_score: scores[index] })), max);
  const existing = savedFor(date);

  function openDate(value: string) { setDate(value); setLines(linesOf(savedFor(value))); setTouched(false); setError(""); }
  const dateTrigger = () => document.querySelector<HTMLElement>("[data-testid='input-daily-date']");
  function chooseDate(value: string) { if (dirty && value !== date) setDiscarding({ date: value, back: dateTrigger() }); else openDate(value); }
  function discard() {
    if (!discarding) return;
    if ("date" in discarding) openDate(discarding.date); else router.push(discarding.href);
    setDiscarding(null);
  }
  function setLine(index: number, patch: Partial<{ score: string; comment: string }>) { setLines((items) => items.map((line, at) => at === index ? { ...line, ...patch } : line)); }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!date || date > today() || !date.startsWith(period)) { setError(`Pilih hari ini atau hari sebelumnya di periode ${formatPeriod(period)}.`); return; }
    const invalid = indicators.filter((_, index) => problems[index]);
    if (invalid.length) {
      setError(`Periksa skor ${invalid.map((row) => `KPI ${row.indicator_order}`).join(", ")}: isi bilangan bulat 1 sampai ${max}, tanpa desimal.`);
      // Centered, so the sticky top bar does not cover the field that receives focus.
      const first = scoreInputs.current[problems.findIndex(Boolean)];
      first?.focus({ preventScroll: true });
      first?.scrollIntoView({ block: "center" });
      return;
    }
    setError("");
    const saving = date;
    const result = await run((source) => source.createDailyKpi({ entryDate: saving, lines: lines.map((line, index) => ({ raw_score: scores[index], comment: line.comment })) }), existing ? "Koreksi Daily KPI tersimpan." : "Daily KPI tersimpan.");
    if (!result.ok) { setError(result.error); return; }
    setTouched(false);
    // A correction is done once saved: back to today, so the next save does not overwrite the past day again.
    if (saving !== today()) openDate(today());
  }

  const compiled = compileDaily(snapshot.kpiDaily ?? [], snapshot.actorEmployeeId, period);
  return <>
    <Card title="My KPI today" testId="my-daily-kpi">
      <form onSubmit={submit} noValidate className="space-y-5">
        {/* B5 (interview D4, 14 Oct 2026): everyone scores their KPI every day before going home. */}
        {!savedFor(today()) && <div data-testid="daily-reminder"><Notice tone="warning">Daily KPI hari ini belum diisi. Isi sebelum pulang.</Notice></div>}
        <div className="grid gap-4 sm:grid-cols-3">
          <DateField label="Date" testId="daily-date" required min={`${period}-01`} max={today()} value={date} onChange={(event) => chooseDate(event.target.value)} />
          <ReadOnlyField label="Position KPI" testId="daily-role" value={indicators[0].role_name} />
          <ReadOnlyField label="Catalog" testId="daily-catalog" value={`KPI Scorecard ${catalog.version} · skala 1–${max}`} />
        </div>
        {existing && <Notice>Tanggal ini sudah diisi (total {formatScore(existing.overallScore, max)}). Menyimpan lagi mencatat koreksi; entri terbaru yang dipakai.</Notice>}
        <ol className="divide-y divide-line rounded-2xl border border-line">
          {indicators.map((row, index) => {
            const problem = touched ? problems[index] : "";
            const comment = lines[index].comment;
            return <li key={row.indicator_order} data-testid={`daily-line-${row.indicator_order}`} className="grid grid-cols-[minmax(0,1fr)_72px] gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_96px_72px_minmax(0,220px)] sm:items-center">
              <div className="col-span-2 min-w-0 sm:col-span-1">
                <p className="text-sm font-semibold text-ink">{row.indicator_order}. {row.kpi_name}</p>
                <p className="text-xs text-ink-3">Weight {row.weight_percent}% · Target {targetOf(row)}</p>
              </div>
              <label className="block text-xs font-semibold text-ink-3">Score
                {/* Text, not type="number": the browser would read "1e2" as 100 and hide what was typed. */}
                <input ref={(element) => { scoreInputs.current[index] = element; }} type="text" inputMode="numeric" autoComplete="off" data-testid={`input-daily-score-${row.indicator_order}`} aria-label={`Score ${row.kpi_name}`}
                  aria-invalid={Boolean(problem)} aria-describedby={problem ? `daily-score-error-${row.indicator_order}` : undefined}
                  value={lines[index].score} onChange={(event) => { if (!aboveScale(event.target.value, max)) setLine(index, { score: event.target.value }); }} className={`mt-1 tabular-nums ${input}`} />
              </label>
              <p className="text-xs font-semibold text-ink-3">Gap<span data-testid={`daily-gap-${row.indicator_order}`} className="mt-1 block text-sm tabular-nums text-ink-2">{scores[index] !== null ? formatGap(scores[index], catalog.version) : "—"}</span></p>
              <label className="col-span-2 block text-xs font-semibold text-ink-3 sm:col-span-1">Comment
                <input data-testid={`input-daily-comment-${row.indicator_order}`} maxLength={COMMENT_MAX} placeholder="Catatan singkat (opsional)" value={comment}
                  aria-describedby={comment ? `daily-comment-count-${row.indicator_order}` : undefined} onChange={(event) => setLine(index, { comment: event.target.value })} className={`mt-1 ${input}`} />
                {comment && <span id={`daily-comment-count-${row.indicator_order}`} data-testid={`daily-comment-count-${row.indicator_order}`} className="mt-1 block text-right font-normal tabular-nums">{comment.length}/{COMMENT_MAX}</span>}
              </label>
              {problem && <p id={`daily-score-error-${row.indicator_order}`} data-testid={`daily-score-error-${row.indicator_order}`} className="col-span-2 text-xs text-danger sm:col-span-4">KPI {row.indicator_order} {row.kpi_name}: {problem}</p>}
            </li>;
          })}
        </ol>
        {/* Next to Save, so the message is on screen where the button was pressed, also on a phone. */}
        <FormError message={error} />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p data-testid="daily-total" className="text-sm text-ink-2">Total <strong className="font-display text-lg font-semibold tabular-nums text-ink">{formatScore(total, max)}</strong>
            {total !== null && max === 100 && <span className="ml-2 tabular-nums">gap {formatGap(total, catalog.version)} dari target {KPI_TARGET}</span>}</p>
          <Button type="submit" disabled={busy} data-testid="btn-save-daily">{existing ? "Save correction" : "Save"}</Button>
        </div>
      </form>
    </Card>
    <Card title={`This period · ${formatPeriod(period)}`} testId="my-daily-period">
      <DailySummary compiled={compiled} />
      <div className="mt-5"><DailyEntriesTable entries={[...days].reverse()} corrections={correctionsByDay(snapshot.kpiDaily ?? [], snapshot.actorEmployeeId, period)} /></div>
    </Card>
    {discarding && <DiscardDialog what={"date" in discarding ? `Pindah ke ${formatDate(discarding.date)}?` : "Tinggalkan halaman ini?"} back={discarding.back} onKeep={() => setDiscarding(null)} onDiscard={discard} />}
  </>;
}

const COMMENT_MAX = 500;

/** Native modal dialog: the browser keeps focus inside and turns Escape into "keep editing". Focus goes to `back` on close. */
function DiscardDialog({ what, back, onKeep, onDiscard }: { what: string; back: HTMLElement | null; onKeep: () => void; onDiscard: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); back?.focus(); };
  }, [back]);
  return <dialog ref={dialog} data-testid="daily-discard-confirm" aria-labelledby="daily-discard-title" onCancel={(event) => { event.preventDefault(); onKeep(); }}
    className="m-auto w-[calc(100%-32px)] max-w-sm rounded-2xl bg-surface p-6 shadow-modal backdrop:bg-ink/40">
    <h2 id="daily-discard-title" className="font-display text-base font-semibold text-ink">{what}</h2>
    <p className="mt-1.5 text-sm text-ink-3">Skor dan komentar yang belum disimpan akan hilang.</p>
    <div className="mt-5 flex justify-end gap-3">
      <Button variant="secondary" data-testid="btn-discard-keep" autoFocus onClick={onKeep}>Keep editing</Button>
      <Button variant="danger" data-testid="btn-discard-confirm" onClick={onDiscard}>Discard</Button>
    </div>
  </dialog>;
}

function DailySummary({ compiled }: { compiled: DailyCompilation | null }) {
  const band = compiled && performanceBand(compiled.total, compiled.definitionVersion);
  const weights = compiled?.days.at(-1)?.lines.map((line) => line.weight_percent) ?? [];
  return <><InfoGrid columns={3} items={[
    { label: "Days filled", testId: "days-filled", value: compiled ? compiled.days.length : 0 },
    { label: "Compiled score", testId: "compiled-score", value: compiled ? <><strong className="font-display text-lg font-semibold tabular-nums">{formatScore(compiled.total, scaleMaxOf(compiled.definitionVersion))}</strong>{band && <span className="mt-1 block"><StatusBadge status={band} /></span>}</> : "—" },
    { label: `Gap vs target ${KPI_TARGET}`, testId: "compiled-gap", value: compiled ? formatGap(compiled.total, compiled.definitionVersion) : "—" },
  ]} />
    {/* K5: the per-KPI scores and weights are on screen, so the compiled number can be recomputed here. */}
    {compiled && <p data-testid="compiled-rule" className="mt-4 text-xs leading-5 text-ink-3">{COMPILED_RULE} Skor bulat per KPI: {compiled.scores.map((score, index) => `KPI ${index + 1} ${score} × ${weights[index]}%`).join(" · ")}.</p>}
  </>;
}

function DailyEntriesTable({ entries, corrections }: { entries: KpiDailyEntry[]; corrections: ReadonlyMap<string, number> }) {
  return <DataTable<KpiDailyEntry> rows={entries} noun="days" rowKey={(entry) => entry.id}
    emptyTitle="Belum ada entri" emptyText="Belum ada skor harian di periode ini."
    columns={[
      { key: "date", header: "Date", cell: (entry) => { const count = corrections.get(entry.entryDate);
        return <>{formatDate(entry.entryDate)}{count && <span data-testid="daily-corrected" className="block text-xs text-ink-3">{count === 1 ? "Corrected once" : `Corrected ${count} times`}</span>}</>; } },
      { key: "total", header: "Total", className: "tabular-nums", cell: (entry) => <span className="font-semibold">{formatScore(entry.overallScore, scaleMaxOf(entry.definitionVersion))}</span> },
      { key: "gap", header: `Gap vs ${KPI_TARGET}`, className: "tabular-nums", cell: (entry) => formatGap(entry.overallScore, entry.definitionVersion) },
      // Interview 14 Oct (00:58:05): each day's score reads as a category ("nilainya ternyata high performance").
      { key: "category", header: "Category", cell: (entry) => { const band = performanceBand(entry.overallScore, entry.definitionVersion); return band ? <StatusBadge status={band} /> : "—"; } },
      { key: "scores", header: "Score per KPI", className: "tabular-nums", cell: (entry) => entry.lines.map((line) => line.raw_score ?? "—").join(" · ") },
      // Always shown (N3: Management reads comments on a 1366 px laptop); a long day scrolls inside its own box.
      { key: "comments", header: "Comments", wrap: true, cell: (entry) => {
        const notes = entry.lines.flatMap((line) => line.comment ? [{ kpi: line.indicator_order, text: line.comment }] : []);
        // Focusable, so a keyboard user can scroll a long day's comments too.
        return notes.length ? <div role="group" tabIndex={0} aria-label={`Comments ${formatDate(entry.entryDate)}`} data-testid="daily-comments" className="max-h-24 min-w-[200px] max-w-[360px] overflow-y-auto break-words text-xs leading-4">
          <ul className="space-y-1">{notes.map((note) => <li key={note.kpi}><span className="font-semibold">KPI {note.kpi}:</span> {note.text}</li>)}</ul>
        </div> : "—";
      } },
    ]} />;
}

type TeamRow = { employee: EmployeeReference; position: string; compiled: DailyCompilation | null; last?: string; scorecard?: KpiAssessment };

function TeamDailyKpi() {
  const snapshot = useSnapshot();
  const { catalog: catalogSet } = useD4();
  // K15: dashboard alerts link here with ?q=<name>. Read from the router: during a client navigation window.location is still the previous page.
  const params = useSearchParams();
  const [search, setSearch] = useState(() => params.get("q") ?? "");
  const [period, setPeriod] = useState(thisMonth());
  const [finalizing, setFinalizing] = useState<TeamRow | null>(null);
  const [saved, setSaved] = useState<{ employeeId: string; scorecardId: string } | null>(null);
  const periods = useMemo(() => [...new Set([thisMonth(), ...(snapshot.kpiDaily ?? []).map((entry) => entry.period)])].sort().reverse(), [snapshot]);
  const catalog = catalogSet && catalogFor(catalogSet, period);
  const running = period === thisMonth();
  const workingDays = workingDaysSoFar(period, today());
  // An empty Saturday or Sunday is not a missed working day, so it is not shown in red.
  const weekend = [0, 6].includes(new Date(`${today()}T12:00:00Z`).getUTCDay());
  const rows = useMemo<TeamRow[]>(() => visibleEmployees(snapshot)
    // Employees whose position has no KPI role have nothing to fill, unless they already have entries.
    .filter((employee) => (catalog && roleForPosition(catalog, employee.positionId)) || (snapshot.kpiDaily ?? []).some((entry) => entry.employeeId === employee.id && entry.period === period))
    .filter((employee) => includesText(employeeSearchText(snapshot, employee), search))
    .map((employee) => {
      const compiled = compileDaily(snapshot.kpiDaily ?? [], employee.id, period);
      // Any scorecard of the period replaces the compilation (pendingCompilation), so the period counts as finalized.
      const scorecard = scorecardsOf(snapshot, employee.id).find((item) => item.period === period);
      return { employee, position: positionOf(snapshot, employee)?.title ?? "—", compiled, last: compiled?.days.at(-1)?.entryDate, scorecard };
    // No entry in the period first, then entries but none today, then filled today (only the running period has a "today").
    }).sort(byProgress((row) => !row.compiled ? 0 : period === thisMonth() && row.last === today() ? 2 : 1, (row) => row.employee.fullName)), [snapshot, catalog, period, search]);

  return <section aria-label="Team daily KPI" className="space-y-4">
    <div>
      <h2 className="font-display text-lg font-semibold text-ink">Team · {formatPeriod(period)}</h2>
      <p data-testid="team-daily-rule" className="mt-1 text-xs leading-5 text-ink-3">Hari kerja dihitung Senin sampai Jumat{running ? " hingga hari ini" : ""}; hari libur belum diperhitungkan. {COMPILED_RULE}</p>
    </div>
    <FilterBar canReset={Boolean(search || period !== thisMonth())} onReset={() => { setSearch(""); setPeriod(thisMonth()); }}
      search={<SearchInput value={search} onChange={setSearch} placeholder="Search name or position" />}
      period={<PeriodFilter label="Period" testId="daily-period" value={period} onChange={(value) => setPeriod(value || thisMonth())} emptyOption={false} options={periods.map((item) => ({ value: item, label: formatPeriod(item) }))} />} />
    {saved && <SavedNotice text={`Performance Review ${employeeById(snapshot, saved.employeeId)?.fullName ?? ""} · ${formatPeriod(period)} difinalisasi dari Daily KPI.`} href={`/performance/scorecard/${saved.scorecardId}`} />}
    <DataTable<TeamRow> rows={rows} noun="employees" rowKey={(row) => row.employee.id} highlightKey={saved?.employeeId}
      emptyTitle="Tidak ada pegawai yang cocok" emptyText="Ubah kata kunci atau periode. Hanya pegawai dengan KPI di katalog yang tampil."
      columns={[
        { key: "employee", header: "Employee", cell: (row) => <PersonCell name={row.employee.fullName} code={row.employee.employeeId} /> },
        { key: "position", header: "Position / Department", wrap: true, secondary: true, cell: (row) => <><span className="block">{row.position}</span><span className="block text-xs text-ink-3">{departmentOf(snapshot, row.employee)?.name ?? "—"}</span></> },
        { key: "days", header: "Days filled / working days", className: "tabular-nums", cell: (row) => `${row.compiled?.days.length ?? 0} / ${workingDays}` },
        // R1: who has not filled today is visible at laptop widths; a closed period shows its last entry instead.
        running
          ? { key: "today", header: "Today", cell: (row) => row.last === today() ? <span data-testid="today-filled" className="text-ink-2">Filled</span>
            : <span data-testid="today-missing" className={weekend ? "text-ink-3" : "font-semibold text-danger"}>Not filled</span> }
          : { key: "last", header: "Last entry", cell: (row) => formatDate(row.last) },
        // The gap sits under the score, so the table keeps room for the status badge on laptop widths.
        { key: "score", header: "Compiled score", className: "tabular-nums", cell: (row) => row.compiled ? <><span className="block font-semibold">{formatScore(row.compiled.total, scaleMaxOf(row.compiled.definitionVersion))}</span>
          <span data-testid="compiled-gap" className="block text-xs text-ink-3">Gap {formatGap(row.compiled.total, row.compiled.definitionVersion)} vs {KPI_TARGET}</span></> : "—" },
        { key: "status", header: "Status", cell: (row) => <><StatusBadge status={!row.compiled ? "No entries" : performanceBand(row.compiled.total, row.compiled.definitionVersion) ?? "Filled"} />
          {row.scorecard && <Link href={`/performance/scorecard/${row.scorecard.id}`} data-testid="daily-finalized" className="mt-1 block text-xs font-semibold text-primary-600 hover:underline">Finalized</Link>}</> },
      ]}
      actions={(row) => <RowActionMenu label={`Actions for ${row.employee.fullName}`} actions={[
        { label: "View entries", testId: "view-entries", icon: <Eye />, href: `/daily-kpi/${row.employee.id}` },
        // W8: the same Finalize as on Performance Review, so HR does not have to switch screens.
        { label: "Finalize from Daily KPI", testId: "finalize-daily", icon: <CheckCircle2 />, onSelect: () => setFinalizing(row), hidden: !row.compiled || Boolean(row.scorecard) || !canAssess(snapshot, row.employee.id) },
      ]} />} />
    {finalizing?.compiled && <FinalizeDailyModal employeeId={finalizing.employee.id} period={period} compiled={finalizing.compiled} onClose={() => setFinalizing(null)} onSaved={(scorecardId) => setSaved({ employeeId: finalizing.employee.id, scorecardId })} />}
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
      actions={<div className="w-48"><PeriodFilter label="Period" testId="daily-period" value={period} onChange={(value) => setPeriod(value || periods[0])} emptyOption={false} options={periods.map((item) => ({ value: item, label: formatPeriod(item) }))} /></div>}>
      <DailySummary compiled={compileDaily(snapshot.kpiDaily, employeeId, period)} />
      <div className="mt-5"><DailyEntriesTable entries={entries} corrections={correctionsByDay(snapshot.kpiDaily, employeeId, period)} /></div>
    </Card>}
  </>;
}
