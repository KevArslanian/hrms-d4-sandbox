import type { KpiDefinition, KpiRecord } from "./types";

const financePositionId = "d4000000-0000-4000-8000-000000000008";

/** Exact five KPI names and weights for this position from KPI Scorecard V5.1. */
export const kpiDefinitions: readonly KpiDefinition[] = [
  { id: "FIN-01", positionId: financePositionId, version: "V5.1", name: "Kecepatan Penerbitan Invoice (SLA < 24 jam)", weight: 25, targetExample: "100% SLA < 24 Jam" },
  { id: "FIN-02", positionId: financePositionId, version: "V5.1", name: "Akurasi Pembukuan Sistem & Krishand GL", weight: 25, targetExample: "100% Akurat" },
  { id: "FIN-03", positionId: financePositionId, version: "V5.1", name: "Ketepatan Waktu Pembayaran & Reimbursement", weight: 20, targetExample: "H+1 dari Approval" },
  { id: "FIN-04", positionId: financePositionId, version: "V5.1", name: "Efektivitas Collection/Penagihan Piutang", weight: 15, targetExample: "Piutang Macet < 5%" },
  { id: "FIN-05", positionId: financePositionId, version: "V5.1", name: "Kerapian Arsip Keuangan & Kepatuhan Pajak", weight: 15, targetExample: "Zero Denda, Arsip Rapi" },
];

/** Entirely fictional record for visual development. Scores happen to match the workbook sample. */
export const kpiFixtureRecords: readonly KpiRecord[] = [
  {
    id: "FIX-D4-KPI-001",
    source: "fixture",
    employeeId: "d4000000-0000-4000-8000-000000000009",
    positionId: financePositionId,
    period: "2026-09",
    definitionVersion: "V5.1",
    lines: [
      { definitionId: "FIN-01", name: kpiDefinitions[0].name, weight: 25, target: kpiDefinitions[0].targetExample, realization: "Contoh: 96%", rawScore: 4, weightedScore: 1 },
      { definitionId: "FIN-02", name: kpiDefinitions[1].name, weight: 25, target: kpiDefinitions[1].targetExample, realization: "Contoh: 100%", rawScore: 5, weightedScore: 1.25 },
      { definitionId: "FIN-03", name: kpiDefinitions[2].name, weight: 20, target: kpiDefinitions[2].targetExample, realization: "Contoh: H+1", rawScore: 4, weightedScore: 0.8 },
      { definitionId: "FIN-04", name: kpiDefinitions[3].name, weight: 15, target: kpiDefinitions[3].targetExample, realization: "Contoh: 4%", rawScore: 3, weightedScore: 0.45 },
      { definitionId: "FIN-05", name: kpiDefinitions[4].name, weight: 15, target: kpiDefinitions[4].targetExample, realization: "Contoh: lengkap", rawScore: 4, weightedScore: 0.6 },
    ],
    totalScore: 4.1,
    createdAt: "2026-09-01T09:00:00.000Z",
    actor: "Fixture D4",
  },
];
