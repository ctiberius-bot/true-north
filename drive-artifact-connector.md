# Private Drive artifact connector

This source is reviewable but not deployed or authorized. It does not reuse the
interactive ChatGPT Drive connection and contains no OAuth client secret, refresh
token, access token, or consent grant.

## Provider contract

The private `DRIVE_TOKEN_PROVIDER` service binding must return an ephemeral token
from `GET /token` with `account_email`, `scope`, and `access_token`. The connector
fails closed unless the account matches `DRIVE_ACCOUNT_EMAIL` and the complete
scope set is exactly:

`https://www.googleapis.com/auth/drive.file`

That scope is not read-only. Google documents it as access to files the app creates
or that a user opens/selects for the app. The connector further narrows its own
behavior to one `DRIVE_ARTIFACT_FOLDER_ID` and implements only:

- `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`
  with metadata and artifact bytes;
- `GET https://www.googleapis.com/drive/v3/files/{fileId}` for exact-file metadata;
- `GET https://www.googleapis.com/drive/v3/files/{fileId}?alt=media` for exact-file
  readback.

There is no list, search, update, delete, share, or permission-management path.
The access token remains inside this private Worker and is never returned by its
routes.

## User-action boundary

Before activation, the user must separately review and approve the OAuth consent
screen, exact Google account, exact destination folder, token-provider deployment,
private service bindings, and connector deployment. The placeholder folder in
`wrangler.drive-artifact-connector.toml` must not be replaced without that approval.
The Citadel `DRIVE_ARTIFACT_CONNECTOR` binding must likewise remain absent until
the connector is approved and deployed.

Official references:

- https://developers.google.com/workspace/drive/api/guides/manage-uploads
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
