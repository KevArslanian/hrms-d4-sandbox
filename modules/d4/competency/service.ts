import { d4ReferenceFixture } from "../shared/fixtures";
import type { ReferenceDataSnapshot } from "../shared/types";
import type { CompetencyAssessment, CompetencyFinding, CompetencyOverallStatus } from "./types";

const storageKey = "hrms-d4-competency-assessments-v1";
const changeEvent = "hrms-d4-competency-changed";

export function compareCompetencies(employeeId: string, positionId: string, reference: ReferenceDataSnapshot = d4ReferenceFixture): {
  findings: CompetencyFinding[];
  overallStatus: CompetencyOverallStatus;
} {
  if (!reference.employees.some((item) => item.id === employeeId)) throw new Error("Employee tidak ditemukan.");
  if (!reference.positions.some((item) => item.id === positionId)) throw new Error("Posisi tidak ditemukan.");
  const requirements = reference.positionRequirements.filter((item) => item.positionId === positionId);
  const findings = requirements.map((requirement): CompetencyFinding => {
    const competency = reference.competencies.find((item) => item.id === requirement.competencyId);
    const skill = reference.employeeSkills.find((item) => item.employeeId === employeeId && item.competencyId === requirement.competencyId);
    const hasEvidence = Boolean(skill?.evidenceNotes?.trim());
    const status = !skill || !hasEvidence ? "Bukti Belum Cukup" :
      skill.proficiencyLevel < requirement.minProficiencyLevel ? "Gap" : "Terpenuhi";
    return {
      requirementId: requirement.id,
      competencyId: requirement.competencyId,
      competencyName: competency?.name ?? "Kompetensi tidak ditemukan",
      requiredLevel: requirement.minProficiencyLevel,
      actualLevel: skill?.proficiencyLevel ?? null,
      evidenceNotes: skill?.evidenceNotes ?? null,
      sourceReference: `position_requirements:${requirement.id}${skill ? ` | employee_skills:${skill.id}` : ""}`,
      status,
    };
  });
  const overallStatus: CompetencyOverallStatus = findings.length === 0 ? "Belum Ada Persyaratan" :
    findings.some((item) => item.status === "Gap") ? "Gap" :
    findings.some((item) => item.status === "Bukti Belum Cukup") ? "Bukti Belum Cukup" : "Terpenuhi";
  return { findings, overallStatus };
}

export function getCompetencyStoredSnapshot(): string {
  if (typeof window === "undefined") return "";
  try { return window.localStorage.getItem(storageKey) ?? ""; } catch { return ""; }
}

export function subscribeCompetency(listener: () => void): () => void {
  window.addEventListener("storage", listener);
  window.addEventListener(changeEvent, listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener(changeEvent, listener); };
}

export function listCompetencyAssessments(snapshot = getCompetencyStoredSnapshot()): CompetencyAssessment[] {
  try {
    const saved: unknown = JSON.parse(snapshot || "[]");
    return Array.isArray(saved) ? saved.filter((item): item is CompetencyAssessment =>
      item !== null && typeof item === "object" && item.source === "local-demo" &&
      typeof item.id === "string" && typeof item.employeeId === "string" &&
      typeof item.positionId === "string" && Array.isArray(item.findings)) : [];
  } catch { return []; }
}

export function saveCompetencyAssessment(input: {
  employeeId: string;
  positionId: string;
  effectiveDate: string;
}): CompetencyAssessment {
  if (typeof window === "undefined") throw new Error("Penyimpanan demo hanya tersedia di browser.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveDate)) throw new Error("Tanggal berlaku wajib diisi.");
  const employee = d4ReferenceFixture.employees.find((item) => item.id === input.employeeId);
  if (!employee) throw new Error("Employee tidak ditemukan pada data demo.");
  const comparison = compareCompetencies(input.employeeId, input.positionId);
  if (comparison.findings.length === 0) throw new Error("Posisi belum memiliki persyaratan kompetensi pada fixture.");
  const record: CompetencyAssessment = {
    id: window.crypto.randomUUID(),
    source: "local-demo",
    employeeId: input.employeeId,
    positionId: input.positionId,
    effectiveDate: input.effectiveDate,
    context: input.positionId === employee.positionId ? "current-position" : "role-change",
    findings: comparison.findings,
    overallStatus: comparison.overallStatus,
    createdAt: new Date().toISOString(),
    actor: "Akun demo lokal",
  };
  window.localStorage.setItem(storageKey, JSON.stringify([record, ...listCompetencyAssessments()]));
  window.dispatchEvent(new Event(changeEvent));
  return record;
}
