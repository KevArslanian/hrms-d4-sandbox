"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  ClipboardList,
  Gauge,
  Headset,
  LayoutDashboard,
  Menu,
  Settings,
  Target,
  Users,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

const links = [
  { href: "/performance", label: "Performance & KPI", icon: ClipboardList },
  { href: "/kpi", label: "KPI Scorecard", icon: Target },
  { href: "/competency", label: "Competency Needs", icon: Gauge },
  { href: "/development", label: "Development Needs", icon: BookOpen },
  { href: "/training", label: "Training Tracking", icon: BarChart3 },
  { href: "/dashboard", label: "People Dashboard", icon: Users },
];

export function D4Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const current = links.find((link) => pathname.startsWith(link.href));

  return (
    <div className="min-h-screen bg-white text-[#192b4c]">
      {menuOpen && (
        <button
          type="button"
          aria-label="Tutup menu"
          className="fixed inset-0 z-30 bg-[#0d203e]/50 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col bg-[#0d2142] text-white transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-16 items-center justify-between gap-3 px-5">
          <Link href="/" className="flex items-center gap-3" onClick={() => setMenuOpen(false)}>
            <span className="flex size-9 items-center justify-center rounded-lg bg-[#08a99d] text-sm font-extrabold">A</span>
            <span className="leading-tight">
              <strong className="block text-sm tracking-wide">ANDIMA</strong>
              <small className="text-[10px] text-[#9fb1d0]">Logistic Suite</small>
            </span>
          </Link>
          <button type="button" aria-label="Tutup menu" className="lg:hidden" onClick={() => setMenuOpen(false)}><X size={19} /></button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Navigasi D4">
          <div className="mb-5 space-y-1 text-[13px] text-[#b9c9e2]">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2"><LayoutDashboard size={16} /> Dashboard</div>
            <div className="flex items-center gap-3 rounded-lg px-3 py-2"><ClipboardList size={16} /> POS</div>
            <div className="flex items-center gap-3 rounded-lg px-3 py-2"><Users size={16} /> CRM</div>
          </div>
          <div className="flex items-center justify-between rounded-md bg-[#078f8b] px-3 py-2 text-sm font-semibold">
            <span className="flex items-center gap-3"><Users size={16} /> HRMS</span><ChevronDown size={16} />
          </div>
          <div className="ml-4 space-y-1 border-l border-[#31476b] pl-2 pt-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-[12px] transition-colors ${active ? "bg-[#d6f5f3] font-semibold text-[#087b7a]" : "text-[#b7c7df] hover:bg-[#1a345a] hover:text-white"}`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={13} /> {label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="space-y-3 border-t border-[#2b4266] px-4 py-4 text-[11px]">
          <div className="flex items-center gap-2 rounded-md bg-[#1a3559] px-3 py-2"><Headset size={16} /><span>Customer Support<br /><small className="text-[#9eb3d0]">24/7 Operations Line</small></span><span className="ml-auto size-2 rounded-full bg-[#54d7a6]" /></div>
          <div className="flex items-center gap-2 px-2 text-[#b7c7df]"><Settings size={15} /> Settings</div>
          <div className="flex items-center gap-2 border-t border-[#2b4266] pt-3"><span className="flex size-7 items-center justify-center rounded-full bg-[#187a79]">BS</span><span>Budi Santoso<br /><small className="text-[#9eb3d0]">Akun demo</small></span></div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[264px]">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-[#e4e9f2] bg-white px-5 lg:px-7">
          <div className="flex items-center gap-3 text-[12px]">
            <button type="button" aria-label="Buka menu" className="lg:hidden" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
            <strong className="text-[#152544]">ANDIMA HRMS</strong><span className="text-[#b8c3d8]">|</span>
            <span className="hidden text-[#586782] sm:inline">HRMS&nbsp; / &nbsp;{current?.label ?? "D4"}</span>
          </div>
          <div className="flex items-center gap-3 text-[#697b99]"><Bell size={17} /><span className="flex size-7 items-center justify-center rounded-full bg-[#dff2eb] text-[10px] font-bold text-[#1e756d]">BS</span></div>
        </header>
        <main className="w-full px-4 py-6 sm:px-6 lg:px-7 lg:py-7">{children}</main>
      </div>
    </div>
  );
}
