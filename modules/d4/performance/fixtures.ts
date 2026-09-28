import type { EvaluationAspect, PerformanceEvaluation, ReviewStatus } from "./types";

const nadinAspects: readonly EvaluationAspect[] = [
  { name: "Work Quality", weight: 20, score: 4, notes: "Hasil kerja rapi dan konsisten." },
  { name: "Productivity", weight: 15, score: 4, notes: "Target kerja tercapai." },
  { name: "Accuracy", weight: 15, score: 4, notes: "Dokumen akurat." },
  { name: "Team Collaboration", weight: 15, score: 4, notes: "Komunikasi tim baik." },
  { name: "Initiative & Growth", weight: 10, score: 5, notes: "Aktif mengusulkan perbaikan." },
  { name: "Discipline", weight: 15, score: 4, notes: "Konsisten mengikuti proses." },
  { name: "Attendance", weight: 10, score: 5, notes: "Kehadiran baik." },
];

function sample(id: number, employee: number, score: number, reviewStatus: ReviewStatus): PerformanceEvaluation {
  return {
    id: `FIX-D4-PERF-00${id}`,
    source: "fixture",
    employeeId: `d4000000-0000-4000-8000-${String(employee).padStart(12, "0")}`,
    period: "2026-09",
    evaluationDate: "2026-09-20",
    evaluator: "Evaluator Demo D4",
    status: "completed",
    reviewStatus,
    overallScore: score,
    aspects: employee === 9 ? nadinAspects : [
      { name: "Work Quality", weight: 100, score: Math.round(score), notes: "Contoh evaluasi lokal." },
    ],
    generalNotes: employee === 9
      ? "Nadin menunjukkan performa kerja yang konsisten, inisiatif baik, dan kolaborasi tim yang kuat."
      : "Catatan evaluasi contoh untuk pengembangan antarmuka D4.",
    evidenceReference: null,
    createdAt: `2026-09-${String(20 + id).padStart(2, "0")}T09:00:00.000Z`,
    actor: "Fixture D4",
  };
}

export const performanceFixtureRecords: readonly PerformanceEvaluation[] = [
  sample(1, 9, 4.2, "Needs Review"),
  sample(2, 10, 4.1, "On Track"),
  sample(3, 11, 4.4, "On Track"),
  sample(4, 12, 3.8, "Needs Review"),
  sample(5, 13, 4.55, "On Track"),
  sample(6, 14, 3.4, "Needs Attention"),
  sample(7, 15, 4.05, "Needs Review"),
];
