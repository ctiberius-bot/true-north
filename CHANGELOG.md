# Change log

## 2026-10-08 — v2.3.4 subject classifier repair

- Replaced broad catch-up subject exclusions with anchored known protected-message templates and added the verified LinkedIn `Company is hiring a/an Role` positive template, which does not carry generic alert keywords. Exact regression subjects cover the two verified false negatives plus Account Executive, Application Architect, Application Development Director, Resume Writer, and interview-role titles; application confirmations, human-message, authentication, welcome, setup, extension, resume-service, and motivation notices remain protected.
- Gmail read failures now retain only an allowlisted provider reason and normalized `Retry-After` value in the existing failed-run error code. Arbitrary provider text, tokens, headers, and message data are never persisted or returned.

## 2026-10-08 — v2.3.3 Ladders redirector repair

- Added exact initial-hop-only HTTPS handling for `t.ladders.co`, with final content restricted to
  `theladders.com` and per-hop scheme, credential, port, IP-literal, hostname, and redirect-bound checks.
- Prevented legal, unsubscribe, contact, footer, and social-navigation anchors from becoming runnable
  research tasks while retaining legitimate job-title candidates.
- Independently reviewed after two focused navigation-filter corrections; 128/128 JavaScript tests and
  the Python SQLite integration pass. `workspace-ui.js` is unchanged.
- Deployed Worker version `b9040e50-6b87-4b51-8487-0f32f22ba5d4` with AI, schedules, Gmail writes,
  automatic sending, and cleanup mutation disabled. The one-task canary remains paused because the
  attempted reversible isolation fence was denied; no workaround or broader batch was run.

## 2026-10-08 — v2.3 source-only repair candidate

- Added provider-aware URL normalization and link classification for representative read-only
  production snapshots; navigation links remain auditable in parse snapshots but never become tasks.
- Added deterministic task identities plus `research_task_observations` so repeated occurrences share
  executable work while every email observation keeps provenance.
- Added supersession-aware queue/coverage queries and a non-destructive production migration plan.
- Replaced free-form AI prose acceptance with evidence-only selection and deterministic,
  claim-constrained, explicitly unreviewed server rendering.
- Added focused deduplication, classification, grounding, schema, and SQLite integration coverage.
- No deployment, production migration, live research, intake, Gmail mutation, or AI call performed.

- 2026-10-07: Prepared the Citadel 2.2 AI safety release candidate for independent review without deploying, migrating production, importing Arsenal data, or invoking a model. The native AI binding remains disabled by `AI_GENERATION_ENABLED=false`. Source-only prompts, exact citations, `internal_only` exclusion, zero retries, and approval-revocation rollback remain enforced. The budget now reserves prompt UTF-8 bytes plus 4,096 overhead tokens and 900 output tokens, then permanently charges the full reservation exactly once through SQLite insert/update triggers; replay, concurrent settlement, unknown usage, Unicode, and invariant-failure cases are tested. Provider hidden-token accounting remains an explicit blocker to calling this a billing cap. User-supplied Drive metadata is now stored only as a pending advisory claim and cannot create a verification or unlock Chris approval; no trusted connector-receipt bridge exists yet. DKIM `header.i` parsing now uses the domain after the last `@`, requires same-clause consistency with `header.d`, and rejects the reviewed forgery. JavaScript: 89 passed, 0 failed, 1 optional standalone-sqlite3 skip. Python SQLite integration passed. Production remains on v2.1 Worker version `0b643999-3893-4674-b2ab-285eaefa590a`; no second intake, AI deployment, or inference occurred.

- 2026-10-07: Prepared the independently recheckable Citadel 2.1 candidate without deploying. Fixed resumed discovery after a cumulative page cap, bounded manual retry for exhausted tasks with retained audit history, candidate-link preservation/fail-closed completion, job-title/navigation misclassification, and explicit remote exclusion. Added runtime-backed sourced dossiers, fit reviews, evidence-mapped packages, enforced Writer → Critic → Chris gates, pipeline/interview/Coach/private-Doc workflows, and exact listing-version/content-hash assessment provenance. Fresh read-only Arsenal extraction produced 153 anchored claims from the unchanged 52,587-byte Drive master (source SHA-256 `12fed09f777d636bc7d8ee18b1d373e4b0aff7c32ee040c9858c007ff05faf0d`). JavaScript: 75 passed, 0 failed, 1 standalone-sqlite3 skip; Python SQLite integration passed, including seeded legacy migration applied twice without data loss. Deployment approval exists, but Worker deployment, D1 migration/import, intake, cleanup, browser activity, and schedules remain held pending independent recheck.

- 2026-10-07: Prepared and tested Citadel 2.1 without deploying. Added replayable parser snapshots, unknown-link quarantine, exact DKIM-domain correlation, partial-discovery checkpoints, evidence-required completion, per-child cleanup proof, immutable Career Arsenal versions tied to the Drive master, hard-constraint review/veto results, duplicate-safe job queries, selectable versioned role profiles, queue recovery and pagination, researched-job evidence/assessment detail, and persistence foundations for sourced dossiers, Critic reviews, Writer → Critic → Chris packages, pipeline, interviews, Coach plans, and isolated private Doc sessions. JavaScript: 67 passed, 0 failed, 1 skipped only because the standalone sqlite3 CLI is unavailable. The separate Python SQLite integration passed. No live intake, Gmail mutation, schedule, D1 migration, Worker deployment, message, application, or external browser action was performed.

- 2026-10-07: Deployed the approved bounded-intake/status update after 55 passing tests. OAuth core version `70736194-2882-4dd8-997a-a3d228595e43` preserves both secret bindings, `OAUTH_CLIENT_ID`, its Durable Object, disabled observability, and no public target. Citadel version `787a1e13-92a6-4056-8e1d-01858f844f93` preserves `DASHBOARD_PASSWORD`, D1, the private service binding, disabled observability, and no schedule. Public health returned 200 with `scheduled_read_only:false`; the unauthenticated status endpoint returned 401. No intake, research, new grant, schedule, or Gmail mutation was run during deployment.

- 2026-10-07: Prepared but did not deploy bounded Gmail intake and safe connection status. Each intake run is capped at five inspected messages and a 24-hour window, applies provider-domain filtering before body fetch, persists a resume cursor when truncated, and reports inspected/persisted/skipped evidence. The authenticated dashboard status reflects the usable encrypted server-side grant and exposes no token material. Gmail mutation and schedules remain disabled.

- 2026-10-07: Added an authenticated dashboard “Connect Gmail read-only” control. It calls only the OAuth-start endpoint, states the exact read-only purpose, redirects to Google without logging tokens, reports a generic safe error, and never starts inbox ingestion. Expanded to 49 passing tests.

- 2026-10-07: Independently rechecked OAuth corrections deployed: core version `4708e148-a806-448c-b1e6-cbb0ed11e20a`; Citadel version `aca3fc7e-0615-4437-adbc-b6510d666797`. The core remains private with no preview/public target and no secrets. Citadel preserves its dashboard secret, D1, and private service binding. Health is 200, unauthenticated APIs are 401, invalid callbacks are 400, and scheduling remains disabled.

- 2026-10-07: OAuth review correction: callback completion now validates both the initiating Citadel session hash and browser nonce. Initial token responses must explicitly report exactly `gmail.readonly`; missing or expanded scopes store no grant. Refresh responses may omit unchanged scope only for a previously verified exact-scope grant, and any reported refresh scope must match exactly.

- 2026-10-07: Deployed the approved private OAuth core Worker and SQLite Durable Object with no public route, then deployed Citadel version `87552d22-5c18-43b1-802b-f3021bc3c0e3` with the `GMAIL_TOKEN_PROVIDER` service binding while preserving `DASHBOARD_PASSWORD` and D1. Added session-bound state, PKCE S256, atomic callback replay prevention, exact callback pinning, mailbox verification, AES-256-GCM encrypted grant storage, refresh-token rotation, and revoked-grant fail-closed behavior. All 46 tests pass. OAuth client configuration, secrets, Google consent, Gmail ingestion, Gmail writes, and schedules remain incomplete or disabled.

- 2026-10-05: Version 1.0 by Grok, at Chris's direction. Standing ingest, dashboard parameters, Upwork added as a source, board seats moved into the in-lane list. Source placed in the canonical True North source folder. Cloudflare Worker and D1 were not created.
- 2026-10-06: Version 2 test-mode implementation by Codex. Added Citadel schema, D1 repository, strict authenticated job-alert and thread filtering, real Gmail response pagination, read-only Gmail interface, bounded public listing/discovery adapters, fair retry-bounded research selection, persistent private APIs, role-profile versioning, research coverage UI, fail-closed cleanup eligibility, security headers, and 35 fixture/local SQLite tests. Corrected discovery parent retention, terminal-page validation, job-scoped listing versions, redirect validation, hourly compensation, thread authentication propagation, and delivered GUI syntax. No Worker, D1, credential, OAuth grant, enabled schedule, Gmail mutation, or external deployment was created. Live source validation remains pending approved account setup.
- 2026-10-07: Added derived Career Arsenal index tables and authenticated import route with source-file ID, version, and content hash; persisted assessment provenance using claim IDs, anchors, and tags without returning private claim text; added durable preview-only cleanup outbox creation; exposed current Arsenal and cleanup reconciliation in GUI coverage; and expanded the suite to 37 passing tests including fixture-only integration and blocked-work fail-closed behavior. No live Arsenal master read, private rider exposure, OAuth, Gmail mutation, Worker/D1 deployment, or schedule activation was performed.
- 2026-10-07: Independent-review hardening. Cleanup preview now keeps zero-link parser results ineligible, reconciles only original source observations rather than discovery children, requires a completed listing/evidence path for every required observation, and fails closed on missing task ledgers. Assessment now requires an existing imported Arsenal version plus the exact requested saved profile ID/version and persists only those verified identifiers. Added D1-repository and authenticated HTTP regressions; 41 tests pass. No Gmail write path or deployment was added.

## 2026-10-08 — v2.3.4 production catch-up controls

- Replaced the lossy positive-subject gate with reviewed tri-state intake: exact source-bound protected templates, authenticated body inspection, durable blocked quarantine for uncertain candidate links, and explicit no-content dispositions. Centralized current-message and thread protection so role titles containing Application or Interview are not treated as correspondence. Deployed Worker version `e759477c-d070-4c3f-830e-a3510564fa79` after 145 JavaScript tests and the Python SQLite integration passed. Gmail remains read-only; AI, schedules, sending, and cleanup execution remain disabled.
- After Gmail returned an explicit `rateLimitExceeded` without `Retry-After`, reduced catch-up to ten-message chunks with a five-second client gap while preserving the pre-metadata already-complete check. Deployed paced Worker version `a934844a-9dce-4633-9031-04790aad7a77` after 146 JavaScript tests and the Python SQLite integration passed.

- Added an exact-ID single-listing research action with no global stale-task recovery; the approved Ladders task completed in one attempt.
- Added a resumable read-only Gmail catch-up over the independently audited 14-sender candidate query. Metadata and DKIM/subject checks precede body reads, protected correspondence remains excluded, and historical links are retained with stale blocked tasks.
- Added explicit failed-run accounting and query-scoped cursors. Catch-up data remains incomplete due Gmail `gmail_read_403` throttling and must resume from `gmail_intake_source_candidates_v4` after cooldown.
- The authorized Llama 3.3 pilot produced one private unreviewed outreach draft and charged exactly 10,000 microUSD; AI was disabled immediately afterward and remains off.
- JavaScript: 135 passed. Python SQLite integration passed. No Gmail mutation, schedule, sending, application, or additional AI call was performed.

