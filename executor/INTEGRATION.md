# Executor integration contract

This tree is implementation-only. Nothing here installs, pairs, starts, receives account access, or submits a real application.

## Authoritative sequence

1. The authenticated dashboard claims one exact queue item.
2. The extension observes the destination and hashes the visible final form state.
3. Chris password-reauthenticates to `POST /api/applications/:queue_id/final-submit-authorizations` with the paired `device_id` and form hash.
4. The Worker verifies the device through the private `EXECUTOR_DEVICE_VERIFIER` service binding and inserts a five-minute capability whose secret is returned once and stored only as a SHA-256 hash.
5. Immediately before clicking, the executor re-observes host and form state and calls `POST /api/applications/:queue_id/consume-final-submit`.
6. A single guarded database update atomically consumes the capability only if the token, device, queue, package revision, listing/check, manifest, destination, form, approval, lease, and current public listing still match.
7. Only a successful consumption response permits one click. Any failure after consumption is `submission_uncertain` and must not be retried.

`reviewer_role` is workflow state, not authentication. Writer and Critic transitions use the authenticated dashboard session plus the displayed revision fence. Chris approval additionally requires password reauthentication.

## Platform boundary

The extension and `shared/executor-core.js` are portable. Launchers implement the same native-messaging boundary:

- macOS: per-user LaunchAgent and Keychain are the planned first implementation.
- Windows: interface only; a Credential Manager-backed runtime is not implemented or tested.

Installation, native-host registration, device pairing, browser access grants, background startup, Keychain/Credential Manager entries, and live submissions require separate approval.
