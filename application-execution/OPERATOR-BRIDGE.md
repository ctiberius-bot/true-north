# Trusted operator submission-receipt bridge

This offline tool is for a later, explicitly authorized receipt operation after Chris approves an exact real application, the operator claims the approved queue item, the application is actually submitted in the authenticated external browser, and a visible confirmation is observed.

It does not submit an application or access the database or browser. It accepts a local observation JSON file and prints deterministic guarded SQL plus mandatory readback SQL:

```sh
node application-execution/trusted-operator-submission-receipt.mjs observation.json
```

The evidence label is **“Employer confirmation — authenticated operator-observed (`trusted_browser_observation`), not cryptographic employer attestation.”** It is authenticated operator evidence, not an employer signature, webhook, or cryptographic proof.

Production already has migration `0003`. Install only `migrations/0004-operator-submission-receipt.d1.sql`; never rerun the initial execution migration blindly. The additive trigger makes a valid receipt INSERT atomically move the exact queue item to `submitted` and its bound pipeline item to `applied`.

The observation must copy the exact queue, job, package revision, listing version/check, destination, manifest, and verified artifact values from the live claim. It also requires the one-time lease, same-host employer confirmation URL, visible confirmation text, locally retained capture hash, observation time, and operator label. The raw lease is hashed and never appears in generated SQL.

At execution time, the generated SQL rechecks the unexpired lease and 15-minute listing freshness against database `now`, and requires the observation timestamp to be at or after approval and no later than database `now`. The stored `recorded_at` value also comes from database `now`, not tool-generation time.

If the guarded INSERT or mandatory readback returns no receipt, treat the outcome as unknown and do not retry the external employer submission. Replaying only the identical receipt INSERT/readback is safe.
