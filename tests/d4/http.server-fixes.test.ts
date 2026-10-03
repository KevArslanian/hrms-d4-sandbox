import { describe, expect, it } from "vitest";
import { ApiError, field } from "@/modules/d4/server/_lib/http";

describe("field.score", () => {
  it.each([1, 3, 5])("accepts %d", (value) => expect(field.score(value, "Skor")).toBe(value));

  it.each([3.5, 0, 6, "4", Number.NaN])("rejects %s with VALIDATION_FAILED", (value) => {
    expect(() => field.score(value, "Skor")).toThrow(ApiError);
    expect(() => field.score(value, "Skor")).toThrow(/bilangan bulat 1 sampai 5/);
  });
});

describe("unsupported methods", () => {
  it("answer 405 with the standard envelope and an Allow header", async () => {
    const route = await import("@/app/api/d4/performance-evaluations/route");
    const res = await route.DELETE();
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("GET, POST");
    expect(await res.json()).toEqual({ error: { code: "METHOD_NOT_ALLOWED", message: expect.any(String) } });
  });
});
