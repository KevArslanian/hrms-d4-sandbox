"use client";

import { Eye, FileSearch, History, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import type { TrainingVersion } from "../../../training/types";
import { useSnapshot } from "../../data/D4DataProvider";
import { canWrite, employeeById, employeeMeta, formatDate, formatPeriod, includesText, trainingById, trainingHistory, trainings, trainingSource, visibleEmployees } from "../../data/selectors";
import { DataTable, PersonCell } from "../../ui/DataTable";
import { FilterBar, SearchInput, SelectFilter } from "../../ui/forms";
import { DetailHeader, NotFound, PageHeader, Timeline } from "../../ui/layout";
import { RowActionMenu } from "../../ui/RowActionMenu";
import { Button, ButtonLink, Card, InfoGrid, Notice, SourceChip, statusLabel, StatusBadge } from "../../ui/primitives";
import { TrainingProgressModal } from "./TrainingModals";

export function TrainingListPage() {
  const snapshot = useSnapshot();
  const writer = canWrite(snapshot);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [period, setPeriod] = useState("");
  const [status, setStatus] = useState("");
  const [progressFor, setProgressFor] = useState<string | null>(null);
  const all = useMemo(() => {
    const visible = new Set(visibleEmployees(snapshot).map((item) => item.id));
    return trainings(snapshot).filter((item) => visible.has(item.employeeId));
  }, [snapshot]);
  const periods = [...new Set(all.map((item) => item.date.slice(0, 7)))].sort().reverse();
  const rows = all.filter((item) => {
    const employee = employeeById(snapshot, item.employeeId);
    return includesText(`${employee?.fullName ?? ""} ${employee?.employeeId ?? ""} ${item.activity}`, search)
      && (!department || employee?.departmentId === department)
      && (!period || item.date.startsWith(period)) && (!status || item.status === status);
  });

  return <>
    <PageHeader title="Training Tracking" subtitle="Pantau training dan development dari requirement sumber sampai hasilnya." />
    <FilterBar canReset={Boolean(search || department || period || status)} onReset={() => { setSearch(""); setDepartment(""); setPeriod(""); setStatus(""); }}>
      <SearchInput value={search} onChange={setSearch} placeholder="Search keyword" />
      {snapshot.role !== "EMPLOYEE" && <SelectFilter label="All departments" testId="all-departments" value={department} onChange={setDepartment} options={snapshot.reference.departments.map((item) => ({ value: item.id, label: item.name }))} />}
      <SelectFilter label="All periods" testId="all-periods" value={period} onChange={setPeriod} options={periods.map((item) => ({ value: item, label: formatPeriod(item) }))} />
      <SelectFilter label="All status" testId="all-status" value={status} onChange={setStatus} options={["Planned", "In Progress", "Completed", "Cancelled"].map((item) => ({ value: item, label: statusLabel(item) }))} />
    </FilterBar>
    <DataTable<TrainingVersion> rows={rows} noun="data training" rowKey={(row) => row.trainingId}
      emptyTitle="Tidak ada training yang cocok" emptyText="Training dibuat dari development requirement (Create Training). Ubah filter atau buka Development Requirement."
      columns={[
        { key: "employee", header: "Employee", cell: (row) => { const employee = employeeById(snapshot, row.employeeId); return <PersonCell name={employee?.fullName ?? "—"} code={employee?.employeeId ?? ""} />; } },
        { key: "activity", header: "Training", wrap: true, cell: (row) => <span className="font-semibold">{row.activity}</span> },
        { key: "source", header: "Source requirement", wrap: true, className: "max-w-[260px]", cell: (row) => <span className="line-clamp-2 text-ink-2">{trainingSource(snapshot, row)?.objective ?? "—"}</span> },
        { key: "date", header: "Date", cell: (row) => formatDate(row.date) },
        { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
      ]}
      actions={(row) => <RowActionMenu label={`Actions for ${row.activity}`} actions={[
        { label: "View Detail", testId: "view-detail", icon: <Eye />, href: `/training/${row.trainingId}` },
        { label: "View History", testId: "view-history", icon: <History />, href: `/training/${row.trainingId}/history` },
        { label: "Update Progress", testId: "update-progress", icon: <RefreshCw />, onSelect: () => setProgressFor(row.trainingId), hidden: !writer },
        { label: "Open Source Requirement", testId: "open-source-requirement", icon: <FileSearch />, href: `/development/${row.developmentNeedId}` },
      ]} />} />
    {progressFor && <TrainingProgressModal trainingId={progressFor} onClose={() => setProgressFor(null)} />}
  </>;
}

export function TrainingDetailPage({ trainingId }: { trainingId: string }) {
  const snapshot = useSnapshot();
  const [progressOpen, setProgressOpen] = useState(false);
  const record = trainingById(snapshot, trainingId);
  const employee = record && employeeById(snapshot, record.employeeId);
  if (!record || !employee || !visibleEmployees(snapshot).some((item) => item.id === employee.id)) return <NotFound what="Training" backHref="/training" backLabel="Back to Training Tracking" />;
  const need = trainingSource(snapshot, record);
  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "Training Tracking", href: "/training" }, { label: "Detail" }]} backHref="/training"
      name={employee.fullName} meta={[...employeeMeta(snapshot, employee), record.activity]} status={record.status}
      actions={<>
        <ButtonLink href={`/training/${record.trainingId}/history`} icon={<History className="size-4" />} testId="view-history">View History</ButtonLink>
        {canWrite(snapshot) && <Button icon={<RefreshCw className="size-4" />} onClick={() => setProgressOpen(true)} data-testid="btn-update-progress">Update Progress</Button>}
      </>} />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
      <Card title="Training">
        <p className="font-display font-semibold text-lg text-ink">{record.activity}</p>
        <div className="mt-6"><InfoGrid columns={3} items={[
          { label: "Date", testId: "date", value: formatDate(record.date) },
          { label: "Status", value: <StatusBadge status={record.status} /> },
          { label: "Version", testId: "version", value: String(record.revision) },
          { label: "Result", testId: "result", value: record.result || "Not recorded yet" },
          { label: "Last updated", testId: "last-updated", value: `${formatDate(record.createdAt)} · ${record.actor}` },
        ]} /></div>
        <h3 className="mb-2 mt-8 text-sm font-semibold text-ink-2">Notes</h3>
        <p className="whitespace-pre-wrap text-sm text-ink-2">{record.notes || "—"}</p>
      </Card>
      <div className="space-y-6">
        <Card title="Source requirement" testId="source-requirement">
          {need ? <><SourceChip label="Development Requirement" reference={statusLabel(need.status)} href={`/development/${need.needId}`} /><p className="mt-3 text-sm text-ink">{need.objective}</p></> : <p className="text-sm text-ink-3">Requirement sumber tidak tersedia.</p>}
        </Card>
        <Notice tone="warning">Training yang Completed tidak otomatis membuat gap kompetensi terpenuhi. Gap tetap terbuka sampai dinilai ulang.</Notice>
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
        body: [item.result && `Result: ${item.result}`, item.notes].filter(Boolean).join(" · ") || undefined,
      }))} />
    </Card>
  </>;
}
