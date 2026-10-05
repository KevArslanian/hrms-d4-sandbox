"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CustomButton from "@/components/CustomButton";
import AuthShell, { inputClass, labelClass, PasswordInput } from "@/components/AuthShell";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMessage("Email atau password tidak valid.");
      setIsLoading(false);
      return;
    }

    router.replace("/employees");
    router.refresh();
  };

  return (
    <AuthShell title="Selamat Datang Kembali" subtitle="Masuk ke HRMS Andima dengan akun Anda.">
      <form id="login-form" data-testid="login-form" className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className={labelClass} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            data-testid="input-email"
            type="email"
            autoComplete="email"
            placeholder="nama@andima.co.id"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="password">
            Password
          </label>
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>

        {errorMessage && (
          <p id="login-error" data-testid="login-error" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {errorMessage}
          </p>
        )}

        <CustomButton id="btn-login" name="btn-login" data-testid="btn-login" type="submit" disabled={isLoading}>
          {isLoading ? "Memproses..." : "Masuk"}
        </CustomButton>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Belum punya akun?{" "}
        <Link id="link-register" data-testid="link-register" href="/register" className="font-semibold text-[#1E3765] hover:underline">
          Daftar
        </Link>
      </p>
    </AuthShell>
  );
}
