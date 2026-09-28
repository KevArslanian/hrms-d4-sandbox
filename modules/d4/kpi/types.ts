export interface KpiDefinition {
  readonly id: string;
  readonly positionId: string;
  readonly version: "V5.1";
  readonly name: string;
  readonly weight: number;
  /** Example from V5.1, not a universal policy target. */
  readonly targetExample: string;
}

export interface KpiLineInput {
  readonly definitionId: string;
  readonly target: string;
  readonly realization: string;
  /** Entered by a person. Never derived from realization. */
  readonly rawScore: number | null;
}

export interface KpiLineSnapshot extends KpiLineInput {
  readonly name: string;
  readonly weight: number;
  readonly weightedScore: number;
}

export interface KpiRecord {
  readonly id: string;
  readonly source: "fixture" | "local-demo";
  readonly employeeId: string;
  readonly positionId: string;
  readonly period: string;
  readonly definitionVersion: "V5.1";
  readonly lines: readonly KpiLineSnapshot[];
  readonly totalScore: number;
  readonly createdAt: string;
  readonly actor: string;
}
