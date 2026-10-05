"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CustomButton from "@/components/CustomButton";
import AuthShell, { inputClass, labelClass, PasswordInput } from "@/components/AuthShell";
import { createClient } from "@/utils/supabase/client";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Konfirmasi password tidak sama.");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    // No session = Supabase email confirmation is on.
    if (!data.session) {
      setSuccessMessage("Akun dibuat. Cek email Anda untuk verifikasi, lalu masuk.");
      return;
    }

    router.replace("/employees");
    router.refresh();
  };

  return (
    <AuthShell title="Buat Akun Baru" subtitle="Daftar untuk mengakses HRMS Andima.">
      <form id="register-form" data-testid="register-form" className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className={labelClass} htmlFor="fullName">
            Nama Lengkap
          </label>
          <input
            id="fullName"
            name="fullName"
            data-testid="input-fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            className={inputClass}
          />
        </div>

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
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="password">
            Password <span className="font-normal text-slate-500">(min. 8 karakter)</span>
          </label>
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="new-password" minLength={8} />
        </div>

        <div>
          <label className={labelClass} htmlFor="confirmPassword">
            Konfirmasi Password
          </label>
          <PasswordInput id="confirmPassword" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" minLength={8} />
        </div>

        {errorMessage && (
          <p id="register-error" data-testid="register-error" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {errorMessage}
          </p>
        )}
        {successMessage && (
          <p id="register-success" data-testid="register-success" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700" role="status">
            {successMessage}
          </p>
        )}

        <CustomButton id="btn-register" name="btn-register" data-testid="btn-register" type="submit" disabled={isLoading}>
          {isLoading ? "Memproses..." : "Daftar"}
        </CustomButton>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Sudah punya akun?{" "}
        <Link id="link-login" data-testid="link-login" href="/login" className="font-semibold text-[#1E3765] hover:underline">
          Masuk
        </Link>
      </p>
    </AuthShell>
  );
}
