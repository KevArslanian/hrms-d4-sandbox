import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SupabaseD4Repository } from "@/modules/d4/supabase/repository";

// Route handlers use the caller's Supabase session cookie, so every query is
// still limited by the D4 RLS policies (read: HR/MANAGER or own record,
// insert: HR/MANAGER only).
export async function d4Session() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new ApiError(500, "Konfigurasi Supabase belum tersedia.");
  const cookieStore = await cookies();
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => {
        try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* read-only in some contexts */ }
      },
    },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new ApiError(401, "Sesi login Supabase tidak tersedia.");
  return { client, repository: new SupabaseD4Repository(client) };
}

export async function d4Repository() {
  return (await d4Session()).repository;
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function statusFor(message: string): number {
  if (/sesi login/i.test(message)) return 401;
  if (/row-level security|permission denied|belum diberi akses/i.test(message)) return 403;
  if (/tidak ditemukan|not found/i.test(message)) return 404;
  return 400;
}

export async function handle(run: () => Promise<unknown>, successStatus = 200) {
  try {
    const data = await run();
    return NextResponse.json({ data }, { status: successStatus });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Permintaan gagal diproses.";
    const status = cause instanceof ApiError ? cause.status : statusFor(message);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function readJson<T>(request: Request): Promise<T> {
  try { return await request.json() as T; } catch { throw new ApiError(400, "Body harus berupa JSON yang valid."); }
}

export function filterByEmployee<T extends { employeeId: string }>(rows: readonly T[] | undefined, request: Request): T[] {
  const employeeId = new URL(request.url).searchParams.get("employee_id");
  const all = [...(rows ?? [])];
  return employeeId ? all.filter((row) => row.employeeId === employeeId) : all;
}
