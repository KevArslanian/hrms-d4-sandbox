import type {
  DepartmentReference,
  EmployeeReference,
  EmployeeSkillReference,
  PositionReference,
  PositionRequirementReference,
  ReferenceDataSnapshot,
  ReferenceSource,
} from "../types";

/** Data access stays behind this contract; feature modules do not import fixtures. */
export interface ReferenceDataRepository {
  loadReferenceData(): Promise<ReferenceDataSnapshot>;
}

export interface EmployeeReferenceContext {
  readonly source: ReferenceSource;
  readonly employee: EmployeeReference;
  readonly position: PositionReference | null;
  readonly department: DepartmentReference | null;
  readonly positionRequirements: readonly PositionRequirementReference[];
  readonly employeeSkills: readonly EmployeeSkillReference[];
}

/** Resolve shared master data by employees.id, never by the display code. */
export async function getEmployeeReferenceContext(
  repository: ReferenceDataRepository,
  employeeUuid: string,
): Promise<EmployeeReferenceContext | null> {
  const data = await repository.loadReferenceData();
  const employee = data.employees.find((item) => item.id === employeeUuid);
  if (!employee) return null;

  const position = data.positions.find((item) => item.id === employee.positionId) ?? null;
  const department = data.departments.find((item) => item.id === employee.departmentId) ?? null;

  return {
    source: data.source,
    employee,
    position,
    department,
    positionRequirements: position
      ? data.positionRequirements.filter((item) => item.positionId === position.id)
      : [],
    employeeSkills: data.employeeSkills.filter((item) => item.employeeId === employee.id),
  };
}
