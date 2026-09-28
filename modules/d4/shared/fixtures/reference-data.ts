import type { ReferenceDataRepository } from "../services";
import type { ReferenceDataSnapshot } from "../types";

/** Fictional D4 data only. No production or Supabase records are stored here. */
export const d4ReferenceFixture: ReferenceDataSnapshot = {
  source: "fixture",
  departments: [
    {
      id: "d4000000-0000-4000-8000-000000000001",
      code: "FIX-D4-DEPT",
      name: "Departemen Demo D4",
    },
    {
      id: "d4000000-0000-4000-8000-000000000007",
      code: "FIX-D4-FIN",
      name: "Finance & Administration",
    },
  ],
  positions: [
    {
      id: "d4000000-0000-4000-8000-000000000002",
      code: "FIX-D4-POS",
      title: "Staf Demo D4",
      departmentId: "d4000000-0000-4000-8000-000000000001",
    },
    {
      id: "d4000000-0000-4000-8000-000000000008",
      code: "FIX-D4-FIN-STAFF",
      title: "Finance & Administration",
      departmentId: "d4000000-0000-4000-8000-000000000007",
    },
  ],
  employees: [
    {
      id: "d4000000-0000-4000-8000-000000000003",
      employeeId: "FIX-D4-EMP-001",
      fullName: "Pegawai Demo D4",
      positionId: "d4000000-0000-4000-8000-000000000002",
      departmentId: "d4000000-0000-4000-8000-000000000001",
    },
    {
      id: "d4000000-0000-4000-8000-000000000009",
      employeeId: "FIX-D4-EMP-002",
      fullName: "Nadin Amizah",
      positionId: "d4000000-0000-4000-8000-000000000008",
      departmentId: "d4000000-0000-4000-8000-000000000007",
    },
  ],
  competencies: [
    {
      id: "d4000000-0000-4000-8000-000000000004",
      code: "FIX-D4-COMP-001",
      name: "Komunikasi Demo",
      category: "Soft skill",
    },
  ],
  positionRequirements: [
    {
      id: "d4000000-0000-4000-8000-000000000005",
      positionId: "d4000000-0000-4000-8000-000000000002",
      competencyId: "d4000000-0000-4000-8000-000000000004",
      minProficiencyLevel: 3,
      isMandatory: true,
    },
  ],
  employeeSkills: [
    {
      id: "d4000000-0000-4000-8000-000000000006",
      employeeId: "d4000000-0000-4000-8000-000000000003",
      competencyId: "d4000000-0000-4000-8000-000000000004",
      proficiencyLevel: 2,
      evidenceNotes: "Data fiktif untuk pengembangan UI.",
    },
  ],
};

/** Must be selected explicitly by a feature in development. */
export const fixtureReferenceRepository: ReferenceDataRepository = {
  async loadReferenceData() {
    return d4ReferenceFixture;
  },
};
