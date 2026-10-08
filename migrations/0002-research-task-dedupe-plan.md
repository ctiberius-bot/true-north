# Research-task deduplication migration plan (not executed)

This is a review plan for the existing production D1 database. It is intentionally not an
auto-run migration. Production remains on the v2.2 schema until a separate deployment and
migration approval.

## Goal

Keep every `emails`, `email_parse_snapshots`, `observations`, `candidate_observations`, audit,
and legacy `research_tasks` row while presenting and executing one active task per normalized
`source + task_kind + URL` identity.

## Preconditions

1. Export and hash a D1 backup.
2. Confirm AI, schedules, Gmail mutation, and research execution are disabled.
3. Re-run the read-only inventory and record counts for observations, tasks, checkpoints,
   canonical jobs, listing versions, evidence, and audit.
4. Generate the v3 normalization/classification mapping offline from the stored snapshots and
   observations. Do not fetch any URL while generating it.
5. Stop if two prospective survivor tasks have conflicting completed canonical jobs or
   incompatible discovery checkpoints; those groups require human review.

## Additive schema phase

Add nullable `research_tasks.superseded_by_task_id`, then create
`research_task_observations(task_id, observation_id, created_at)` and its observation index.
Backfill one provenance row for every existing non-null `research_tasks.observation_id`.
All steps are additive; no legacy task or observation is deleted.

The reviewed schema migration also adds `parent_task_id`, `completed_listing_version_id`,
`active_research_task_assignments`, package `revision`, and review `package_revision`. Backfill
these fields inside the same transaction before enabling new queue, cleanup, or approval paths.

## Reviewed mapping phase

For each offline-computed identity group:

- select one survivor, preferring a completed evidence-backed task, then the task with the most
  advanced safe state, then the oldest task ID;
- attach every member observation to the survivor in `research_task_observations`;
- set `superseded_by_task_id` on non-survivors, leaving their rows and checkpoints intact;
- write an audit record containing only task IDs, normalized identity hash, prior status, and
  survivor ID—never email bodies, headers, tokens, or full snapshot content.

The runtime queue, runnable-task query, coverage counts, and cleanup reconciliation ignore
superseded rows and resolve provenance through `research_task_observations`.

## Verification gates

- Observation count and parse-snapshot count are unchanged.
- Every actionable observation has exactly one active task association.
- Active task count equals the reviewed distinct normalized identities.
- No active task points at an unrelated/navigation classification.
- Completed cleanup paths still resolve through the provenance join.
- Existing canonical jobs, listing versions, evidence, checkpoints, and audit rows are unchanged.
- A dry-run report lists every conflict and every superseded-to-survivor mapping before commit.

## Rollback

Before mutation, persist every observation's exact pre-migration active task ID and every task's exact pre-migration `superseded_by_task_id` in a migration ledger. Rollback restores those captured values transactionally; it must never clear supersession globally. Because legacy rows remain, rollback restores the captured assignments and returns queue queries to
the legacy occurrence rows. The additive provenance table can remain unused. Do not drop tables
or delete rows during rollback.

## Current production inventory motivating this plan

The authorized five-message read-only intake produced 137 occurrence tasks from 63 distinct URLs,
including 124 unresolved candidate observations and zero researched real canonical jobs. This is
not evidence that the links are accessible; no live research was run.
