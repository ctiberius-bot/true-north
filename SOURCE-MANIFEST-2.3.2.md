# True North live-source manifest

Observed 2026-10-08 after the bounded research-control deployment. This document is read-only reconciliation evidence; it does not authorize or perform a Drive write.

## Current live Worker

- Production URL: `https://truenorth.justsignal.company`
- Health version: `2.3.2-2026-10-08`
- Cloudflare Worker version ID: `2f9fe3d0-7b25-4c76-b67d-f5c804e7d334`
- Cloudflare creation time: `2026-10-08T15:53:14.593Z`
- Cloudflare author: `ctiberius@gmail.com`
- AI generation: disabled
- Scheduled read-only execution: disabled
- Cleanup: preview only
- Automatic sending: false

The previously reported `2.3.1` release was superseded by the tested `2.3.2` functional deployment before the Drive continuity alert arrived. `2.3.2` adds only the explicit authenticated GUI control for one bounded batch of up to five existing research tasks. That action was not invoked.

## Exact local deployment inputs

These files are the inputs used for the live `2.3.2` Worker upload:

| File | SHA-256 |
|---|---|
| `worker.js` | `6ae6b51a6912b36bc903f8a4c7785a1ae3e0b1f17d87c5bdfb7b78567388ad8e` |
| `workspace-ui.js` | `4f781e776f64797e221a007d2b1da23990a8b4537b323ef900d78cc8308ed1bf` |
| `application-execution/application-execution.js` | `97ea873080aeaf3933cc3819a10fd671279d8448af9595fcb04081f91c5fc729` |
| `wrangler.toml` | `53dcbc966938497af6d9b047c1fa186c8f194d132aec9522810fe245263d7211` |

`workspace-ui.js` embeds the exact HTML and SVG assets served by the Worker. The source HTML and exact SVG files are also retained separately in the bundle.

## Database migration deployed separately

Migration `0004` was applied to D1 before the `2.3.2` Worker upload. It is database state, not a Worker-version hash input.

| File | SHA-256 |
|---|---|
| `migrations/0004-operator-submission-receipt.d1.sql` | `82b319ff919aa360737056578cdeec8a9ec0477e4a7342cb7b23fe56ff1b983e` |

Production readback confirmed trigger `apply_pipeline_after_submission_receipt`, zero submission receipts, zero execution queue items, and zero applied pipeline items.

## Prepared canonical ZIP

- Local file: `/tmp/true-north-jobs-source-2.3.2.zip`
- Size: `173063` bytes
- SHA-256: `f618244dcf1ef38f20f636508001288cc41fb4aff41c5a3cc158ee3ee9e9b809`
- Embedded `worker.js` SHA-256: `6ae6b51a6912b36bc903f8a4c7785a1ae3e0b1f17d87c5bdfb7b78567388ad8e`
- Embedded `workspace-ui.js` SHA-256: `4f781e776f64797e221a007d2b1da23990a8b4537b323ef900d78cc8308ed1bf`
- Embedded `README.md` SHA-256: `bc974b5b2205e6d95ee97253e36cd467b935b98f2caa2264f6534dc1b427b3b1`

The ZIP includes source, generated UI module, application-execution module, migrations, tests, exact SVG assets, environment-name-only configuration, README, and frontend/API handoff. It excludes private Career Arsenal/application data, local databases, and secret values.

## Current Drive state and ownership

- Canonical folder ID: `1nyJNgw-TuM_AYEuYE8FbjoOYFe23okcd`
- Owner: `ctiberius@gmail.com` (`Chris Lockhart`)
- Writer: `chris@justsignal.company`
- Current connected account for reconciliation: `ctiberius@gmail.com`
- Existing ZIP ID: `10nJDCqO4z00-RTB1d8lwb8wcghVzm3-7`
- Existing ZIP owner: `ctiberius@gmail.com`
- Existing ZIP parent: the canonical folder above
- Existing ZIP remains stale at `101103` bytes, modified `2026-10-07T23:04:22.984Z`
- Existing Drive ZIP SHA-256 from its last verified canonical readback: `C866A3323170A23FDEA214D9CCC63C832E1430C4ECD7D2402E92D1A67661A18E`

No Drive write from this reconciliation succeeded. A later overwrite requires fresh direct approval accepted by the Drive write safety gate.
