"use client";

import { Eye, GraduationCap, History, ListChecks, Pencil, Plus, RefreshCw, Scale } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { DevelopmentNeedVersion, DevelopmentSourceType } from "../../../development/types";
import { useSnapshot } from "../../data/D4DataProvider";
import { canWrite, describeSource, developmentById, developmentHistory, developmentNeeds, employeeById, employeeMeta, formatDate, formatPeriod, nextStep, REASSESSMENT_PENDING, reassessmentFor, revisionChanges, sourceFinding, sourceTypeLabel, trainings, visibleEmployees, type NeedStep, type Snapshot } from "../../data/selectors";
import { DataTable, PersonCell } from "../../ui/DataTable";
import { FilterBar, SearchInput, SelectFilter } from "../../ui/forms";
import { DetailHeader, NotFound, PageHeader, Timeline } from "../../ui/layout";
import { RowActionMenu } from "../../ui/RowActionMenu";
import { Button, ButtonLink, Card, InfoGrid, Notice, SourceChip, statusLabel, StatusBadge } from "../../ui/primitives";
import { LevelLine, TrainingFormModal, TrainingProgressModal } from "../training/TrainingModals";
import { DevelopmentEditModal, DevelopmentFormModal, DevelopmentStatusModal } from "./DevelopmentModals";
import { competencyOptions } from "../competency/rows";
import { developmentRows } from "./rows";

/**
 * Reassessment result of a need, or nothing while it is still open.
 * `compact`: a short line next to the status, which may wrap so the table still fits a laptop.
 */
export function ReassessmentBadge({ snapshot, needId, compact }: { snapshot: Snapshot; needId: string; compact?: boolean }) {
  const state = reassessmentFor(snapshot, needId);
  if (!state) return null;
  const status = state === "pending" ? REASSESSMENT_PENDING : state;
  return compact
    ? <span data-testid="reassessment-result" className="block max-w-28 text-xs leading-4 text-ink-2">{statusLabel(status)}</span>
    : <span data-testid="reassessment-result"><StatusBadge status={status} /></span>;
}

const STATUS_MEANING: [string, string][] = [
  ["Identified", "dicatat, belum ada training"], ["Planned", "training dijadwalkan"],
  ["In Progress", "training berjalan atau menunggu keputusan HR"], ["Completed", "ditutup oleh keputusan HR"],
];

/** What each requirement status means; HR asked (10 Nov 2026) because the status words alone were unclear. */
function StatusLegend() {
  return <div data-testid="status-legend" className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-xs text-ink-2">
    {STATUS_MEANING.map(([status, meaning]) => <span key={status} className="inline-flex items-center gap-1.5"><StatusBadge status={status} />{meaning}</span>)}
    <span className="text-ink-3">Status mengikuti training secara otomatis.</span>
  </div>;
}

type StepHandlers = { onDecide: (trainingId: string) => void; onCreate: () => void };

/** The button of a step, or null when the step needs none. `row`: the small button of the list. */
function StepButton({ step, row, onDecide, onCreate }: { step: NeedStep; row?: boolean } & StepHandlers) {
  const action = step.kind === "decide"
    ? step.decision === "follow-up"
      ? { label: "Retraining / Follow-up", testId: "record-follow-up", icon: ListChecks, onClick: () => onDecide(step.training.trainingId) }
      // In the narrow list column the two choices themselves fit; "Reassessment" alone would widen it past 1024 px.
      : { label: row ? "Meets / Retraining" : "Record Reassessment", testId: "record-reassessment", icon: Scale, onClick: () => onDecide(step.training.trainingId) }
    : step.kind === "create" ? { label: step.retraining ? "Create Retraining" : "Create Training", testId: "next-create-training", icon: GraduationCap, onClick: onCreate } : null;
  if (!action) return null;
  const Icon = action.icon;
  return row
    ? <button type="button" data-testid={`btn-row-${action.testId}`} onClick={action.onClick}
        className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2 py-1.5 text-left text-xs font-semibold leading-4 text-primary-600 hover:bg-primary-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500">
        <Icon aria-hidden="true" className="size-3.5 shrink-0" />{action.label}</button>
    : <Button icon={<Icon className="size-4" />} onClick={action.onClick} data-testid={`btn-${action.testId}`}>{action.label}</Button>;
}

/**
 * Next step column (Q10, 10 Nov 2026): what happens next for the requirement, with the button that does it. A decision
 * on a training (Retraining included) opens the same form as Training Tracking, so there is still one way to record it.
 */
function NextStepCell({ snapshot, need, writer, ...handlers }: { snapshot: Snapshot; need: DevelopmentNeedVersion; writer: boolean } & StepHandlers) {
  const step = nextStep(snapshot, need);
  if (step.kind === "decide") return <div className="space-y-1.5">
    <span className="block text-xs text-ink-2">Training {step.decision === "follow-up" ? "Not Passed" : "Passed"}</span>
    {writer ? <StepButton step={step} row {...handlers} /> : <span className="block text-xs text-ink-3">Menunggu keputusan HR</span>}
  </div>;
  // Two lines rather than a chip, so the training name is not cut to a few letters in this narrow column.
  if (step.kind === "running") return <Link href={`/training/${step.training.trainingId}`} data-testid="link-row-training" className="block rounded-lg text-xs leading-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500">
    <span className="font-semibold text-primary-600">{step.retraining ? "Retraining" : "Training"}</span><span className="text-ink-3"> · {statusLabel(step.training.status)}</span>
    <span className="mt-0.5 line-clamp-2 break-words text-ink-2">{step.training.activity}</span>
  </Link>;
  if (step.kind === "create") return writer ? <StepButton step={step} row {...handlers} /> : <span className="text-xs text-ink-3">Belum ada training</span>;
  return step.meets ? <StatusBadge status="Meets requirement" /> : <span className="text-xs text-ink-3">Closed</span>;
}

/** The detail page's version of the Next step column: one sentence on what to do, and the same button. */
function NextStepCard({ snapshot, need, writer, ...handlers }: { snapshot: Snapshot; need: DevelopmentNeedVersion; writer: boolean } & StepHandlers) {
  const step = nextStep(snapshot, need);
  const finding = step.kind === "decide" && step.decision === "reassessment" ? sourceFinding(snapshot, need) : undefined;
  const text = step.kind === "decide"
    ? step.decision === "follow-up"
      ? `Training "${step.training.activity}" Not Passed. Pilih Retraining (training ulang dibuat, status Planned) atau Other follow-up dengan catatan.`
      : `Training "${step.training.activity}" Passed. Pilih Meets requirement bila level kompetensi sudah memenuhi, atau Retraining bila gap belum tertutup.`
    : step.kind === "running"
      ? `${step.retraining ? "Retraining" : "Training"} berjalan: "${step.training.activity}" (${statusLabel(step.training.status)}). Perbarui progresnya di Training Tracking; setelah Completed, keputusan berikutnya muncul di sini.`
      : step.kind === "create"
        ? step.retraining ? "Retraining sudah dipilih, tetapi training ulangnya belum dibuat. Buat training ulang untuk requirement ini." : "Belum ada training untuk requirement ini. Buat training; status requirement ikut berubah otomatis."
        : step.meets ? "Requirement ditutup: Meets requirement." : "Requirement ditutup tanpa reassessment.";
  return <Card title="Next step" testId="development-next-step">
    <p data-testid="next-step-text" className="break-words text-sm text-ink-2">{text}</p>
    {finding && <div className="mt-3"><LevelLine finding={finding} /></div>}
    {step.kind === "running" && <div className="mt-3"><SourceChip label={step.retraining ? "Retraining" : "Training"} reference={statusLabel(step.training.status)} href={`/training/${step.training.trainingId}`} /></div>}
    {writer && (step.kind === "decide" || step.kind === "create") && <div className="mt-4"><StepButton step={step} {...handlers} /></div>}
  </Card>;
}

export function DevelopmentListPage() {
  const snapshot = useSnapshot();
  const writer = canWrite(snapshot);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState("");
  const [competency, setCompetency] = useState("");
  const [priority, setPriority] = useState("");
  const [adding, setAdding] = useState(false);
  const [statusFor, setStatusFor] = useState<string | null>(null);
  const [editFor, setEditFor] = useState<string | null>(null);
  const [trainingFor, setTrainingFor] = useState<DevelopmentNeedVersion | null>(null);
  const [progressFor, setProgressFor] = useState<string | null>(null);
  // FR-04.8: filter by employee, source, period (month the requirement was last recorded) and status; FR-D4-002 B adds competency and priority.
  const periods = useMemo(() => [...new Set(developmentNeeds(snapshot).map((need) => need.createdAt.slice(0, 7)))].sort().reverse(), [snapshot]);
  const rows = useMemo(() => developmentRows(snapshot, { search, department, sourceType, status, period, competency, priority }), [snapshot, search, department, sourceType, status, period, competency, priority]);

  return <>
    <PageHeader title="Development Requirement" subtitle="Kebutuhan development dan training dengan alasan dan sumber yang dapat ditelusuri."
      actions={writer && <Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)} data-testid="btn-add-requirement">Add Requirement</Button>} />
    <FilterBar canReset={Boolean(search || department || sourceType || status || period || competency || priority)} onReset={() => { setSearch(""); setDepartment(""); setSourceType(""); setStatus(""); setPeriod(""); setCompetency(""); setPriority(""); }}>
      <SearchInput value={search} onChange={setSearch} placeholder="Search name or position" />
      {snapshot.role !== "EMPLOYEE" && <SelectFilter label="All departments" testId="all-departments" value={department} onChange={setDepartment} options={snapshot.reference.departments.map((item) => ({ value: item.id, label: item.name }))} />}
      <SelectFilter label="All sources" testId="all-sources" value={sourceType} onChange={setSourceType} options={(Object.keys(sourceTypeLabel) as DevelopmentSourceType[]).map((key) => ({ value: key, label: sourceTypeLabel[key] }))} />
      <SelectFilter label="All periods" testId="all-periods" value={period} onChange={setPeriod} options={periods.map((item) => ({ value: item, label: formatPeriod(item) }))} />
      <SelectFilter label="All status" testId="all-status" value={status} onChange={setStatus} options={["Identified", "Planned", "In Progress", "Completed"].map((item) => ({ value: item, label: statusLabel(item) }))} />
      <SelectFilter label="All competencies" testId="all-competencies" value={competency} onChange={setCompetency} options={competencyOptions(snapshot)} />
      <SelectFilter label="All priorities" testId="all-priorities" value={priority} onChange={setPriority} options={["High", "Medium", "Low"].map((item) => ({ value: item, label: statusLabel(item) }))} />
    </FilterBar>
    <StatusLegend />
    <DataTable<DevelopmentNeedVersion> rows={rows} noun="requirements" rowKey={(row) => row.needId}
      emptyTitle="Belum ada development requirement" emptyText="Buat dari gap kompetensi, perubahan posisi, atau evaluasi performance."
      columns={[
        { key: "employee", header: "Employee", cell: (row) => { const employee = employeeById(snapshot, row.employeeId); return <PersonCell name={employee?.fullName ?? "—"} code={employee?.employeeId ?? ""} />; } },
        // The source sits under the objective it explains, so the Action column fits 1280 px without scrolling (Q10).
        { key: "objective-source", header: "Objective / Source", wrap: true, className: "max-w-[320px]", cell: (row) => <>
          <span data-testid="cell-objective" className="line-clamp-2">{row.objective}</span>
          <span data-testid="cell-source" className="mt-1.5 block"><SourceChip label={sourceTypeLabel[row.sourceType]} /></span>
        </> },
        { key: "priority", header: "Priority", optional: true, cell: (row) => statusLabel(row.priority) },
        // One column, as Position / Department on the People Dashboard, so the table fits a laptop screen.
        { key: "method-pic", header: "Method / PIC", wrap: true, optional: true, className: "max-w-[160px]", cell: (row) => <>
          <span data-testid="cell-method" className="block">{row.method || "—"}</span>
          <span data-testid="cell-pic" className="block text-xs text-ink-3">{row.pic || "—"}</span>
        </> },
        { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
        { key: "next-step", header: "Next step", wrap: true, className: "max-w-[200px]", cell: (row) => <NextStepCell snapshot={snapshot} need={row} writer={writer} onDecide={setProgressFor} onCreate={() => setTrainingFor(row)} /> },
        // Below 1400 px the date gives way (it is also on the detail page), so Method / PIC stays visible for the "Tanpa PIC" alert.
        { key: "updated", header: "Updated", secondary: true, cell: (row) => formatDate(row.createdAt) },
      ]}
      actions={(row) => { const step = nextStep(snapshot, row); return <RowActionMenu label={`Actions for ${row.objective}`} actions={[
        { label: "View Detail", testId: "view-detail", icon: <Eye />, href: `/development/${row.needId}` },
        { label: "View History", testId: "view-history", icon: <History />, href: `/development/${row.needId}/history` },
        // The decision HR still owes on a training (Retraining included), the same form as Training Tracking.
        ...(step.kind === "decide" ? [step.decision === "follow-up"
          ? { label: "Retraining / Follow-up", testId: "record-follow-up", icon: <ListChecks />, onSelect: () => setProgressFor(step.training.trainingId), hidden: !writer }
          : { label: "Record Reassessment", testId: "record-reassessment", icon: <Scale />, onSelect: () => setProgressFor(step.training.trainingId), hidden: !writer }] : []),
        { label: "Create Training", testId: "create-training", icon: <GraduationCap />, onSelect: () => setTrainingFor(row), hidden: !writer || row.status === "Completed" },
        { label: "Update Status", testId: "update-status", icon: <RefreshCw />, onSelect: () => setStatusFor(row.needId), hidden: !writer },
        { label: "Edit Requirement", testId: "edit-requirement", icon: <Pencil />, onSelect: () => setEditFor(row.needId), hidden: !writer },
      ]} />; }} />
    {adding && <DevelopmentFormModal onClose={() => setAdding(false)} />}
    {statusFor && <DevelopmentStatusModal needId={statusFor} onClose={() => setStatusFor(null)} />}
    {editFor && <DevelopmentEditModal needId={editFor} onClose={() => setEditFor(null)} />}
    {trainingFor && <TrainingFormModal employeeId={trainingFor.employeeId} developmentNeedId={trainingFor.needId} onClose={() => setTrainingFor(null)} />}
    {progressFor && <TrainingProgressModal trainingId={progressFor} onClose={() => setProgressFor(null)} />}
  </>;
}

export function DevelopmentDetailPage({ needId }: { needId: string }) {
  const snapshot = useSnapshot();
  const writer = canWrite(snapshot);
  const [statusOpen, setStatusOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [progressFor, setProgressFor] = useState<string | null>(null);
  const need = developmentById(snapshot, needId);
  const employee = need && employeeById(snapshot, need.employeeId);
  if (!need || !employee || !visibleEmployees(snapshot).some((item) => item.id === employee.id)) return <NotFound what="Development requirement" backHref="/development" backLabel="Back to Development Requirement" />;
  const source = describeSource(snapshot, need);
  const linked = trainings(snapshot).filter((item) => item.developmentNeedId === need.needId);
  const history = developmentHistory(snapshot, need.needId);
  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "Development Requirement", href: "/development" }, { label: "Detail" }]} backHref="/development"
      name={employee.fullName} meta={[...employeeMeta(snapshot, employee), `Revision ${need.revision}`]} status={need.status}
      actions={<>
        <ButtonLink href={`/development/${need.needId}/history`} icon={<History className="size-4" />} testId="view-history">View History</ButtonLink>
        {writer && <Button icon={<Pencil className="size-4" />} onClick={() => setEditOpen(true)} data-testid="btn-edit-requirement">Edit Requirement</Button>}
        {writer && <Button icon={<RefreshCw className="size-4" />} onClick={() => setStatusOpen(true)} data-testid="btn-update-status">Update Status</Button>}
        {/* A completed requirement cannot take new training (assertNeedOpen). */}
        {writer && need.status !== "Completed" && <Button icon={<GraduationCap className="size-4" />} onClick={() => setTrainingOpen(true)} data-testid="btn-create-training">Create Training</Button>}
      </>} />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
      <Card title="Requirement">
        <p className="break-words font-display font-semibold text-lg text-ink">{need.objective}</p>
        <div className="mt-6"><InfoGrid columns={3} items={[
          { label: "Priority", testId: "priority", value: statusLabel(need.priority) },
          { label: "Method", testId: "method", value: need.method || "—" },
          { label: "PIC", testId: "pic", value: need.pic || "—" },
          { label: "Status", value: <StatusBadge status={need.status} /> },
          { label: "Reassessment", testId: "reassessment", value: reassessmentFor(snapshot, need.needId) ? <ReassessmentBadge snapshot={snapshot} needId={need.needId} /> : "—" },
          { label: "Last updated", testId: "last-updated", value: `${formatDate(need.createdAt)} · ${need.actor}` },
          { label: "Created", testId: "created", value: formatDate(history[history.length - 1]?.createdAt) },
          { label: "Revisions", testId: "revisions", value: String(history.length) },
        ]} /></div>
        <h3 className="mb-2 mt-8 text-sm font-semibold text-ink-2">Notes</h3>
        <p className="whitespace-pre-wrap break-words text-sm text-ink-2">{need.notes || "—"}</p>
      </Card>
      <div className="min-w-0 space-y-6">
        <NextStepCard snapshot={snapshot} need={need} writer={writer} onDecide={setProgressFor} onCreate={() => setTrainingOpen(true)} />
        <Card title="Source (traceability)" testId="source-traceability">
          <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">{sourceTypeLabel[need.sourceType]}</p>
          <div className="mt-2"><SourceChip label={source.label} href={source.href} /></div>
          <p className="mt-4 text-xs text-ink-3">Requirement tetap terhubung ke sumber aslinya walaupun posisi pegawai berubah.</p>
        </Card>
        <Card title="Linked training" testId="linked-training">
          {linked.length ? <div className="flex flex-col items-start gap-2">{linked.map((item) => <SourceChip key={item.trainingId} label={item.activity} reference={statusLabel(item.status)} href={`/training/${item.trainingId}`} />)}</div>
            : <p className="text-sm text-ink-3">Belum ada training untuk requirement ini.</p>}
        </Card>
      </div>
    </div>
    <Notice>Status development atau training yang selesai tidak otomatis menutup gap kompetensi; gap tetap harus dinilai ulang.</Notice>
    {statusOpen && <DevelopmentStatusModal needId={need.needId} onClose={() => setStatusOpen(false)} />}
    {editOpen && <DevelopmentEditModal needId={need.needId} onClose={() => setEditOpen(false)} />}
    {trainingOpen && <TrainingFormModal employeeId={need.employeeId} developmentNeedId={need.needId} onClose={() => setTrainingOpen(false)} />}
    {progressFor && <TrainingProgressModal trainingId={progressFor} onClose={() => setProgressFor(null)} />}
  </>;
}

export function DevelopmentHistoryPage({ needId }: { needId: string }) {
  const snapshot = useSnapshot();
  const need = developmentById(snapshot, needId);
  const employee = need && employeeById(snapshot, need.employeeId);
  if (!need || !employee || !visibleEmployees(snapshot).some((item) => item.id === employee.id)) return <NotFound what="Development requirement" backHref="/development" backLabel="Back to Development Requirement" />;
  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "Development Requirement", href: "/development" }, { label: "History" }]} backHref={`/development/${need.needId}`}
      name={employee.fullName} meta={employeeMeta(snapshot, employee)} status={need.status} />
    <Card title="Revision history" testId="revision-history">
      <Timeline empty="Belum ada revisi." entries={developmentHistory(snapshot, need.needId).map((item, index, all) => ({
        id: item.id, date: formatDate(item.createdAt), title: `Revision ${item.revision}`, status: item.status, actor: item.actor,
        body: [...revisionChanges(item, all[index + 1]), item.notes].filter(Boolean).join(" · ") || undefined,
      }))} />
    </Card>
  </>;
}
