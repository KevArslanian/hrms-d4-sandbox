"use client";

import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "./primitives";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Allow text to wrap (long text columns). Other cells stay on one line. */
  wrap?: boolean;
  /** Secondary column: hidden below 1400 px so the primary columns keep their room (matches Figma frame 28). */
  secondary?: boolean;
};

const secondaryCell = (column: { secondary?: boolean }) => column.secondary && "hidden min-[1400px]:table-cell";

const PAGE_SIZES = [10, 20, 50, 100] as const;

// The ⋮ column stays pinned to the right edge, so row actions remain reachable when long names push the table wider than the screen.
// Its edge shadow shows only while columns are actually scrolled underneath it.
const stickyAction = "sticky right-0 z-[1] transition-shadow group-data-[covered=true]:shadow-[-8px_0_8px_-8px_rgba(15,35,66,0.18)]";

/** Page buttons to show: first, last, and the current page ±1, with gaps (load test: 1000 rows = 100 pages). */
export function pageWindow(current: number, count: number): (number | "gap")[] {
  const pages = [...new Set([1, current - 1, current, current + 1, count])].filter((page) => page >= 1 && page <= count).sort((a, b) => a - b);
  return pages.flatMap((page, index) => index && page - pages[index - 1] > 1 ? ["gap" as const, page] : [page]);
}

/**
 * Standard D4 table: caps header, 56 px rows, ⋮ action column last, pagination bottom right.
 * Clicking a row opens its detail page (same as "View Detail" in the menu).
 */
export function DataTable<T>({ rows, columns, rowKey, actions, emptyTitle, emptyText, noun }: {
  rows: readonly T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  actions?: (row: T) => ReactNode;
  emptyTitle: string;
  emptyText: string;
  noun: string;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * pageSize, current * pageSize);
  const first = rows.length ? (current - 1) * pageSize + 1 : 0;
  const scroller = useRef<HTMLDivElement>(null);
  const [covered, setCovered] = useState(false);
  const measure = () => {
    const el = scroller.current;
    if (el) setCovered(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, []);

  return <section className="min-w-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
    <div ref={scroller} onScroll={measure} data-covered={covered} className="group overflow-x-auto">
      <table data-testid="data-table" className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-app">
          <tr>{columns.map((column) => <th key={column.key} scope="col" className={cx("px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3", secondaryCell(column), column.className)}>{column.header}</th>)}
            {actions && <th scope="col" className={cx(stickyAction, "w-16 bg-app px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3")}>Actions</th>}</tr>
        </thead>
        <tbody>
          {visible.map((row) => {
            // Rows are not clickable: details open only from the ⋮ menu (View Detail / View History).
            return <tr key={rowKey(row)} data-testid={`row-${rowKey(row)}`} className="h-14 border-t border-line hover:bg-primary-50/40">
              {columns.map((column) => <td key={column.key} data-testid={`cell-${column.key}`} className={cx("px-5 py-3 align-middle text-ink", !column.wrap && "whitespace-nowrap", secondaryCell(column), column.className)}>{column.cell(row)}</td>)}
              {actions && <td className={cx(stickyAction, "bg-surface px-5 py-3 text-right")}>{actions(row)}</td>}
            </tr>;
          })}
        </tbody>
      </table>
      {!rows.length && <div data-testid="table-empty" className="flex flex-col items-center gap-2 px-6 py-14 text-center">
        <SearchX aria-hidden="true" className="size-8 text-ink-3" />
        <p className="text-sm font-semibold text-ink">{emptyTitle}</p>
        <p className="max-w-md text-xs text-ink-3">{emptyText}</p>
      </div>}
    </div>
    {rows.length > 0 && <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-xs text-ink-2">
      <div className="flex flex-wrap items-center gap-3">
        <span data-testid="table-count">Menampilkan {first}–{Math.min(current * pageSize, rows.length)} dari {rows.length} {noun}</span>
        <label className="flex items-center gap-1.5">Per halaman
          <select data-testid="select-page-size" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}
            className="h-8 rounded-lg border border-line bg-surface px-2 font-semibold text-ink">
            {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </div>
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button type="button" data-testid="btn-page-prev" aria-label="Previous page" disabled={current === 1} onClick={() => setPage(current - 1)} className="inline-flex size-8 items-center justify-center rounded-lg border border-line bg-surface disabled:opacity-40"><ChevronLeft className="size-4" /></button>
        {pageWindow(current, pageCount).map((number, index) => number === "gap" ? <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-ink-3">…</span> :
          <button key={number} type="button" data-testid={`btn-page-${number}`} aria-current={number === current ? "page" : undefined} onClick={() => setPage(number)}
            className={cx("inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 font-semibold", number === current ? "bg-primary-600 text-white" : "border border-line bg-surface text-ink")}>{number}</button>)}
        <button type="button" data-testid="btn-page-next" aria-label="Next page" disabled={current === pageCount} onClick={() => setPage(current + 1)} className="inline-flex size-8 items-center justify-center rounded-lg border border-line bg-surface disabled:opacity-40"><ChevronRight className="size-4" /></button>
      </nav>
    </footer>}
  </section>;
}

/** First column content: name + employee code. */
export function PersonCell({ name, code }: { name: string; code: string }) {
  return <span className="block min-w-[140px]"><strong className="block whitespace-normal break-words font-semibold text-ink">{name}</strong><span className="block text-xs text-ink-3">{code}</span></span>;
}
