"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, Contact, Menu, ShoppingBag, Terminal, Users, X } from "lucide-react";
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

const roleLabel: Record<string, string> = { HR: "HR Manager", MANAGER: "Manager", EMPLOYEE: "Employee" };

function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { mode } = useD4();
  const other = "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-semibold text-nav-text/70";

  async function signOut() {
    await createD4BrowserClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return <div className="flex h-full flex-col gap-2 bg-nav px-3 py-6">
    <div className="flex items-center gap-3 px-2 pb-6">
      <span aria-hidden="true" className="size-9 rounded-lg bg-primary-600" />
      <span><strong className="block font-display text-lg leading-6 text-white">ANDIMA</strong><span className="block text-xs text-nav-text">Logistics Suite</span></span>
    </div>
    <nav aria-label="Navigasi utama" className="flex flex-1 flex-col gap-1 overflow-y-auto">
      <span className={other}><ShoppingBag aria-hidden="true" className="size-[18px]" />POS</span>
      <span className={other}><Contact aria-hidden="true" className="size-[18px]" />CRM</span>
      <span className="flex items-center gap-3 rounded-[10px] bg-primary-600 px-3 py-2.5 text-sm font-semibold text-white"><Users aria-hidden="true" className="size-[18px]" /><span className="flex-1">HRMS</span><ChevronDown aria-hidden="true" className="size-4" /></span>
      <div className="ml-3 border-l border-nav-2 py-1 pl-3">
        <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">Performance &amp; Training</p>
        {D4_MENU.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
            className={cx("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm", active ? "bg-nav-2 font-semibold text-white" : "text-nav-text hover:bg-nav-2/60 hover:text-white")}>
            <span aria-hidden="true" className={cx("size-1.5 rounded-full", active ? "bg-teal" : "bg-nav-text/50")} />{item.label}
          </Link>;
        })}
      </div>
      <span className={other}><Terminal aria-hidden="true" className="size-[18px]" />MID</span>
    </nav>
    {mode === "live"
      ? <button type="button" onClick={() => void signOut()} className="rounded-xl border-2 border-danger py-2.5 font-display text-lg text-danger hover:bg-danger/10">Logout</button>
      : <p className="rounded-xl border border-nav-2 px-3 py-2 text-center text-xs text-nav-text">Preview mode · data fiktif</p>}
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
      <Sidebar onNavigate={() => setMenuOpen(false)} />
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
          <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-success-bg text-xs font-semibold text-success">{name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span>
          <span className="hidden sm:block"><strong className="block text-sm font-semibold leading-5 text-ink">{name}</strong><span className="block text-xs text-ink-2">{roleLabel[snapshot?.role ?? ""] ?? "—"}</span></span>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-8 sm:px-8">{children}</main>
    </div>
  </div>;
}
