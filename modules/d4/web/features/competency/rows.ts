import type { CompetencyFinding } from "../../../competency/types";
import type { EmployeeReference } from "../../../shared/types";
import { currentCompetencyStatus, currentGap, employeeSearchText, inTrainingOrPositionChange, includesText, latestCurrentPositionAssessment, positionOf, visibleEmployees, type CurrentCompetencyStatus, type Snapshot } from "../../data/selectors";
import { statusLabel } from "../../ui/primitives";

export type CompetencyRow = { employee: EmployeeReference; position: string; status: CurrentCompetencyStatus; findings: CompetencyFinding[]; lastAssessed?: string };
/** Empty string = no filter. `status` is the English display label (statusLabel). */
export type CompetencyFilters = { search: string; position: string; department: string; status: string };

/**
 * Rows of the Competency Gap list (UAT-11). HR and managers only see employees in scope: trainees, a position
 * change saved in the last 6 months, or an open requirement (inTrainingOrPositionChange). Anyone else is assessed
 * through Assess Position Change, which brings them into scope. Employees see only themselves.
 */
export function competencyRows(snapshot: Snapshot, filters: CompetencyFilters): CompetencyRow[] {
  const scoped = snapshot.role !== "EMPLOYEE";
  return visibleEmployees(snapshot).filter((employee) => !scoped || inTrainingOrPositionChange(snapshot, employee.id)).map((employee) => {
    const gap = currentGap(snapshot, employee);
    const saved = latestCurrentPositionAssessment(snapshot, employee);
    return { employee, position: positionOf(snapshot, employee)?.title ?? "—", status: currentCompetencyStatus(snapshot, employee), findings: gap?.findings ?? [], lastAssessed: saved?.effectiveDate };
  }).filter((row) => includesText(employeeSearchText(snapshot, row.employee), filters.search)
    && (!filters.position || row.employee.positionId === filters.position) && (!filters.department || row.employee.departmentId === filters.department)
    && (!filters.status || statusLabel(row.status) === filters.status))
    .sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName));
}
