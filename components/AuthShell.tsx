"use client";

import { useState } from "react";
import Image from "next/image";

// Split layout from Figma PISD "Login" frame (1815:2898): navy brand panel + form card.
export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen font-sans" data-testid="auth-page">
      <aside className="hidden w-[60%] flex-col justify-between bg-[#1E3765] p-12 text-white md:flex">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-white p-1.5"><Image src="/andima-logo.png" alt="Logo Andima" width={56} height={38} priority data-testid="auth-logo-brand" /></span>
          <div>
            <p className="text-3xl font-bold leading-none tracking-wide">ANDIMA</p>
            <p className="text-sm text-white/70">HRMS</p>
          </div>
        </div>
        <p className="max-w-sm text-white/70">Human Resource Management System PT Andima.</p>
      </aside>

      <section className="flex flex-1 flex-col items-center justify-center bg-white p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-8">
          <Image src="/andima-logo.png" alt="Logo Andima" width={70} height={48} className="mb-4 md:hidden" priority data-testid="auth-logo" />
          <h1 className="text-2xl font-bold text-slate-900" data-testid="auth-title">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
          {children}
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">Akses aman untuk tim Andima. Hanya personel berwenang.</p>
      </section>
    </main>
  );
}

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 outline-none transition focus:border-[#1E3765] focus:ring-1 focus:ring-[#1E3765]";
export const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

// Plain <input> with stable id/name/data-testid: Katalon "Set Text" works on it directly.
export function PasswordInput({ id, value, onChange, autoComplete, minLength }: { id: string; value: string; onChange: (value: string) => void; autoComplete: string; minLength?: number }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={id}
        data-testid={`input-${id}`}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        minLength={minLength}
        className={`${inputClass} pr-20`}
      />
      <button
        type="button"
        id={`toggle-${id}`}
        data-testid={`toggle-${id}`}
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-3 text-xs font-semibold text-[#1E3765]"
      >
        {visible ? "Sembunyikan" : "Tampilkan"}
      </button>
    </div>
  );
}
