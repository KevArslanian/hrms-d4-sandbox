"use client";

import { ArrowRightLeft, Eye, FilePlus2, History, Save } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { CompetencyFinding } from "../../../competency/types";
import type { EmployeeReference } from "../../../shared/types";
import { openNeedFor } from "../../../shared/rules";
import { useD4, useSnapshot } from "../../data/D4DataProvider";
import { canWrite, currentCompetencyStatus, currentGap, departmentOf, developmentNeeds, employeeById, employeeMeta, employeeSearchText, formatDate, inTrainingOrPositionChange, includesText, latestCurrentPositionAssessment, positionById, positionOf, today, visibleEmployees, type CurrentCompetencyStatus } from "../../data/selectors";
import { DataTable, PersonCell } from "../../ui/DataTable";
import { FilterBar, FormError, FormModal, ModalActions, SearchInput, SearchSelectField, SelectFilter, TextField } from "../../ui/forms";
import { DetailHeader, NotFound, PageHeader, Timeline } from "../../ui/layout";
import { RowActionMenu } from "../../ui/RowActionMenu";
import { Button, ButtonLink, Card, InfoGrid, Notice, SourceChip, statusLabel, StatusBadge } from "../../ui/primitives";
import { DevelopmentFormModal } from "../development/DevelopmentModals";

type Row = { employee: EmployeeReference; position: string; status: CurrentCompetencyStatus; findings: CompetencyFinding[]; lastAssessed?: string };

// Compared with statusLabel(row.status), so these are the English display labels.
const STATUS_FILTER = ["Not Evaluated", "Met", "Gap", "Insufficient Data"];
const SCOPE_ACTIVE = "In training / position change";
const SCOPE_ALL = "All employees";

/** Optional "Dinilai bersama" (interview D4: after training HR evaluates with the department that raised the need). */
function AssessedWithField({ value, onChange, className }: { value: string; onChange: (value: string) => void; className?: string }) {
  return <TextField label="Assessed with" testId="assessed-with" maxLength={200} value={value} onChange={(event) => onChange(event.target.value)} className={className}
    placeholder="Contoh: Rina, Finance Manager" helper="Opsional. Dinilai bersama atasan atau departemen yang mengajukan kebutuhan pegawai (nama/jabatan)." />;
}

const assessedWithText = (value?: string | null) => value?.trim() ? `Dinilai bersama ${value.trim()}` : "";

export function CompetencyListPage() {
  const snapshot = useSnapshot();
  const writer = canWrite(snapshot);
  const allNeeds = developmentNeeds(snapshot);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  // Employees see only themselves, so the scope applies to HR and managers.
  const scoped = snapshot.role !== "EMPLOYEE";
  const [scope, setScope] = useState(SCOPE_ACTIVE);
  const [devFor, setDevFor] = useState<string | null>(null);
  const rows = useMemo<Row[]>(() => visibleEmployees(snapshot).filter((employee) => !scoped || scope === SCOPE_ALL || inTrainingOrPositionChange(snapshot, employee.id)).map((employee) => {
    const gap = currentGap(snapshot, employee);
    const saved = latestCurrentPositionAssessment(snapshot, employee);
    return { employee, position: positionOf(snapshot, employee)?.title ?? "—", status: currentCompetencyStatus(snapshot, employee), findings: gap?.findings ?? [], lastAssessed: saved?.effectiveDate };
  }).filter((row) => includesText(employeeSearchText(snapshot, row.employee), search)
    && (!position || row.employee.positionId === position) && (!department || row.employee.departmentId === department) && (!status || statusLabel(row.status) === status))
    .sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName)), [snapshot, scoped, scope, search, position, department, status]);

  return <>
    <PageHeader title="Competency Gap" subtitle="Bandingkan kemampuan dan bukti pegawai dengan persyaratan posisinya. Kompetensi dinilai saat pegawai sedang training atau naik jabatan." />
    <FilterBar canReset={Boolean(search || position || department || status || scope !== SCOPE_ACTIVE)} onReset={() => { setSearch(""); setPosition(""); setDepartment(""); setStatus(""); setScope(SCOPE_ACTIVE); }}>
      <SearchInput value={search} onChange={setSearch} placeholder="Search name or position" />
      {scoped && <SelectFilter label="Scope" testId="competency-scope" value={scope} onChange={setScope} emptyOption={false} options={[SCOPE_ACTIVE, SCOPE_ALL].map((item) => ({ value: item, label: item }))} />}
      {snapshot.role !== "EMPLOYEE" && <SelectFilter label="All positions" testId="all-positions" value={position} onChange={setPosition} options={snapshot.reference.positions.map((item) => ({ value: item.id, label: item.title }))} />}
      {snapshot.role !== "EMPLOYEE" && <SelectFilter label="All departments" testId="all-departments" value={department} onChange={setDepartment} options={snapshot.reference.departments.map((item) => ({ value: item.id, label: item.name }))} />}
      <SelectFilter label="All status" testId="all-gap-status" value={status} onChange={setStatus} options={STATUS_FILTER.map((item) => ({ value: item, label: item }))} />
    </FilterBar>
    <DataTable<Row> rows={rows} noun="employees" rowKey={(row) => row.employee.id}
      emptyTitle="Tidak ada pegawai yang cocok" emptyText={scoped && scope === SCOPE_ACTIVE ? "Belum ada pegawai yang sedang training atau naik jabatan. Pilih All employees untuk memulai penilaian." : "Ubah kata kunci atau reset filter."}
      columns={[
        { key: "employee", header: "Employee", cell: (row) => <PersonCell name={row.employee.fullName} code={row.employee.employeeId} /> },
        { key: "position", header: "Position", wrap: true, cell: (row) => row.position },
        { key: "department", header: "Department", wrap: true, cell: (row) => departmentOf(snapshot, row.employee)?.name ?? "—" },
        { key: "requirements", header: "Requirement", className: "tabular-nums", cell: (row) => row.findings.length || "—" },
        { key: "gaps", header: "Gap", className: "tabular-nums", cell: (row) => row.findings.filter((item) => item.status === "Gap").length || "—" },
        { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
        { key: "assessed", header: "Last saved", cell: (row) => formatDate(row.lastAssessed) },
      ]}
      actions={(row) => <RowActionMenu label={`Actions for ${row.employee.fullName}`} actions={[
        { label: "View Detail", testId: "view-detail", icon: <Eye />, href: `/competency/${row.employee.id}` },
        { label: "View History", testId: "view-history", icon: <History />, href: `/competency/${row.employee.id}/history` },
        { label: "Create Development Requirement", testId: "create-development-requirement", icon: <FilePlus2 />, onSelect: () => setDevFor(row.employee.id),
          hidden: !writer || row.status === "Not Evaluated" || row.findings.filter((item) => item.status === "Gap").every((item) => openNeedFor(allNeeds, row.employee.id, "competency_gap", item.requirementId)) },
      ]} />} />
    {devFor && <DevelopmentFormModal employeeId={devFor} sourceType="competency_gap" onClose={() => setDevFor(null)} />}
  </>;
}

function PositionChangeModal({ employee, onClose }: { employee: EmployeeReference; onClose: () => void }) {
  const snapshot = useSnapshot();
  const { run, busy } = useD4();
  const [position, setPosition] = useState("");
  const [date, setDate] = useState(today());
  const [assessedWith, setAssessedWith] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!position) { setError("Pilih posisi baru."); return; }
    const result = await run((source) => source.saveCompetency({ employeeId: employee.id, positionId: position, effectiveDate: date, assessedWith }), "Penilaian perubahan posisi tersimpan.");
    if (result.ok) onClose(); else setError(result.error);
  }
  return <FormModal title="Position Change Assessment" description="Bandingkan kemampuan pegawai dengan persyaratan posisi baru. Riwayat gap untuk posisi lama tetap disimpan." onClose={onClose}
    footer={<ModalActions onCancel={onClose} busy={busy} submitLabel="Save Assessment" />}>
    <form id="d4-modal-form" onSubmit={submit} noValidate className="space-y-5">
      <FormError message={error} />
      <SearchSelectField label="New position" testId="new-position" required value={position} onChange={(value) => setPosition(value)} placeholder="Select position"
        options={snapshot.reference.positions.filter((item) => item.id !== employee.positionId).map((item) => ({ value: item.id, label: `${item.title}` }))} />
      <TextField label="Effective date" testId="effective-date" required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      <AssessedWithField value={assessedWith} onChange={setAssessedWith} />
      <Notice>Penilaian ini tidak mengubah data master posisi pegawai dan tidak memindahkan siapa pun secara otomatis.</Notice>
    </form>
  </FormModal>;
}

export function CompetencyDetailPage({ employeeId }: { employeeId: string }) {
  const snapshot = useSnapshot();
  const { run, busy } = useD4();
  const writer = canWrite(snapshot);
  const [devRef, setDevRef] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const [assessedWith, setAssessedWith] = useState("");
  const employee = employeeById(snapshot, employeeId);
  if (!employee || !visibleEmployees(snapshot).some((item) => item.id === employeeId)) return <NotFound what="Employee" backHref="/competency" backLabel="Back to Competency Gap" />;
  const gap = currentGap(snapshot, employee);
  const needs = developmentNeeds(snapshot).filter((item) => item.employeeId === employee.id && item.sourceType === "competency_gap");
  const saved = latestCurrentPositionAssessment(snapshot, employee);
  const assessed = Boolean(saved);
  // Saving again the same day with the same result only duplicates history.
  const sameAsSaved = (item: CompetencyFinding) => `${item.requirementId}:${item.actualLevel}:${item.status}`;
  // Naming a different co-assessor makes it a new snapshot, as on the server; an empty field changes nothing.
  const savedToday = Boolean(saved && gap && saved.effectiveDate === today() && (!assessedWith.trim() || (saved.assessedWith ?? "") === assessedWith.trim())
    && saved.findings.map(sameAsSaved).sort().join("|") === gap.findings.map(sameAsSaved).sort().join("|"));
  const canSave = writer && Boolean(gap?.findings.length);
  const saveSnapshot = () => employee.positionId && void run((source) => source.saveCompetency({ employeeId: employee.id, positionId: employee.positionId!, effectiveDate: today(), assessedWith }), "Penilaian kompetensi tersimpan ke riwayat.");

  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "Competency Gap", href: "/competency" }, { label: "Detail" }]} backHref="/competency"
      name={employee.fullName} meta={employeeMeta(snapshot, employee)}
      status={currentCompetencyStatus(snapshot, employee)}
      actions={<>
        <ButtonLink href={`/competency/${employee.id}/history`} icon={<History className="size-4" />} testId="view-history">View History</ButtonLink>
        {writer && <Button icon={<ArrowRightLeft className="size-4" />} onClick={() => setChanging(true)} data-testid="btn-assess-position-change">Assess Position Change</Button>}
      </>} />
    <Notice>{!assessed && <>Status keseluruhan tetap <strong>Not Evaluated</strong> sampai penilaian untuk posisi aktif disimpan; Development Requirement dari gap baru bisa dibuat setelah itu. </>}Bukti yang belum ada pada perbandingan persyaratan ditandai <strong>Insufficient Data</strong>, bukan otomatis Gap. Gap tidak pernah otomatis menetapkan training, promosi, atau sertifikasi.</Notice>
    {(saved || canSave) && <Card title="Assessment" testId="assessment-saved">
      <InfoGrid columns={3} items={[
        { label: "Last saved", testId: "last-saved", value: saved ? formatDate(saved.effectiveDate) : "Not saved yet" },
        { label: "Recorded by", testId: "recorded-by", value: saved?.actor ?? "—" },
        { label: "Last assessed with", testId: "assessed-with-saved", value: saved?.assessedWith || "—" },
      ]} />
      {/* The next save sits apart from what was saved last, and its button sits right next to the field it sends. */}
      {canSave && <div className="mt-5 flex flex-wrap items-start gap-x-3 gap-y-2 border-t border-line pt-5">
        <AssessedWithField className="min-w-[240px] flex-[1_1_320px]" value={assessedWith} onChange={setAssessedWith} />
        <Button icon={<Save className="size-4" />} className="sm:mt-[26px]" disabled={busy || savedToday} title={savedToday ? "Sudah disimpan hari ini dengan hasil yang sama." : undefined} onClick={saveSnapshot} data-testid="btn-save-assessment">{savedToday ? "Saved Today" : "Save Assessment"}</Button>
      </div>}
    </Card>}
    <Card title="Requirement vs capability" testId="requirement-vs-capability" padded={false}>
      <div className="overflow-x-auto">
        <table data-testid="competency-gap-table" className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-app text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3"><tr><th className="px-5 py-2.5">Competency</th><th className="px-5 py-2.5">Required</th><th className="px-5 py-2.5">Actual</th><th className="px-5 py-2.5">Evidence</th><th className="px-5 py-2.5">Status</th><th className="px-5 py-2.5 text-right">Action</th></tr></thead>
          <tbody>{(gap?.findings ?? []).map((finding) => {
            // Prefer the unfinished need; a completed one does not block raising a new need for a gap that remains.
            const open = needs.find((need) => need.sourceRef === finding.requirementId && need.status !== "Completed");
            const linked = open ?? needs.find((need) => need.sourceRef === finding.requirementId);
            return <tr key={finding.requirementId} data-testid={`gap-${finding.requirementId}`} className="border-t border-line align-middle">
              <td className="px-5 py-3 font-semibold">{finding.competencyName}</td>
              <td className="px-5 py-3 tabular-nums">Level {finding.requiredLevel}</td>
              <td className="px-5 py-3 tabular-nums">{finding.actualLevel === null ? "—" : `Level ${finding.actualLevel}`}</td>
              <td className="max-w-[280px] px-5 py-3 text-ink-2">{finding.evidenceNotes?.trim() || "Belum ada bukti"}</td>
              <td className="px-5 py-3"><StatusBadge status={finding.status} /></td>
              <td className="px-5 py-3 text-right">{linked && (open || finding.status !== "Gap" || !writer) ? <SourceChip label="Development" reference={statusLabel(linked.status)} href={`/development/${linked.needId}`} />
                : finding.status === "Gap" && writer && !assessed ? <span className="text-xs text-ink-3">Simpan penilaian dulu</span>
                : finding.status === "Gap" && writer ? <Button variant="ghost" className="h-9" icon={<FilePlus2 className="size-4" />} onClick={() => setDevRef(finding.requirementId)} data-testid="btn-create-development-requirement">Create Development Requirement</Button> : "—"}</td>
            </tr>;
          })}</tbody>
        </table>
        {!gap?.findings.length && <p className="px-5 py-10 text-center text-sm text-ink-3">{gap ? "Posisi ini belum memiliki persyaratan kompetensi." : "Pegawai belum memiliki posisi aktif."}</p>}
      </div>
    </Card>
    {devRef && <DevelopmentFormModal employeeId={employee.id} sourceType="competency_gap" sourceRef={devRef} onClose={() => setDevRef(null)} />}
    {changing && <PositionChangeModal employee={employee} onClose={() => setChanging(false)} />}
  </>;
}

export function CompetencyHistoryPage({ employeeId }: { employeeId: string }) {
  const snapshot = useSnapshot();
  const employee = employeeById(snapshot, employeeId);
  if (!employee || !visibleEmployees(snapshot).some((item) => item.id === employeeId)) return <NotFound what="Employee" backHref="/competency" backLabel="Back to Competency Gap" />;
  const saved = snapshot.competency.filter((item) => item.employeeId === employee.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <>
    <DetailHeader crumbs={[{ label: "HRMS" }, { label: "Competency Gap", href: "/competency" }, { label: "History" }]} backHref={`/competency/${employee.id}`}
      name={employee.fullName} meta={[...employeeMeta(snapshot, employee), `${saved.length} saved ${saved.length === 1 ? "assessment" : "assessments"}`]} />
    <Card title="Assessment history" testId="assessment-history">
      <Timeline empty="Belum ada penilaian kompetensi yang tersimpan untuk pegawai ini." entries={saved.map((item) => ({
        id: item.id, date: formatDate(item.effectiveDate), status: item.overallStatus, actor: item.actor,
        title: `${positionById(snapshot, item.positionId)?.title ?? "Position"} — ${item.context === "role-change" ? "position change" : "current position"}`,
        body: [`${item.findings.length} requirement · ${item.findings.filter((finding) => finding.status === "Gap").length} gap · ${item.findings.filter((finding) => finding.status === "Bukti Belum Cukup").length} insufficient data`, assessedWithText(item.assessedWith)].filter(Boolean).join(" · "),
      }))} />
    </Card>
  </>;
}
