import { AuthApiError, AuthRetryableFetchError, createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { loginErrorMessage } from "@/lib/loginErrorMessage";

const UNREACHABLE = { message: "Tidak dapat menghubungi server login. Coba lagi.", countsAsAttempt: false };

// D4-FN-02: only a real credential check costs an attempt; an unreachable server or the Supabase rate limit does not.
describe("loginErrorMessage", () => {
  it("reports an unreachable login server without costing an attempt", () => {
    expect(loginErrorMessage(new AuthRetryableFetchError("Failed to fetch", 0))).toEqual(UNREACHABLE);
    expect(loginErrorMessage(new AuthRetryableFetchError("Service Unavailable", 503))).toEqual(UNREACHABLE);
    expect(loginErrorMessage(new TypeError("Failed to fetch"))).toEqual(UNREACHABLE); // thrown instead of returned
  });

  it("reports the Supabase rate limit without costing an attempt", () => {
    expect(loginErrorMessage(new AuthApiError("Request rate limit reached", 429, "over_request_rate_limit")))
      .toEqual({ message: "Terlalu banyak percobaan. Coba lagi nanti.", countsAsAttempt: false });
  });

  it("keeps the credential messages", () => {
    expect(loginErrorMessage(new AuthApiError("Invalid login credentials", 400, "invalid_credentials")))
      .toEqual({ message: "Email atau password salah.", countsAsAttempt: true });
    expect(loginErrorMessage(new AuthApiError("Email not confirmed", 400, "email_not_confirmed")).message)
      .toBe("Email belum dikonfirmasi. Selesaikan konfirmasi melalui email terlebih dahulu.");
  });

  // The audit's root cause: supabase-js returns a network failure in { error } instead of throwing it.
  it("maps what signInWithPassword returns when nothing listens on the auth URL", async () => {
    const client = createClient("http://127.0.0.1:1", "test-anon-key", { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await client.auth.signInWithPassword({ email: "uji@andima.co.id", password: "Rahasia-123!" });
    expect(error).not.toBeNull();
    expect(loginErrorMessage(error)).toEqual(UNREACHABLE);
  });
});
