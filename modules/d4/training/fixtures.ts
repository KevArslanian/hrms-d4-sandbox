import type { TrainingStatus, TrainingVersion } from "./types";

const employee = (n: number) => `d4000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

type Training = { no: number; employeeNo: number; need: number; activity: string; date: string; actor: string };

/** One training with its status history (oldest first). */
function training({ no, employeeNo, need, activity, date, actor }: Training, steps: [TrainingStatus, string, string, string][]): TrainingVersion[] {
  const trainingId = `FIX-D4-TRN-${String(no).padStart(3, "0")}`;
  return steps.map(([status, result, notes, createdAt], index) => ({
    id: `FIX-D4-TRN-V${index + 1}-${String(no).padStart(3, "0")}`, trainingId, revision: index + 1, source: "fixture",
    employeeId: employee(employeeNo), developmentNeedId: `FIX-D4-DEV-${String(need).padStart(3, "0")}`,
    activity, date, status, result, notes, createdAt, actor,
  }));
}

/** Fictional, manually linked training records. Completion does not change a competency finding. */
export const trainingFixtureVersions: readonly TrainingVersion[] = [
  ...training({ no: 1, employeeNo: 9, need: 1, activity: "Workshop Akurasi Worksheet & Dokumen Ekspor-Impor", date: "2026-10-08", actor: "Mercury" }, [
    ["Planned", "", "Materi: MAWB/HAWB, Gross vs Chargeable Weight, Reference No. Contoh kasus worksheet AENAT/2609/0354.", "2026-09-25T09:00:00.000Z"],
  ]),
  ...training({ no: 2, employeeNo: 11, need: 2, activity: "Pelatihan Data Siap Tagih & Reimbursement", date: "2026-10-12", actor: "Mercury" }, [
    ["Planned", "", "Materi: dokumen RA CMU, Warehouse Garuda, invoice reimbursement.", "2026-09-24T10:00:00.000Z"],
    ["In Progress", "", "Sesi 1 dari 2 selesai.", "2026-09-25T10:00:00.000Z"],
  ]),
  ...training({ no: 3, employeeNo: 14, need: 3, activity: "Pelatihan Penyusunan Worksheet & Job Number ERP", date: "2026-09-29", actor: "Romeo" }, [
    ["Planned", "", "Pelatihan internal ERP.", "2026-09-24T11:00:00.000Z"],
    ["In Progress", "", "Sesi pertama berjalan.", "2026-09-29T11:00:00.000Z"],
  ]),
  ...training({ no: 4, employeeNo: 55, need: 5, activity: "Workshop Penerbitan & Revisi Invoice (SLA < 24 jam)", date: "2026-09-22", actor: "Mercury" }, [
    ["Planned", "", "Workshop internal Finance.", "2026-09-16T10:00:00.000Z"],
    ["In Progress", "", "Hari pertama workshop.", "2026-09-22T10:00:00.000Z"],
    ["Completed", "Lulus. Simulasi invoice reimbursement 26 28597A selesai tanpa revisi.", "Gap belum tertutup otomatis; perlu reassessment.", "2026-09-26T10:00:00.000Z"],
  ]),
  ...training({ no: 5, employeeNo: 13, need: 6, activity: "Coaching Serah Terima Order ke Operasional", date: "2026-10-15", actor: "Romeo" }, [
    ["Planned", "", "Coaching satu lawan satu dengan Sales Executive 2.", "2026-09-26T11:00:00.000Z"],
  ]),
  ...training({ no: 6, employeeNo: 51, need: 7, activity: "Pelatihan Administrasi KPI Scorecard V5.1 (batch September)", date: "2026-09-28", actor: "Quebec" }, [
    ["Planned", "", "Kelas eksternal.", "2026-09-23T12:00:00.000Z"],
    ["Cancelled", "", "Kelas eksternal dibatalkan penyelenggara; diganti pendampingan internal.", "2026-09-27T12:00:00.000Z"],
  ]),
  ...training({ no: 7, employeeNo: 51, need: 7, activity: "Pendampingan Administrasi KPI oleh Mercury", date: "2026-09-30", actor: "Quebec" }, [
    ["Planned", "", "Pengganti kelas yang dibatalkan.", "2026-09-27T13:00:00.000Z"],
    ["In Progress", "", "Pendampingan mingguan berjalan.", "2026-09-30T13:00:00.000Z"],
  ]),
];
