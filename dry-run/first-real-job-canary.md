# First real stored-job canary (prepared only)

- Stored title: Head of Enterprise Architecture
- Source: LinkedIn
- Normalized URL: https://www.linkedin.com/jobs/view/4431768865
- Canonical task ID: `research_8105c377faf36eb9cbf99c861874bff6`
- Task kind: `fetch_listing`
- Observation count: 2
- Legacy task IDs: `1a117d398d95d311:11`, `1a117d398d95d311:12`
- Current status: pending; no canonical job, checkpoint, or live fetch

Execution gates: use an authenticated external Chrome session only when available; capture visible listing text through the strict bridge without cookies, passwords, tokens, or auth headers; persist capture time, source URL, availability, content hash, listing version, and anchored evidence. Closed or inaccessible listings remain blocked. A fresh open check is required before Chris approval and again before send-readiness; any content change revokes the old approval and requires package review against the new listing version.

This document does not authorize a live fetch, application, outreach, or submission.
