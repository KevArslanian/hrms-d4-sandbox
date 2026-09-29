"use client";

import { useSyncExternalStore } from "react";
import { D4Shell } from "@/modules/d4/shared/ui";
import { d4ReferenceFixture } from "@/modules/d4/shared/fixtures";
import { performanceFixtureRecords } from "@/modules/d4/performance/fixtures";
import { trainingFixtureVersions } from "@/modules/d4/training/fixtures";
import { developmentFixtureVersions } from "@/modules/d4/development/fixtures";
import { PerformancePages } from "@/modules/d4/supabase/pages/PerformancePages";
import { PeoplePages } from "@/modules/d4/supabase/pages/PeoplePages";
import { TrainingPages } from "@/modules/d4/supabase/pages/TrainingPages";
import type { D4LiveSnapshot } from "@/modules/d4/supabase/types";
import type { SupabaseD4Repository } from "@/modules/d4/supabase/repository";

export default function Preview() {
  const search = useSyncExternalStore(() => () => {}, () => window.location.search, () => null);
  if (search === null) return null;
  const query = new URLSearchParams(search);
  const currentModule = query.get("module") ?? "performance";
  const view = query.get("view") ?? (currentModule === "dashboard" ? "dashboard" : currentModule === "competency" ? "competency" : "list");
  const role = query.get("role") === "EMPLOYEE" ? "EMPLOYEE" : "HR";
  const employeeId = query.get("employee") ?? d4ReferenceFixture.employees[1].id;
  const empty = query.has("empty");
  const snapshot: D4LiveSnapshot = {
    role, actorEmployeeId: d4ReferenceFixture.employees[1].id,
    reference: empty ? { ...d4ReferenceFixture, employees: [], employeeSkills: [] } : d4ReferenceFixture,
    performance: empty ? [] : performanceFixtureRecords,
    kpi: empty ? [] : performanceFixtureRecords.map((record, index) => ({ id: `QA-KPI-${index}`, employeeId: record.employeeId, period: record.period, score: 70 + index * 3, notes: "QA fixture only", createdAt: record.createdAt })),
    competency: [], developmentVersions: empty ? [] : developmentFixtureVersions,
    trainingVersions: empty ? [] : trainingFixtureVersions,
  };
  const runWrite = async (operation: (repo: SupabaseD4Repository, data: D4LiveSnapshot) => Promise<unknown>) => {
    const repo = new Proxy({}, { get: (_, method) => async (...args: unknown[]) => {
      Object.assign(window, { qaWrite: { method, args } });
      return "QA-WRITE";
    } }) as SupabaseD4Repository;
    await operation(repo, snapshot);
  };
  const navigate = (url: string) => { window.location.assign(url.replace("/live", "/qa-preview") + (role === "EMPLOYEE" ? "&role=EMPLOYEE" : "")); };
  const props = { snapshot, busy: false, runWrite, navigate, employeeId, evaluationId: query.get("evaluation") ?? performanceFixtureRecords[0].id, trainingId: query.get("training") ?? trainingFixtureVersions[0].trainingId, sourceRef: query.get("source") ?? "d4000000-0000-4000-8000-000000000028" };
  return <D4Shell live activeModule={currentModule === "development" ? "competency" : currentModule as "performance" | "competency" | "training" | "dashboard"} canvasBackground={currentModule === "development" ? "white" : undefined} accountName="Nadin Amizah" accountRole={role} people={role === "EMPLOYEE" ? snapshot.reference.employees.filter((item) => item.id === snapshot.actorEmployeeId) : snapshot.reference.employees} onSignOut={() => {}}><div className="mx-auto max-w-[1604px]">
    {currentModule === "performance" && <PerformancePages {...props} view={view as "list" | "add" | "edit" | "detail" | "history" | "scorecard"} />}
    {(currentModule === "dashboard" || currentModule === "competency") && <PeoplePages {...props} view={currentModule === "dashboard" ? "dashboard" : "competency"} />}
    {(currentModule === "training" || currentModule === "development") && <TrainingPages {...props} view={view as "list" | "add" | "progress" | "history" | "development-new"} />}
  </div></D4Shell>;
}
