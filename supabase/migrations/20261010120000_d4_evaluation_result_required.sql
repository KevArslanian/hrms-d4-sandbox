-- UC-D4-001 (BF-6, BF-8, E-1, A-2): a completed performance evaluation has an Evaluation Result,
-- the evaluator's 1–5 score (same scale as the KPI Scorecard). Reverses the notes-only rule of
-- 20261006120000_d4_evaluation_score_optional.sql.
-- NOT VALID: rows saved while the score was optional keep loading; every new or updated row is checked.
alter table public.d4_performance_evaluations
  drop constraint if exists d4_performance_evaluations_check;

alter table public.d4_performance_evaluations
  add constraint d4_performance_evaluations_check check (
    status <> 'completed' or (
      evaluation_date is not null
      and length(btrim(evaluator_name_snapshot)) > 0
      and length(btrim(general_notes)) > 0
      and overall_score is not null
    )
  ) not valid;
