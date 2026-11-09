"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, Contact, Eye, Menu, SquareTerminal, Store, Users, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { catalogFor, roleForPosition } from "../../kpi/catalog";
import { canFillDaily } from "../../shared/rules";
import { createD4BrowserClient } from "../../supabase/client";
import { useD4 } from "../data/D4DataProvider";
import { thisMonth, today } from "../data/selectors";
import { FormModal, SearchSelectField } from "./forms";
import { Button, cx, slug } from "./primitives";

export const D4_MENU = [
  { href: "/performance", label: "Performance Review" },
  { href: "/daily-kpi", label: "Daily KPI" },
  { href: "/competency", label: "Competency Gap" },
  { href: "/development", label: "Development Requirement" },
  { href: "/training", label: "Training Tracking" },
  { href: "/dashboard", label: "People Dashboard" },
] as const;

const roleLabel: Record<string, string> = { HR: "HR", MANAGER: "Manager", MANAGEMENT: "Management", EMPLOYEE: "Employee" };

const LOGO_URL = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-ANDIMA-wzx4gpZx20EFE5IYcH3jqabixELIo3.png";

// Other teams' modules: shown as in the shared sidebar, not clickable from D4 yet.
const OTHER_MODULES = [{ label: "POS", icon: Store }, { label: "CRM", icon: Contact }] as const;

// Matches Figma PISD D3 sidebar (file L5k46NNy2gX6xOq8e1dczQ, node 1582:458): POS, CRM, HRMS (expanded) and MID,
// active HRMS item on #b0c6d4 Logout outlined at the bottom.
function Sidebar({ onNavigate, onClose }: { onNavigate: () => void; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { mode } = useD4();
  const [hrmsOpen, setHrmsOpen] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await createD4BrowserClient().auth.signOut({ scope: "local" });
      router.replace("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const moduleItem = "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold tracking-[0.07px] text-[#d9e2fc]";
  const disabledModule = (label: string, Icon: typeof Store) => <span key={label} role="link" aria-disabled="true" title={`${label} — not available in module D4`} data-testid={`nav-${slug(label)}`}
    className={cx(moduleItem, "cursor-not-allowed opacity-70")}><Icon aria-hidden="true" className="size-[17px]" />{label}</span>;

  return <div className="flex h-full flex-col bg-[#0f2342] px-4 pb-5 pt-4 text-white">
    <div className="flex h-12 items-center gap-3 px-2 pt-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_URL} alt="Logo ANDIMA" width={400} height={246} data-testid="sidebar-logo" className="h-9 w-auto rounded-lg bg-white object-contain p-0.5" />
      <div><p className="text-xl font-bold leading-7 tracking-[-0.5px]">ANDIMA</p><p className="text-xs leading-4 text-[#d9e2fc]/80">Logistics Suite</p></div>
      <button type="button" onClick={onClose} data-testid="btn-sidebar-close" className="ml-auto rounded p-1 text-[#d9e2fc] lg:hidden" aria-label="Close navigation"><X size={18} /></button>
    </div>

    <nav aria-label="Main navigation" data-testid="sidebar" className="mt-[70px] flex-1 space-y-1.5 overflow-y-auto">
      {OTHER_MODULES.map((item) => disabledModule(item.label, item.icon))}
      <button type="button" data-testid="nav-hrms" onClick={() => setHrmsOpen((v) => !v)} aria-expanded={hrmsOpen}
        className="flex h-[29px] w-full items-center justify-between rounded-lg bg-[#155dfc] px-3 text-sm font-semibold tracking-[0.07px] text-white">
        <span className="flex items-center gap-3"><Users aria-hidden="true" className="size-[17px]" /> HRMS</span>
        <ChevronDown aria-hidden="true" size={16} className={cx("transition-transform", hrmsOpen ? "rotate-0" : "-rotate-90")} />
      </button>
      {hrmsOpen && <div className="ml-5 space-y-1.5 border-l border-[#d9e2fc]/40 py-2 pl-1.5">
        {D4_MENU.map((item) => {
          const active = isActive(item.href);
          return <Link key={item.href} href={item.href} data-testid={`nav-${slug(item.label)}`} onClick={onNavigate} aria-current={active ? "page" : undefined}
            className={cx("flex items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
              active ? "bg-[#b0c6d4] text-[#606f8c]" : "text-[#d9e2fc]/40 hover:text-[#d9e2fc]")}>
            {item.label}
          </Link>;
        })}
      </div>}
      {disabledModule("MID", SquareTerminal)}
    </nav>

    {mode === "live"
      ? <button type="button" data-testid="btn-logout" onClick={() => void signOut()} disabled={signingOut}
          className="mt-4 h-10 w-full rounded-[20px] border-[3px] border-[#d9364f] text-xl font-semibold text-[#d9364f] transition hover:bg-[#d9364f]/10 disabled:cursor-not-allowed disabled:opacity-50">
          {signingOut ? "Keluar..." : "Logout"}
        </button>
      : <p className="mt-4 rounded-lg border border-[#d9e2fc]/20 px-3 py-1.5 text-center text-[11px] text-[#d9e2fc]/80">Mode pratinjau · data contoh</p>}
  </div>;
}

/** HR/manager backup for demos: preview the app as one employee without that employee's login. Read-only. */
function SimulateEmployee() {
  const router = useRouter();
  const { snapshot, canSimulate, viewAs, setViewAs } = useD4();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState("");
  if (!snapshot || !canSimulate || viewAs) return null;
  const options = [...snapshot.reference.employees]
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((item) => ({ value: item.id, label: `${item.fullName.slice(0, 60)} · ${item.employeeId}` }));
  return <>
    <Button variant="secondary" data-testid="btn-simulate-employee" icon={<Eye aria-hidden="true" className="size-4" />} className="h-9 px-3 text-xs" onClick={() => setOpen(true)}>
      <span className="hidden md:inline">Simulasi Employee</span><span className="sr-only md:hidden">Simulasi Employee</span>
    </Button>
    {open && <FormModal title="Simulasi Employee" description="Lihat aplikasi persis seperti yang dilihat satu pegawai. Hanya tampilan; tidak ada data yang disimpan." onClose={() => setOpen(false)}
      footer={<>
        <Button variant="secondary" data-testid="btn-simulate-cancel" onClick={() => setOpen(false)}>Cancel</Button>
        <Button data-testid="btn-simulate-start" disabled={!choice} onClick={() => { setViewAs(choice); setOpen(false); router.push("/daily-kpi"); }}>Lihat sebagai Employee</Button>
      </>}>
      <SearchSelectField label="Pegawai" testId="simulate-employee" value={choice} onChange={setChoice} options={options} placeholder="Pilih pegawai" />
    </FormModal>}
  </>;
}

type Notification = { id: string; title: string; text: string; href: string };

/** B5 (interview D4, 14 Oct 2026): everyone with a KPI role scores today's Daily KPI; until then this is their notification. */
function useNotifications(): Notification[] {
  const { snapshot, catalog } = useD4();
  if (!snapshot?.kpiDaily || !canFillDaily(snapshot.role, snapshot.actorEmployeeId)) return [];
  const periodCatalog = catalog ? catalogFor(catalog, thisMonth()) : null;
  const me = snapshot.reference.employees.find((item) => item.id === snapshot.actorEmployeeId);
  if (!periodCatalog || !roleForPosition(periodCatalog, me?.positionId)) return [];
  const day = today();
  if (snapshot.kpiDaily.some((entry) => entry.employeeId === snapshot.actorEmployeeId && entry.entryDate === day)) return [];
  return [{ id: `daily-kpi-${snapshot.actorEmployeeId}-${day}`, title: "Daily KPI hari ini belum diisi", text: "Isi skor lima Core KPI Anda sebelum pulang.", href: "/daily-kpi" }];
}

// The last reminder that was opened or dismissed, per browser: the panel opens by itself once per reminder, not on every page.
const SEEN_KEY = "d4-notification-seen";
const wasSeen = (id: string) => { try { return localStorage.getItem(SEEN_KEY) === id; } catch { return false; } };
const markSeen = (id: string) => { try { localStorage.setItem(SEEN_KEY, id); } catch { /* blocked storage: it opens again next load */ } };

function NotificationBell() {
  const pathname = usePathname();
  const items = useNotifications();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const first = items[0];
  // Opens by itself so nobody has to look for it, except on the page the reminder points to.
  const shown = open || (Boolean(first) && pathname !== first.href && dismissed !== first.id && !wasSeen(first.id));
  function close() {
    if (first) { markSeen(first.id); setDismissed(first.id); }
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
    {shown && <div role="dialog" aria-label="Notifications" data-testid="notification-panel" className="absolute right-0 top-full z-50 mt-2 w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-2 shadow-modal">
      {items.length ? items.map((item) => <Link key={item.id} href={item.href} onClick={close} data-testid="notification-item" className="block rounded-xl px-3 py-2.5 hover:bg-muted">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink"><span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-danger" />{item.title}</span>
        <span className="mt-0.5 block text-xs text-ink-2">{item.text}</span>
        <span className="mt-2 inline-block text-xs font-semibold text-primary-600">Isi sekarang</span>
      </Link>) : <p className="px-3 py-2.5 text-sm text-ink-3">Tidak ada notifikasi.</p>}
    </div>}
  </div>;
}

function SimulationBanner() {
  const { snapshot, viewAs, setViewAs } = useD4();
  if (!snapshot || !viewAs) return null;
  const who = snapshot.reference.employees.find((item) => item.id === viewAs);
  return <div role="status" data-testid="simulation-banner" className="flex flex-wrap items-center gap-3 border-b border-line bg-warning-bg px-4 py-2.5 text-xs text-warning sm:px-8">
    <Eye aria-hidden="true" className="size-4 shrink-0" />
    <span className="min-w-0 flex-1"><strong>Mode simulasi Employee:</strong> melihat sebagai {who?.fullName.slice(0, 60) ?? "—"}. Hanya tampilan, penyimpanan dinonaktifkan.</span>
    <Button variant="secondary" data-testid="btn-simulate-exit" className="h-8 px-3 text-xs" onClick={() => setViewAs(null)}>Keluar simulasi</Button>
  </div>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { snapshot, mode } = useD4();
  const [menuOpen, setMenuOpen] = useState(false);
  const current = D4_MENU.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const actor = snapshot?.reference.employees.find((item) => item.id === snapshot.actorEmployeeId);
  const name = actor?.fullName ?? "—";

  return <div className="min-h-screen bg-app">
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">Skip to content</a>
    {menuOpen && <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 bg-ink/40 lg:hidden" onClick={() => setMenuOpen(false)} />}
    <aside className={cx("fixed inset-y-0 left-0 z-40 w-[260px] transition-transform lg:translate-x-0", menuOpen ? "translate-x-0" : "-translate-x-full")}>
      <Sidebar onNavigate={() => setMenuOpen(false)} onClose={() => setMenuOpen(false)} />
    </aside>
    <div className="lg:pl-[260px]">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-line bg-surface px-4 sm:px-8">
        <button type="button" data-testid="btn-mobile-menu" aria-label={menuOpen ? "Close menu" : "Open menu"} className="rounded-lg p-2 text-ink-2 hover:bg-muted lg:hidden" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        <strong className="text-sm font-semibold text-ink">ANDIMA HRMS</strong>
        <span aria-hidden="true" className="hidden h-5 w-px bg-line-strong sm:block" />
        <p data-testid="header-breadcrumb" className="hidden flex-1 truncate text-xs text-ink-2 sm:block">HRMS / {current?.label ?? "Performance & Training"}</p>
        <span className="flex-1 sm:hidden" />
        {mode === "fixture" && <span className="hidden rounded-full bg-warning-bg px-2.5 py-1 text-[11px] font-semibold text-warning md:inline">Pratinjau · data contoh</span>}
        <SimulateEmployee />
        <NotificationBell />
        <span aria-hidden="true" className="h-8 w-px bg-line" />
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-avatar-me-bg text-xs font-semibold text-avatar-me">{name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span>
          <span className="hidden sm:block"><strong data-testid="header-user-name" className="block text-sm font-semibold leading-5 text-ink">{name}</strong><span data-testid="header-user-role" className="block text-xs text-ink-2">{roleLabel[snapshot?.role ?? ""] ?? "—"}</span></span>
        </div>
      </header>
      <SimulationBanner />
      <main id="main" className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-8 sm:px-8">{children}</main>
    </div>
  </div>;
}
