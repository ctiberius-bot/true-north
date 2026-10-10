# True North Mac executor — bounded authorization package

This document is a proposed authorization request only. Approval does not itself install, deploy, pair, grant account access, start a background process, or submit an application.

## A. Local-gesture Mac mode

Approve only these actions:

1. Copy the reviewed executor source/runtime to `~/Library/Application Support/TrueNorthExecutor/`.
2. Compile `executor/native-host/KeychainSigner.swift` locally with Apple's installed command-line toolchain and place the resulting binary in that directory.
3. Render one native-host manifest from the reviewed template and write it to `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/company.justsignal.truenorth_executor.json`.
4. Enable Chrome Developer Mode and load the reviewed unpacked extension from the copied `executor/chrome-extension/` directory.
5. Grant required Chrome permissions: `nativeMessaging`, `scripting`, `activeTab`, and `https://truenorth.justsignal.company/*`.
6. On each execution, require a local click on the extension while the exact employer tab is active. `activeTab` lasts only for that user-invoked tab interaction.

Do not approve any background LaunchAgent, all-sites employer access, phone-triggered execution, password/cookie extraction, or submission without the exact server-consumed authorization.

## B. Optional phone-to-Mac automatic mode — separate approval

This cannot use `activeTab`, because Chrome requires a local gesture. It would require all of the following separately:

1. Grant the extension runtime access to one exact employer origin, such as `https://jobs.example.com/*`, only after the server-bound destination is known. The manifest's `https://*/*` entry is optional permission capacity, not an installation-time grant.
2. Write `~/Library/LaunchAgents/company.justsignal.truenorth.executor.plist` to launch the native host from `~/Library/Application Support/TrueNorthExecutor/` for the signed-in user only.
3. Load/start that LaunchAgent and permit bounded background queue polling. It must not run as root or as a system daemon.
4. Revoke the exact employer-origin grant when it is no longer needed.

No automatic-phone-mode approval should be requested until background polling and exact-origin grant revocation are implemented and reviewed.

## C. Keychain and device pairing — implemented, not activated

The reviewed helper now implements create, public-key export, ECDSA signing, and exact-key revoke for a non-exportable P-256 key tagged `company.justsignal.truenorth.executor`. Pairing requires password reauthentication and an exact SHA-256 public-key fingerprint confirmation; only the public SPKI value, label, and fingerprint enter `executor_devices`. Revocation is separately password reauthenticated. No command has been run against the real Keychain and no device has been paired.

## D. Server changes

Already present only on the review branch, not deployed:

- D1 migrations `0010`, `0011`, and `0012` for single-use capabilities, device registry/nonces, and submit-attempt journal.
- Private Worker `true-north-executor-device-verifier`.
- Main Worker service binding `EXECUTOR_DEVICE_VERIFIER`.
- Narrow signed-device endpoints for claim, consume, receipt, and uncertainty; dashboard session/password remains required for capability issuance.

Deployment approval would cover these exact files/services and no public verifier route. It would preserve AI-off, schedules-off, sending-off, Gmail read-only, and cleanup-preview settings.

## E. Drive artifact connector — provider access not yet ready for approval

Implemented today: the authenticated route and create → download → exact-byte-hash → D1 verification/audit workflow.

A concrete private connector implementation and mocked contract tests are now present, but it is not deployed or connected. The OAuth client/token-provider binding and exact approved destination folder remain unconfigured. The existing interactive ChatGPT Drive connection cannot be silently reused by the Worker.

The proposed provider is Google Drive for `ctiberius@gmail.com`, using OAuth scope `https://www.googleapis.com/auth/drive.file`. This scope is not read-only: it permits True North to create and edit files it creates or files Chris explicitly selects for the app. The application behavior would be restricted to:

- Create a new DOCX artifact in one explicitly approved folder.
- Read back that exact new file's metadata and bytes for hash verification.
- Never list/search the account, edit after verification, delete, share, or access unrelated files.

Approval must name the destination folder and authorize creation/readback there. The connector requires the verified account `ctiberius@gmail.com`, exactly `drive.file`, and the fixed configured folder; it exposes no list, search, update, delete, or share operation. No OAuth grant, token-provider configuration, or connector deployment should occur before the implementation and consent screen are reviewed.

## F. Signing, binaries, and terms

- The Swift helper is compiled locally from repository source with Apple's toolchain. It is not downloaded from an unknown binary source.
- The resulting helper is not currently Developer ID signed or notarized. macOS may display an unidentified/developer warning; installation must stop rather than bypass Gatekeeper silently.
- The Chrome extension is currently an unpacked developer-mode extension, not Chrome Web Store signed. Enabling Developer Mode and loading unpacked code are explicit user actions.
- No new third-party terms are accepted by the implementation itself. Google OAuth consent would be a separate explicit user action under Google's existing account terms.
- No credentials, cookies, or password values are copied into source, manifests, logs, or chat.

## G. Cost

- No new paid API is introduced by the source.
- The verifier uses the existing Cloudflare Worker/D1 account and the Drive design uses Google Drive API access. Usage may count against existing platform quotas.
- No purchase, paid plan upgrade, or billable third-party call is authorized. If deployment would require one, stop and request separate approval.

## Current recommendation

Do not install, pair, grant Chrome/Google access, or deploy from this document alone. The source now includes reviewable Keychain lifecycle, pairing/revocation, exact-origin grant removal, a per-user installer plan, post-click confirmation observation, a consumed-attempt reconciliation route, and the concrete Drive connector. Independent review is still required. After review, the next user decision should choose local-gesture mode only or local plus the separately bounded phone-automatic mode; Drive consent, its fixed folder, and all deployments remain separate explicit approvals.
