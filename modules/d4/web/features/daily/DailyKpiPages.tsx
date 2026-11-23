"use client";

import { CheckCircle2, Eye, History } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { compileDaily, dailyEntriesOf, dailyHistoryOf, type DailyCompilation } from "../../../kpi/daily";
import { catalogFor, indicatorsFor, KPI_TARGET, roleForPosition, targetOf } from "../../../kpi/catalog";
import { performanceBand, scaleMaxOf, typedScore } from "../../../kpi/scale";
import { canFillDaily } from "../../../shared/rules";
import { msg, type Language } from "../../../shared/text";
import type { EmployeeReference } from "../../../shared/types";
import type { KpiAssessment, KpiDailyEntry } from "../../../supabase/types";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { byProgress, canAssess, departmentOf, employeeById, employeeMeta, employeeSearchText, formatDate, formatDateTime, formatGap, formatPeriod, formatScore, includesText, positionOf, scorecardsOf, thisMonth, today, visibleEmployees } from "../../data/selectors";
import { useLanguage } from "../../i18n/LanguageProvider";
import { DataTable, PersonCell } from "../../ui/DataTable";
import { DateField, FilterBar, FormError, PeriodFilter, ReadOnlyField, SearchInput } from "../../ui/forms";
import { DetailHeader, NotFound, PageHeader, Timeline } from "../../ui/layout";
import { RowActionMenu } from "../../ui/RowActionMenu";
import { Button, ButtonLink, Card, cx, InfoGrid, Notice, SavedNotice, StatusBadge } from "../../ui/primitives";
import { FinalizeDailyModal } from "../kpi/FinalizeDailyModal";
import { noKpiText, SavedScore, scorecardTotal, totalComparison } from "../kpi/KpiFormModal";
import { COMPILED_RULE, correctionsByDay, isDirty, missedWorkingDays, openDailyForm, scoreProblem, workingDaysSoFar } from "./entry";

const NOT_READY = msg("Daily KPI belum tersedia karena database belum diperbarui (migrasi 20261108130000). Menu lain tetap bisa dipakai.");
const input = "h-9 w-full rounded-2xl border border-ink-3 px-3 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 text-sm aria-[invalid=true]:border-danger";

/** Daily KPI: employees score their own five Core KPI per day; HR, managers and management follow who filled them. */
export function DailyKpiPage() {
  const snapshot = useSnapshot();
  const { t } = useLanguage();
  const team = snapshot.role !== "EMPLOYEE";
  return <>
    <PageHeader title="Daily KPI" subtitle={team
      ? t("Skor harian lima Core KPI per pegawai. Compiled score periode menjadi titik awal Performance Review.")
      : t("Isi skor lima Core KPI Anda untuk hari ini. Compiled score sebulan menjadi titik awal Performance Review dari HR.")} />
    {!snapshot.kpiDaily ? <Notice tone="warning">{t(NOT_READY)}</Notice> : <div className="space-y-6">
      {canFillDaily(snapshot.role, snapshot.actorEmployeeId) && <MyDailyKpi team={team} />}
      {team && <TeamDailyKpi />}
    </div>}
  </>;
}

function MyDailyKpi({ team }: { team: boolean }) {
  const snapshot = useSnapshot();
  const { catalog: catalogSet, run, busy } = useD4();
  const router = useRouter();
  const { t, language } = useLanguage();
  const me = employeeById(snapshot, snapshot.actorEmployeeId);
  const period = thisMonth();
  const catalog = catalogSet ? catalogFor(catalogSet, period) : null;
  const roleOrder = catalog ? roleForPosition(catalog, me?.positionId) : 0;
  const indicators = catalog ? indicatorsFor(catalog, roleOrder) : [];
  const max = scaleMaxOf(catalog?.version);
  const days = dailyEntriesOf(snapshot.kpiDaily ?? [], snapshot.actorEmployeeId, period);
  const savedFor = (day: string) => days.find((entry) => entry.entryDate === day);
  const [opened, setOpened] = useState(() => openDailyForm(today()));
  const date = opened.date;
  const [lines, setLines] = useState(opened.lines);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  // A date pick or a link that would throw typed scores away waits here for the user's answer. `back` gets focus
  // again afterwards: the calendar day that was clicked no longer exists, so the dialog cannot restore it itself.
  const [discarding, setDiscarding] = useState<({ date: string; correct?: boolean } | { href: string }) & { back: HTMLElement | null } | null>(null);
  const scoreInputs = useRef<(HTMLInputElement | null)[]>([]);
  const dirty = isDirty(lines, opened.lines);
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
  if (!catalog || indicators.length !== 5) return <Card title={t("My KPI today")} testId="my-daily-kpi"><Notice tone="warning">{positionOf(snapshot, me) ? noKpiText(catalog?.version, t) : t("Akun Anda belum memiliki posisi aktif, jadi KPI-nya belum bisa ditentukan. Hubungi HR.")}</Notice></Card>;

  const problems = lines.map((line) => scoreProblem(line.score, max, t));
  const scores = lines.map((line, index) => problems[index] ? null : Number(line.score.trim()));
  const total = scorecardTotal(indicators.map((row, index) => ({ weight_percent: row.weight_percent, raw_score: scores[index] })), max);
  const existing = savedFor(date);

  function openDate(value: string, correct = false) {
    const next = openDailyForm(value, savedFor(value), correct);
    setOpened(next); setLines(next.lines); setTouched(false); setError("");
  }
  const dateTrigger = () => document.querySelector<HTMLElement>("[data-testid='input-daily-date']");
  function chooseDate(value: string) { if (dirty && value !== date) setDiscarding({ date: value, back: dateTrigger() }); else openDate(value); }
  // Correct on a saved day opens that day in the form above, the same way Revise opens a saved Performance Review.
  function correct(day: string, back: HTMLElement) {
    if (dirty) { setDiscarding({ date: day, correct: true, back }); return; }
    openDate(day, true);
    requestAnimationFrame(() => { const first = scoreInputs.current[0]; first?.focus({ preventScroll: true }); first?.scrollIntoView({ block: "center" }); });
  }
  function discard() {
    if (!discarding) return;
    if ("date" in discarding) openDate(discarding.date, discarding.correct); else router.push(discarding.href);
    setDiscarding(null);
  }
  function setLine(index: number, patch: Partial<{ score: string; comment: string }>) { setLines((items) => items.map((line, at) => at === index ? { ...line, ...patch } : line)); }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!date || date > today() || !date.startsWith(period)) { setError(t("Pilih hari ini atau hari sebelumnya di periode {period}.", { period: formatPeriod(period, language) })); return; }
    const invalid = indicators.filter((_, index) => problems[index]);
    if (invalid.length) {
      setError(t("Periksa skor {kpis}: isi bilangan bulat 1 sampai {max}, tanpa desimal.", { kpis: invalid.map((row) => `KPI ${row.indicator_order}`).join(", "), max }));
      // Centered, so the sticky top bar does not cover the field that receives focus.
      const first = scoreInputs.current[problems.findIndex(Boolean)];
      first?.focus({ preventScroll: true });
      first?.scrollIntoView({ block: "center" });
      return;
    }
    setError("");
    const saving = date;
    const result = await run((source) => source.createDailyKpi({ entryDate: saving, lines: lines.map((line, index) => ({ raw_score: scores[index], comment: line.comment })) }), existing ? t("Koreksi Daily KPI tersimpan.") : t("Daily KPI tersimpan."));
    if (!result.ok) { setError(result.error); return; }
    // Back to an empty form for today (BUG-FN-D4-002), so the next save does not overwrite a past day again either.
    openDate(today());
  }

  const compiled = compileDaily(snapshot.kpiDaily ?? [], snapshot.actorEmployeeId, period);
  const missed = missedWorkingDays(period, today(), new Set(days.map((entry) => entry.entryDate)));
  return <>
    <Card title={t("My KPI today")} testId="my-daily-kpi">
      <form onSubmit={submit} noValidate className="space-y-5">
        {/* B5 (interview D4, 14 Oct 2026): everyone scores their KPI every day before going home. */}
        {date === today() && !savedFor(today()) && <div data-testid="daily-reminder"><Notice tone="warning">{t("Daily KPI hari ini belum diisi. Isi sebelum pulang.")}</Notice></div>}
        {/* A forgotten day can still be filled until the month ends: each one opens that date in this form. */}
        {missed.length > 0 && <div data-testid="daily-missed"><Notice tone="warning">
          <span className="font-semibold">{t("{count} hari kerja bulan ini belum diisi.", { count: missed.length })}</span> {t("Pilih tanggalnya untuk mengisi, satu per satu, sampai akhir {period}. Lewati tanggal libur:", { period: formatPeriod(period, language) })}
          <span className="mt-2 flex flex-wrap gap-2">{missed.map((day) => <button key={day} type="button" data-testid={`missed-${day}`} onClick={() => chooseDate(day)}
            className={cx("rounded-lg border px-2.5 py-1 text-xs font-semibold", day === date ? "border-primary-500 bg-primary-50 text-primary-600" : "border-line bg-surface text-ink hover:border-primary-500")}>{shortDay(day, language)}</button>)}</span>
        </Notice></div>}
        <div className="grid gap-4 sm:grid-cols-3">
          <DateField label={t("Date")} testId="daily-date" required min={`${period}-01`} max={today()} value={date} onChange={(event) => chooseDate(event.target.value)} />
          <ReadOnlyField label={t("Position KPI")} testId="daily-role" value={indicators[0].role_name} />
          <ReadOnlyField label={t("Catalog")} testId="daily-catalog" value={t("KPI Scorecard {version} · skala 1–{max}", { version: catalog.version, max })} />
        </div>
        {existing && (opened.correcting
          ? <div data-testid="daily-correction-rule"><Notice>{t("Anda sedang mengoreksi entri {date}. Entri bulan ini bisa Anda koreksi sampai akhir {period}; nilai sebelumnya tetap tercatat di History.", { date: formatDate(date, language), period: formatPeriod(period, language) })}</Notice></div>
          : <div data-testid="daily-already-saved"><Notice>{t("Daily KPI {date} sudah tersimpan dengan total {total}. Menyimpan form ini akan mengoreksinya. Untuk mulai dari skor yang tersimpan, pilih Correct di tabel This period di bawah.", { date: formatDate(date, language), total: formatScore(existing.overallScore, max) })}</Notice></div>)}
        <ol className="divide-y divide-line rounded-2xl border border-line">
          {indicators.map((row, index) => {
            const problem = touched ? problems[index] : "";
            const comment = lines[index].comment;
            return <li key={row.indicator_order} data-testid={`daily-line-${row.indicator_order}`} className="grid grid-cols-[minmax(0,1fr)_72px] gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_96px_72px_minmax(0,220px)] sm:items-center">
              <div className="col-span-2 min-w-0 sm:col-span-1">
                <p className="text-sm font-semibold text-ink">{row.indicator_order}. {row.kpi_name}</p>
                <p className="text-xs text-ink-3">{t("Weight {weight}% · Target {target}", { weight: row.weight_percent, target: targetOf(row) })}</p>
              </div>
              <label className="block text-xs font-semibold text-ink-3">{t("Score")}
                {/* Text, not type="number": the browser would read "1e2" as 100 and hide what was typed. */}
                <input ref={(element) => { scoreInputs.current[index] = element; }} type="text" inputMode="numeric" autoComplete="off" data-testid={`input-daily-score-${row.indicator_order}`} aria-label={t("Score {kpi}", { kpi: row.kpi_name })}
                  aria-invalid={Boolean(problem)} aria-describedby={problem ? `daily-score-error-${row.indicator_order}` : undefined}
                  value={lines[index].score} onChange={(event) => { const text = typedScore(event.target.value, max); if (text !== null) setLine(index, { score: text }); }} className={`mt-1 tabular-nums ${input}`} />
                {existing && opened.correcting && <SavedScore before={existing.lines[index]?.raw_score ?? null} now={scores[index]} testId={`daily-saved-${row.indicator_order}`} />}
              </label>
              <p className="text-xs font-semibold text-ink-3">Gap<span data-testid={`daily-gap-${row.indicator_order}`} className="mt-1 block text-sm tabular-nums text-ink-2">{scores[index] !== null ? formatGap(scores[index], catalog.version, t) : "—"}</span></p>
              <label className="col-span-2 block text-xs font-semibold text-ink-3 sm:col-span-1">{t("Comment")}
                <input data-testid={`input-daily-comment-${row.indicator_order}`} maxLength={COMMENT_MAX} placeholder={t("Catatan singkat (opsional)")} value={comment}
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
          <p data-testid="daily-total" className="text-sm text-ink-2">{t("Total")} <strong className="font-display text-lg font-semibold tabular-nums text-ink">{formatScore(total, max)}</strong>
            {total !== null && max === 100 && <span className="ml-2 tabular-nums">{t("gap {gap} dari target {target}", { gap: formatGap(total, catalog.version, t), target: KPI_TARGET })}</span>}
            {opened.correcting && existing?.overallScore != null && <span data-testid="daily-total-compare" className="mt-1 block text-xs tabular-nums text-ink-3">{totalComparison(existing.overallScore, total, t)}</span>}</p>
          <Button type="submit" disabled={busy} data-testid="btn-save-daily">{existing ? t("Save correction") : t("Save")}</Button>
        </div>
      </form>
    </Card>
    <Card title={t("This period · {period}", { period: formatPeriod(period, language) })} testId="my-daily-period"
      actions={<ButtonLink href={`/daily-kpi/${snapshot.actorEmployeeId}/history`} icon={<History className="size-4" />} testId="view-history">{t("View History")}</ButtonLink>}>
      <DailySummary compiled={compiled} />
      <div className="mt-5"><DailyEntriesTable entries={[...days].reverse()} corrections={correctionsByDay(snapshot.kpiDaily ?? [], snapshot.actorEmployeeId, period)} editing={opened.correcting ? date : undefined} onCorrect={correct} /></div>
    </Card>
    {discarding && <DiscardDialog what={"date" in discarding ? (discarding.date === date ? t("Muat skor tersimpan {date}?", { date: formatDate(discarding.date, language) }) : t("Pindah ke {date}?", { date: formatDate(discarding.date, language) })) : t("Tinggalkan halaman ini?")} back={discarding.back} onKeep={() => setDiscarding(null)} onDiscard={discard} />}
  </>;
}

const COMMENT_MAX = 500;

/** Native modal dialog: the browser keeps focus inside and turns Escape into "keep editing". Focus goes to `back` on close. */
function DiscardDialog({ what, back, onKeep, onDiscard }: { what: string; back: HTMLElement | null; onKeep: () => void; onDiscard: () => void }) {
  const { t } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); back?.focus(); };
  }, [back]);
  return <dialog ref={dialog} data-testid="daily-discard-confirm" aria-labelledby="daily-discard-title" onCancel={(event) => { event.preventDefault(); onKeep(); }}
    className="m-auto w-[calc(100%-32px)] max-w-sm rounded-2xl bg-surface p-6 shadow-modal backdrop:bg-ink/40">
    <h2 id="daily-discard-title" className="font-display text-base font-semibold text-ink">{what}</h2>
    <p className="mt-1.5 text-sm text-ink-3">{t("Skor dan komentar yang belum disimpan akan hilang.")}</p>
    <div className="mt-5 flex justify-end gap-3">
      <Button variant="secondary" data-testid="btn-discard-keep" autoFocus onClick={onKeep}>{t("Keep editing")}</Button>
      <Button variant="danger" data-testid="btn-discard-confirm" onClick={onDiscard}>{t("Discard")}</Button>
    </div>
  </dialog>;
}

function DailySummary({ compiled }: { compiled: DailyCompilation | null }) {
  const { t } = useLanguage();
  const band = compiled && performanceBand(compiled.total, compiled.definitionVersion);
  const weights = compiled?.days.at(-1)?.lines.map((line) => line.weight_percent) ?? [];
  return <><InfoGrid columns={3} items={[
    { label: t("Days filled"), testId: "days-filled", value: compiled ? compiled.days.length : 0 },
    { label: "Compiled score", testId: "compiled-score", value: compiled ? <><strong className="font-display text-lg font-semibold tabular-nums">{formatScore(compiled.total, scaleMaxOf(compiled.definitionVersion))}</strong>{band && <span className="mt-1 block"><StatusBadge status={band} /></span>}</> : "—" },
    { label: t("Gap vs target {target}", { target: KPI_TARGET }), testId: "compiled-gap", value: compiled ? formatGap(compiled.total, compiled.definitionVersion, t) : "—" },
  ]} />
    {/* K5: the per-KPI scores and weights are on screen, so the compiled number can be recomputed here. */}
    {compiled && <p data-testid="compiled-rule" className="mt-4 text-xs leading-5 text-ink-3">{t(COMPILED_RULE)} {t("Skor bulat per KPI: {scores}.", { scores: compiled.scores.map((score, index) => `KPI ${index + 1} ${score} × ${weights[index]}%`).join(" · ") })}</p>}
  </>;
}

function DailyEntriesTable({ entries, corrections, editing, onCorrect }: { entries: KpiDailyEntry[]; corrections: ReadonlyMap<string, number>; editing?: string; onCorrect?: (day: string, back: HTMLElement) => void }) {
  const { t, language } = useLanguage();
  return <DataTable<KpiDailyEntry> rows={entries} noun="days" rowKey={(entry) => entry.id}
    emptyTitle={t("Belum ada entri")} emptyText={t("Belum ada skor harian di periode ini.")}
    columns={[
      { key: "date", header: t("Date"), cell: (entry) => { const count = corrections.get(entry.entryDate);
        return <>{formatDate(entry.entryDate, language)}{count && <span data-testid="daily-corrected" className="block text-xs text-ink-3">{count === 1 ? t("Corrected once") : t("Corrected {count} times", { count })}</span>}</>; } },
      { key: "total", header: t("Total"), className: "tabular-nums", cell: (entry) => <span className="font-semibold">{formatScore(entry.overallScore, scaleMaxOf(entry.definitionVersion))}</span> },
      { key: "gap", header: t("Gap vs {target}", { target: KPI_TARGET }), className: "tabular-nums", cell: (entry) => formatGap(entry.overallScore, entry.definitionVersion, t) },
      // Interview 14 Oct (00:58:05): each day's score reads as a category ("nilainya ternyata high performance").
      { key: "category", header: t("Category"), cell: (entry) => { const band = performanceBand(entry.overallScore, entry.definitionVersion); return band ? <StatusBadge status={band} /> : "—"; } },
      { key: "scores", header: t("Score per KPI"), className: "tabular-nums", cell: (entry) => entry.lines.map((line) => line.raw_score ?? "—").join(" · ") },
      // Always shown (N3: Management reads comments on a 1366 px laptop); a long day scrolls inside its own box.
      { key: "comments", header: t("Comments"), wrap: true, cell: (entry) => {
        const notes = entry.lines.flatMap((line) => line.comment ? [{ kpi: line.indicator_order, text: line.comment }] : []);
        // Focusable, so a keyboard user can scroll a long day's comments too.
        return notes.length ? <div role="group" tabIndex={0} aria-label={t("Comments {date}", { date: formatDate(entry.entryDate, language) })} data-testid="daily-comments" className="max-h-24 min-w-[200px] max-w-[360px] overflow-y-auto break-words text-xs leading-4">
          <ul className="space-y-1">{notes.map((note) => <li key={note.kpi}><span className="font-semibold">KPI {note.kpi}:</span> {note.text}</li>)}</ul>
        </div> : "—";
      } },
      // Only on the employee's own entries: the period is the running month, the only one that can still be corrected.
      ...(onCorrect ? [{ key: "correct", header: "", cell: (entry: KpiDailyEntry) => entry.entryDate === editing
        ? <span data-testid="daily-editing" className="text-xs font-semibold text-ink-3">{t("In the form")}</span>
        : <Button variant="secondary" data-testid="btn-correct-daily" aria-label={t("Correct {date}", { date: formatDate(entry.entryDate, language) })} onClick={(event) => onCorrect(entry.entryDate, event.currentTarget)}>{t("Correct")}</Button> }] : []),
    ]} />;
}

type TeamRow = { employee: EmployeeReference; position: string; compiled: DailyCompilation | null; last?: string; scorecard?: KpiAssessment };

function TeamDailyKpi() {
  const snapshot = useSnapshot();
  const { catalog: catalogSet } = useD4();
  const { t, language } = useLanguage();
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
  const all = useMemo<TeamRow[]>(() => visibleEmployees(snapshot)
    // Employees whose position has no KPI role have nothing to fill, unless they already have entries.
    .filter((employee) => (catalog && roleForPosition(catalog, employee.positionId)) || (snapshot.kpiDaily ?? []).some((entry) => entry.employeeId === employee.id && entry.period === period))
    .map((employee) => {
      const compiled = compileDaily(snapshot.kpiDaily ?? [], employee.id, period);
      // Any scorecard of the period replaces the compilation (pendingCompilation), so the period counts as finalized.
      const scorecard = scorecardsOf(snapshot, employee.id).find((item) => item.period === period);
      return { employee, position: positionOf(snapshot, employee)?.title ?? "—", compiled, last: compiled?.days.at(-1)?.entryDate, scorecard };
    // No entry in the period first, then entries but none today, then filled today (only the running period has a "today").
    }).sort(byProgress((row) => !row.compiled ? 0 : period === thisMonth() && row.last === today() ? 2 : 1, (row) => row.employee.fullName)), [snapshot, catalog, period]);
  const rows = useMemo(() => all.filter((row) => includesText(employeeSearchText(snapshot, row.employee), search)), [all, snapshot, search]);

  // The working-day count is the same on every row, so it sits in the column header once (24 Nov 2026).
  const daysFilled = (row: TeamRow) => row.compiled?.days.length ?? 0;
  // Below 1280 px the Days column gives way and its count sits here, under Today or Last entry: with the column the
  // table scrolled sideways at 1024 and 768 px.
  const daysCompact = (row: TeamRow) => <span data-testid="days-compact" className="mt-0.5 block text-xs tabular-nums text-ink-3 min-[1280px]:hidden">{t("{filled} / {total} days", { filled: daysFilled(row), total: workingDays })}</span>;

  return <section aria-label={t("Team daily KPI")} className="space-y-4">
    <div>
      <h2 className="font-display text-lg font-semibold text-ink">{t("Team · {period}", { period: formatPeriod(period, language) })}</h2>
      <p data-testid="team-daily-rule" className="mt-1 text-xs leading-5 text-ink-3">{running ? t("Hari kerja dihitung Senin sampai Jumat hingga hari ini; hari libur belum diperhitungkan.") : t("Hari kerja dihitung Senin sampai Jumat; hari libur belum diperhitungkan.")} {t(COMPILED_RULE)}</p>
    </div>
    <FilterBar canReset={Boolean(search || period !== thisMonth())} onReset={() => { setSearch(""); setPeriod(thisMonth()); }}
      search={<SearchInput value={search} onChange={setSearch} placeholder={t("Search name or position")} />}
      period={<PeriodFilter label={t("Period")} testId="daily-period" value={period} onChange={(value) => setPeriod(value || thisMonth())} emptyOption={false} options={periods.map((item) => ({ value: item, label: formatPeriod(item, language) }))} />} />
    {saved && <SavedNotice text={t("Performance Review {name} · {period} difinalisasi dari Daily KPI.", { name: employeeById(snapshot, saved.employeeId)?.fullName ?? "", period: formatPeriod(period, language) })} href={`/performance/scorecard/${saved.scorecardId}`} />}
    <DataTable<TeamRow> rows={rows} noun="employees" rowKey={(row) => row.employee.id} justSaved={all.find((row) => row.employee.id === saved?.employeeId)}
      emptyTitle={t("Tidak ada pegawai yang cocok")} emptyText={t("Ubah kata kunci atau periode. Hanya pegawai dengan KPI di katalog yang tampil.")}
      columns={[
        { key: "employee", header: t("Employee"), cell: (row) => <PersonCell name={row.employee.fullName} code={row.employee.employeeId} /> },
        { key: "position", header: t("Position / Department"), wrap: true, secondary: true, cell: (row) => <><span className="block">{row.position}</span><span className="block text-xs text-ink-3">{departmentOf(snapshot, row.employee)?.name ?? "—"}</span></> },
        { key: "days", header: t("Days filled (/{days})", { days: workingDays }), className: "tabular-nums", optional: true, cell: daysFilled },
        // R1: who has not filled today is visible at laptop widths; a closed period shows its last entry instead.
        running
          ? { key: "today", header: t("Today"), cell: (row) => <>{row.last === today() ? <span data-testid="today-filled" className="text-ink-2">{t("Filled")}</span>
            : <span data-testid="today-missing" className={weekend ? "text-ink-3" : "font-semibold text-danger"}>{t("Not filled")}</span>}{daysCompact(row)}</> }
          : { key: "last", header: t("Last entry"), cell: (row) => <>{formatDate(row.last, language)}{daysCompact(row)}</> },
        // The gap sits under the score, so the table keeps room for the status badge on laptop widths.
        { key: "score", header: t("Compiled score / Gap vs {target}", { target: KPI_TARGET }), className: "tabular-nums", cell: (row) => row.compiled ? <><span className="block font-semibold">{formatScore(row.compiled.total, scaleMaxOf(row.compiled.definitionVersion))}</span>
          <span data-testid="compiled-gap" className="block text-xs text-ink-3">{formatGap(row.compiled.total, row.compiled.definitionVersion, t)}</span></> : "—" },
        { key: "status", header: t("Status"), cell: (row) => <><StatusBadge status={!row.compiled ? "No entries" : performanceBand(row.compiled.total, row.compiled.definitionVersion) ?? "Filled"} />
          {row.scorecard && <Link href={`/performance/scorecard/${row.scorecard.id}`} data-testid="daily-finalized" className="mt-1 block text-xs font-semibold text-primary-600 hover:underline">Finalized</Link>}</> },
      ]}
      actions={(row) => <RowActionMenu label={t("Actions for {name}", { name: row.employee.fullName })} actions={[
        { label: t("View Detail"), testId: "view-entries", icon: <Eye />, href: `/daily-kpi/${row.employee.id}` },
        { label: t("View History"), testId: "view-history", icon: <History />, href: `/daily-kpi/${row.employee.id}/history` },
        // W8: the same Finalize as on Performance Review, so HR does not have to switch screens.
        { label: t("Finalize from Daily KPI"), testId: "finalize-daily", icon: <CheckCircle2 />, onSelect: () => setFinalizing(row), hidden: !row.compiled || Boolean(row.scorecard) || !canAssess(snapshot, row.employee.id) },
      ]} />} />
    {finalizing?.compiled && <FinalizeDailyModal employeeId={finalizing.employee.id} period={period} compiled={finalizing.compiled} onClose={() => setFinalizing(null)} onSaved={(scorecardId) => setSaved({ employeeId: finalizing.employee.id, scorecardId })} />}
  </section>;
}

/** Every daily entry of one employee, a period at a time (newest period first). */
export function DailyKpiEmployeePage({ employeeId }: { employeeId: string }) {
  const snapshot = useSnapshot();
  const { t, language } = useLanguage();
  const employee = employeeById(snapshot, employeeId);
  const periods = [...new Set([thisMonth(), ...(snapshot.kpiDaily ?? []).filter((entry) => entry.employeeId === employeeId).map((entry) => entry.period)])].sort().reverse();
  const [period, setPeriod] = useState(periods[0]);
  if (!employee || !visibleEmployees(snapshot).some((item) => item.id === employeeId)) return <NotFound what={t("Employee")} backHref="/daily-kpi" backLabel={t("Back to Daily KPI")} />;
  const entries = dailyEntriesOf(snapshot.kpiDaily ?? [], employeeId, period).reverse();
  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "Daily KPI", href: "/daily-kpi" }, { label: t("Entries") }]} backHref="/daily-kpi"
      name={employee.fullName} meta={[...employeeMeta(snapshot, employee, t), t("Period {period}", { period: formatPeriod(period, language) })]}
      actions={<ButtonLink href={`/daily-kpi/${employeeId}/history`} icon={<History className="size-4" />} testId="view-history">{t("View History")}</ButtonLink>} />
    {!snapshot.kpiDaily ? <Notice tone="warning">{t(NOT_READY)}</Notice> : <Card title={t("Daily entries")} testId="daily-entries"
      actions={<div className="w-48"><PeriodFilter label={t("Period")} testId="daily-period" value={period} onChange={(value) => setPeriod(value || periods[0])} emptyOption={false} options={periods.map((item) => ({ value: item, label: formatPeriod(item, language) }))} /></div>}>
      <DailySummary compiled={compileDaily(snapshot.kpiDaily, employeeId, period)} />
      <div className="mt-5"><DailyEntriesTable entries={entries} corrections={correctionsByDay(snapshot.kpiDaily, employeeId, period)} /></div>
    </Card>}
  </>;
}

/** Every saved daily entry of one employee, corrections included, newest first: what each correction changed stays readable (R2). */
export function DailyKpiHistoryPage({ employeeId }: { employeeId: string }) {
  const snapshot = useSnapshot();
  const { t, language } = useLanguage();
  const employee = employeeById(snapshot, employeeId);
  const periods = [...new Set([thisMonth(), ...(snapshot.kpiDaily ?? []).filter((entry) => entry.employeeId === employeeId).map((entry) => entry.period)])].sort().reverse();
  const [period, setPeriod] = useState(periods[0]);
  if (!employee || !visibleEmployees(snapshot).some((item) => item.id === employeeId)) return <NotFound what={t("Employee")} backHref="/daily-kpi" backLabel={t("Back to Daily KPI")} />;
  const items = dailyHistoryOf(snapshot.kpiDaily ?? [], employeeId, period);
  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "Daily KPI", href: "/daily-kpi" }, { label: t("History") }]} backHref={`/daily-kpi/${employeeId}`}
      name={employee.fullName} meta={[...employeeMeta(snapshot, employee, t), t("Period {period}", { period: formatPeriod(period, language) })]} />
    {!snapshot.kpiDaily ? <Notice tone="warning">{t(NOT_READY)}</Notice> : <Card title={t("Daily KPI history")} testId="daily-history"
      actions={<div className="w-48"><PeriodFilter label={t("Period")} testId="daily-period" value={period} onChange={(value) => setPeriod(value || periods[0])} emptyOption={false} options={periods.map((item) => ({ value: item, label: formatPeriod(item, language) }))} /></div>}>
      <Timeline empty={t("Belum ada entri harian di periode ini.")} entries={items.map(({ entry, revision, previous, versions }) => {
        const max = scaleMaxOf(entry.definitionVersion);
        const current = revision === versions;
        const changes = previous ? entry.lines.flatMap((line, index) => line.raw_score === previous.lines[index]?.raw_score ? [] : [`KPI ${line.indicator_order}: ${previous.lines[index]?.raw_score ?? "—"} → ${line.raw_score ?? "—"}`]) : [];
        return {
          id: entry.id,
          date: formatDateTime(entry.createdAt, language),
          title: `${previous ? t("Correction {date} · Revision {revision}", { date: formatDate(entry.entryDate, language), revision }) : t("Daily entry {date}", { date: formatDate(entry.entryDate, language) })}${versions > 1 ? ` · ${current ? t("Current") : t("Superseded")}` : ""}`,
          status: performanceBand(entry.overallScore, entry.definitionVersion) ?? undefined,
          body: previous
            ? <p data-testid="history-changes" className="tabular-nums">{changes.length ? changes.join(" · ") : t("Skor tidak berubah, hanya komentar.")} · {t("Total")} {formatScore(previous.overallScore, max)} → {formatScore(entry.overallScore, max)}</p>
            : <p className="tabular-nums">{t("Total")} {formatScore(entry.overallScore, max)} · {entry.lines.map((line) => `KPI ${line.indicator_order} ${line.raw_score ?? "—"}`).join(" · ")}</p>,
          actor: employee.fullName,
        };
      })} />
    </Card>}
  </>;
}

/** "Sen, 17 Nov" or "Mon 17 Nov": a missed day as a short button label. */
const shortDay = (day: string, language: Language) => new Date(`${day}T12:00:00Z`).toLocaleDateString(language === "en" ? "en-GB" : "id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
