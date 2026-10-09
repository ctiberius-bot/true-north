# Change log

## 2026-10-09 — v2.3.39 approved redesign and execution progress integration

- Integrated Claude's approved `live-f78eaed9` navy/cream workspace and exact recolored Polaris assets without recreating the redesign by hand.
- Preserved all v2.3.38 generation, document, protocol, approval, browser-handoff, and receipt-gated execution behavior.
- Added Application execution as a native workspace view with global lifecycle, blocker, lease, exact-binding, and receipt visibility.
- Automatic browser dispatch remains unconfigured; approval still does not claim, open, fill, or submit an application.

## 2026-10-09 — v2.3.38 receipt-aware execution progress

- Added an always-visible execution summary with lifecycle step, exact queue/package identity, blocker detail, lease timing, next action, and receipt state.
- Enriched queue views with deterministic progress metadata while preserving exact approval, lease, artifact, destination, and receipt guards.
- Kept browser execution unconfigured and separately authorized; approval does not claim, open, fill, or submit an application.

## 2026-10-09 — v2.3.37 source-bound role-associated application documents

- Preserves factual actor/action/outcome boundaries by rendering exact selected Career Arsenal statements separately from role-relevance sentences. Discover now remains “enabled tracking of 50 initiatives delivering $500M,” never personal delivery attribution.
- Associates selected achievements beneath their actual employers in the resume instead of a detached impact list.
- Separates compact inference evidence from full rendering evidence so stored documents cannot end in truncated prompt excerpts.
- Tightened `Board` word-boundary relevance matching so `dashboards` maps to KPI and performance-management relevance.
- Propagates explicit channel, partner-marketing, and alliances-marketing gaps to both resume and cover metadata, with normalized paragraph spacing.
- Passed 177 JavaScript tests and all five SQLite suites. Production Worker version is `140b0682-a3ca-4b13-b499-58c8838b4be1`.
- Verified private, unreviewed PSI resume revision 11 (`document_revision_a02fda0c-6bea-4e36-bc77-43776bbbb976`) and cover revision 8 (`document_revision_755035b0-7c2c-4887-b4d5-cb4c5bcf6204`).

## 2026-10-09 — v2.3.35 verified grounded PSI package

- Added privacy-safe predicate diagnostics for application completeness failures, identifying the original production defect as an empty resume capability array (`cb_0`) rather than missing evidence.
- Added artifact-scoped resume and cover cardinality contracts, plus a server-side unsupported-ownership guard for go-to-market, channel, alliances, partner-marketing, growth-bet, commercial-planning, and market-expansion claims.
- Cover narrative paragraphs are now rendered deterministically around the exact selected role/company and validated one-to-one achievement bullets; unsupported model-authored ownership prose cannot enter the stored document.
- Passed 176 JavaScript tests and all five SQLite suites.
- Production Worker version is `335b9a06-8713-431c-beba-77008db2f986`.
- Authenticated production verification persisted private unreviewed PSI resume revision 9 (`document_revision_b07a06d4-aaba-47e9-9337-cb1aaa45ff0e`, 2,035 characters) and cover revision 6 (`document_revision_14ecf4d9-5c37-483b-8fcc-a360d3ee8263`, 1,180 characters). Nothing was approved, uploaded, sent, or submitted.

## 2026-10-09 — v2.3.30 explicit JSON object contract

- Added the exact required application-document key and value shapes directly to the JSON-mode system prompt. Version 2.3.29 correctly produced a JSON object but rejected its unconstrained shape as `ai_output_invalid_document`; no draft was saved.
- Kept every server-side evidence-pair, source-class, uniqueness, prose, and completeness check fail-closed.
- Passed all 174 JavaScript tests before deployment.
- Production Worker version is `3d74f920-1383-4003-878c-1fd57a4e1ddd`.
- The single bounded authenticated PSI verification call reached JSON parsing and exact evidence validation but failed closed at `ai_output_protocol_incomplete`; no resume or cover revision was saved. Further paid attempts were stopped.

## 2026-10-09 — v2.3.29 documented JSON object mode

- Moved application-document inference from the complex schema-constrained provider mode to Cloudflare's documented non-streaming `json_object` mode while retaining the full exact-pair, source-class, uniqueness, visible-prose, shape, and completeness contract server-side.
- Added privacy-preserving failure diagnostics containing only output type, byte length, fence/start classification, finish reason, and a short hash—never model prose or private source text.
- Added regressions proving the official structured object envelope succeeds while prefixed and truncated JSON strings fail closed and save no drafts.
- Passed 174 JavaScript tests and all five SQLite integration checks before deployment.
- Production Worker version is `66b540bd-df38-417c-b613-017c147d0473`.

## 2026-10-09 — v2.3.28 career-only achievement grounding

- Strengthened the writer contract so mapped Career Arsenal achievement bullets cannot absorb unsupported job-listing duties, results, clients, or metrics.
- Cover letters now visibly incorporate their mapped quantified achievements, employer-facing titles omit the alert-only `[Remote]` prefix, and deterministic gaps plus clarification questions are retained as review warnings rather than document copy.
- Passed 173 JavaScript tests and all five SQLite integration checks; production Worker version is `06c7a3ad-4307-4a04-a09b-ca94f5d57e5c`.

## 2026-10-09 — v2.3.27 provider-compatible uniqueness enforcement

- Removed unsupported JSON-Schema `uniqueItems` keywords after Cloudflare xgrammar rejected the schema before inference. Exact evidence-pair uniqueness remains enforced server-side before any draft can be saved, including a regression that rejects four repeated accomplishment references.
- Preserves the grounded employer-facing prose contract from 2.3.26 without relaxing content or evidence validation.
- Passed 173 JavaScript tests and all five SQLite integration checks; production Worker version is `90450f9c-c5cd-4ab3-8827-2a41deec21f1`.

## 2026-10-09 — v2.3.26 grounded employer-facing prose

- Replaced raw evidence-excerpt rendering with structured, evidence-grounded employer-facing summaries, capability labels, achievement bullets, and cover paragraphs while preserving canonical chronology and education server-side.
- Added JSON-Schema `uniqueItems` constraints and explicit server-side duplicate-pair rejection for listing and achievement evidence. Achievement prose and its unique Career Arsenal references are position-bound and count-matched.
- Rejects truncated ellipsis, source identifiers, anchors, placeholders, raw HTML, and drafting commentary from visible prose. Gaps, omissions, warnings, evidence maps, and clarification questions remain review metadata rather than employer-facing copy.
- Passed 173 JavaScript tests and all five SQLite integration checks before deployment; production Worker version is `ae6c97cb-b0c7-49e5-b79e-4912c8233d37`.

## 2026-10-09 — v2.3.25 deterministic evidence-selected documents

- Replaced free-form model-authored document content with structured selection of exact listing, chronology, education, and accomplishment source pairs.
- Added deterministic employer-facing resume and cover-letter rendering from the selected stored source texts; no unsupported model prose is accepted or substituted.
- Reserved prompt slots by source class so ranked Career Arsenal accomplishments cannot be displaced by the base-context cap.
- Added dynamic job/company rendering and removed PSI-specific cover-letter validation.
- Passed 172 JavaScript tests and all five SQLite integration checks before deployment; production Worker version is `0b7db251-9d82-4c47-aee3-fb4b679041db`.
- Verified the release through the authenticated production GUI for PSI Services LLC's `[Remote] Sr. Director, Strategy & Execution` listing `lv_ee95330afbf804602dbf13aa`. The exact-bound requests completed and persisted private, unreviewed tailored-resume revision 4 (`document_revision_cf6ea407-31c0-412b-9440-c78ca7256d0e`, 3,704 characters) and cover-letter revision 3 (`document_revision_320b8d76-fdea-4ff5-b241-c3efd5d47236`, 4,419 characters). Neither revision was approved, uploaded, sent, or submitted.

## 2026-10-09 — v2.3.24 canonical Career Arsenal prompt context

- Added source-grounded canonical Career Arsenal chronology and education references so every application-document prompt receives exact role/date history and education rather than relying only on accomplishment bullets from the v1 index extractor.
- Pinned those references ahead of ranked evidence, retained relevant quantified accomplishments, and compacted source excerpts to remain within the 24K model context.
- Extended D1 and in-memory evidence verification to accept only the exact canonical profile reference pairs.
- Added a regression test proving the application model receives the complete chronology through Ahold and the Boston University education anchor.
- Passed 172 JavaScript tests and all five SQLite integration checks before production deployment.
- Deployed Worker version `a895867c-ca9b-450a-9673-99b1bf5113c0`. A real PSI GUI generation produced resume revision 3 but the cover letter failed closed with `ai_output_protocol_incomplete`; the partial package remains private and unreviewed.

## 2026-10-09 — v2.3.23 protocol adequacy validation

- Replaced artifact-specific character-count acceptance with State Street protocol adequacy checks.
- Rejects raw HTML, brace-wrapped content, incomplete executive sections, chronology-free or unquantified resumes, and one-line untailored cover letters.
- Requires plain-text employer-facing output and preserves the exact evidence, selection, review, budget, and no-submit gates.

## 2026-10-09 — v2.3.22 mandatory evidence classes

- Split application-document structured output into required `listing_evidence` and `arsenal_evidence` arrays, each constrained to exact trusted ID-anchor pairs from its own source class.
- Merge and revalidate both evidence classes server-side before any draft can be saved, closing the one-sided grounding failure observed in the live PSI generation.
- Retained complete-document length, quality, selection, budget, review, and no-submit gates; full suite passes with 172 tests.

## 2026-10-09 — v2.3.21 complete-document schema

- Raises structured-output minimum content length to 800 characters for tailored resumes and 400 characters for cover letters, preventing preambles from satisfying the provider contract.

## 2026-10-09 — v2.3.20 employer-facing document quality

- Requires complete employer-facing resume and cover-letter content for Chris Lockhart and rejects drafting preambles, raw citation identifiers, source anchors, and unresolved `[Your Name]` placeholders before persistence.

## 2026-10-09 — v2.3.19 complete grounding instruction

- Explicitly requires every generated application document to cite at least one exact listing or listing-evidence source and at least one exact Career Arsenal source, matching the existing fail-closed validator.

## 2026-10-09 — v2.3.18 bounded application context

- Compacts the evidence-selected State Street protocol dossier before application-document reservation, keeping large real listings and Arsenal inventories inside the 24K context while retaining exact citation pairs, coverage classifications, gaps, and human-review gates.
- Added a large-source regression proving the complete resume-generation request remains bounded before any provider call.

## 2026-10-09 — v2.3.17 user-triggered package generation

- Removed the one-time-only package authorization obstruction. Each explicit authenticated Generate action may create one idempotent authorization bound to the exact selected job, listing version, and Career Arsenal.
- Retained the fixed package ceiling, monthly runaway cap, exact source/protocol validation, private unreviewed drafts, duplicate-click protection, and all human approval and submission gates.

## 2026-10-09 — v2.3.16 assistant-prepared document import

- Added an authenticated, same-origin import path for assistant-prepared resume and cover-letter revisions bound to the existing selected job, exact listing version, Career Arsenal version, and State Street protocol.
- Every supplied evidence reference is verified against the exact listing or non-internal Arsenal before persistence. Imported revisions are explicitly labeled `assistant_prepared`, retain no AI-draft identity, and require human claim revalidation before approval.
- Added a private dashboard import form plus preview, provenance, and DOCX download through the existing document workflow. Import performs no inference, approval, package build, upload, sending, or submission.

## 2026-10-09 — v2.3.15 exact application-document citations

- Bound application-document JSON Schema evidence entries to exact trusted claim-ID and source-anchor pairs selected for the request. The prompt now exposes the allowed pairs separately and instructs the provider to copy them verbatim; the local validator independently rejects extra evidence fields, out-of-range evidence arrays, pair mismatches, and untrusted references.
- Added mocked contract tests proving that malformed or recombined citations cannot satisfy the response schema. No inference retry was performed.
- Prepared a private unreviewed CVS Health resume draft and an explicit claim-source map from the exact stored listing and non-internal Career Arsenal evidence. No package was approved or submitted.

## 2026-10-09 — v2.3.13 exact displayed-job generation binding

- Bound Generate to the exact visible job, title, company, listing version, selection, authorization, and render token; stale and out-of-order responses fail closed.
- Made Generate visible in job detail and loaded the verified Career Arsenal version automatically as read-only provenance.
- Removed the redundant Generate password prompt while retaining authenticated-session, same-origin, one-package, and exact $0.029-cap controls.
- Added regressions for stale forms, out-of-order responses, unauthenticated/cross-origin requests, stale server context, and duplicate authorization.

## 2026-10-09 — v2.3.12 bounded first-package generation

- Split application-document generation from the global AI switch so outreach and all other AI remain disabled while the explicitly approved resume/optional-cover flow can be enabled independently.
- Added a password-confirmed, selection-scoped authorization request capped at exactly 29,000 micro-USD for the first user-selected package; no retry or second grant is implied.
- Added an append-only history guard across current and migrated authorization ledgers, including clean-install schema coverage and a regression test that rejects a second first-package authorization.
- Corrected the catch-up release note to the authoritative exhausted reconciliation: 778 candidates and 771 committed verified alerts.

## 2026-10-09 — v2.3.11 explicit browser-executor boundary

- Replaced the misleading GUI claim-and-open action with a durable exact-bound browser-executor handoff download.
- The GUI no longer claims a lease or opens an employer destination; a separately authorized executor must claim through the guarded API, stop for user interaction, and record an employer receipt before “applied.”
- Added a synthetic workspace regression proving the handoff contract and absence of the former open/claim click path.

## 2026-10-09 — v2.3.10 controlled document workflow

- Added exact-listing State Street targeting controls, real DOCX revisions, edit revalidation, exact approval, and source-revision package linkage.
- Added a human-reauthenticated, atomic $0.029 package authorization cap: $0.017 resume plus $0.012 cover letter, with no provider call after exhaustion.
- Added fail-closed migration coverage for legacy approvals and selections plus an end-to-end selected-document test.

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

## 2.3.14-2026-10-09

- Migrated the deployed `ai_requests` ledger from its legacy 900-token CHECK to the bounded 3,500-token application-document ceiling.
- Preserved existing request/draft history, foreign-key integrity, and monthly plus package budget reserve/settle triggers.
- Added a legacy-schema migration regression covering a 3,500-token resume, 1,500-token cover letter, existing referenced history, ledger settlement, and rejection above 3,500 tokens.

