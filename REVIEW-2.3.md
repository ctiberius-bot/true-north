# True North v2.3 source-only review notes

## 2026-10-08 production dry-run and release status

The read-only export contained 218 observations and 219 legacy research tasks. Offline normalization produced 59 actionable deduplicated tasks plus the existing unbound fixture task (60 projected executable tasks), superseded 185 occurrence rows, and excluded 33 navigation/non-listing observations. There were zero canonical-job conflicts and zero checkpoint conflicts. Exact mappings are in `dry-run/migration-dry-run.json`; the human-readable summary is `dry-run/migration-dry-run.md`.

The authenticated external-Chrome capture/import interface is prepared locally. It rejects session material and arbitrary fields, timestamps and versions visible listing evidence, records open/closed/inaccessible availability, and applies 15-minute freshness checks before Chris approval and send-readiness. Recurring access still depends on a live authenticated Chrome session; Workers do not inherit it.

The known independent-review corrections are now implemented for re-review: exact completed-listing-version cleanup provenance; explicit discovery edges and atomic discovery transitions; one-active-task assignment plus rollback-safe migration semantics; quote-only draft rendering without inferred connective prose; and revision-fenced transaction/CAS protection for approval, revocation, and send-readiness. Production was not changed and deployment still requires independent re-review.

The earlier 137-to-218 observation increase is accounted for by the exported run ledger. The first persisted five-email run stored 137 observations. A second run at 2026-10-08T05:18:23Z persisted four messages and 81 more observations. The export contains no audit row identifying an actor or caller for that run, so attribution is unavailable and must not be inferred. Production health readback reports `scheduled_read_only:false`, `automatic_sending:false`, and `ai_generation_enabled:false`; the deployed Wrangler configuration has no cron trigger.

Production was not changed. No deployment, D1 migration, live research, Gmail intake or mutation,
data deletion, or Workers AI call was performed while preparing this patch.

## Review scope

- `worker.js`: provider-aware classification and normalization, deterministic deduplicated task IDs,
  provenance joins, supersession-aware queue reads, and claim-constrained outreach rendering.
- `schema.sql`: additive provenance table and nullable supersession pointer.
- `migrations/0002-research-task-dedupe-plan.md`: non-destructive production migration and rollback plan.
- Tests: targeted provider classification, cross-message URL deduplication, observation provenance,
  evidence-only AI selection, rejection of model prose, mandatory job-plus-Arsenal grounding,
  claim-constrained rendering, schema topology, and SQLite provenance uniqueness.

Against canonical ZIP `c866a3323170a23fdea214d9ccc63c832e1430c4ecd7d2402e92d1a67661a18e`,
the review diff changes:

- `worker.js`: +87 / -40
- `schema.sql`: +3 / -2
- `README.md`: +18 / -1
- `CHANGELOG.md`: +12 / -0
- `test/ai-safety.test.js`: +22 / -16
- `test/citadel.test.js`: +4 / -2
- `test/safety-milestone.test.js`: +10 / -8
- `test/schema.test.js`: +1 / -1
- `test/sqlite_integration.py`: +11 / -0
- one new migration-plan document and this review note

## Verification

- `node --check worker.js`
- `npm test`: 102 passed, 0 failed, 0 skipped
- `python3 test/sqlite_integration.py`: PASS
- `wrangler.toml` remains byte-identical to the canonical disabled config
  (`f152ab1c4ccdf65a3abc5ea6712b08e5b18caea4141d76f6e9e3da155fee7db0`).

## Known limits

- Ladders email redirect URLs are opaque. The classifier deliberately keeps plausible title links as
  candidates and excludes obvious salary/location/footer anchors; final identity still requires a
  separately approved read-only fetch or provider-supported redirect resolution.
- The migration mapping must be generated and reviewed offline before production execution because
  current production contains legacy occurrence IDs and may contain checkpoint conflicts.
- Claim-constrained rendering prevents arbitrary generated prose from being saved. It does not solve
  general semantic entailment and still requires human review of exact quoted evidence and job context.
