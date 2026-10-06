import type { DevelopmentNeedVersion, DevelopmentPriority, DevelopmentSourceType, DevelopmentStatus } from "./types";

const employee = (n: number) => `d4000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const requirement = employee;

type Need = { no: number; employeeNo: number; sourceType: DevelopmentSourceType; sourceRef: string; objective: string; priority: DevelopmentPriority; actor: string };

/** One need with its revisions (oldest first); each status change is a new revision, never an overwrite. */
function need({ no, employeeNo, sourceType, sourceRef, objective, priority, actor }: Need, steps: [DevelopmentStatus, string, string][]): DevelopmentNeedVersion[] {
  const needId = `FIX-D4-DEV-${String(no).padStart(3, "0")}`;
  return steps.map(([status, notes, createdAt], index) => ({
    id: `FIX-D4-DEV-V${index + 1}-${String(no).padStart(3, "0")}`, needId, revision: index + 1, source: "fixture",
    employeeId: employee(employeeNo), sourceType, sourceRef, objective, priority, status, notes, createdAt, actor,
  }));
}

/** Manual, fictional needs. No automatic recommendation or training assignment. */
export const developmentFixtureVersions: readonly DevelopmentNeedVersion[] = [
  ...need({ no: 1, employeeNo: 9, sourceType: "competency_gap", sourceRef: requirement(28), priority: "High", actor: "Mercury",
    objective: "Meningkatkan akurasi dokumen worksheet (level 2 → 4) agar Job Number dan data siap tagih tidak perlu revisi." }, [
    ["Identified", "Gap dari assessment 21 Sep 2026: worksheet AENAT/2609/0354 direvisi dua kali.", "2026-09-24T09:00:00.000Z"],
  ]),
  ...need({ no: 2, employeeNo: 11, sourceType: "competency_gap", sourceRef: requirement(31), priority: "Medium", actor: "Mercury",
    objective: "Memperkuat penyiapan data siap tagih (reimbursement, RA CMU, warehouse) agar job tidak tertahan billing." }, [
    ["Identified", "Gap dari assessment 21 Sep 2026.", "2026-09-22T09:00:00.000Z"],
    ["Planned", "Disepakati dengan Sales Executive 2; training dijadwalkan Oktober.", "2026-09-23T09:00:00.000Z"],
  ]),
  ...need({ no: 3, employeeNo: 14, sourceType: "competency_gap", sourceRef: requirement(28), priority: "Medium", actor: "Romeo",
    objective: "Menutup gap akurasi worksheet (level 3 → 4), terutama Gross/Chargeable Weight." }, [
    ["Identified", "Gap dari assessment 21 Sep 2026.", "2026-09-22T10:00:00.000Z"],
    ["Planned", "Pelatihan ERP internal dipilih.", "2026-09-24T10:00:00.000Z"],
    ["In Progress", "Sesi pertama pelatihan berjalan.", "2026-09-29T10:00:00.000Z"],
  ]),
  ...need({ no: 4, employeeNo: 10, sourceType: "role_change", sourceRef: "FIX-D4-COMP-ASSESS-RC-010", priority: "Medium", actor: "Mercury",
    objective: "Menyiapkan Bravo untuk peran Sales Executive: manajemen akun pelanggan level 4." }, [
    ["Identified", "Hasil Assess Position Change ke Sales Executive (posisi tidak diubah).", "2026-09-26T09:00:00.000Z"],
  ]),
  ...need({ no: 5, employeeNo: 55, sourceType: "competency_gap", sourceRef: requirement(33), priority: "High", actor: "Mercury",
    objective: "Meningkatkan ketepatan penerbitan dan revisi invoice sesuai SLA < 24 jam." }, [
    ["Identified", "Gap dari assessment: invoice 26 28597A sempat direvisi.", "2026-09-15T09:00:00.000Z"],
    ["Planned", "Workshop invoice dijadwalkan 22 Sep.", "2026-09-16T09:00:00.000Z"],
    ["In Progress", "Workshop berjalan.", "2026-09-22T09:00:00.000Z"],
    ["Completed", "Workshop selesai. Gap tetap Gap sampai reassessment kompetensi.", "2026-09-27T09:00:00.000Z"],
  ]),
  ...need({ no: 6, employeeNo: 13, sourceType: "performance_context", sourceRef: "FIX-D4-PERF-005", priority: "Low", actor: "Romeo",
    objective: "Menjaga kualitas serah terima order ke operasional (KPI Sales & Marketing no. 5)." }, [
    ["Identified", "Konteks dari evaluasi September (hasil 5).", "2026-09-25T09:00:00.000Z"],
    ["Planned", "Coaching bersama Sales Executive 2.", "2026-09-26T09:00:00.000Z"],
  ]),
  ...need({ no: 7, employeeNo: 51, sourceType: "competency_gap", sourceRef: requirement(32), priority: "Medium", actor: "Quebec",
    objective: "Mandiri dalam administrasi KPI dan penilaian kinerja (level 2 → 3)." }, [
    ["Identified", "Gap dari assessment 21 Sep 2026.", "2026-09-22T11:00:00.000Z"],
    ["Planned", "Pelatihan dipilih.", "2026-09-23T11:00:00.000Z"],
    ["In Progress", "Pendampingan oleh Mercury berjalan.", "2026-09-30T11:00:00.000Z"],
  ]),
];
