import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {artifactManifestHash,canonicalManifestRows,EXECUTION_STATUSES,validateSubmittedAt} from "../application-execution/application-execution.js";

const rows=[
  {artifact_id:"b",artifact_type:"cover_letter",drive_file_id:"drive-b",content_hash:"b".repeat(64),byte_size:20,drive_modified_time:"2026-10-08T10:00:00.000Z"},
  {artifact_id:"a",artifact_type:"tailored_resume",drive_file_id:"drive-a",content_hash:"A".repeat(64),byte_size:10,drive_modified_time:"2026-10-08T09:00:00.000Z"}
];

test("manifest hash is deterministic, ordered, and binds verification metadata",async()=>{
  assert.deepEqual(canonicalManifestRows(rows).map(x=>x.artifact_id),["a","b"]);
  assert.equal(await artifactManifestHash(rows),await artifactManifestHash([...rows].reverse()));
  assert.notEqual(await artifactManifestHash(rows),await artifactManifestHash(rows.map(x=>x.artifact_id==="a"?{...x,byte_size:11}:x)));
});

test("execution states include explicit stops, uncertainty, and submitted",()=>{
  for(const value of ["login_required","user_input_required","submission_uncertain","rejected","submitted"])assert.ok(EXECUTION_STATUSES.includes(value));
  assert.ok(!EXECUTION_STATUSES.includes("applied"));
});

test("manifest rejects caller-like incomplete artifact data",async()=>{
  await assert.rejects(()=>artifactManifestHash([{artifact_id:"a",artifact_type:"resume",drive_file_id:"d",content_hash:"a".repeat(64),byte_size:0,drive_modified_time:"x"}]),/invalid_verified_artifact_manifest/);
});

test("manual submission timestamp must be real, nonfuture, and after approval",()=>{
  const now=Date.parse("2026-10-08T12:00:00.000Z"),approved="2026-10-08T11:00:00.000Z";
  assert.equal(validateSubmittedAt("2026-10-08T11:30:00Z",now,approved),"2026-10-08T11:30:00.000Z");
  for(const value of ["not-a-date","2026-10-08T10:59:59Z","2026-10-08T12:01:01Z"])assert.throws(()=>validateSubmittedAt(value,now,approved),/invalid_submitted_at/);
});

test("claim, receipt, revocation, and migration SQL retain fail-closed guards",async()=>{
  const [source,sql]=await Promise.all([readFile(new URL("../application-execution/application-execution.js",import.meta.url),"utf8"),readFile(new URL("../migrations/0003-application-execution.sql",import.meta.url),"utf8")]);
  assert.match(source,/c\.availability='open'.*c\.capture_source='public_server_fetch'.*'-15 minutes'.*application_execution_artifacts/s);
  assert.match(source,/status='submission_uncertain'.*claim_lease_expired_outcome_unknown[\s\S]*status IN\('approved','login_required','user_input_required'\)/);
  assert.match(sql,/execution_receipt_guard[\s\S]*c\.availability='open'[\s\S]*'-15 minutes'[\s\S]*application_execution_artifacts/);
  for(const guard of ["revoke_execution_on_artifact_change","revoke_execution_on_artifact_delete","revoke_execution_on_verification_change","revoke_execution_on_verification_delete","revoke_execution_on_listing_check_change","immutable_execution_destination_update"])assert.match(sql,new RegExp(guard));
  assert.match(sql,/BEGIN IMMEDIATE;[\s\S]*ON CONFLICT ROLLBACK[\s\S]*COMMIT;/);
});
