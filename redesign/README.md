# True North workspace redesign

This is a frontend-only redesign of `true-north-career-workspace.html`. Nothing has been deployed, and nothing has been written to Drive.

## Sources (re-checked 2026-10-08 19:50 UTC)

The redesign now starts from the newest page, which is the `true-north-career-workspace.html` inside `true-north-jobs-source-2.3.2.zip` (modified 19:31). That page includes two recent changes from another tool:

- **Research provider selector.** It is also in the standalone Drive HTML, which was changed at 18:40.
- **Fit assessments.** This adds the "Assess up to 25 current listings" button and the assessment cards on the Listing tab. It is only in the zip.

Both changes are kept, with the same endpoints and payloads.

The two Drive copies of the page now differ. The standalone `true-north-career-workspace.html` lacks fit assessments.

## Files

| File | What it is |
| --- | --- |
| `workspace.html` | The new `true-north-career-workspace.html`. |
| `workspace-html.patch` | Unified diff against the zip's page. It applies cleanly. |
| `screenshots/` | Rendered against mock data at 1440, 1024 and 390 px wide. |
| `fonts/`, `oswald-font-route.js` | Optional backend item 2: self-hosted Oswald (SIL OFL 1.1). |
| `preview-harness/` | The mock API server, the screenshot script, and the page it replaces. |

## Integration (per the handoff)

1. Replace `true-north-career-workspace.html` with `workspace.html`.
2. Regenerate `workspace-ui.js` with the build script. Don't hand-edit that file.
3. Run `npm test` and `python3 test/sqlite_integration.py`.

Results on the zip as of 19:31:

- **With the new page:** 156 tests, of which 154 pass, 1 fails and 1 is skipped. The SQLite test passes.
- **Without the new page:** exactly the same counts.
- **The one failure** is "read-only Drive Arsenal extraction". It fails because `arsenal-import-prep.json` is missing from the zip, so it is unrelated to the UI.

## The design

**One state vocabulary.** Every job has a single derived state. The list, the progress track and the submission panel all show it with the same mark, and a written label always sits next to the mark.

| Mark | State | Meaning |
| --- | --- | --- |
| Grey ring | Draft | Writer or critic stage |
| Gold ring | Awaiting your review | Package is in `chris_review` |
| Half gold | Approved, not submitted | Package approved, `approved_to_send`, or queued |
| Green dot | Submitted | Only a queue status of `submitted` or the receipt-driven `applied` stage |
| Red diamond | Needs you | `submission_uncertain`, `login_required` or `user_input_required` |

**Layout.**
- A filter-and-list index sits on the left, and the job reader sits on the right.
- On phones these become two screens.
- The research queue is its own view.

**Job reader.**
- The header shows the exact Polaris lockup and the words "Submission disabled".
- Below it is a four-step track: Listing, Documents, Approval to send, Submitted.
- The tabs are Listing (freshness, then fit assessment, then the listing), Documents & approval, and Submission. Fit bands use text color only, so they never read as application states.
- The original listing displays as a 72-character reading column, using the exact allowlist sanitizer.

**Freshness.** The page now uses `latest_listing_check`, which `GET /api/jobs/:id` already returns.

## Handoff compliance

- All write calls have the same endpoints and payloads, confirmed by diffing the extracted calls.
- Password reauthentication, revision, listing-check and manifest fences, and stale-response protection are unchanged.
- The approve button reads "Approve and queue — does not submit". Attestation appears only for queued items that are not `submitted` or `rejected`.
- There are no AI calls, no polling, and nothing is stored in browser storage.
- The brand SVGs are used unmodified.

## Additions you didn't ask for (Principle 5)

1. The All / Drafts / Approved / Submitted switch with counts. This is client-side filtering only.
2. The page loads `GET /api/applications/queue` once at start, so the list can show approved and submitted states. The current page reads it per job.
3. The selected job is kept in the URL hash (`#job=…`), so a refresh reopens it.
4. Arrow keys move through the job list.
5. A disabled-by-default preview hook (`ARTIFACT_PREVIEW_ENDPOINT = null`). It makes no requests until backend item 1 exists.
6. An `@font-face` rule for `./fonts/oswald-latin-wght-normal.woff2`. Without backend item 2 it falls back to condensed system fonts.

## Backend changes needed

1. **Résumé and cover-letter previews.** Artifacts store only a Drive ID and a hash. An in-app preview needs a new read endpoint that returns the document checked against `content_hash`. Until then, Preview offers "Open in Drive".
2. **Oswald.** The page's CSP (`default-src 'self'`) blocks Google Fonts, so Oswald has never loaded. Fix it by serving the woff2 from the worker (see `oswald-font-route.js`).
3. **Optional, for speed.** The list makes one `/api/workflows/:id` call per job (up to 250), the same as today.

## Existing behavior noticed but not changed

- Saving pipeline tracking sends an empty `due_at`, which clears any existing due date. This is confirmed in `worker.js`.
- The backend accepts a `request_changes` package decision that the UI doesn't offer.
