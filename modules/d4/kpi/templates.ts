import type { KpiDefinition, KpiLineInput } from "./types";

/** Workbook V5.1 templates assigned to the Finance Staff and Sales Staff demo positions. */
export const kpiDefinitions: readonly KpiDefinition[] = [
  { id: "FIN-01", positionId: "d4000000-0000-4000-8000-000000000008", version: "V5.1", name: "Kecepatan Penerbitan Invoice (SLA < 24 jam)", weight: 25, targetExample: "100% SLA < 24 Jam" },
  { id: "FIN-02", positionId: "d4000000-0000-4000-8000-000000000008", version: "V5.1", name: "Akurasi Pembukuan Sistem & Krishand GL", weight: 25, targetExample: "100% Akurat" },
  { id: "FIN-03", positionId: "d4000000-0000-4000-8000-000000000008", version: "V5.1", name: "Ketepatan Waktu Pembayaran & Reimbursement", weight: 20, targetExample: "H+1 dari Approval" },
  { id: "FIN-04", positionId: "d4000000-0000-4000-8000-000000000008", version: "V5.1", name: "Efektivitas Collection/Penagihan Piutang", weight: 15, targetExample: "Piutang Macet < 5%" },
  { id: "FIN-05", positionId: "d4000000-0000-4000-8000-000000000008", version: "V5.1", name: "Kerapian Arsip Keuangan & Kepatuhan Pajak", weight: 15, targetExample: "Zero Denda, Arsip Rapi" },
  { id: "SAL-01", positionId: "d4000000-0000-4000-8000-000000000017", version: "V5.1", name: "Pencapaian Target Volume Penjualan", weight: 35, targetExample: "" },
  { id: "SAL-02", positionId: "d4000000-0000-4000-8000-000000000017", version: "V5.1", name: "Akuisisi Klien Baru", weight: 25, targetExample: "" },
  { id: "SAL-03", positionId: "d4000000-0000-4000-8000-000000000017", version: "V5.1", name: "Akurasi Pemberian Quotation/Penawaran Harga", weight: 15, targetExample: "" },
  { id: "SAL-04", positionId: "d4000000-0000-4000-8000-000000000017", version: "V5.1", name: "Win Rate dari Total Quotation", weight: 15, targetExample: "" },
  { id: "SAL-05", positionId: "d4000000-0000-4000-8000-000000000017", version: "V5.1", name: "Kualitas Serah Terima Order ke Operasional", weight: 10, targetExample: "" },
];

export function definitionsForPosition(positionId: string): readonly KpiDefinition[] {
  return kpiDefinitions.filter((item) => item.positionId === positionId);
}

/** A live UUID is not a fixture UUID; only these explicit demo position titles are mapped. */
export function definitionsForPositionTitle(title: string): readonly KpiDefinition[] {
  const fixtureId = title === "Finance Staff" ? "d4000000-0000-4000-8000-000000000008"
    : title === "Sales Staff" ? "d4000000-0000-4000-8000-000000000017" : null;
  return fixtureId ? definitionsForPosition(fixtureId) : [];
}

export function prepareKpiLinesForDefinitions(definitions: readonly KpiDefinition[], inputLines: readonly KpiLineInput[]) {
  if (definitions.length !== 5 || definitions.reduce((sum, item) => sum + item.weight, 0) !== 100) throw new Error("Definisi KPI posisi belum lengkap atau bobot bukan 100%.");
  return definitions.map((definition) => {
    const item = inputLines.find((line) => line.definitionId === definition.id);
    if (!item || !item.target.trim() || !item.realization.trim()) throw new Error(`Target dan realisasi ${definition.name} wajib diisi.`);
    if (item.rawScore === null || !Number.isInteger(item.rawScore) || item.rawScore < 1 || item.rawScore > 5) throw new Error(`Skor mentah ${definition.name} harus bilangan 1 sampai 5.`);
    return { definitionId: definition.id, name: definition.name, weight: definition.weight, target: item.target.trim(), realization: item.realization.trim(), rawScore: item.rawScore, weightedScore: (definition.weight / 100) * item.rawScore };
  });
}

export function prepareKpiLines(positionId: string, inputLines: readonly KpiLineInput[]) {
  return prepareKpiLinesForDefinitions(definitionsForPosition(positionId), inputLines);
}
