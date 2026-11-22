"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, LayoutDashboard, Menu, Users, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { catalogFor, roleForPosition, type KpiCatalogSet } from "../../kpi/catalog";
import { canFillDaily } from "../../shared/rules";
import { createD4BrowserClient } from "../../supabase/client";
import { useD4 } from "../data/D4DataProvider";
import { endPreviewSession } from "../data/preview-session";
import { canWrite, developmentNeeds, needsTraining, thisMonth, today, visibleEmployees, type Snapshot } from "../data/selectors";
import { Button, cx, slug } from "./primitives";

// People Dashboard first: it is the HR landing page and the summary the other five pages feed (decision 13 Nov 2026).
export const D4_MENU = [
  { href: "/dashboard", label: "People Dashboard" },
  { href: "/performance", label: "Performance Review" },
  { href: "/daily-kpi", label: "Daily KPI" },
  { href: "/competency", label: "Competency Gap" },
  { href: "/development", label: "Development Requirement" },
  { href: "/training", label: "Training Tracking" },
] as const;

// An employee only ever sees their own data, so the team lists are left out: /dashboard is their own profile.
const EMPLOYEE_MENU = [
  { href: "/dashboard", label: "My Performance" },
  { href: "/daily-kpi", label: "Daily KPI" },
] as const;

// No items until the role is known, or an employee briefly sees the HR menu while the snapshot loads.
const menuFor = (role: string | undefined): readonly { href: string; label: string }[] => !role ? [] : role === "EMPLOYEE" ? EMPLOYEE_MENU : D4_MENU;

const roleLabel: Record<string, string> = { HR: "HR", MANAGER: "Manager", MANAGEMENT: "Management", EMPLOYEE: "Employee" };

// Sidebar follows the revised sidebar in the PISD design system page (node 5429:830, 16 Nov 2026): ANDIMA wordmark without
// the logo, a Dashboard link above the HRMS group (POS, CRM and MID left out, they were never clickable from D4), and the
// active sub-menu item on #b0c6d4 with a teal dot. Logout stays at the bottom: it is the only way out (decision 13 Nov 2026).
/**
 * Logout asks first (decision 13 Nov 2026). "Iya" turns the dialog into "Logging out..." until the login page replaces
 * the app; "Tidak", Esc or the overlay closes it. Focus starts on "Tidak" and returns to where it was.
 */
function LogoutConfirm({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const { mode } = useD4();
  const dialog = useRef<HTMLDivElement>(null);
  const [signingOut, setSigningOut] = useState(false);
  const cancel = () => { if (!signingOut) onCancel(); };

  async function signOut() {
    setSigningOut(true);
    dialog.current?.focus();
    try {
      // The local preview signs out by dropping its own cookie; only the live app has a Supabase session to end.
      if (mode === "fixture") endPreviewSession();
      else await createD4BrowserClient().auth.signOut({ scope: "local" });
      router.replace("/login");
      router.refresh();
    } catch {
      // Back to the question, so the user can try again instead of waiting on a message that never ends.
      setSigningOut(false);
    }
  }

  useEffect(() => {
    // Read before moving focus in: an autoFocus would already have taken it, and focus could not go back on close.
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>("[data-testid=btn-logout-cancel]")?.focus();
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; previous?.focus(); };
  }, []);

  return createPortal(<div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) cancel(); }}>
    <div ref={dialog} role="alertdialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby={signingOut ? undefined : "logout-text"} tabIndex={-1} data-testid="logout-confirm"
      onKeyDown={(event) => {
        if (event.key === "Escape") cancel();
        if (event.key !== "Tab") return;
        // Two buttons: Tab moves between them and never leaves the dialog.
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
        const next = buttons[(buttons.indexOf(document.activeElement as HTMLButtonElement) + (event.shiftKey ? buttons.length - 1 : 1)) % buttons.length];
        event.preventDefault(); next?.focus();
      }}
      className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-modal outline-none">
      {signingOut
        ? <p id="logout-title" role="status" data-testid="logout-progress" className="text-center font-display text-base font-semibold text-ink">Logging out...</p>
        : <>
          <h2 id="logout-title" className="font-display text-base font-semibold text-ink">Logout</h2>
          <p id="logout-text" className="mt-1.5 text-sm text-ink-2">Apakah Anda yakin ingin logout?</p>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="secondary" data-testid="btn-logout-cancel" onClick={onCancel}>Tidak</Button>
            <Button variant="danger" data-testid="btn-logout-confirm" onClick={() => void signOut()}>Iya</Button>
          </div>
        </>}
    </div>
  </div>, document.body);
}

function Sidebar({ onNavigate, onClose }: { onNavigate: () => void; onClose: () => void }) {
  const pathname = usePathname();
  const { mode, snapshot } = useD4();
  const [hrmsOpen, setHrmsOpen] = useState(true);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // The first menu entry (People Dashboard, or My Performance for an employee) is the "Dashboard" link above the module.
  const [home, ...features] = menuFor(snapshot?.role);
  const homeActive = Boolean(home && isActive(home.href));

  return <div className="flex h-full flex-col bg-[#0f2342] px-4 pb-5 pt-4 text-white">
    {/* Design System PISD 5858:643: logo 52x35, then the wordmark, 12 px apart. */}
    <div className="relative flex h-12 items-center gap-3 px-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- a 52 px static logo; the login page loads it the same way. */}
      <img src="/andima-logo.png" alt="" width={52} height={35} data-testid="sidebar-logo" className="h-[35px] w-[52px] object-contain" />
      <div><p className="font-display text-xl font-bold leading-7">ANDIMA</p><p className="font-display text-xs leading-4 text-[#d9e2fc]/80">Logistics Suite</p></div>
      <button type="button" onClick={onClose} data-testid="btn-sidebar-close" className="absolute right-0 rounded p-1 text-[#d9e2fc] lg:hidden" aria-label="Close navigation"><X size={18} /></button>
    </div>

    <nav aria-label="Main navigation" data-testid="sidebar" className="mt-6 flex-1 overflow-y-auto">
      {home && <Link href={home.href} data-testid="nav-dashboard" onClick={onNavigate} aria-current={homeActive ? "page" : undefined}
        className={cx("mb-1.5 flex h-10 items-center gap-3 rounded-lg px-3 font-display text-sm font-semibold transition-colors",
          homeActive ? "bg-[#b0c6d4] text-[#45556c]" : "text-[#d9e2fc] hover:bg-white/10")}>
        <LayoutDashboard aria-hidden="true" className="size-[15px]" /> Dashboard
      </Link>}
      <button type="button" data-testid="nav-hrms" onClick={() => setHrmsOpen((v) => !v)} aria-expanded={hrmsOpen}
        className="flex h-10 w-full items-center justify-between rounded-lg bg-primary-700 px-4 font-display text-sm font-semibold text-white">
        <span className="flex items-center gap-1"><Users aria-hidden="true" className="size-[18px]" /> HRMS</span>
        <ChevronDown aria-hidden="true" size={16} className={cx("transition-transform", hrmsOpen ? "rotate-0" : "-rotate-90")} />
      </button>
      {hrmsOpen && <div className="ml-4 mt-2 space-y-1.5 border-l border-[#d9e2fc]/20 pl-3">
        {features.map((item) => {
          const active = isActive(item.href);
          // Wraps instead of clipping: "Development Requirement" needs 179 px at 14 px Inter; after the dot the pill has 161.
          return <Link key={item.href} href={item.href} data-testid={`nav-${slug(item.label)}`} onClick={onNavigate} aria-current={active ? "page" : undefined}
            className={cx("flex items-start gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
              active ? "bg-[#b0c6d4] text-[#45556c]" : "text-white hover:bg-white/10")}>
            {/* Only the active page has the teal dot; the others keep its space so every label starts at the same x. */}
            <span aria-hidden="true" className={cx("mt-[7px] size-1.5 shrink-0 rounded-full", active && "bg-teal")} />
            {item.label}
          </Link>;
        })}
      </div>}
    </nav>

    {/* On a phone the header badge is hidden, so the sidebar is where the preview says it shows sample data. */}
    {mode === "fixture" && <p className="mt-4 rounded-lg border border-[#d9e2fc]/20 px-3 py-1.5 text-center text-[11px] text-[#d9e2fc]/80">Mode pratinjau · data contoh</p>}
    {/* Shown in the preview as well, where it ends the preview sign-in (preview-session.ts) without contacting a server.
        The text is a lighter shade of the #d9364f border, which reaches only 3.4:1 on the dark sidebar; this one clears 4.5:1 also on hover.
        On a phone the drawer traps focus and closes on Esc, so it closes first and the dialog has the keyboard to itself. */}
    <button type="button" data-testid="btn-logout" onClick={() => { onClose(); setConfirmLogout(true); }}
      className="mt-4 h-10 w-full rounded-[20px] border-[3px] border-[#d9364f] font-display text-xl font-semibold text-[#e3697b] transition hover:bg-[#d9364f]/10">
      Logout
    </button>
    {confirmLogout && <LogoutConfirm onCancel={() => setConfirmLogout(false)} />}
  </div>;
}

type Notification = { id: string; title: string; text: string; href: string; action: string };

/** B5 (interview D4, 14 Oct 2026): everyone with a KPI role scores today's Daily KPI; until then this is their notification. */
function useNotifications(): Notification[] {
  const { snapshot, catalog } = useD4();
  if (!snapshot) return [];
  return [dailyReminder(snapshot, catalog), trainingReminder(snapshot)].filter((item): item is Notification => Boolean(item));
}

function dailyReminder(snapshot: Snapshot, catalog: KpiCatalogSet | null): Notification | null {
  if (!snapshot.kpiDaily || !canFillDaily(snapshot.role, snapshot.actorEmployeeId)) return null;
  const periodCatalog = catalog ? catalogFor(catalog, thisMonth()) : null;
  const me = snapshot.reference.employees.find((item) => item.id === snapshot.actorEmployeeId);
  if (!periodCatalog || !roleForPosition(periodCatalog, me?.positionId)) return null;
  const day = today();
  if (snapshot.kpiDaily.some((entry) => entry.employeeId === snapshot.actorEmployeeId && entry.entryDate === day)) return null;
  return { id: `daily-kpi-${snapshot.actorEmployeeId}-${day}`, title: "Daily KPI hari ini belum diisi", text: "Isi skor lima Core KPI Anda sebelum pulang.", href: "/daily-kpi", action: "Isi sekarang" };
}

/** PST 2 (Kei): HR and managers see who still needs training without opening the dashboard first. */
function trainingReminder(snapshot: Snapshot): Notification | null {
  if (!canWrite(snapshot)) return null;
  const visible = new Set(visibleEmployees(snapshot).map((item) => item.id));
  const waiting = developmentNeeds(snapshot).filter((need) => visible.has(need.employeeId) && needsTraining(snapshot, need));
  if (!waiting.length) return null;
  const people = new Set(waiting.map((need) => need.employeeId)).size;
  return { id: `need-training-${waiting.map((need) => need.needId).join(",")}`, title: `${people} pegawai butuh training`,
    text: `${waiting.length} development requirement terbuka belum punya training.`, href: "/development", action: "Buat training" };
}

// The last reminder that was opened or dismissed, per browser: the panel opens by itself once per reminder, not on every page.
const SEEN_KEY = "d4-notification-seen";
const COLLAPSED_KEY = "d4-sidebar-collapsed";
// Read through useSyncExternalStore: the server renders the sidebar open, the browser then applies the saved choice.
const collapsedListeners = new Set<() => void>();
let collapsedInMemory = false;
const onCollapsedChange = (listener: () => void) => { collapsedListeners.add(listener); return () => { collapsedListeners.delete(listener); }; };
const readCollapsed = () => { try { return localStorage.getItem(COLLAPSED_KEY) === "1"; } catch { return collapsedInMemory; } };
function writeCollapsed(next: boolean) {
  collapsedInMemory = next;
  try { localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0"); } catch { /* blocked storage: kept for this page view */ }
  collapsedListeners.forEach((listener) => listener());
}
const wasSeen = (id: string) => { try { return localStorage.getItem(SEEN_KEY) === id; } catch { return false; } };
const markSeen = (id: string) => { try { localStorage.setItem(SEEN_KEY, id); } catch { /* blocked storage: it opens again next load */ } };

function NotificationBell() {
  const pathname = usePathname();
  const items = useNotifications();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const first = items[0];
  // Seen per set of reminders, so a new one (say, someone now needs training) opens the panel again.
  const key = items.map((item) => item.id).join("|");
  // Opens by itself so nobody has to look for it, except on the page the reminder points to.
  const shown = open || (Boolean(first) && pathname !== first.href && dismissed !== key && !wasSeen(key));
  function close() {
    if (first) { markSeen(key); setDismissed(key); }
    setOpen(false);
  }
  useEffect(() => {
    if (!shown) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    const onPointer = (event: MouseEvent) => { if (!wrapper.current?.contains(event.target as Node)) close(); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onPointer); };
  });
  return <div ref={wrapper} className="relative">
    <button type="button" data-testid="btn-notifications" aria-label={items.length ? `Notifications (${items.length})` : "Notifications"} aria-expanded={shown}
      onClick={() => shown ? close() : setOpen(true)} className="relative rounded-lg p-2 text-ink-2 hover:bg-muted">
      <Bell aria-hidden="true" className="size-5" />
      {items.length > 0 && <span data-testid="notification-badge" className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-semibold text-white">{items.length}</span>}
    </button>
    {/* On a phone the bell is not at the right edge, so a panel anchored to it would run off the left side: pin it to the viewport. */}
    {shown && <div role="dialog" aria-label="Notifications" data-testid="notification-panel" className="absolute right-0 top-full z-50 mt-2 w-[min(320px,calc(100vw-2rem))] max-sm:fixed max-sm:inset-x-4 max-sm:top-16 max-sm:w-auto rounded-2xl border border-line bg-surface p-2 shadow-modal">
      {items.length ? items.map((item) => <Link key={item.id} href={item.href} onClick={close} data-testid="notification-item" className="block rounded-xl px-3 py-2.5 hover:bg-muted">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink"><span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-danger" />{item.title}</span>
        <span className="mt-0.5 block text-xs text-ink-2">{item.text}</span>
        <span className="mt-2 inline-block text-xs font-semibold text-primary-600">{item.action}</span>
      </Link>) : <p className="px-3 py-2.5 text-sm text-ink-3">Tidak ada notifikasi.</p>}
    </div>}
  </div>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { snapshot, mode } = useD4();
  const [menuOpen, setMenuOpen] = useState(false);
  // Design System PISD 5858:737: on a desktop the same button hides the sidebar; the choice stays per browser.
  const collapsed = useSyncExternalStore(onCollapsedChange, readCollapsed, () => false);
  const toggleMenu = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) writeCollapsed(!collapsed);
    else setMenuOpen(!menuOpen);
  };
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);
  const matches = (item: { href: string }) => pathname === item.href || pathname.startsWith(`${item.href}/`);
  // An employee opens every other page from their own profile (View source), so it sits under My Performance, not a team menu.
  const current = !snapshot ? undefined : snapshot.role === "EMPLOYEE" ? EMPLOYEE_MENU.find(matches) ?? EMPLOYEE_MENU[0] : D4_MENU.find(matches);
  const actor = snapshot?.reference.employees.find((item) => item.id === snapshot.actorEmployeeId);
  const name = actor?.fullName ?? "-";

  // One title per section (WCAG 2.4.2), set only once the role is known so an employee never sees an HR menu name.
  useEffect(() => {
    if (!snapshot) return;
    const title = `${current?.label ?? "Performance & Training"} · HRMS D4`;
    const apply = () => { if (document.title !== title) document.title = title; };
    apply();
    // Next.js writes the root layout's metadata title again after a client-side navigation.
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [snapshot, current]);

  const closeMenu = () => { setMenuOpen(false); menuButton.current?.focus(); };
  // The open drawer is modal on a phone: focus starts in it and stays in it, Esc closes it.
  useEffect(() => {
    if (!menuOpen || !drawer.current) return;
    const panel = drawer.current;
    const focusable = () => [...panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
    focusable()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenuOpen(false); menuButton.current?.focus(); }
      if (event.key !== "Tab") return;
      const items = focusable(), first = items[0], last = items[items.length - 1];
      if (!panel.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return <div className="min-h-screen bg-app">
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">Skip to content</a>
    {menuOpen && <button type="button" aria-label="Close menu" tabIndex={-1} className="fixed inset-0 z-30 bg-ink/40 lg:hidden" onClick={closeMenu} />}
    {/* Closed on a phone it is also invisible, so Tab does not walk through links that are off screen. Visibility is part of
        the transition only when closing: it hides after the slide-out, and shows at once on opening so focus can move in. */}
    <aside ref={drawer} data-testid="sidebar-panel" className={cx("fixed inset-y-0 left-0 z-40 w-[260px]", !collapsed && "lg:visible lg:translate-x-0", menuOpen ? "translate-x-0 transition-transform" : "invisible -translate-x-full transition-[transform,visibility]")}>
      <Sidebar onNavigate={closeMenu} onClose={closeMenu} />
    </aside>
    <div className={cx(!collapsed && "lg:pl-[260px]")}>
      {/* Tighter gaps on a phone: at 320 px the header (menu, bell, avatar) otherwise pushes the avatar off screen. */}
      <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-line bg-surface px-4 sm:gap-4 sm:px-8">
        {/* One button for both sizes: drawer on a phone, collapse on a desktop. 24 px mark, 40 px hit area. */}
        <button ref={menuButton} type="button" data-testid="btn-mobile-menu" aria-label={menuOpen || !collapsed ? "Hide menu" : "Show menu"} aria-expanded={menuOpen}
          className="-ml-2 rounded-lg p-2 hover:bg-muted sm:-ml-2" onClick={toggleMenu}>
          <span className="flex size-6 items-center justify-center rounded-[5px] bg-[#3b6ff5] text-white"><Menu aria-hidden="true" className="size-[18px]" strokeWidth={2.5} /></span>
        </button>
        <strong className="font-display text-base font-semibold text-ink">ANDIMA HRMS</strong>
        <span aria-hidden="true" className="hidden h-5 w-px bg-[#d9e2fc] sm:block" />
        <p data-testid="header-breadcrumb" className="hidden flex-1 truncate text-xs text-ink-2 sm:block">HRMS / {current?.label ?? "Performance & Training"}</p>
        <span className="flex-1 sm:hidden" />
        {mode === "fixture" && <span className="hidden rounded-full bg-warning-bg px-2.5 py-1 text-[11px] font-semibold text-warning md:inline">Pratinjau · data contoh</span>}
        <NotificationBell />
        <span aria-hidden="true" className="h-8 w-px bg-line" />
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-avatar-me-bg text-xs font-semibold text-avatar-me">{name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span>
          <span className="hidden sm:block"><strong data-testid="header-user-name" className="block text-sm font-semibold leading-5 text-ink">{name}</strong><span data-testid="header-user-role" className="block text-xs text-ink-2">{roleLabel[snapshot?.role ?? ""] ?? "-"}</span></span>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-8 sm:px-8">{children}</main>
    </div>
  </div>;
}
