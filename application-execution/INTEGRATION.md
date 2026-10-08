# Application execution integration patch

This directory is additive and intentionally does not modify `worker.js`, `schema.sql`, or the main GUI. It performs no deployment and no employer-form interaction.

## Security boundary

- `approved_to_send`, queue `approved`, and `claimed` all explicitly mean **not submitted**.
- Chris must password-reauthenticate and approve the exact server-derived package revision, listing check, destination, and artifact manifest.
- Claims are same-origin, token-bound, and limited to 60–900 seconds. The token is returned once and only its SHA-256 is stored.
- Claim and receipt/attestation gates recheck that the exact bound public listing check is open and no older than 15 minutes, and that every artifact and trusted verification still matches the immutable approval snapshot.
- Login and unknown questions stop execution as `login_required` or `user_input_required`.
- An ambiguous employer response becomes `submission_uncertain`; it cannot be reclaimed, preventing duplicate submission.
- `applied` is written only in the same database batch as a receipt. Employer receipts require an internal trusted-browser verifier result that cannot be supplied in request JSON. The available fallback is a clearly labeled, password-reauthenticated Chris manual attestation.
- No credentials, cron, broad sending, browser ownership, or automated form filling are added.

## Minimal worker wiring

Import `createApplicationExecutionService` and `routeApplicationExecution`. After the existing dashboard-session check, create the service from the existing D1 binding and call the router before the generic 404. The reauthentication callback must compare against the existing `DASHBOARD_PASSWORD` and return exactly `{actor:'chris', reauthenticated:true}` on success. Do not accept `reauthenticated`, `trusted`, or `submitted` booleans from JSON.

The trusted receipt callback must be omitted (or fail closed) until a reviewed browser-observation adapter can independently establish the employer confirmation. Queue readiness is still useful without it because the GUI manual-attestation path remains available.

```js
const executionService=createApplicationExecutionService(env.DB);
const executionResponse=await routeApplicationExecution(request,{
  service:executionService,
  reauthenticate:async password=>{
    if(!env.DASHBOARD_PASSWORD||password!==env.DASHBOARD_PASSWORD)throw new Error('human_reauthentication_required');
    return {actor:'chris',reauthenticated:true};
  }
  // trustedEmployerReceipt: intentionally absent until reviewed trust integration exists
});
if(executionResponse)return executionResponse;
```

Mount `gui-fragment.js` only inside the authenticated workspace and pass the existing same-origin `api` helper, selected job ID, and a server-created destination ID.

## Endpoints

| Method | Endpoint | Meaning |
|---|---|---|
| GET | `/api/applications/:job_id/execution-preview?destination_id=...` | Exact approval review data; no state change |
| POST | `/api/applications/:job_id/approve-execution` | Reauthenticated exact approval; creates one queue item; not submitted |
| GET | `/api/applications/queue` | Safe queue/status list |
| POST | `/api/applications/:queue_id/claim` | Bounded same-origin lease; can resume a resolved login/input stop after lease expiry; not submitted |
| POST | `/api/applications/:queue_id/blocker` | `login_required` or `user_input_required` stop |
| POST | `/api/applications/:queue_id/uncertain` | Irreversible hold against duplicate submit |
| POST | `/api/applications/:queue_id/receipt` | Trusted adapter only; employer confirmation receipt |
| POST | `/api/applications/:queue_id/manual-attestation` | Reauthenticated, clearly labeled Chris attestation |
| POST | `/api/applications/:queue_id/reject` | Reauthenticated cancellation |

Executor mutation calls send the one-time claim secret in `X-Application-Lease`. All calls must remain under the existing authenticated dashboard session and same browser origin.

`registerDestination()` is a repository method, not an exposed public route. It requires `listing_version_id`, `listing_check_id`, `destination_url`, `verification_source`, and `verified_at`. Only a destination whose host and timestamp exactly match an open `public_server_fetch` check can authorize approval; an `unverified_browser_observation` remains display-only. Never allow a caller to create a destination during approval.
