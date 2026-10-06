import { compareCompetencies } from "../../competency/service";
import { developmentFixtureVersions } from "../../development/fixtures";
import { indicatorsFor, KPI_V51_CATALOG, roleForPositionTitle, selectCatalog } from "../../kpi/catalog";
import { performanceFixtureRecords } from "../../performance/fixtures";
import { validatePerformanceInput } from "../../performance/validation";
import { d4ReferenceFixture } from "../../shared/fixtures";
import { assertDevelopmentChange, assertNeedOpen, assertNoOpenNeed, assertNotFutureDate, assertNotSelf, assertPeriodRevision, assertTrainingChange } from "../../shared/rules";
import type { CompetencyAssessment } from "../../competency/types";
import type { D4LiveSnapshot, KpiAssessment, KpiAssessmentLine } from "../../supabase/types";
import { latestDevelopment, latestTraining } from "../../supabase/types";
import { trainingFixtureVersions } from "../../training/fixtures";
import type { D4DataSource } from "./source";

// Local preview only (NEXT_PUBLIC_D4_DATA_MODE=fixture in development). All people and
// records are fictional; writes live in memory and disappear on reload. The rules below
// mirror the server so the UI behaves the same as in live mode.
const employee = (n: number) => `d4000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const HR_ACTOR = employee(12); // Mercury, HR Associate Officer (Learning, Development & Performance)
const MANAGER_ACTOR = employee(50); // Romeo, Sales Executive 2: direct superior of Sales Administration Team 2
const ALFA = employee(9);
// NEXT_PUBLIC_D4_FIXTURE_ROLE=EMPLOYEE previews the self-service view as Alfa (read-only).
const FIXTURE_ROLE = process.env.NEXT_PUBLIC_D4_FIXTURE_ROLE === "EMPLOYEE" ? "EMPLOYEE" : process.env.NEXT_PUBLIC_D4_FIXTURE_ROLE === "MANAGER" ? "MANAGER" : "HR";
const catalog = selectCatalog(KPI_V51_CATALOG);

const SALES = 9;
const FINANCE = 10;
// Targets per KPI line. Finance follows the "SAMPEL EVALUATION CARD" sheet of KPI Scorecard V5.1.
const TARGETS: Record<number, string[]> = {
  [SALES]: ["Rp 1,2 M volume/bulan", "4 klien baru/bulan", "100% quotation tanpa revisi harga", "Win rate ≥ 35%", "Order lengkap H-1 sebelum job"],
  [FINANCE]: ["100% SLA < 24 Jam", "100% Akurat", "H+1 dari Approval", "Piutang Macet < 5%", "Zero Denda, Arsip Rapi"],
};

type Line = [number, string, string]; // raw score, realisation, comment

function kpiLines(roleOrder: number, lines: Line[]): KpiAssessmentLine[] {
  return indicatorsFor(catalog, roleOrder).map((row, index) => ({
    indicator_order: row.indicator_order, kpi_name: row.kpi_name, weight_percent: row.weight_percent,
    target: TARGETS[roleOrder]?.[index] ?? "", actual: lines[index]?.[1] ?? "", raw_score: lines[index]?.[0] ?? null, comment: lines[index]?.[2] ?? "",
  }));
}

function total(lines: readonly KpiAssessmentLine[]): number | null {
  if (lines.some((line) => line.raw_score === null)) return null;
  return Math.round(lines.reduce((sum, line) => sum + line.weight_percent * (line.raw_score ?? 0) / 100, 0) * 100) / 100;
}

function assessment(id: string, employeeId: string, roleOrder: number, period: string, evaluatorName: string, lines: Line[], generalNotes: string): KpiAssessment {
  const kpi = kpiLines(roleOrder, lines);
  return {
    id, definitionVersion: catalog.version, employeeId, roleOrder, roleName: indicatorsFor(catalog, roleOrder)[0].role_name,
    period, evaluationDate: `${period}-25`, evaluatorName, status: "completed", lines: kpi, overallScore: total(kpi),
    generalNotes, createdAt: `${period}-25T08:${id.slice(-2)}:00.000Z`, actor: evaluatorName,
  };
}

/** Scores 1–5 are entered by the evaluator; realisation is never converted into a score. */
const kpiAssessments: KpiAssessment[] = [
  assessment("FIX-D4-KPI-001", ALFA, SALES, "2026-09", "Romeo", [
    [4, "Rp 1,25 M", "Volume naik dari Agustus."], [3, "3 klien baru", "Kurang satu klien."], [3, "2 quotation direvisi", "Cek tarif handling sebelum kirim."],
    [4, "38%", "Di atas target."], [4, "Order lengkap, 1 terlambat", "Worksheet AENAT/2609/0354 terlambat lengkap."],
  ], "Kinerja Baik. Rekomendasi pelatihan: akurasi worksheet dan quotation."),
  assessment("FIX-D4-KPI-002", ALFA, SALES, "2026-06", "Romeo", [
    [3, "Rp 1,05 M", ""], [3, "3 klien baru", ""], [3, "3 quotation direvisi", ""], [3, "33%", ""], [3, "2 order terlambat lengkap", ""],
  ], "Cukup. Fokus pada kelengkapan order."),
  assessment("FIX-D4-KPI-003", employee(10), SALES, "2026-09", "Romeo", [
    [4, "Rp 1,30 M", ""], [4, "4 klien baru", ""], [5, "0 revisi", "Sangat teliti."], [3, "31%", "Perlu follow-up quotation."], [4, "Order lengkap", ""],
  ], "Baik. Kandidat pengembangan ke Sales Executive."),
  assessment("FIX-D4-KPI-004", employee(11), SALES, "2026-09", "Romeo", [
    [3, "Rp 1,10 M", ""], [3, "3 klien baru", ""], [3, "2 revisi", ""], [3, "34%", ""], [2, "3 job tertahan billing", "Dokumen reimbursement belum lengkap."],
  ], "Cukup. Perkuat penyiapan data siap tagih."),
  assessment("FIX-D4-KPI-005", employee(13), SALES, "2026-09", "Romeo", [
    [5, "Rp 1,50 M", "Melampaui target."], [4, "5 klien baru", ""], [5, "0 revisi", ""], [4, "40%", ""], [5, "Seluruh order lengkap H-1", ""],
  ], "Sangat Baik."),
  assessment("FIX-D4-KPI-006", employee(14), SALES, "2026-09", "Romeo", [
    [3, "Rp 1,15 M", ""], [3, "3 klien baru", ""], [2, "4 revisi", "Gross weight salah input."], [3, "30%", ""], [3, "1 order terlambat", ""],
  ], "Cukup. Ikuti pelatihan worksheet ERP."),
  assessment("FIX-D4-KPI-007", employee(15), SALES, "2026-09", "Romeo", [
    [4, "Rp 1,22 M", ""], [4, "4 klien baru", ""], [4, "1 revisi", ""], [3, "33%", ""], [4, "Order lengkap", ""],
  ], "Baik."),
  assessment("FIX-D4-KPI-008", employee(49), SALES, "2026-09", "Romeo", [
    [4, "Rp 1,28 M", ""], [4, "4 klien baru", ""], [4, "1 revisi", ""], [4, "36%", ""], [4, "Order lengkap", ""],
  ], "Baik."),
  assessment("FIX-D4-KPI-009", employee(50), SALES, "2026-09", "Mercury", [
    [4, "Rp 6,4 M (Sales Team 2)", ""], [4, "18 klien baru tim", ""], [4, "Revisi < 5%", ""], [4, "37%", ""], [3, "4 order tim terlambat", "Koordinasi dengan Sales Admin."],
  ], "Baik."),
  assessment("FIX-D4-KPI-010", employee(54), FINANCE, "2026-09", "Mercury", [
    [4, "Tercapai, terbit < 24 jam", ""], [5, "Tidak ada error pada GL", ""], [4, "100% dibayar tepat waktu", ""],
    [3, "Piutang tertunggak masih 10%", "Perlu reminder H-3 dan H+1 jatuh tempo."], [4, "Tepat waktu pelaporan pajak", ""],
  ], "Kinerja secara keseluruhan Baik (4,10). Collection perlu perbaikan."),
  assessment("FIX-D4-KPI-011", employee(55), FINANCE, "2026-09", "Mercury", [
    [3, "92% invoice < 24 jam", ""], [3, "2 koreksi GL", ""], [4, "Pembayaran tepat waktu", ""], [3, "Piutang macet 7%", ""], [3, "Arsip belum lengkap", "Invoice 26 28597A direvisi."],
  ], "Cukup. Ikuti workshop invoice."),
];

function initialSnapshot(): D4LiveSnapshot {
  // A saved gap snapshot for every employee with position requirements, plus one Assess Position Change.
  const competency: CompetencyAssessment[] = d4ReferenceFixture.employees.map((person, index) => {
    const comparison = compareCompetencies(person.id, person.positionId!, d4ReferenceFixture);
    const no = Number(person.id.slice(-3));
    return {
      id: no === 9 ? "FIX-D4-COMP-ASSESS-001" : `FIX-D4-COMP-ASSESS-${String(no).padStart(3, "0")}`, source: "local-demo" as const,
      employeeId: person.id, positionId: person.positionId!, effectiveDate: "2026-09-21", context: "current-position",
      findings: comparison.findings, overallStatus: comparison.overallStatus,
      createdAt: `2026-09-21T${String(index).padStart(2, "0")}:00:00.000Z`, actor: "Mercury",
    };
  });
  const salesExecutive = d4ReferenceFixture.positions.find((item) => item.title === "Sales Executive")!.id;
  const roleChange = compareCompetencies(employee(10), salesExecutive, d4ReferenceFixture);
  competency.unshift({
    id: "FIX-D4-COMP-ASSESS-RC-010", source: "local-demo", employeeId: employee(10), positionId: salesExecutive, effectiveDate: "2026-09-25",
    context: "role-change", findings: roleChange.findings, overallStatus: roleChange.overallStatus, createdAt: "2026-09-25T09:00:00.000Z", actor: "Mercury",
  });
  const actorEmployeeId = FIXTURE_ROLE === "EMPLOYEE" ? ALFA : FIXTURE_ROLE === "MANAGER" ? MANAGER_ACTOR : HR_ACTOR;
  return {
    reference: d4ReferenceFixture,
    role: FIXTURE_ROLE,
    actorEmployeeId,
    kpi: [],
    kpiAssessments,
    performance: performanceFixtureRecords,
    competency,
    developmentVersions: developmentFixtureVersions,
    trainingVersions: trainingFixtureVersions,
  };
}

/** What RLS returns to an employee: only their own records, so detail URLs of others show NotFound. */
function ownRecords(snapshot: D4LiveSnapshot): D4LiveSnapshot {
  const own = <T extends { employeeId: string }>(items: readonly T[]) => items.filter((item) => item.employeeId === snapshot.actorEmployeeId);
  return {
    ...snapshot, performance: own(snapshot.performance), kpiAssessments: own(snapshot.kpiAssessments ?? []), competency: own(snapshot.competency),
    developmentVersions: own(snapshot.developmentVersions), trainingVersions: own(snapshot.trainingVersions),
  };
}

const now = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
const delay = () => new Promise((resolve) => setTimeout(resolve, 250));

export function createFixtureSource(): D4DataSource {
  let state = initialSnapshot();
  const update = (patch: Partial<D4LiveSnapshot>) => { state = { ...state, ...patch }; };
  const assertWriter = () => { if (state.role === "EMPLOYEE") throw new Error("Hanya HR atau Manager yang dapat menyimpan perubahan."); };
  // The evaluator is always the signed-in actor, never a free-text value from the form.
  const actorName = () => state.reference.employees.find((item) => item.id === state.actorEmployeeId)?.fullName ?? "HR";
  return {
    mode: "fixture",
    async loadSnapshot() { await delay(); return state.role === "EMPLOYEE" ? ownRecords(state) : state; },
    async loadKpiCatalog() { return catalog; },
    async createEvaluation({ revisionOf, ...draft }) {
      assertWriter();
      const input = { ...draft, evaluator: actorName() };
      validatePerformanceInput(input);
      assertNotSelf(state.actorEmployeeId, input.employeeId);
      assertNotFutureDate(input.evaluationDate);
      assertPeriodRevision(state.performance, input.employeeId, input.period, revisionOf, "Evaluasi");
      const id = newId("FIX-D4-PERF");
      update({ performance: [{ ...input, id, source: "local-demo", createdAt: now(), actor: actorName() }, ...state.performance] });
      return id;
    },
    async createKpiAssessment({ revisionOf, ...draft }) {
      assertWriter();
      const input = { ...draft, evaluatorName: actorName() };
      assertNotSelf(state.actorEmployeeId, input.employeeId);
      assertNotFutureDate(input.evaluationDate);
      assertPeriodRevision(state.kpiAssessments ?? [], input.employeeId, input.period, revisionOf, "Scorecard");
      const indicators = indicatorsFor(catalog, input.roleOrder);
      if (indicators.length !== 5) throw new Error("Jabatan KPI tidak ditemukan pada katalog.");
      const employee = state.reference.employees.find((item) => item.id === input.employeeId);
      const positionTitle = state.reference.positions.find((item) => item.id === employee?.positionId)?.title;
      if (roleForPositionTitle(catalog, positionTitle) !== input.roleOrder) throw new Error("KPI yang dipilih bukan KPI untuk position employee ini.");
      if (input.status === "completed" && input.lines.some((line) => line.raw_score === null)) throw new Error("Seluruh lima indikator harus dinilai sebelum diselesaikan.");
      const id = newId("FIX-D4-KPI");
      update({ kpiAssessments: [{ ...input, id, definitionVersion: catalog.version, roleName: indicators[0].role_name, overallScore: total(input.lines), createdAt: now(), actor: actorName() }, ...(state.kpiAssessments ?? [])] });
      return id;
    },
    async saveCompetency(input) {
      assertWriter();
      const employee = state.reference.employees.find((item) => item.id === input.employeeId);
      if (!employee) throw new Error("Employee tidak ditemukan.");
      const comparison = compareCompetencies(input.employeeId, input.positionId, state.reference);
      if (!comparison.findings.length) throw new Error("Persyaratan kompetensi posisi belum tersedia.");
      const id = newId("FIX-D4-COMP");
      update({ competency: [{ id, source: "local-demo", employeeId: input.employeeId, positionId: input.positionId, effectiveDate: input.effectiveDate, context: employee.positionId === input.positionId ? "current-position" : "role-change", findings: comparison.findings, overallStatus: comparison.overallStatus, createdAt: now(), actor: actorName() }, ...state.competency] });
      return id;
    },
    async createDevelopment(input) {
      assertWriter();
      if (!input.objective.trim()) throw new Error("Development objective wajib diisi.");
      if (!input.sourceRef) throw new Error("Referensi sumber wajib dipilih.");
      assertNoOpenNeed(latestDevelopment(state), input.employeeId, input.sourceType, input.sourceRef);
      const needId = newId("FIX-D4-DEV");
      update({ developmentVersions: [{ ...input, id: newId("FIX-D4-DEV-V"), needId, revision: 1, source: "local-demo", status: "Identified", createdAt: now(), actor: actorName() }, ...state.developmentVersions] });
      return needId;
    },
    async updateDevelopment(needId, status, notes) {
      assertWriter();
      const current = latestDevelopment(state).find((item) => item.needId === needId);
      if (!current) throw new Error("Development need tidak ditemukan.");
      assertDevelopmentChange(current.status, status, notes);
      update({ developmentVersions: [{ ...current, id: newId("FIX-D4-DEV-V"), revision: current.revision + 1, status, notes, createdAt: now(), actor: actorName() }, ...state.developmentVersions] });
    },
    async createTraining(input) {
      assertWriter();
      const need = latestDevelopment(state).find((item) => item.needId === input.developmentNeedId);
      if (!need || need.employeeId !== input.employeeId) throw new Error("Training harus mengacu pada development need milik employee yang sama.");
      assertNeedOpen(need);
      if (input.status === "Completed" && !input.result.trim()) throw new Error("Hasil wajib diisi saat training selesai.");
      const trainingId = newId("FIX-D4-TRN");
      update({ trainingVersions: [{ ...input, id: newId("FIX-D4-TRN-V"), trainingId, revision: 1, source: "local-demo", createdAt: now(), actor: actorName() }, ...state.trainingVersions] });
      return trainingId;
    },
    async updateTraining(trainingId, status, result, notes) {
      assertWriter();
      const current = latestTraining(state).find((item) => item.trainingId === trainingId);
      if (!current) throw new Error("Training tidak ditemukan.");
      if (status === "Completed" && !result.trim()) throw new Error("Hasil wajib diisi saat training selesai.");
      assertTrainingChange(current.status, status, notes);
      update({ trainingVersions: [{ ...current, id: newId("FIX-D4-TRN-V"), revision: current.revision + 1, status, result, notes, createdAt: now(), actor: actorName() }, ...state.trainingVersions] });
    },
  };
}
