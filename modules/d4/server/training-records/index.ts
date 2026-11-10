import { compareCompetencies } from "../../competency/service";
import type { TrainingFollowUp, TrainingStatus } from "../../training/types";
import { assertNeedOpen, assertTrainingChange, assertTrainingDate, assertTrainingFollowUp, localToday, planTrainingCompletion, retrainingNotes, TRAINING_DECISIONS, TRAINING_FOLLOW_UPS, TRAINING_RESULTS } from "../../shared/rules";
import { latestDevelopment, latestTraining } from "../../supabase/types";
import { ApiError, employeeFilter, enforce, field, readJson } from "../_lib/http";
import { d4Session, requireWriter } from "../_lib/session";

const statuses: readonly TrainingStatus[] = ["Planned", "In Progress", "Completed", "Cancelled"];

/** Only a completed training has a result, and it is Passed or Not Passed. */
const completedResult = (body: Record<string, unknown>, status: TrainingStatus) => status === "Completed" ? field.oneOf(body, "result", TRAINING_RESULTS) : "";

/** GET /api/d4/training-records?employee_id= — latest version of each training record. */
export async function listTraining(request: Request) {
  const { repository } = await d4Session();
  const employeeId = employeeFilter(request);
  return latestTraining(await repository.loadSnapshot()).filter((item) => !employeeId || item.employeeId === employeeId);
}

/** GET /api/d4/training-records/:id — latest version plus status history. */
export async function getTraining(id: string) {
  const { repository } = await d4Session();
  const snapshot = await repository.loadSnapshot();
  const versions = snapshot.trainingVersions.filter((item) => item.trainingId === id).sort((a, b) => b.revision - a.revision);
  if (!versions.length) throw new ApiError("NOT_FOUND", "Training tidak ditemukan.");
  return { latest: versions[0], versions };
}

/** POST /api/d4/training-records — training must point to a development need of the same employee. */
export async function createTraining(request: Request) {
  const { repository } = await requireWriter();
  const body = await readJson(request);
  const status = field.oneOf(body, "status", statuses);
  const input = {
    employeeId: field.uuid(body, "employeeId"), developmentNeedId: field.uuid(body, "developmentNeedId"),
    activity: field.text(body, "activity", { max: 200 }), date: field.date(body, "date"), status,
    result: completedResult(body, status), notes: field.text(body, "notes", { required: false, max: 2000 }),
  };
  const snapshot = await repository.loadSnapshot();
  enforce(() => assertNeedOpen(latestDevelopment(snapshot).find((item) => item.needId === input.developmentNeedId)));
  enforce(() => assertTrainingDate(input.status, input.date));
  return { id: await repository.createTraining(input, snapshot) };
}

/** POST /api/d4/training-records/:id/versions — progress update as a new version. Completion never closes a gap. */
export async function addTrainingVersion(request: Request, id: string) {
  const { repository } = await requireWriter();
  const body = await readJson(request);
  const status = field.oneOf(body, "status", statuses);
  const result = completedResult(body, status);
  const notes = field.text(body, "notes", { required: false, max: 2000 });
  const current = latestTraining(await repository.loadSnapshot()).find((item) => item.trainingId === id);
  if (!current) throw new ApiError("NOT_FOUND", "Training tidak ditemukan.");
  enforce(() => assertTrainingChange(current.status, status, notes));
  await repository.updateTraining(id, status, result, notes);
  return { trainingId: id, status };
}

/**
 * POST /api/d4/training-records/:id/follow-up — Q16: HR's follow-up of a Not Passed training, saved as a new version
 * of it (status and result come from the record, not the body). Retraining also creates the next training for the
 * same requirement and returns its id.
 */
export async function recordTrainingFollowUp(request: Request, id: string) {
  const { repository } = await requireWriter();
  const body = await readJson(request);
  const followUp = field.oneOf(body, "followUp", TRAINING_FOLLOW_UPS);
  const input = { followUp, notes: field.text(body, "notes", { required: false, max: 2000 }),
    ...(followUp === "Retraining" ? { activity: field.text(body, "activity", { max: 200 }), date: field.date(body, "date") } : {}) };
  const snapshot = await repository.loadSnapshot();
  const history = snapshot.trainingVersions.filter((item) => item.trainingId === id);
  if (!history.length) throw new ApiError("NOT_FOUND", "Training tidak ditemukan.");
  enforce(() => assertTrainingFollowUp(history, input, latestDevelopment(snapshot).find((item) => item.needId === history[0].developmentNeedId)));
  return { trainingId: id, followUp, retrainingId: await repository.recordTrainingFollowUp(id, input, snapshot) };
}

/**
 * POST /api/d4/training-records/:id/complete — the one save of Training Tracking that finishes a training: the result
 * and HR's decision (Passed: Meets requirement or Retraining; Not Passed: Retraining or Other follow-up). Every rule
 * is checked before the first write. Writes follow this order so the histories read correctly: the training version,
 * a competency snapshot (Passed), the requirement revision (Passed), then the Retraining training. Not one transaction:
 * a failure part-way keeps the earlier records and the training page shows the step that is still open.
 */
export async function completeTraining(request: Request, id: string) {
  const { repository } = await requireWriter();
  const body = await readJson(request);
  const decision = field.oneOf(body, "decision", TRAINING_DECISIONS);
  const input = { result: field.oneOf(body, "result", TRAINING_RESULTS), decision, notes: field.text(body, "notes", { required: false, max: 2000 }),
    ...(decision === "Retraining" ? { activity: field.text(body, "activity", { max: 200 }), date: field.date(body, "date") } : {}) };
  const snapshot = await repository.loadSnapshot();
  const record = latestTraining(snapshot).find((item) => item.trainingId === id);
  if (!record) throw new ApiError("NOT_FOUND", "Training tidak ditemukan.");
  const needs = latestDevelopment(snapshot);
  const need = needs.find((item) => item.needId === record.developmentNeedId);
  const employee = snapshot.reference.employees.find((item) => item.id === record.employeeId);
  const comparison = employee?.positionId && snapshot.reference.positions.some((item) => item.id === employee.positionId)
    ? compareCompetencies(employee.id, employee.positionId, snapshot.reference) : null;
  const plan = planTrainingCompletion(input, {
    trainingId: id, history: snapshot.trainingVersions.filter((item) => item.trainingId === id), need,
    needHistory: snapshot.developmentVersions.filter((item) => item.needId === record.developmentNeedId), latestNeeds: needs, latestTrainings: latestTraining(snapshot),
    finding: comparison?.findings.find((item) => item.requirementId === need?.sourceRef), at: new Date().toISOString(),
  });
  if (plan.training === "follow-up") {
    const retrainingId = await repository.recordTrainingFollowUp(id, { followUp: decision as TrainingFollowUp, notes: input.notes, activity: input.activity, date: input.date }, snapshot);
    return { trainingId: id, result: input.result, decision, retrainingId };
  }
  if (plan.training === "version") await repository.updateTraining(id, "Completed", "Passed", input.notes);
  if (plan.snapshot && employee?.positionId && comparison?.findings.length) {
    await repository.saveCompetency({ employeeId: employee.id, positionId: employee.positionId, effectiveDate: localToday() }, snapshot.reference);
  }
  if (plan.development && need) await repository.updateDevelopment(need.needId, plan.development, need);
  const retrainingId = plan.retraining ? await repository.createTraining({ employeeId: record.employeeId, developmentNeedId: record.developmentNeedId,
    activity: input.activity ?? "", date: input.date ?? "", status: "Planned", result: "", notes: retrainingNotes(record, input.notes, "Passed") }, snapshot) : null;
  return { trainingId: id, result: input.result, decision, retrainingId };
}
