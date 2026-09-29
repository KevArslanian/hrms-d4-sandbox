"use client";

import { type FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import styles from "@/components/auth/auth.module.css";
import { createD4BrowserClient, hasSupabaseConfig } from "@/modules/d4/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const configError = hasSupabaseConfig() ? "" : "Konfigurasi Supabase belum tersedia. Isi .env.local sesuai .env.example.";

  useEffect(() => {
    let active = true;
    if (!hasSupabaseConfig()) return;
    void createD4BrowserClient().auth.getUser().then(({ data }) => {
      if (active && data.user) router.replace("/dashboard");
    });
    return () => { active = false; };
  }, [router]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error: authError } = await createD4BrowserClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError("Email atau kata sandi tidak valid.");
        return;
      }
      setPassword("");
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Login belum dapat diproses. Coba lagi nanti.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className={styles.title}>Good Evening</h1>
      <p className={styles.subtitle}>Masuk dengan akun terdaftar untuk mengakses HRMS.</p>
      <form className={styles.form} onSubmit={signIn}>
        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="password">Password</label>
          <div className={styles.passwordField}>
            <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <button type="button" className={styles.visibilityButton} aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
              {showPassword ? <Eye size={24} aria-hidden="true" /> : <Image src="/auth/visibility-off.svg" width={32} height={32} alt="" aria-hidden="true" />}
            </button>
          </div>
        </div>
        <button className={styles.submitButton} type="submit" disabled={busy}>{busy ? "MEMPROSES..." : "LOGIN"}</button>
      </form>
      {(error || configError) && <p className={styles.formError} role="alert">{error || configError}</p>}
      <p className={styles.accountSwitch}>Belum punya akses? Hubungi admin HRMS.</p>
      <div className={styles.accountNote}>
        <strong>Akses HRMS</strong>
        <span>Gunakan email dan kata sandi akun Anda.</span>
      </div>
    </AuthLayout>
  );
}
