# True North frontend/API handoff

Snapshot: 2026-10-08. Production backend version: `2.3.1-2026-10-08`.

This document is the integration boundary for a replacement visual design. The redesign may replace markup and CSS in `true-north-career-workspace.html`, but it must preserve the API calls, security behavior, workflow gates, exact brand assets, and semantic-listing safety described here.

## Source and build boundary

- Editable frontend: `true-north-career-workspace.html`
- Exact brand assets:
  - `TrueNorth-Polaris-full_dark.svg`
  - `TrueNorth-Polaris-mark_transparent.svg`
- Generated module: `workspace-ui.js` (do not hand-edit)
- Bundle command, run from the repository parent: `node staging-cor-r2004/build-workspace-module.mjs`
- Worker entry point: `worker.js`
- Production routes: `/` and `https://truenorth.justsignal.company`
- Legacy diagnostic UI: `/legacy`; do not use it as the redesign target.

## Required browser behavior

- All API requests are same-origin and cookie-authenticated. Do not store the password or session in browser storage.
- Any `401` response opens the private login dialog. Login is `POST /api/login` with JSON `{ "password": string }`; success is HTTP 204 and sets an HttpOnly, Secure, SameSite=Strict cookie.
- Non-2xx JSON errors use `{ "error": string }`. Display the error without treating it as HTML.
- Escape every ordinary API string before inserting it into HTML.
- `listing_versions[].render_html` is the only server-provided semantic HTML intended for rendering. Sanitize it again in the client with the exact allowlist `p, br, ul, ol, li, h1, h2, h3, h4, strong, b, em, i, blockquote`; remove all attributes and unwrap all other tags.
- External links open in a new tab with `rel="noreferrer"`.
- Keep stale-response protection when switching jobs: a slower prior request must never overwrite the currently selected job.
- Approval controls must clearly distinguish approval/queueing from actual submission.

## Primary read contracts

### `GET /api/jobs?limit=250`

Returns an array of real jobs. The synthetic fixture is deliberately hidden by the backend. Fields used by the current frontend:

```json
{
  "id": "job id",
  "title": "role title",
  "company": "company",
  "location": "location",
  "source": "provider",
  "canonical_url": "https://...",
  "research_status": "complete|pending|login_required|blocked|incomplete_retry"
}
```

### `GET /api/jobs/{job_id}`

Returns the job fields plus:

```json
{
  "listing_versions": [{
    "id": "listing version id",
    "fetched_at": "ISO timestamp",
    "content_hash": "sha256",
    "full_description": "canonical flat source text",
    "render_html": "sanitized semantic rendering or null",
    "provider": "provider"
  }],
  "evidence": [{
    "id": "evidence id",
    "evidence_type": "listing",
    "source_url": "https://...",
    "source_anchor": "anchor",
    "claim_text": "source-backed text",
    "fetched_at": "ISO timestamp"
  }],
  "assessments": []
}
```

Arrays are newest-first where the current UI calls `latest(rows) => rows[0]`. Do not reconstruct or alter `full_description` or `content_hash`. `render_html` is a parallel presentation field.

### `GET /api/workflows/{job_id}`

Returns arrays used by the three job tabs:

```json
{
  "requirements": [],
  "company_dossiers": [],
  "dossier_sources": [],
  "fit_reviews": [],
  "application_packages": [],
  "application_artifacts": [],
  "artifact_verifications": [],
  "package_reviews": [],
  "pipeline_items": [],
  "interviews": [],
  "interviewer_dossiers": [],
  "interview_records": []
}
```

Important package fields: `id`, `status`, `revision`, `listing_version_id`, `arsenal_version`. Artifact readback is verified only when artifact and verification records agree on `artifact_id`, `drive_file_id`, and case-insensitive `content_hash`.

### `GET /api/queue?limit=100&offset=0&status={optional}`

Returns rows with `id`, `source`, `task_kind`, `status`, `url`, and optional `error_code`. Retry UI is appropriate only for `login_required`, `blocked`, and `incomplete_retry`.

### Application execution reads

- `GET /api/applications/{job_id}/destinations`
- `GET /api/applications/{job_id}/execution-preview?destination_id={id}`
- `GET /api/applications/queue`

The execution preview is the authoritative exact-bound object. Fields consumed by the UI include `destination_url`, `destination_host`, `package_id`, `package_revision`, `listing_version_id`, `listing_check_id`, `artifact_manifest_hash`, and `listing_current`. Never infer readiness from visual state alone.

## Mutating contracts exposed in the review UI

Every mutation is server-validated. Do not add client-side bypasses or substitute optimistic state for the returned record.

### Verify current public employer listing

1. `POST /api/run/public-listing-verification`

```json
{ "job_id": "...", "source_url": "allowlisted employer URL" }
```

2. `POST /api/workflows/{job_id}/freshness`

```json
{ "phase": "approval" }
```

The first call performs the allowlisted server fetch; the second asserts the resulting check. Failure must remain visibly fail-closed.

### Review a package

`POST /api/packages/{package_id}/review`

```json
{
  "reviewer_role": "chris",
  "decision": "approve|reject",
  "expected_revision": 1,
  "notes": "...",
  "confirmation_password": "entered by Chris at action time"
}
```

Approval is enabled only when package status is `chris_review`. Keep the displayed revision fence. Never retain or log `confirmation_password`.

### Update pipeline status

`POST /api/workflows/{job_id}/pipeline`

```json
{ "stage": "...", "next_action": "...", "owner": "...", "due_at": "ISO timestamp or null" }
```

Valid visible stages are `target`, `considering`, `package_draft`, `chris_review`, `approved_to_send`, `conversation`, `interviewing`, `offer`, and `closed`. The backend applies additional gates to `approved_to_send`.

### Approve exact execution (queues only; does not submit)

`POST /api/applications/{job_id}/approve-execution`

```json
{
  "destination_id": "...",
  "expected_package_id": "...",
  "expected_package_revision": 1,
  "expected_listing_version_id": "...",
  "expected_listing_check_id": "...",
  "expected_artifact_manifest_hash": "...",
  "confirm_exact_package": true,
  "confirmation_password": "entered by Chris at action time"
}
```

All expected values must come verbatim from the current execution-preview response. Button language must say that this approves and queues but does not submit.

### Record an external manual submission

`POST /api/applications/{queue_id}/manual-attestation`

```json
{
  "attestation": "I manually submitted this exact approved application",
  "submitted_at": "ISO timestamp",
  "employer_confirmation_ref": "optional",
  "confirmation_password": "entered by Chris at action time"
}
```

Show this only for a queued item that is neither `submitted` nor `rejected`. It records Chris's attestation after an external manual action; it does not perform that action.

### Retry research

`POST /api/queue/retry`

```json
{ "task_id": "..." }
```

No bulk retry control is currently authorized.

## Immutable safety and product constraints

- AI generation is disabled in production. Do not surface or call `POST /api/ai/generate` in the replacement review UI.
- No cron is enabled. Do not add polling that invokes intake or research mutations.
- Gmail is read-only. Do not add email mutation controls.
- Cleanup is preview-only. Do not imply deletion or scheduled cleanup.
- The application execution service does not submit applications. Do not label queued or approved records as submitted.
- Human-authoritative actions require password reauthentication at action time.
- Preserve version/revision/listing-check/manifest fences. These are functional controls, not display metadata.
- Preserve source URLs and evidence provenance. Do not synthesize missing records.
- Preserve the exact supplied SVG assets; do not redraw or replace the brand.
- Do not upload, deploy, contact an external agent, or create credentials as part of importing a frontend patch unless separately authorized.

## Current screen topology (may be visually redesigned)

1. Header with exact True North brand, API state, and explicit “Submission disabled”.
2. Filters for role/company, location, pipeline stage, and research status.
3. Job rail plus selected-job detail.
4. Selected-job tabs:
   - Listing & evidence
   - Package & approval
   - Application status / exact execution
5. Research queue with status filter and bounded retries.
6. Private login dialog.

The topology may change, but every backend state and gate above must remain legible and correctly wired.

## Integration validation

From `restored/`:

```text
npm test
python3 test/sqlite_integration.py
```

Then regenerate `workspace-ui.js` from the repository parent and rerun `npm test`. Current baseline is 118 passing Node tests plus a passing SQLite integration test. Before any production deployment, verify `/health` still reports:

- `cleanup_mode: "preview"`
- `scheduled_read_only: false`
- `ai_generation_enabled: false`
- `automatic_sending: false`

Visually verify in authenticated external Chrome that the job list comes from the API, the stored listing uses semantic paragraphs/lists, approval language remains non-submission language, and no password value persists after an action.
