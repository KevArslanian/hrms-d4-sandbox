"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { Button, cx, slug } from "./primitives";

const control = "h-10 w-full rounded-[10px] border border-line-strong bg-surface px-3 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 disabled:bg-muted disabled:text-ink-3 aria-[invalid=true]:border-danger";

/* ---------- Filter bar ---------- */

export function FilterBar({ children, onReset, canReset }: { children: ReactNode; onReset?: () => void; canReset?: boolean }) {
  return <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-card">
    {children}
    {onReset && <button type="button" data-testid="btn-filter-reset" onClick={onReset} disabled={!canReset} className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold text-primary-600 hover:bg-primary-50 disabled:text-ink-3 disabled:hover:bg-transparent">
      <X aria-hidden="true" className="size-4" />Reset filter
    </button>}
  </div>;
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="relative min-w-[200px] flex-[2_1_220px]">
    <span className="sr-only">{placeholder}</span>
    <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-4 text-ink-3" />
    <input type="search" data-testid="input-search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={cx(control, "bg-app pl-9")} />
  </label>;
}

/**
 * Filter dropdown with a search box on top (reviewer feedback): opening it lists every option, typing narrows
 * the list. `emptyOption={false}` drops the "All …" choice for filters that always show one value (the dashboard period).
 */
export function SelectFilter({ label, testId, value, onChange, options, emptyOption = true }: { label: string; testId?: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; emptyOption?: boolean }) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const id = testId ?? slug(label);
  const all = emptyOption ? [{ value: "", label }, ...options] : options;
  const term = query.trim().toLowerCase();
  const matches = term ? all.filter((option) => option.label.toLowerCase().includes(term)) : all;
  const selected = options.find((option) => option.value === value);
  const close = () => { setOpen(false); setQuery(""); };
  const pick = (next: string) => { onChange(next); close(); };
  return <div className="relative min-w-[172px] flex-[1_1_172px]" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) close(); }}
    onKeyDown={(event) => { if (event.key === "Escape" && open) { event.stopPropagation(); close(); } }}>
    <button type="button" data-testid={`filter-${id}`} aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => open ? close() : setOpen(true)}
      className={cx(control, "flex items-center justify-between gap-2 text-left", !selected && "text-ink-2")}>
      <span className="truncate">{selected?.label ?? label}</span>
      <ChevronDown aria-hidden="true" className={cx("size-4 shrink-0 text-ink-3 transition-transform", open && "rotate-180")} />
    </button>
    {open && <div className="absolute inset-x-0 top-full z-30 mt-1 rounded-[10px] border border-line bg-surface p-1.5 shadow-card">
      <label className="relative block">
        <span className="sr-only">Search {label}</span>
        <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-ink-3" />
        <input autoFocus data-testid={`search-${id}`} role="combobox" aria-controls={listId} aria-expanded aria-autocomplete="list" value={query} onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && matches[0]) { event.preventDefault(); pick(matches[0].value); } }}
          placeholder="Type to filter…" className="h-9 w-full rounded-lg border border-line-strong bg-app pl-8 pr-2 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-primary-500" />
      </label>
      <ul id={listId} role="listbox" data-testid={`options-${id}`} aria-label={label} className="mt-1.5 max-h-64 overflow-y-auto text-sm">
        {matches.length ? matches.map((option) => <li key={option.value || "all"} role="option" aria-selected={option.value === value}>
          <button type="button" onClick={() => pick(option.value)} className={cx("flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-ink hover:bg-primary-50 focus:bg-primary-50 focus:outline-none", option.value === value && "font-semibold text-primary-600")}>
            <Check aria-hidden="true" className={cx("size-4 shrink-0", option.value !== value && "invisible")} />{option.label}
          </button>
        </li>) : <li className="px-2.5 py-2 text-ink-3">No match</li>}
      </ul>
    </div>}
  </div>;
}

/* ---------- Form fields ---------- */

function FieldShell({ label, required, error, helper, children, id, className }: { label: string; required?: boolean; error?: string; helper?: string; children: ReactNode; id: string; className?: string }) {
  return <div className={cx("min-w-0", className)}>
    <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink-2">{label}{required && <span className="text-danger"> *</span>}</label>
    {children}
    {error ? <p id={`${id}-message`} className="mt-1.5 text-xs text-danger">{error}</p> : helper ? <p id={`${id}-message`} className="mt-1.5 text-xs text-ink-3">{helper}</p> : null}
  </div>;
}

/** testId: keeps the Katalon id from the original English label when the visible label is translated. */
type Common = { label: string; testId?: string; required?: boolean; error?: string; helper?: string; className?: string };

export function TextField({ label, testId, required, error, helper, className, ...props }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return <FieldShell {...{ label, required, error, helper, id, className }}>
    <input id={id} data-testid={`input-${testId ?? slug(label)}`} aria-invalid={Boolean(error)} aria-describedby={error || helper ? `${id}-message` : undefined} required={required} {...props} className={control} />
  </FieldShell>;
}

export function SelectField({ label, testId, required, error, helper, className, children, ...props }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return <FieldShell {...{ label, required, error, helper, id, className }}>
    <div className="relative">
      <select id={id} data-testid={`input-${testId ?? slug(label)}`} aria-invalid={Boolean(error)} aria-describedby={error || helper ? `${id}-message` : undefined} required={required} {...props} className={cx(control, "appearance-none pr-9")}>{children}</select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-3 size-4 text-ink-3" />
    </div>
  </FieldShell>;
}

export function TextAreaField({ label, testId, required, error, helper, className, ...props }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return <FieldShell {...{ label, required, error, helper, id, className }}>
    <textarea id={id} data-testid={`input-${testId ?? slug(label)}`} aria-invalid={Boolean(error)} aria-describedby={error || helper ? `${id}-message` : undefined} required={required} rows={3} {...props} className={cx(control, "h-auto py-2.5")} />
  </FieldShell>;
}

export function ReadOnlyField({ label, testId, value, className }: { label: string; testId?: string; value: ReactNode; className?: string }) {
  return <div className={cx("min-w-0", className)}>
    <p className="mb-1.5 text-sm font-semibold text-ink-2">{label}</p>
    <div data-testid={`readonly-${testId ?? slug(label)}`} className="flex min-h-10 items-center rounded-[10px] bg-muted px-3 text-sm text-ink">{value}</div>
  </div>;
}

/**
 * One active record per employee and period: when one exists, saving is allowed only as an explicit
 * revision of it, so a second record never silently replaces the one shown on the page.
 */
export function RevisionConfirm({ what, existing, checked, onChange, error }: { what: string; existing: string; checked: boolean; onChange: (checked: boolean) => void; error?: string }) {
  const id = useId();
  return <div className={cx("rounded-xl border px-4 py-3 text-xs leading-5", error ? "border-danger bg-danger-bg" : "border-warning/30 bg-warning-bg")}>
    <p className="text-warning">{what} for this period already exists ({existing}). Saving creates a <strong>revision</strong>; the previous version stays in the history.</p>
    <label htmlFor={id} className="mt-2 flex items-center gap-2 font-semibold text-ink">
      <input id={id} type="checkbox" data-testid="checkbox-revision" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-primary-600" />
      Save as revision
    </label>
    {error && <p className="mt-1 text-danger">{error}</p>}
  </div>;
}

/* ---------- Modal ---------- */

// Lets the footer Cancel button go through the same discard confirm as X / Escape / overlay.
const ModalCloseContext = createContext<(() => void) | null>(null);

/**
 * Centered form modal (reviewer note K1). 640 px by default, 880 px for the KPI scorecard.
 * Escape, the overlay and X close it — after a confirm once a field was edited, so typed data is not lost
 * by a stray click. Focus starts in the dialog and returns to the page on close.
 */
export function FormModal({ title, description, size = "md", onClose, children, footer }: {
  title: string;
  description?: string;
  size?: "md" | "lg";
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Callers pass an inline onClose, so it changes on every parent render. Keeping it in a ref lets the
  // effect below run once per open; otherwise each re-render (busy flag, toast) would refocus the first field.
  const closeRef = useRef(onClose);
  useLayoutEffect(() => { closeRef.current = onClose; });
  const dirty = useRef(false);
  // In-app confirm instead of the browser's default window.confirm popup.
  const [confirming, setConfirming] = useState(false);
  const confirmingRef = useRef(false);
  useLayoutEffect(() => { confirmingRef.current = confirming; });
  const requestClose = useCallback(() => { if (dirty.current) setConfirming(true); else closeRef.current(); }, []);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const body = dialog.current?.querySelector<HTMLElement>("[data-modal-body]");
    (body?.querySelector<HTMLElement>("input:not([disabled]), select:not([disabled]), textarea:not([disabled])") ?? dialog.current)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { if (confirmingRef.current) setConfirming(false); else requestClose(); }
      if (event.key !== "Tab" || !dialog.current) return;
      const focusable = [...dialog.current.querySelectorAll<HTMLElement>("input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href]")];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; previous?.focus(); };
  }, [requestClose]);

  return createPortal(<div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
    <div ref={dialog} role="dialog" data-testid="modal" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onInput={() => { dirty.current = true; }}
      className={cx("relative flex max-h-[88vh] w-full flex-col rounded-2xl bg-surface shadow-modal", size === "lg" ? "max-w-[880px]" : "max-w-[640px]")}>
      <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
        <div><h2 id={titleId} data-testid="modal-title" className="font-display font-semibold text-lg text-ink">{title}</h2>{description && <p className="mt-1 text-xs text-ink-3">{description}</p>}</div>
        <button type="button" data-testid="btn-modal-close" aria-label="Close" onClick={requestClose} className="rounded-lg p-1.5 text-ink-3 hover:bg-muted hover:text-ink"><X className="size-5" /></button>
      </header>
      <div data-modal-body className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      <footer className="flex flex-wrap justify-end gap-3 border-t border-line px-6 py-4"><ModalCloseContext.Provider value={requestClose}>{footer}</ModalCloseContext.Provider></footer>
      {confirming && <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-ink/30 p-6">
        <div role="alertdialog" data-testid="modal-discard-confirm" aria-labelledby={`${titleId}-discard`} className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-modal">
          <h3 id={`${titleId}-discard`} className="font-display font-semibold text-base text-ink">Discard changes?</h3>
          <p className="mt-1.5 text-sm text-ink-3">The data you entered will not be saved.</p>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="secondary" data-testid="btn-discard-keep" autoFocus onClick={() => setConfirming(false)}>Keep editing</Button>
            <Button variant="danger" data-testid="btn-discard-confirm" onClick={() => closeRef.current()}>Discard</Button>
          </div>
        </div>
      </div>}
    </div>
  </div>, document.body);
}

export function ModalActions({ onCancel, busy, submitLabel, secondary, disabled = false }: { onCancel: () => void; busy: boolean; submitLabel: string; secondary?: ReactNode; disabled?: boolean }) {
  const requestClose = useContext(ModalCloseContext);
  return <>
    <Button variant="secondary" data-testid="btn-modal-cancel" onClick={requestClose ?? onCancel}>Cancel</Button>
    {secondary}
    <Button type="submit" form="d4-modal-form" data-testid="btn-modal-submit" disabled={busy || disabled}>{busy ? "Saving…" : submitLabel}</Button>
  </>;
}

export function FormError({ message }: { message: string }) {
  return message ? <p role="alert" data-testid="form-error" className="mb-5 rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">{message}</p> : null;
}
