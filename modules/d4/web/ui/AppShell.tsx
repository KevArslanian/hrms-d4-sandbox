"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BriefcaseBusiness, ChevronDown, ClipboardList, Layers3, Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { createD4BrowserClient } from "../../supabase/client";
import { useD4 } from "../data/D4DataProvider";
import { cx } from "./primitives";

export const D4_MENU = [
  { href: "/performance", label: "Performance Evaluation" },
  { href: "/kpi", label: "KPI Scorecard" },
  { href: "/competency", label: "Competency Gap" },
  { href: "/development", label: "Development Requirement" },
  { href: "/training", label: "Training Tracking" },
  { href: "/dashboard", label: "People Dashboard" },
] as const;

const roleLabel: Record<string, string> = { HR: "HR", MANAGER: "Manager", EMPLOYEE: "Employee" };

// Same look as the D3 sidebar (components/Sidebar.tsx on the D3 branches); D4 owns its own sub-menu.
function Sidebar({ onNavigate, onClose }: { onNavigate: () => void; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { mode } = useD4();
  const [hrmsOpen, setHrmsOpen] = useState(true);
  const [d4Open, setD4Open] = useState(true);
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

  return <div className="flex h-full flex-col bg-[#0f2342] px-4 py-5 text-[#d9e2fc] shadow-lg">
    <div className="flex items-center gap-3 px-2">
      <div className="grid size-9 place-items-center rounded-lg bg-[#155cfd] shadow-sm"><BriefcaseBusiness size={19} className="text-white" /></div>
      <div><p className="text-xl font-bold tracking-[-0.5px] text-white">ANDIMA</p><p className="text-xs text-[#d9e2fc]/80">Logistics Suite</p></div>
      <button type="button" onClick={onClose} className="ml-auto rounded p-1 text-[#d9e2fc] lg:hidden" aria-label="Tutup navigasi"><X size={18} /></button>
    </div>

    <nav aria-label="Navigasi utama" className="mt-8 flex-1 space-y-1.5 overflow-y-auto text-sm font-semibold">
      <button type="button" onClick={() => setHrmsOpen((v) => !v)} aria-expanded={hrmsOpen}
        className="flex w-full items-center justify-between rounded-lg bg-[#155cfd] px-3 py-2.5 text-white shadow-sm">
        <span className="flex items-center gap-3"><ClipboardList size={17} /> HRMS</span>
        <ChevronDown size={16} className={cx("transition-transform", hrmsOpen ? "rotate-0" : "-rotate-90")} />
      </button>
      {hrmsOpen && <div className="ml-5 mt-2 border-l border-[#d9e2fc]/20 pl-3">
        <button type="button" onClick={() => setD4Open((v) => !v)} aria-expanded={d4Open}
          className="mt-1 flex w-full items-center justify-between rounded-md bg-[#155cfd] px-3 py-2 text-xs text-white transition-colors">
          <span className="flex items-center gap-2"><Layers3 size={14} /> D4</span>
          <ChevronDown size={14} className={cx("transition-transform", d4Open ? "rotate-0" : "-rotate-90")} />
        </button>
        {d4Open && <div className="ml-4 mt-1 border-l border-[#d9e2fc]/15 pl-2">
          {D4_MENU.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
              className={cx("flex w-full items-center rounded-md px-3 py-2 text-xs transition-colors", active ? "bg-[#1e3765] text-white" : "text-[#d9e2fc]/80 hover:bg-[#1e3765] hover:text-white")}>
              {item.label}
            </Link>;
          })}
        </div>}
      </div>}
    </nav>

    <div className="mt-auto space-y-3">
      {mode === "live"
        ? <button type="button" onClick={() => void signOut()} disabled={signingOut} aria-label="Logout"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-red-600 px-3 py-1.5 text-sm font-bold text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50">
            {signingOut ? "Keluar..." : "Logout"}
          </button>
        : <p className="rounded-lg border border-[#d9e2fc]/20 px-3 py-1.5 text-center text-[11px] text-[#d9e2fc]/80">Preview mode · data fiktif</p>}
    </div>
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
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">Lewati ke konten</a>
    {menuOpen && <button type="button" aria-label="Tutup menu" className="fixed inset-0 z-30 bg-ink/40 lg:hidden" onClick={() => setMenuOpen(false)} />}
    <aside className={cx("fixed inset-y-0 left-0 z-40 w-[260px] transition-transform lg:translate-x-0", menuOpen ? "translate-x-0" : "-translate-x-full")}>
      <Sidebar onNavigate={() => setMenuOpen(false)} onClose={() => setMenuOpen(false)} />
    </aside>
    <div className="lg:pl-[260px]">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-line bg-surface px-4 sm:px-8">
        <button type="button" aria-label={menuOpen ? "Tutup menu" : "Buka menu"} className="rounded-lg p-2 text-ink-2 hover:bg-muted lg:hidden" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        <strong className="text-sm font-semibold text-ink">ANDIMA HRMS</strong>
        <span aria-hidden="true" className="hidden h-5 w-px bg-line-strong sm:block" />
        <p className="hidden flex-1 truncate text-xs text-ink-2 sm:block">HRMS / {current?.label ?? "Performance & Training"}</p>
        <span className="flex-1 sm:hidden" />
        {mode === "fixture" && <span className="hidden rounded-full bg-warning-bg px-2.5 py-1 text-[11px] font-semibold text-warning md:inline">Preview · data fiktif</span>}
        <span className="rounded-lg p-2 text-ink-2" title="Notifikasi"><Bell aria-hidden="true" className="size-5" /><span className="sr-only">Notifikasi</span></span>
        <span aria-hidden="true" className="h-8 w-px bg-line" />
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-avatar-me-bg text-xs font-semibold text-avatar-me">{name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span>
          <span className="hidden sm:block"><strong className="block text-sm font-semibold leading-5 text-ink">{name}</strong><span className="block text-xs text-ink-2">{roleLabel[snapshot?.role ?? ""] ?? "—"}</span></span>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-8 sm:px-8">{children}</main>
    </div>
  </div>;
}
