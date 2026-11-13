"use client";

import { useSearchParams } from "next/navigation";
import { CircleCheck, Eye, GraduationCap, History, Pencil, Plus, RefreshCw, Scale } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { DevelopmentNeedVersion, DevelopmentSourceType } from "../../../development/types";
import { useSnapshot } from "../../data/D4DataProvider";
import { canAssess, canWrite, describeSource, developmentById, developmentHistory, developmentNeeds, employeeById, employeeMeta, formatDate, formatPeriod, REASSESSMENT_PENDING, reassessmentFor, revisionChanges, sourceFinding, sourceTypeLabel, trainings, visibleEmployees, type Snapshot } from "../../data/selectors";
import { DataTable, PersonCell } from "../../ui/DataTable";
import { FilterBar, PeriodFilter, SearchInput, SelectFilter } from "../../ui/forms";
import { DetailHeader, NotFound, PageHeader, Timeline } from "../../ui/layout";
import { RowActionMenu } from "../../ui/RowActionMenu";
import { Button, ButtonLink, Card, InfoGrid, Notice, SavedNotice, SourceChip, statusLabel, StatusBadge } from "../../ui/primitives";
import { TrainingFormModal } from "../training/TrainingModals";
import { closeEvidence, CloseAsMetModal, DevelopmentEditModal, DevelopmentFormModal, openTrainingOf } from "./DevelopmentModals";
import { competencyOptions } from "../competency/rows";
import { developmentRows } from "./rows";

/**
 * Reassessment result of a need, or nothing while it is still open.
 * `compact`: a short line in the list's Action column, which may wrap so the table still fits a laptop.
 */
export function ReassessmentBadge({ snapshot, needId, compact }: { snapshot: Snapshot; needId: string; compact?: boolean }) {
  const state = reassessmentFor(snapshot, needId);
  if (!state) return null;
  const status = state === "pending" ? REASSESSMENT_PENDING : state;
  return compact
    ? <span data-testid="reassessment-result" className="block max-w-28 text-xs leading-4 text-ink-2">{statusLabel(status)}</span>
    : <span data-testid="reassessment-result"><StatusBadge status={status} /></span>;
}

/**
 * Action column of the list (Q10): a Completed requirement waiting for HR's decision links to the passed training,
 * where the decision is recorded (Training Tracking is the only place); once recorded, the decision shows here instead
 * (Retraining stays until the requirement is Completed again). The link wraps to two lines so the column stays narrow.
 */
function ReassessmentAction({ snapshot, needId, writer }: { snapshot: Snapshot; needId: string; writer: boolean }) {
  const state = reassessmentFor(snapshot, needId);
  const passed = state === "pending" && trainings(snapshot).filter((item) => item.developmentNeedId === needId && item.status === "Completed" && item.result === "Passed")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (passed && writer) return <Link href={`/training/${passed.trainingId}`} data-testid="btn-row-record-reassessment"
    className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-2.5 py-1.5 text-left text-xs font-semibold leading-4 text-primary-600 hover:bg-primary-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500">
    <Scale aria-hidden="true" className="size-3.5 shrink-0" />Record in Training</Link>;
  return state ? <ReassessmentBadge snapshot={snapshot} needId={needId} compact /> : <span className="text-ink-3">—</span>;
}

export function DevelopmentListPage() {
  const snapshot = useSnapshot();
  const writer = canWrite(snapshot);
  // K15: dashboard alerts link here with ?q=<name>. Read from the router: during a client navigation window.location is still the previous page.
  const params = useSearchParams();
  const [search, setSearch] = useState(() => params.get("q") ?? "");
  const [department, setDepartment] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState("");
  const [competency, setCompetency] = useState("");
  const [priority, setPriority] = useState("");
  const [adding, setAdding] = useState(false);
  const [closingFor, setClosingFor] = useState<string | null>(null);
  const [editFor, setEditFor] = useState<string | null>(null);
  const [trainingFor, setTrainingFor] = useState<DevelopmentNeedVersion | null>(null);
  const [saved, setSaved] = useState<{ needId: string; trainingId?: string } | null>(null);
  // FR-04.8: filter by employee, source, period (month the requirement was last recorded) and status; FR-D4-002 B adds competency and priority.
  const periods = useMemo(() => [...new Set(developmentNeeds(snapshot).map((need) => need.createdAt.slice(0, 7)))].sort().reverse(), [snapshot]);
  const rows = useMemo(() => developmentRows(snapshot, { search, department, sourceType, status, period, competency, priority }), [snapshot, search, department, sourceType, status, period, competency, priority]);
  const filtered = Boolean(search || department || sourceType || status || period || competency || priority);
  const savedNeed = saved && developmentNeeds(snapshot).find((need) => need.needId === saved.needId);
  const savedTraining = saved?.trainingId && trainings(snapshot).find((item) => item.trainingId === saved.trainingId);
  const savedName = savedNeed ? employeeById(snapshot, savedNeed.employeeId)?.fullName : "";

  return <>
    <PageHeader title="Development Requirement" subtitle="Kebutuhan development dan training dengan alasan dan sumber yang dapat ditelusuri."
      actions={writer && <Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)} data-testid="btn-add-requirement">Add Requirement</Button>} />
    <FilterBar canReset={filtered} onReset={() => { setSearch(""); setDepartment(""); setSourceType(""); setStatus(""); setPeriod(""); setCompetency(""); setPriority(""); }}
      search={<SearchInput value={search} onChange={setSearch} placeholder="Search name or position" />}
      period={<PeriodFilter label="Periods" testId="all-periods" value={period} onChange={setPeriod} options={periods.map((item) => ({ value: item, label: formatPeriod(item) }))} />}>
      <SelectFilter label="Sources" testId="all-sources" value={sourceType} onChange={setSourceType} options={(Object.keys(sourceTypeLabel) as DevelopmentSourceType[]).map((key) => ({ value: key, label: sourceTypeLabel[key] }))} />
      <SelectFilter label="Status" testId="all-status" value={status} onChange={setStatus} options={["Identified", "Planned", "In Progress", "Completed"].map((item) => ({ value: item, label: statusLabel(item) }))} />
      {snapshot.role !== "EMPLOYEE" && <SelectFilter label="Departments" testId="all-departments" value={department} onChange={setDepartment} options={snapshot.reference.departments.map((item) => ({ value: item.id, label: item.name }))} />}
      <SelectFilter label="Competencies" testId="all-competencies" value={competency} onChange={setCompetency} options={competencyOptions(snapshot)} />
      <SelectFilter label="Priorities" testId="all-priorities" value={priority} onChange={setPriority} options={["High", "Medium", "Low"].map((item) => ({ value: item, label: statusLabel(item) }))} />
    </FilterBar>
    {savedTraining ? <SavedNotice text={`Training "${savedTraining.activity}" untuk ${savedName} tersimpan.`} href={`/training/${savedTraining.trainingId}`} />
      : savedNeed && <SavedNotice text={`Development requirement ${savedName} tersimpan (${statusLabel(savedNeed.status)}).`} href={`/development/${savedNeed.needId}`} />}
    <DataTable<DevelopmentNeedVersion> rows={rows} noun="requirements" rowKey={(row) => row.needId} highlightKey={savedNeed ? savedNeed.needId : undefined}
      emptyTitle={filtered ? "Tidak ada requirement yang cocok" : "Belum ada development requirement"}
      emptyText={filtered ? "Ubah kata kunci atau reset filter." : writer ? "Buat dari gap kompetensi, perubahan posisi, atau evaluasi performance dengan Add Requirement." : "Belum ada development requirement yang tercatat."}
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
        // Display only: a gap requirement of a former position stays open until HR closes it, so the list says why it looks stuck.
        { key: "status", header: "Status", cell: (row) => <><StatusBadge status={row.status} />{row.sourceType === "competency_gap" && row.status !== "Completed" && !sourceFinding(snapshot, row)
          && <span data-testid="not-in-position" className="mt-1 block text-xs text-ink-2">Not in current position</span>}</> },
        { key: "action", header: "Action", wrap: true, cell: (row) => <ReassessmentAction snapshot={snapshot} needId={row.needId} writer={canAssess(snapshot, row.employeeId)} /> },
        // Below 1400 px the date gives way (it is also on the detail page), so Method / PIC stays visible for the "Tanpa PIC" alert.
        { key: "updated", header: "Updated", secondary: true, cell: (row) => formatDate(row.createdAt) },
      ]}
      actions={(row) => <RowActionMenu label={`Actions for ${row.objective}`} actions={[
        { label: "View Detail", testId: "view-detail", icon: <Eye />, href: `/development/${row.needId}` },
        { label: "View History", testId: "view-history", icon: <History />, href: `/development/${row.needId}/history` },
        { label: "Create Training", testId: "create-training", icon: <GraduationCap />, onSelect: () => setTrainingFor(row), hidden: !canAssess(snapshot, row.employeeId) || row.status === "Completed" },
        // 13 Nov 2026: progress is written once, in Training Tracking; this only takes HR there.
        { label: "Update progress in Training", testId: "update-progress-in-training", icon: <RefreshCw />, href: `/training/${openTrainingOf(snapshot, row.needId)?.trainingId}`, hidden: !canAssess(snapshot, row.employeeId) || !openTrainingOf(snapshot, row.needId) },
        { label: "Close as Met", testId: "close-as-met", icon: <CircleCheck />, onSelect: () => setClosingFor(row.needId), hidden: !canAssess(snapshot, row.employeeId) || Boolean(closeEvidence(snapshot, row).blocked) },
        { label: "Edit Requirement", testId: "edit-requirement", icon: <Pencil />, onSelect: () => setEditFor(row.needId), hidden: !canAssess(snapshot, row.employeeId) },
      ]} />} />
    {adding && <DevelopmentFormModal onClose={() => setAdding(false)} onSaved={(needId) => setSaved({ needId })} />}
    {closingFor && <CloseAsMetModal needId={closingFor} onClose={() => setClosingFor(null)} onSaved={() => setSaved({ needId: closingFor })} />}
    {editFor && <DevelopmentEditModal needId={editFor} onClose={() => setEditFor(null)} onSaved={() => setSaved({ needId: editFor })} />}
    {trainingFor && <TrainingFormModal employeeId={trainingFor.employeeId} developmentNeedId={trainingFor.needId} onClose={() => setTrainingFor(null)} onSaved={(trainingId) => setSaved({ needId: trainingFor.needId, trainingId })} />}
  </>;
}

export function DevelopmentDetailPage({ needId }: { needId: string }) {
  const snapshot = useSnapshot();
  const [closing, setClosing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [trainingOpen, setTrainingOpen] = useState(false);
  const need = developmentById(snapshot, needId);
  const employee = need && employeeById(snapshot, need.employeeId);
  if (!need || !employee || !visibleEmployees(snapshot).some((item) => item.id === employee.id)) return <NotFound what="Development requirement" backHref="/development" backLabel="Back to Development Requirement" />;
  // Nobody follows up their own requirement (SR-D4-EMP-23).
  const writer = canAssess(snapshot, need.employeeId);
  const source = describeSource(snapshot, need);
  const linked = trainings(snapshot).filter((item) => item.developmentNeedId === need.needId);
  const open = openTrainingOf(snapshot, need.needId);
  const history = developmentHistory(snapshot, need.needId);
  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "Development Requirement", href: "/development" }, { label: "Detail" }]} backHref="/development"
      name={employee.fullName} meta={[...employeeMeta(snapshot, employee), `Revision ${need.revision}`]} status={need.status}
      actions={<>
        <ButtonLink href={`/development/${need.needId}/history`} icon={<History className="size-4" />} testId="view-history">View History</ButtonLink>
        {writer && <Button icon={<Pencil className="size-4" />} onClick={() => setEditOpen(true)} data-testid="btn-edit-requirement">Edit Requirement</Button>}
        {/* 13 Nov 2026: progress is written once, in Training Tracking. A completed requirement takes no new training (assertNeedOpen). */}
        {writer && open && <ButtonLink href={`/training/${open.trainingId}`} icon={<RefreshCw className="size-4" />} testId="btn-update-progress-in-training">Update progress in Training</ButtonLink>}
        {writer && need.status !== "Completed" && <Button icon={<GraduationCap className="size-4" />} onClick={() => setTrainingOpen(true)} data-testid="btn-create-training">Create Training</Button>}
        {writer && !closeEvidence(snapshot, need).blocked && <Button icon={<CircleCheck className="size-4" />} onClick={() => setClosing(true)} data-testid="btn-close-as-met">Close as Met</Button>}
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
      <div className="space-y-6">
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
    <Notice>Status requirement mengikuti Training Tracking: training dibuat menjadi Planned, training berjalan menjadi In Progress. Completed hanya lewat training Passed dengan Meets requirement, atau Close as Met saat level di data kompetensi sudah memenuhi. Training yang selesai tidak otomatis menutup gap; gap tetap harus dinilai ulang.</Notice>
    {closing && <CloseAsMetModal needId={need.needId} onClose={() => setClosing(false)} />}
    {editOpen && <DevelopmentEditModal needId={need.needId} onClose={() => setEditOpen(false)} />}
    {trainingOpen && <TrainingFormModal employeeId={need.employeeId} developmentNeedId={need.needId} onClose={() => setTrainingOpen(false)} />}
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
