import type { DevelopmentNeedVersion, DevelopmentSourceType, DevelopmentStatus } from "../development/types";
import type { TrainingStatus } from "../training/types";
import { ApiError } from "./errors";

/**
 * Integrity rules shared by the fixture source (browser preview) and the API handlers, so both
 * reject the same input. Messages are shown to the user as-is; a broken rule is a validation error (422).
 */

const JAKARTA = "Asia/Jakarta";

/** Today as YYYY-MM-DD in WIB. `toISOString()` is UTC and returns yesterday before 07:00 WIB. */
export function localToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: JAKARTA, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export const localMonth = (now = new Date()) => localToday(now).slice(0, 7);

type PeriodRecord = { readonly id: string; readonly employeeId: string; readonly period: string; readonly createdAt: string };

/** Latest record of an employee for a period; an older one in the same period is an earlier revision. */
export function latestForPeriod<T extends PeriodRecord>(records: readonly T[], employeeId: string, period: string): T | undefined {
  return records.filter((item) => item.employeeId === employeeId && item.period === period)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

/**
 * One active record per employee and period (FR-01.4, FR-02.9, BR-06.2). A second record is only
 * accepted as an explicit revision of the current one, so it never hides another record silently.
 */
export function assertPeriodRevision(records: readonly PeriodRecord[], employeeId: string, period: string, revisionOf: string | null | undefined, label: string) {
  const current = latestForPeriod(records, employeeId, period);
  if (current && revisionOf !== current.id) throw new ApiError("VALIDATION_FAILED", `${label} untuk periode ini sudah ada. Simpan sebagai revisi atau buka riwayatnya.`);
  if (!current && revisionOf) throw new ApiError("VALIDATION_FAILED", `${label} yang direvisi tidak cocok dengan pegawai atau periodenya.`);
}

/** Revision number of a record within its employee and period (1 = first record). */
export function revisionNumber<T extends PeriodRecord>(records: readonly T[], record: T): number {
  return records.filter((item) => item.employeeId === record.employeeId && item.period === record.period && item.createdAt <= record.createdAt).length;
}

/** An evaluator never assesses themselves. */
export function assertNotSelf(actorEmployeeId: string, employeeId: string) {
  if (actorEmployeeId === employeeId) throw new ApiError("VALIDATION_FAILED", "Penilaian untuk diri sendiri harus dilakukan oleh HR atau manager lain.");
}

/** A completed development need does not take new training. */
export function assertNeedOpen(need: Pick<DevelopmentNeedVersion, "status"> | undefined) {
  if (need?.status === "Completed") throw new ApiError("VALIDATION_FAILED", "Development requirement ini sudah Completed; training baru harus merujuk ke requirement yang masih terbuka.");
}

/** An unfinished need already raised from the same source, if any (prevents duplicate needs for one gap). */
export function openNeedFor(needs: readonly DevelopmentNeedVersion[], employeeId: string, sourceType: DevelopmentSourceType, sourceRef: string) {
  return needs.find((item) => item.employeeId === employeeId && item.sourceType === sourceType && item.sourceRef === sourceRef && item.status !== "Completed");
}

/**
 * One open need per competency gap. Other sources may legitimately yield several needs (an evaluation
 * can recommend more than one development activity), so they are not limited.
 */
export function assertNoOpenNeed(needs: readonly DevelopmentNeedVersion[], employeeId: string, sourceType: DevelopmentSourceType, sourceRef: string) {
  if (sourceType === "competency_gap" && openNeedFor(needs, employeeId, sourceType, sourceRef)) throw new ApiError("VALIDATION_FAILED", "Gap kompetensi ini sudah memiliki development requirement yang belum selesai.");
}

const TRAINING_STEP: Record<TrainingStatus, number> = { Planned: 0, "In Progress": 1, Completed: 2, Cancelled: 2 };

/** Moving back (e.g. Completed → Planned) or reopening a cancelled training. */
export const isTrainingRollback = (from: TrainingStatus, to: TrainingStatus) =>
  from !== to && (TRAINING_STEP[to] < TRAINING_STEP[from] || from === "Cancelled" || (from === "Completed" && to === "Cancelled"));

export function assertTrainingChange(from: TrainingStatus, to: TrainingStatus, notes: string) {
  if (isTrainingRollback(from, to) && !notes.trim()) throw new ApiError("VALIDATION_FAILED", `Alasan wajib diisi saat status mundur dari ${from} ke ${to}.`);
}

const DEVELOPMENT_STEP: Record<DevelopmentStatus, number> = { Identified: 0, Planned: 1, "In Progress": 2, Completed: 3 };

/** Moving back (e.g. Completed → Planned). */
export const isDevelopmentRollback = (from: DevelopmentStatus, to: DevelopmentStatus) => DEVELOPMENT_STEP[to] < DEVELOPMENT_STEP[from];

/** A status update must change the status, and moving back needs a reason (same rule as training). */
export function assertDevelopmentChange(from: DevelopmentStatus, to: DevelopmentStatus, notes: string, openTrainings = 0) {
  if (from === to) throw new ApiError("VALIDATION_FAILED", `Status sudah ${to}. Pilih status lain.`);
  if (isDevelopmentRollback(from, to) && !notes.trim()) throw new ApiError("VALIDATION_FAILED", `Alasan wajib diisi saat status mundur dari ${from} ke ${to}.`);
  if (to === "Completed" && openTrainings > 0 && !notes.trim()) throw new ApiError("VALIDATION_FAILED", "Training untuk requirement ini masih Planned atau In Progress. Selesaikan atau batalkan dulu, atau jelaskan alasannya di Notes.");
}

/** Planned/In Progress trainings of a need: completing the need while these run needs a reason. */
export const openTrainingCount = (trainings: readonly { developmentNeedId: string; status: TrainingStatus }[], needId: string) =>
  trainings.filter((item) => item.developmentNeedId === needId && (item.status === "Planned" || item.status === "In Progress")).length;

/** A gap-based need is raised only after a competency assessment is saved for the employee's active position. */
export function assertGapAssessed(competency: readonly { employeeId: string; positionId: string }[], employee: { id: string; positionId?: string | null } | undefined, sourceType: DevelopmentSourceType) {
  if (sourceType !== "competency_gap") return;
  if (!employee?.positionId || !competency.some((item) => item.employeeId === employee.id && item.positionId === employee.positionId))
    throw new ApiError("VALIDATION_FAILED", "Simpan penilaian kompetensi untuk posisi aktif sebelum membuat development requirement dari gap-nya.");
}

/** A completed training already happened, so its date cannot be later than today; planned training may be in the future. */
export function assertTrainingDate(status: TrainingStatus, date: string) {
  if (status === "Completed") assertNotFutureDate(date, "The date of a completed training");
}

/** Evaluation dates are when the evaluation happened, so they cannot be later than today (WIB). */
export function assertNotFutureDate(date: string | null | undefined, label = "Evaluation date") {
  if (date && date > localToday()) throw new ApiError("VALIDATION_FAILED", `${label} tidak boleh lebih dari hari ini.`);
}
