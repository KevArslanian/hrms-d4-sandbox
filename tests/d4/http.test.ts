import { describe, expect, it, vi } from "vitest";
import { ApiError, handle } from "@/modules/d4/server/_lib/http";

// The status comes from the typed error code, never from the message text.
const fail = (error: Error) => handle(async () => { throw error; });

describe("handle() error mapping", () => {
  it.each([
    ["BAD_REQUEST", 400],
    ["UNAUTHENTICATED", 401],
    ["FORBIDDEN", 403],
    ["NOT_FOUND", 404],
    ["VALIDATION_FAILED", 422],
    ["INTEGRATION_ERROR", 503],
    ["SERVER_ERROR", 500],
  ] as const)("%s → %i", async (code, status) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await fail(new ApiError(code, "Pesan uji."));
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ error: { code, message: "Pesan uji." } });
  });

  it("does not guess a status from an untyped message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await fail(new Error("Periode penilaian wajib dipilih."))).status).toBe(500);
  });

  it("maps a transport failure to 503", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await fail(new Error("fetch failed"))).status).toBe(503);
  });

  it("never leaks database details on a server error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const body = await (await fail(new Error('insert: violates check constraint "d4_x_check"'))).json();
    expect(body.error.code).toBe("SERVER_ERROR");
    expect(body.error.message).not.toMatch(/d4_x|constraint/);
  });
});
