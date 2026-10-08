# Review handoff

## What is complete

- Transaction-wrapped additive migration with post-install assertions, exact approval tuple, artifact snapshot, bounded lease, origin/token binding, explicit blocker and uncertainty states, immutable receipt/destination, and automatic listing/artifact/verification revocation triggers.
- Modular D1 service and authenticated router adapter.
- Same-origin GUI fragment for exact approval and clearly labeled manual attestation.
- Unit and SQLite trigger tests.
- A narrow illustrative worker hook in `worker-integration.patch`; main builder files were not edited.

## Deliberate blocker / smallest safe path

There is no reviewed trust/auth integration that can independently verify a browser-observed employer confirmation. Therefore `/receipt` fails closed unless the host supplies a trusted internal callback. The smallest honest completion path is:

1. Chris approves the exact package in the GUI.
2. A browser-assisted operator claims the item and stops for login or unanswered questions.
3. Chris submits externally in the employer UI.
4. Chris uses the GUI's explicitly labeled, password-reauthenticated manual attestation.

Only step 4 creates a receipt and moves the bound pipeline item to `applied`. Queue-ready, claimed, blocked, and uncertain states never do.

## Integration cautions

- The current generic pipeline endpoint must reject caller-requested `stage: applied`; this patch owns that transition through a receipt batch only.
- Keep `registerDestination()` behind reviewed internal listing-verification/admin code. Do not expose it as an approval-time endpoint.
- D1 `batch()` atomicity is relied on for approval+snapshot+queue and receipt+submitted+pipeline writes.
- Do not log `X-Application-Lease` or return it after the initial claim response.
- `expected_package_revision` and all other expected-version fields are required in the approval request and compared with server-derived values.
