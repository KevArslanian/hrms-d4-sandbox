import { describe, expect, it, vi } from "vitest";
import { handle } from "@/modules/d4/server/_lib/http";

// Every message the Supabase repository throws must map to a client status, never a bare 500.
const fail = (message: string) => handle(async () => { throw new Error(message); });

describe("handle() error classification", () => {
  it.each([
    ["Periode penilaian wajib dipilih.", 422],
    ["Penilaian harus memiliki lima indikator KPI.", 422],
    ["Posisi employee tidak tersedia.", 422],
    ["Employee atau posisi tidak tersedia.", 422],
    ["Tanggal berlaku tidak valid.", 422],
    ["Persyaratan kompetensi posisi belum tersedia.", 422],
    ["Employee tidak tersedia.", 422],
    ["Referensi sumber tidak sesuai employee atau belum tersedia.", 422],
    ["Hasil wajib diisi saat training selesai.", 422],
    ["Sesi login Supabase tidak tersedia.", 401],
    ["Akun sudah masuk, tetapi belum diberi akses data HRMS.", 403],
    ['Simpan evaluasi: new row violates row-level security policy for table "x"', 403],
    ["Riwayat training: JSON object requested, multiple (or no) rows returned", 500],
    ["fetch failed", 503],
  ])("%s → %i", async (message, status) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await fail(message)).status).toBe(status);
  });

  it("never leaks database details on a server error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const body = await (await fail('insert: duplicate key value violates unique constraint "d4_x_pkey"')).json();
    expect(body.error.code).toBe("SERVER_ERROR");
    expect(body.error.message).not.toMatch(/d4_x|constraint/);
  });

  it("strips the repository label from validation messages", async () => {
    const body = await (await fail("Simpan KPI: Periode penilaian wajib dipilih.")).json();
    expect(body.error.message).toBe("Periode penilaian wajib dipilih.");
  });
});
