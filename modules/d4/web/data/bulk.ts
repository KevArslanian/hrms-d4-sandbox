import type { TrainingCompletion, TrainingDecision } from "../../shared/rules";
import type { TrainingStatus } from "../../training/types";
import type { D4DataSource } from "./source";

/**
 * Bulk actions (interview 13 Nov 2026, 1:10:34–1:12:33): HR selects many rows and acts once, e.g. the 32 field agents
 * who took one training together. Each row still goes through the single-row write, so every rule and message stays the
 * same; rows run one after another and a refused row does not stop the others.
 */
export type BulkFailure = { key: string; label: string; message: string };
export type BulkOutcome = { done: string[]; failed: BulkFailure[] };

export async function eachInOrder<T>(items: readonly T[], key: (item: T) => string, label: (item: T) => string, write: (item: T) => Promise<unknown>): Promise<BulkOutcome> {
  const outcome: BulkOutcome = { done: [], failed: [] };
  for (const item of items) {
    try {
      await write(item);
      outcome.done.push(key(item));
    } catch (cause) {
      outcome.failed.push({ key: key(item), label: label(item), message: cause instanceof Error ? cause.message : "Gagal menyimpan." });
    }
  }
  return outcome;
}

/** A bulk save where every row was refused is a failed save, so the caller shows an error instead of a success toast. */
export function requireSome(outcome: BulkOutcome): BulkOutcome {
  if (!outcome.done.length && outcome.failed.length) throw new Error(`Tidak ada yang tersimpan. ${outcome.failed[0].label}: ${outcome.failed[0].message}`);
  return outcome;
}

export const bulkSummary = (outcome: BulkOutcome, what: string) =>
  outcome.failed.length ? `${outcome.done.length} ${what} tersimpan, ${outcome.failed.length} gagal.` : `${outcome.done.length} ${what} tersimpan.`;

export type BulkTarget = { key: string; label: string };
export type BulkNeed = BulkTarget & { employeeId: string };
export type BulkTraining = BulkTarget & { status: TrainingStatus };

/** One new training, the same activity and date, for every selected development requirement. */
export const addTrainingToNeeds = (source: D4DataSource, needs: readonly BulkNeed[], training: { activity: string; date: string; status: TrainingStatus; notes: string }) =>
  eachInOrder(needs, (need) => need.key, (need) => need.label, (need) =>
    source.createTraining({ employeeId: need.employeeId, developmentNeedId: need.key, activity: training.activity, date: training.date, status: training.status, result: "", notes: training.notes }));

export const DECIDE_LATER = "Decide later";

/** Progress for many trainings at once: In Progress, or Completed with one result and one decision for all of them. */
export type BulkProgress =
  | { status: "In Progress"; notes: string }
  | { status: "Completed"; result: TrainingCompletion["result"]; decision: TrainingDecision | typeof DECIDE_LATER; notes: string; activity?: string; date?: string };

/** Trainings a bulk progress change applies to: moving to In Progress leaves the ones already running untouched. */
export const progressTargets = <T extends BulkTraining>(trainings: readonly T[], change: Pick<BulkProgress, "status">) =>
  change.status === "In Progress" ? trainings.filter((item) => item.status === "Planned") : trainings;

export const updateTrainings = (source: D4DataSource, trainings: readonly BulkTraining[], change: BulkProgress) =>
  eachInOrder(progressTargets(trainings, change), (item) => item.key, (item) => item.label, (item) => {
    if (change.status === "In Progress") return source.updateTraining(item.key, "In Progress", "", change.notes);
    // Passed + Decide later saves the result only; the reassessment is recorded later from Next step (as in Update Progress).
    if (change.decision === DECIDE_LATER) return source.updateTraining(item.key, "Completed", change.result, change.notes);
    return source.completeTraining(item.key, { result: change.result, decision: change.decision, notes: change.notes,
      ...(change.decision === "Retraining" ? { activity: change.activity, date: change.date } : {}) });
  });
