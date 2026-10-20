import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// D4-SEC-01: the lockout lived in React state, so a refresh reset it, and it claimed the account was blocked. The real
// limit is the Supabase rate limit (429, shown by loginErrorMessage), so the page keeps no counter of its own.
describe("login page", () => {
  const source = readFileSync(fileURLToPath(new URL("../../app/login/page.tsx", import.meta.url)), "utf8");

  it("claims no blocked account and keeps no local attempt counter", () => {
    expect(source).not.toMatch(/blocked/i);
    expect(source).not.toMatch(/loginAttempts|handleFailedAttempt|Remaining attempts|Please wait/);
  });
});
