"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ClipboardList,
  Headset,
  LayoutDashboard,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

const links = [
  { href: "/performance", label: "Performance & KPI", module: "performance" },
  { href: "/competency", label: "Competency Needs", module: "competency" },
  { href: "/training", label: "Training Tracking", module: "training" },
  { href: "/dashboard", label: "KPI Dashboard", module: "dashboard" },
];

function moduleForPath(pathname: string) {
  if (pathname.startsWith("/performance") || pathname.startsWith("/kpi")) return "performance";
  if (pathname.startsWith("/competency") || pathname.startsWith("/development")) return "competency";
  if (pathname.startsWith("/training")) return "training";
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/employee/")) return "dashboard";
  return "";
}

export function D4Shell({ children, live = false, activeModule, navigationEnabled = true }: {
  children: ReactNode;
  live?: boolean;
  activeModule?: string;
  navigationEnabled?: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const selectedModule = activeModule ?? moduleForPath(pathname);
  const current = links.find((link) => link.module === selectedModule);
  const currentLabel = live && selectedModule === "dashboard" ? "People Dashboard" : current?.label;

  return (
    <div className={`min-h-screen text-[#192b4c] ${live ? "bg-[#f6f8fc]" : "bg-white"}`}>
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
          <Link href={live ? "/live" : "/"} className="flex items-center gap-3" onClick={() => setMenuOpen(false)}>
            <span className={`flex size-9 items-center justify-center rounded-lg text-sm font-extrabold ${live ? "bg-[#3b6ff5]" : "bg-[#08a99d]"}`}>A</span>
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
          <div className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold ${live ? "bg-[#1b3458]" : "bg-[#078f8b]"}`}>
            <span className="flex items-center gap-3"><Users size={16} /> HRMS</span><ChevronDown size={16} />
          </div>
          <div className="ml-4 space-y-1 border-l border-[#31476b] pl-2 pt-1">
            {links.map(({ href, label, module }) => {
              const displayLabel = live && module === "dashboard" ? "People Dashboard" : label;
              const destination = live ? `/live?module=${module}` : href;
              const active = selectedModule === module && navigationEnabled;
              const className = `flex items-center gap-2 rounded-md px-3 py-2 text-[12px] transition-colors ${active ? live ? "bg-[#3b6ff5] font-semibold text-white" : "bg-[#d6f5f3] font-semibold text-[#087b7a]" : "text-[#b7c7df] hover:bg-[#1a345a] hover:text-white"}`;
              if (!navigationEnabled) return <span key={href} aria-disabled="true" className="flex cursor-not-allowed items-center gap-2 rounded-md px-3 py-2 text-[12px] text-[#7183a0]"><span aria-hidden="true">•</span>{displayLabel}</span>;
              return (
                <Link
                  key={href}
                  href={destination}
                  onClick={() => setMenuOpen(false)}
                  className={className}
                  aria-current={active ? "page" : undefined}
                >
                  <span aria-hidden="true">•</span>{displayLabel}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-[#b9c9e2]"><ClipboardList size={16} /> MID</div>
        </nav>

        <div className="space-y-3 border-t border-[#2b4266] px-4 py-4 text-[11px]">
          <div className="flex items-center gap-2 rounded-md bg-[#1a3559] px-3 py-2"><Headset size={16} /><span>Customer Support<br /><small className="text-[#9eb3d0]">24/7 Operations Line</small></span><span className="ml-auto size-2 rounded-full bg-[#54d7a6]" /></div>
          <div className="flex items-center gap-2 px-2 text-[#b7c7df]"><Settings size={15} /> Settings</div>
          <div className="flex items-center gap-2 border-t border-[#2b4266] pt-3"><span className="flex size-7 items-center justify-center rounded-full bg-[#187a79]">{live ? "D4" : "BS"}</span><span>{live ? "Data Supabase" : "Budi Santoso"}<br /><small className="text-[#9eb3d0]">{live ? "Sesuai hak akses akun" : "Akun demo"}</small></span></div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[264px]">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-[#e4e9f2] bg-white px-5 lg:px-7">
          <div className="flex items-center gap-3 text-[12px]">
            <button type="button" aria-label="Buka menu" className="lg:hidden" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
            <strong className="text-[#152544]">ANDIMA HRMS</strong><span className="text-[#b8c3d8]">|</span>
            <span className="hidden text-[#586782] sm:inline">HRMS&nbsp; / &nbsp;{currentLabel ?? "D4"}</span>
          </div>
          <div className="flex items-center gap-3 text-[#697b99]"><Bell size={17} /><span className="flex size-7 items-center justify-center rounded-full bg-[#dff2eb] text-[10px] font-bold text-[#1e756d]">{live ? "D4" : "BS"}</span></div>
        </header>
        <main className="w-full px-4 py-6 sm:px-6 lg:px-7 lg:py-7">{children}</main>
      </div>
    </div>
  );
}
