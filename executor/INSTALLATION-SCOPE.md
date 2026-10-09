# Future installation and access approval scope

This is a proposal only. It does not grant or perform any listed action.

## macOS files and registrations

- Copy the reviewed native host into one user-owned application-support directory.
- Materialize `company.justsignal.truenorth_executor.template.json` with that one absolute host path and the reviewed extension ID.
- Register that manifest only in the current user's Chrome `NativeMessagingHosts` directory.
- Load/install the reviewed extension with required permissions limited to `nativeMessaging`, `scripting`, `activeTab`, and `https://truenorth.justsignal.company/*`. The manifest declares `https://*/*` only as an optional host pattern so Chrome can grant one exact employer origin at runtime; it is not granted at installation.
- Create one per-user LaunchAgent only if background queue polling is separately approved. The initial click-to-run prototype does not need it.
- Create one device key in macOS Keychain and pair only its public identity if pairing is separately approved. Never read or export browser passwords, cookies, employer credentials, or the dashboard password.

## Runtime scope

- Dashboard origin: exactly `https://truenorth.justsignal.company`.
- Queue scope: one claimed queue ID and its exact five-minute capability.
- Employer scope, local mode: only the active tab whose HTTPS host equals the server-bound destination host; `activeTab` access begins from an explicit local Chrome extension gesture. This mode cannot provide unattended iPhone-to-Mac execution.
- Employer scope, optional remote mode: unattended phone-triggered execution requires a separately approved runtime host grant for the exact employer origin and a separately approved active background native host. It must not request or retain unrelated employer origins.
- Final action: one capability consumption followed by at most one submit activation. Any ambiguous result stops as uncertain.
- Storage: capability secrets remain memory-only; server stores only their hash. Device private key would remain non-exportable in Keychain.

## Separate approvals still required

1. Install the reviewed native host and Chrome extension.
2. Pair this Mac's device public identity.
3. Grant the listed Chrome permissions and per-click `activeTab` access.
4. Create/start a LaunchAgent, only if background polling is desired.
5. Use the executor on a real employer application.

## Drive artifact verification access

The repository currently has no Drive runtime binding; the interactive ChatGPT Drive connection cannot be reused by the Worker. The least-privilege supported design is a private connector using Google OAuth `drive.file`, limited to artifact files that True North creates or that Chris explicitly opens/selects for True North. That OAuth scope is not read-only: it permits creating and editing those app-created/selected files. The implemented application behavior creates a new artifact file, downloads that exact file for byte-for-byte hash verification, records its immutable receipt, and performs no later edit. It does not list or search the account, delete, share, or access unrelated canonical/private documents. Creating that OAuth grant, configuring the private binding, and selecting any existing artifact files require separate approval.

The private `EXECUTOR_DEVICE_VERIFIER` service binding is declared in the review branch but neither verifier Worker nor binding is deployed. Receipt verification deliberately reuses that signed-device service rather than declaring a second trust service. Deployment, device registration, and runtime access remain separately unapproved.
