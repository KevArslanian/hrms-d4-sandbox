import { NextResponse } from "next/server";

export type ErrorCode = "BAD_REQUEST" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_FAILED" | "INTEGRATION_ERROR" | "SERVER_ERROR";

const statusByCode: Record<ErrorCode, number> = {
  BAD_REQUEST: 400, VALIDATION_FAILED: 422, UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, SERVER_ERROR: 500, INTEGRATION_ERROR: 503,
};

/** An error whose message is safe to show to the user. */
export class ApiError extends Error {
  constructor(readonly code: ErrorCode, message: string) { super(message); }
  get status() { return statusByCode[this.code]; }
}

// Repository and database messages are mapped to a code; anything unrecognised
// becomes a generic message so SQL details and stack traces never reach the client (TR-17).
function classify(message: string): ApiError {
  if (/fetch failed|ECONNREFUSED|ECONNRESET|ENOTFOUND|ETIMEDOUT|network ?error|timed? ?out/i.test(message)) return new ApiError("INTEGRATION_ERROR", "Layanan data HRMS sedang tidak dapat dihubungi. Coba lagi beberapa saat lagi.");
  if (/sesi login/i.test(message)) return new ApiError("UNAUTHENTICATED", "Sesi login tidak tersedia. Silakan masuk kembali.");
  if (/row-level security|permission denied|belum diberi akses/i.test(message)) return new ApiError("FORBIDDEN", "Akun ini tidak memiliki izin untuk tindakan tersebut.");
  if (/tidak ditemukan|not found/i.test(message)) return new ApiError("NOT_FOUND", message);
  if (/wajib|harus|tidak valid|tidak sesuai|belum tersedia|belum lengkap/i.test(message)) return new ApiError("VALIDATION_FAILED", message.replace(/^[^:]+:\s*/, ""));
  return new ApiError("SERVER_ERROR", "Permintaan gagal diproses. Coba lagi beberapa saat lagi.");
}

/** Wraps a handler in the standard `{ data }` / `{ error: { code, message } }` envelope. */
export async function handle(run: () => Promise<unknown>, successStatus = 200) {
  try {
    return NextResponse.json({ data: await run() }, { status: successStatus });
  } catch (cause) {
    const error = cause instanceof ApiError ? cause : classify(cause instanceof Error ? cause.message : "");
    if (error.code === "SERVER_ERROR" || error.code === "INTEGRATION_ERROR") console.error("[d4-api]", cause);
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try { body = await request.json(); } catch { throw new ApiError("BAD_REQUEST", "Body harus berupa JSON yang valid."); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError("BAD_REQUEST", "Body harus berupa objek JSON.");
  return body as Record<string, unknown>;
}

// Small field readers so every endpoint validates input the same way before touching the database (TR-19).
export const field = {
  text(body: Record<string, unknown>, key: string, { required = true, max = 2000 } = {}): string {
    const value = body[key];
    if (value === undefined || value === null || value === "") {
      if (required) throw new ApiError("VALIDATION_FAILED", `Field ${key} wajib diisi.`);
      return "";
    }
    if (typeof value !== "string") throw new ApiError("VALIDATION_FAILED", `Field ${key} harus berupa teks.`);
    if (value.length > max) throw new ApiError("VALIDATION_FAILED", `Field ${key} maksimal ${max} karakter.`);
    return value;
  },
  uuid(body: Record<string, unknown>, key: string): string {
    const value = field.text(body, key);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new ApiError("VALIDATION_FAILED", `Field ${key} harus berupa UUID.`);
    return value;
  },
  oneOf<T extends string>(body: Record<string, unknown>, key: string, options: readonly T[]): T {
    const value = field.text(body, key);
    if (!options.includes(value as T)) throw new ApiError("VALIDATION_FAILED", `Field ${key} harus salah satu dari: ${options.join(", ")}.`);
    return value as T;
  },
  period(body: Record<string, unknown>, key: string): string {
    const value = field.text(body, key);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new ApiError("VALIDATION_FAILED", `Field ${key} harus berformat YYYY-MM.`);
    return value;
  },
  date(body: Record<string, unknown>, key: string, { required = true } = {}): string {
    const value = field.text(body, key, { required });
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ApiError("VALIDATION_FAILED", `Field ${key} harus berformat YYYY-MM-DD.`);
    return value;
  },
  score(value: unknown, label: string, { required = true } = {}): number | null {
    if (value === null || value === undefined || value === "") {
      if (required) throw new ApiError("VALIDATION_FAILED", `${label} wajib diisi.`);
      return null;
    }
    if (typeof value !== "number" || !Number.isFinite(value) || value < 1 || value > 5) throw new ApiError("VALIDATION_FAILED", `${label} harus antara 1 dan 5.`);
    return value;
  },
};

export function employeeFilter(request: Request): string | null {
  return new URL(request.url).searchParams.get("employee_id");
}
