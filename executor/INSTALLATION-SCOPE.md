# Future installation and access approval scope

This is a proposal only. It does not grant or perform any listed action.

## macOS files and registrations

- Copy the reviewed native host into one user-owned application-support directory.
- Materialize `company.justsignal.truenorth_executor.template.json` with that one absolute host path and the reviewed extension ID.
- Register that manifest only in the current user's Chrome `NativeMessagingHosts` directory.
- Load/install the reviewed extension with permissions limited to `nativeMessaging`, `scripting`, `activeTab`, and `https://truenorth.justsignal.company/*`.
- Create one per-user LaunchAgent only if background queue polling is separately approved. The initial click-to-run prototype does not need it.
- Create one device key in macOS Keychain and pair only its public identity if pairing is separately approved. Never read or export browser passwords, cookies, employer credentials, or the dashboard password.

## Runtime scope

- Dashboard origin: exactly `https://truenorth.justsignal.company`.
- Queue scope: one claimed queue ID and its exact five-minute capability.
- Employer scope: only the active tab whose HTTPS host equals the server-bound destination host; `activeTab` access begins from an explicit extension action.
- Final action: one capability consumption followed by at most one submit activation. Any ambiguous result stops as uncertain.
- Storage: capability secrets remain memory-only; server stores only their hash. Device private key would remain non-exportable in Keychain.

## Separate approvals still required

1. Install the reviewed native host and Chrome extension.
2. Pair this Mac's device public identity.
3. Grant the listed Chrome permissions and per-click `activeTab` access.
4. Create/start a LaunchAgent, only if background polling is desired.
5. Use the executor on a real employer application.

## Drive artifact verification access

The repository currently has no Drive runtime binding; the interactive ChatGPT Drive connection cannot be reused by the Worker. The least-privilege supported design is a private `DRIVE_ARTIFACT_VERIFIER` service using Google OAuth `drive.file`, limited to artifact files that True North creates or that Chris explicitly opens/selects for True North. It needs only file metadata plus read access to hash the exact selected bytes. It does not need Drive listing, search across the account, write, delete, sharing, or access to unrelated canonical/private documents. Creating that OAuth grant, configuring the private binding, and selecting any existing artifact files require separate approval.

The private `TRUSTED_EMPLOYER_RECEIPT_VERIFIER` and `EXECUTOR_DEVICE_VERIFIER` bindings likewise remain unconfigured until device pairing/runtime access is separately approved.
