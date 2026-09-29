"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";

const links = [
  { href: "/performance", label: "Performance & KPI", module: "performance" },
  { href: "/competency", label: "Competency Needs", module: "competency" },
  { href: "/training", label: "Training Tracking", module: "training" },
  { href: "/dashboard", label: "People Dashboard", module: "dashboard" },
];

function moduleForPath(pathname: string) {
  if (pathname.startsWith("/performance") || pathname.startsWith("/kpi")) return "performance";
  if (pathname.startsWith("/competency") || pathname.startsWith("/development")) return "competency";
  if (pathname.startsWith("/training")) return "training";
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/employee/")) return "dashboard";
  return "";
}

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  return <Image src={`/figma/d4/${name}.svg`} alt="" aria-hidden="true" width={size} height={size} />;
}

type SearchPerson = { id: string; fullName: string; employeeId: string };
export function D4Shell({ children, live = false, activeModule, navigationEnabled = true, accountName, accountRole, onSignOut, people = [] }: {
  children: ReactNode;
  live?: boolean;
  activeModule?: string;
  navigationEnabled?: boolean;
  accountName?: string;
  accountRole?: string;
  onSignOut?: () => void;
  people?: readonly SearchPerson[];
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const selectedModule = activeModule ?? moduleForPath(pathname);
  const currentLabel = links.find((link) => link.module === selectedModule)?.label;
  const initials = accountName?.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("") || "D4";
  const matches = people.filter((person) => `${person.fullName} ${person.employeeId}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).slice(0, 5);

  return <div className={`min-h-screen text-[#192b4c] ${live && selectedModule !== "dashboard" ? "bg-[#f6f8fc]" : "bg-white"}`}>
    {menuOpen && <button type="button" aria-label="Tutup menu" className="fixed inset-0 z-30 bg-[#0d203e]/50 lg:hidden" onClick={() => setMenuOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[261px] flex-col bg-[#0f2342] text-white transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex min-h-[88px] items-start justify-between gap-3 border-b border-[#1e3765]/60 px-5 py-5">
        <Link href={live ? "/live" : "/"} className="flex items-start gap-3" onClick={() => setMenuOpen(false)}>
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#3b6ff5]"><Icon name="logo" size={20} /></span>
          <span><strong className="block text-sm leading-5 tracking-[0.7px]">ANDIMA</strong><span className="block text-xs leading-4">TRANSPORTINDO</span><small className="block text-[7px] tracking-[0.6px] text-[#94a3b8]">ENTERPRISE DIGITAL ECOSYSTEM</small></span>
        </Link>
        <button type="button" aria-label="Tutup menu" className="mt-1 lg:hidden" onClick={() => setMenuOpen(false)}><X size={19} /></button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 text-xs text-[#cbd5e1]" aria-label="Navigasi D4">
        <p className="mb-2 px-3 text-[9px] font-semibold tracking-[1px] text-[#64748b]">MAIN</p>
        <div className="mb-6 flex items-center gap-3 rounded-lg px-3 py-2"><Icon name="dashboard" />General Dashboard</div>
        <p className="mb-2 px-3 text-[9px] font-semibold tracking-[1px] text-[#64748b]">BUSINESS MODULE</p>
        <div className="flex items-center gap-3 px-3 py-2"><Icon name="pos" />POS</div>
        <div className="flex items-center gap-3 px-3 py-2"><Icon name="crm" />CRM</div>
        <div className="mt-1 flex items-center justify-between px-3 py-2 font-semibold text-white"><span className="flex items-center gap-3"><Icon name="hrms" />HRMS</span><span className="rotate-180"><Icon name="chevron" size={14} /></span></div>
        <div className="ml-10 space-y-0.5 border-l border-[#1e3765] pl-4">
          {links.map(({ href, label, module }) => {
            const destination = live ? `/live?module=${module}` : href;
            const active = selectedModule === module && navigationEnabled;
            const className = `flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[11px] ${active ? "bg-[#3b6ff5] font-semibold text-white" : "text-[#cbd5e1] hover:bg-[#1a345a] hover:text-white"}`;
            return navigationEnabled ? <Link key={href} href={destination} onClick={() => setMenuOpen(false)} className={className} aria-current={active ? "page" : undefined}>{label}{active && <span aria-hidden="true" className="size-1.5 rounded-full bg-white" />}</Link> : <span key={href} aria-disabled="true" className="block px-2.5 py-1.5 text-[11px] text-[#7183a0]">{label}</span>;
          })}
        </div>
        <div className="mt-2 flex items-center gap-3 px-3 py-2"><Icon name="mid" />MID</div>
        <p className="mb-2 mt-6 px-3 text-[9px] font-semibold tracking-[1px] text-[#64748b]">SYSTEM</p>
        <div className="flex items-center gap-3 px-3 py-2"><Icon name="settings" />Settings</div>
      </nav>
      <div className="p-3"><div className="flex items-center gap-2.5 rounded-lg border border-[#25426e] bg-[#1a2f50]/80 p-3"><span className="flex size-7 items-center justify-center rounded-md bg-[#25426e]"><Icon name="support" /></span><span className="text-[10px] font-semibold text-[#e2e8f0]">Customer Support<small className="block text-[9px] font-normal text-[#64748b]">24/7 Operations Line</small></span></div></div>
    </aside>
    <div className="min-h-screen lg:pl-[261px]">
      <header className="flex h-16 items-center justify-between gap-3 border-b border-[#e5eaf0] bg-white px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <div className="flex items-center gap-2 text-xs"><button type="button" aria-label="Buka menu" className="mr-1 lg:hidden" onClick={() => setMenuOpen(true)}><Menu size={21} /></button><strong className="whitespace-nowrap text-[#172033]">ANDIMA HRMS</strong><span className="hidden text-[#cbd5e1] sm:inline">/</span><span className="hidden whitespace-nowrap text-[#64748b] sm:inline">HRMS</span><span className="hidden text-[#cbd5e1] sm:inline">/</span><span className="hidden whitespace-nowrap font-semibold text-[#16a37a] sm:inline">{currentLabel ?? "D4"}</span></div>
          <div className="relative hidden xl:block" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false); }}>
            <span className="pointer-events-none absolute left-3 top-2"><Icon name="search" size={14} /></span>
            <input aria-label="Cari pegawai" value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setSearchOpen(true)} onKeyDown={(event) => { if (event.key === "Escape") setSearchOpen(false); }} disabled={!navigationEnabled} placeholder="Cari pegawai atau ID..." className="h-8 w-[320px] rounded-full border border-[#e5eaf0] bg-[#f4f6fa] pl-9 pr-3 text-xs text-[#334766] outline-none placeholder:text-[#94a3b8] focus:border-[#3b6ff5]" />
            {searchOpen && query.trim() && <div className="absolute left-0 top-10 z-50 w-full rounded-lg border border-[#e5eaf0] bg-white p-1 shadow-lg">{matches.length ? matches.map((person) => <Link key={person.id} href={live ? `/live?module=performance&view=detail&employee=${encodeURIComponent(person.id)}` : `/employee/${encodeURIComponent(person.id)}`} onClick={() => { setQuery(""); setSearchOpen(false); }} className="block rounded px-3 py-2 text-xs hover:bg-[#f4f6fa]"><strong className="block">{person.fullName}</strong><span className="text-[#64748b]">{person.employeeId}</span></Link>) : <p className="px-3 py-2 text-xs text-[#64748b]">Tidak ada pegawai yang cocok.</p>}</div>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-[#697b99]"><Icon name="bell" /><div className="flex items-center gap-2 border-l border-[#e5eaf0] pl-3"><span className="flex size-7 items-center justify-center rounded-full border border-[#16a37a]/30 bg-[#eaf7f0] text-[10px] font-semibold text-[#16a37a]">{initials}</span>{accountName && <span className="hidden max-w-40 md:block"><strong className="block truncate text-[11px] uppercase text-[#172033]">{accountName}</strong><small className="block text-[9px] text-[#94a3b8]">{accountRole}</small></span>}</div>{onSignOut && <button type="button" onClick={onSignOut} className="rounded-md px-1.5 py-1.5 text-xs font-semibold hover:bg-[#f4f6fa]">Keluar</button>}</div>
      </header>
      <main className="w-full px-4 py-6 sm:px-6">{children}</main>
    </div>
  </div>;
}
