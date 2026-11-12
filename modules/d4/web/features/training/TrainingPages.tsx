"use client";

import { useSearchParams } from "next/navigation";
import { Eye, FileSearch, History, ListChecks, RefreshCw, Scale } from "lucide-react";
import { useMemo, useState } from "react";
import type { TrainingVersion } from "../../../training/types";
import { completedAt, followUpOf } from "../../../shared/rules";
import { useSnapshot } from "../../data/D4DataProvider";
import { byProgress, canAssess, canWrite, employeeById, employeeMeta, employeeSearchText, formatDate, formatPeriod, includesText, sourceFinding, trainingById, trainingDecision, trainingHistory, trainings, trainingSource, visibleEmployees } from "../../data/selectors";
import { DataTable, PersonCell } from "../../ui/DataTable";
import { FilterBar, SearchInput, SelectFilter } from "../../ui/forms";
import { DetailHeader, NotFound, PageHeader, Timeline } from "../../ui/layout";
import { RowActionMenu } from "../../ui/RowActionMenu";
import { Button, ButtonLink, Card, InfoGrid, Notice, SavedNotice, SourceChip, statusLabel, StatusBadge } from "../../ui/primitives";
import { ReassessmentBadge } from "../development/DevelopmentPages";
import { LevelLine, TrainingProgressModal } from "./TrainingModals";

// A result still waiting for HR's decision first (Q16 follow-up, Passed reassessment), then planned and running trainings; finished and cancelled last.
const TRAINING_RANK: Record<string, number> = { Planned: 1, "In Progress": 2, Completed: 3, Cancelled: 4 };

export function TrainingListPage() {
  const snapshot = useSnapshot();
  // K15: dashboard alerts link here with ?q=<name>. Read from the router: during a client navigation window.location is still the previous page.
  const params = useSearchParams();
  const [search, setSearch] = useState(() => params.get("q") ?? "");
  const [department, setDepartment] = useState("");
  const [period, setPeriod] = useState("");
  const [status, setStatus] = useState("");
  const [progressFor, setProgressFor] = useState<string | null>(null);
  const [savedId, setSavedId] = useState("");
  const all = useMemo(() => {
    const visible = new Set(visibleEmployees(snapshot).map((item) => item.id));
    return trainings(snapshot).filter((item) => visible.has(item.employeeId));
  }, [snapshot]);
  const periods = [...new Set(all.map((item) => item.date.slice(0, 7)))].sort().reverse();
  const saved = savedId ? all.find((item) => item.trainingId === savedId) : undefined;
  const rows = all.filter((item) => {
    const employee = employeeById(snapshot, item.employeeId);
    return includesText(`${employeeSearchText(snapshot, employee)} ${item.activity}`, search)
      && (!department || employee?.departmentId === department)
      && (!period || item.date.startsWith(period)) && (!status || item.status === status);
  }).sort(byProgress((item) => trainingDecision(snapshot, item) ? 0 : TRAINING_RANK[item.status] ?? 3,
    (item) => employeeById(snapshot, item.employeeId)?.fullName ?? ""));
  const filtered = Boolean(search || department || period || status);

  return <>
    <PageHeader title="Training Tracking" subtitle="Pantau training dan development dari requirement sumber sampai hasilnya." />
    <FilterBar canReset={filtered} onReset={() => { setSearch(""); setDepartment(""); setPeriod(""); setStatus(""); }}>
      <SearchInput value={search} onChange={setSearch} placeholder="Search name or position" />
      {snapshot.role !== "EMPLOYEE" && <SelectFilter label="All departments" testId="all-departments" value={department} onChange={setDepartment} options={snapshot.reference.departments.map((item) => ({ value: item.id, label: item.name }))} />}
      <SelectFilter label="All periods" testId="all-periods" value={period} onChange={setPeriod} options={periods.map((item) => ({ value: item, label: formatPeriod(item) }))} />
      <SelectFilter label="All status" testId="all-status" value={status} onChange={setStatus} options={["Planned", "In Progress", "Completed", "Cancelled"].map((item) => ({ value: item, label: statusLabel(item) }))} />
    </FilterBar>
    {saved && <SavedNotice text={`Training "${saved.activity}" untuk ${employeeById(snapshot, saved.employeeId)?.fullName ?? ""} tersimpan (${statusLabel(saved.status)}).`} href={`/training/${saved.trainingId}`} />}
    <DataTable<TrainingVersion> rows={rows} noun="trainings" rowKey={(row) => row.trainingId} highlightKey={saved ? saved.trainingId : undefined}
      emptyTitle={filtered ? "Tidak ada training yang cocok" : "Belum ada training"}
      emptyText={filtered ? "Ubah kata kunci atau reset filter." : canWrite(snapshot) ? "Training dibuat dari development requirement (Create Training) di Development Requirement." : "Belum ada training yang tercatat."}
      columns={[
        { key: "employee", header: "Employee", cell: (row) => { const employee = employeeById(snapshot, row.employeeId); return <PersonCell name={employee?.fullName ?? "—"} code={employee?.employeeId ?? ""} />; } },
        { key: "activity", header: "Training", wrap: true, cell: (row) => <span className="font-semibold">{row.activity}</span> },
        { key: "source", header: "Source requirement", wrap: true, optional: true, className: "max-w-[260px]", cell: (row) => <span className="line-clamp-2 text-ink-2">{trainingSource(snapshot, row)?.objective ?? "—"}</span> },
        { key: "date", header: "Date", cell: (row) => formatDate(row.date) },
        { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
      ]}
      actions={(row) => <RowActionMenu label={`Actions for ${row.activity}`} actions={[
        { label: "View Detail", testId: "view-detail", icon: <Eye />, href: `/training/${row.trainingId}` },
        { label: "View History", testId: "view-history", icon: <History />, href: `/training/${row.trainingId}/history` },
        { label: "Update Progress", testId: "update-progress", icon: <RefreshCw />, onSelect: () => setProgressFor(row.trainingId), hidden: !canAssess(snapshot, row.employeeId) },
        { label: "Open Source Requirement", testId: "open-source-requirement", icon: <FileSearch />, href: `/development/${row.developmentNeedId}` },
      ]} />} />
    {progressFor && <TrainingProgressModal trainingId={progressFor} onClose={() => setProgressFor(null)} onSaved={() => setSavedId(progressFor)} />}
  </>;
}

export function TrainingDetailPage({ trainingId }: { trainingId: string }) {
  const snapshot = useSnapshot();
  const [progressOpen, setProgressOpen] = useState(false);
  const record = trainingById(snapshot, trainingId);
  const employee = record && employeeById(snapshot, record.employeeId);
  if (!record || !employee || !visibleEmployees(snapshot).some((item) => item.id === employee.id)) return <NotFound what="Training" backHref="/training" backLabel="Back to Training Tracking" />;
  const need = trainingSource(snapshot, record);
  // Q16: a Not Passed result waits for HR's follow-up; Retraining links to the trainings created with it.
  const notPassed = record.status === "Completed" && record.result === "Not Passed";
  const versions = trainingHistory(snapshot, record.trainingId);
  const followUp = followUpOf(versions) && versions.find((item) => item.followUp);
  const retrainings = followUp?.followUp === "Retraining" ? trainings(snapshot).filter((item) => item.developmentNeedId === record.developmentNeedId && item.trainingId !== record.trainingId
    && (trainingHistory(snapshot, item.trainingId).at(-1)?.createdAt ?? "") >= followUp.createdAt) : [];
  const pending = trainingDecision(snapshot, record);
  // Passed + Retraining: the trainings of the next round, created after this pass.
  const passedAt = record.status === "Completed" && record.result === "Passed" ? completedAt(versions) ?? "" : "";
  const nextRound = passedAt ? trainings(snapshot).filter((item) => item.developmentNeedId === record.developmentNeedId && item.trainingId !== record.trainingId
    && (trainingHistory(snapshot, item.trainingId).at(-1)?.createdAt ?? "") > passedAt) : [];
  const finding = need && sourceFinding(snapshot, need);
  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "Training Tracking", href: "/training" }, { label: "Detail" }]} backHref="/training"
      name={employee.fullName} meta={[...employeeMeta(snapshot, employee), record.activity]} status={record.status}
      actions={<>
        <ButtonLink href={`/training/${record.trainingId}/history`} icon={<History className="size-4" />} testId="view-history">View History</ButtonLink>
        {/* V2: while the Next step card holds the primary action, this one steps back. */}
        {canAssess(snapshot, record.employeeId) && <Button variant={pending ? "secondary" : "primary"} icon={<RefreshCw className="size-4" />} onClick={() => setProgressOpen(true)} data-testid="btn-update-progress">Update Progress</Button>}
      </>} />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
      <Card title="Training">
        <p className="break-words font-display font-semibold text-lg text-ink">{record.activity}</p>
        <div className="mt-6"><InfoGrid columns={3} items={[
          { label: "Date", testId: "date", value: formatDate(record.date) },
          { label: "Status", value: <StatusBadge status={record.status} /> },
          { label: "Version", testId: "version", value: String(record.revision) },
          { label: "Result", testId: "result", value: record.result || "Not recorded yet" },
          { label: "Last updated", testId: "last-updated", value: `${formatDate(record.createdAt)} · ${record.actor}` },
        ]} /></div>
        <h3 className="mb-2 mt-8 text-sm font-semibold text-ink-2">Notes</h3>
        <p className="whitespace-pre-wrap break-words text-sm text-ink-2">{record.notes || "—"}</p>
      </Card>
      <div className="min-w-0 space-y-6">
        {/* Q14/Q16: the decision after a result is recorded here, in the same Update Progress form. */}
        {pending && <Card title="Next step" testId="training-next-step">
          {pending === "follow-up"
            ? <Notice tone="warning"><strong>Awaiting follow-up.</strong> Hasil Not Passed wajib ditindaklanjuti HR: Retraining, atau Other follow-up (coaching, rotasi, eskalasi ke atasan) dengan catatan.</Notice>
            : <div className="space-y-3">
                <p className="text-sm text-ink-2">Training Passed. Catat hasil reassessment: Meets requirement bila level kompetensinya sudah memenuhi, atau Retraining bila gap belum tertutup.</p>
                {finding && <LevelLine finding={finding} employeeId={record.employeeId} />}
              </div>}
          {canAssess(snapshot, record.employeeId) && <div className="mt-4"><Button variant="primary" icon={pending === "follow-up" ? <ListChecks className="size-4" /> : <Scale className="size-4" />} onClick={() => setProgressOpen(true)}
            data-testid={pending === "follow-up" ? "btn-record-follow-up" : "btn-record-reassessment"}>{pending === "follow-up" ? "Record Follow-up" : "Record Reassessment"}</Button></div>}
        </Card>}
        {notPassed && followUp && <Card title="Follow-up" testId="training-follow-up">
          <p className="text-sm text-ink"><span data-testid="follow-up-value" className="font-semibold">{followUp.followUp}</span> · {formatDate(followUp.createdAt)} · {followUp.actor}</p>
          {followUp.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink-2">{followUp.notes}</p>}
          {retrainings.map((item) => <div key={item.trainingId} data-testid={`retraining-${item.trainingId}`} className="mt-3"><SourceChip label="Retraining" reference={`${item.activity} · ${statusLabel(item.status)}`} href={`/training/${item.trainingId}`} /></div>)}
        </Card>}
        <Card title="Source requirement" testId="source-requirement">
          {need ? <><SourceChip label="Development Requirement" reference={statusLabel(need.status)} href={`/development/${need.needId}`} /><p className="mt-3 text-sm text-ink">{need.objective}</p>
            <div className="mt-3"><ReassessmentBadge snapshot={snapshot} needId={need.needId} /></div>
            {nextRound.map((item) => <div key={item.trainingId} data-testid={`retraining-${item.trainingId}`} className="mt-3"><SourceChip label="Retraining" reference={`${item.activity} · ${statusLabel(item.status)}`} href={`/training/${item.trainingId}`} /></div>)}</> : <p className="text-sm text-ink-3">Requirement sumber tidak tersedia.</p>}
        </Card>
        {/* Once Completed, the Next step or Follow-up card above already says what comes after. */}
        {record.status !== "Completed" && <Notice tone="warning">Training yang Completed tidak otomatis membuat gap kompetensi terpenuhi. Gap tetap terbuka sampai dinilai ulang.</Notice>}
      </div>
    </div>
    {progressOpen && <TrainingProgressModal trainingId={record.trainingId} onClose={() => setProgressOpen(false)} />}
  </>;
}

export function TrainingHistoryPage({ trainingId }: { trainingId: string }) {
  const snapshot = useSnapshot();
  const record = trainingById(snapshot, trainingId);
  const employee = record && employeeById(snapshot, record.employeeId);
  if (!record || !employee || !visibleEmployees(snapshot).some((item) => item.id === employee.id)) return <NotFound what="Training" backHref="/training" backLabel="Back to Training Tracking" />;
  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "Training Tracking", href: "/training" }, { label: "History" }]} backHref={`/training/${record.trainingId}`}
      name={employee.fullName} meta={[...employeeMeta(snapshot, employee), record.activity]} status={record.status} />
    <Card title="Status history" testId="status-history">
      <Timeline empty="Belum ada riwayat status." entries={trainingHistory(snapshot, record.trainingId).map((item) => ({
        id: item.id, date: formatDate(item.createdAt), title: `Version ${item.revision}`, status: item.status, actor: item.actor,
        body: [item.result && `Result: ${item.result}`, item.followUp && `Follow-up: ${item.followUp}`, item.notes].filter(Boolean).join(" · ") || undefined,
      }))} />
    </Card>
  </>;
}
