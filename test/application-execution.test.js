import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {artifactManifestHash,canonicalManifestRows,EXECUTION_STATUSES,executionProgress,routeApplicationExecution,validateSubmittedAt} from "../application-execution/application-execution.js";

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

test("execution progress never confuses queued or blocked work with submission",()=>{
  assert.equal(executionProgress("approved").step,1);
  assert.match(executionProgress("approved").next_action,/no browser action or submission/);
  assert.match(executionProgress("submission_uncertain").next_action,/Do not submit again/);
  assert.equal(executionProgress("submitted").terminal,true);
});

test("manifest rejects caller-like incomplete artifact data",async()=>{
  await assert.rejects(()=>artifactManifestHash([{artifact_id:"a",artifact_type:"resume",drive_file_id:"d",content_hash:"a".repeat(64),byte_size:0,drive_modified_time:"x"}]),/invalid_verified_artifact_manifest/);
});

test("manual submission timestamp must be real, nonfuture, and after approval",()=>{
  const now=Date.parse("2026-10-08T12:00:00.000Z"),approved="2026-10-08T11:00:00.000Z";
  assert.equal(validateSubmittedAt("2026-10-08T11:30:00Z",now,approved),"2026-10-08T11:30:00.000Z");
  for(const value of ["not-a-date","2026-10-08T10:59:59Z","2026-10-08T12:01:01Z"])assert.throws(()=>validateSubmittedAt(value,now,approved),/invalid_submitted_at/);
});

test("authenticated execution router exposes destination registration separately from approval",async()=>{
  const calls=[],service={
    registerDestination:async(jobId,input)=>{calls.push({jobId,input});return{id:"destination-1",job_id:jobId,...input}},
    listDestinations:async jobId=>[{id:"destination-1",job_id:jobId}]
  };
  const input={listing_version_id:"lv-1",listing_check_id:"check-1",destination_url:"https://jobs.example/apply",verification_source:"public_server_fetch",verified_at:"2026-10-09T18:00:00.000Z"};
  const created=await routeApplicationExecution(new Request("https://truenorth.justsignal.company/api/applications/job%2F1/destinations",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(input)}),{service});
  assert.equal(created.status,200);
  assert.deepEqual(calls,[{jobId:"job/1",input}]);
  assert.equal((await created.json()).id,"destination-1");
  const listed=await routeApplicationExecution(new Request("https://truenorth.justsignal.company/api/applications/job%2F1/destinations"),{service});
  assert.deepEqual(await listed.json(),[{id:"destination-1",job_id:"job/1"}]);
  const ignored=await routeApplicationExecution(new Request("https://truenorth.justsignal.company/api/applications/job%2F1/destinations",{method:"DELETE"}),{service});
  assert.equal(ignored,null);
});

test("claim, receipt, revocation, and migration SQL retain fail-closed guards",async()=>{
  const [source,sql]=await Promise.all([readFile(new URL("../application-execution/application-execution.js",import.meta.url),"utf8"),readFile(new URL("../migrations/0003-application-execution.sql",import.meta.url),"utf8")]);
  assert.match(source,/c\.availability='open'.*c\.capture_source='public_server_fetch'.*'-15 minutes'.*application_execution_artifacts/s);
  assert.match(source,/status='submission_uncertain'.*claim_lease_expired_outcome_unknown[\s\S]*status IN\('approved','login_required','user_input_required'\)/);
  assert.match(sql,/execution_receipt_guard[\s\S]*c\.availability='open'[\s\S]*'-15 minutes'[\s\S]*application_execution_artifacts/);
  for(const guard of ["revoke_execution_on_artifact_change","revoke_execution_on_artifact_delete","revoke_execution_on_verification_change","revoke_execution_on_verification_delete","revoke_execution_on_listing_check_change","immutable_execution_destination_update"])assert.match(sql,new RegExp(guard));
  assert.match(sql,/BEGIN IMMEDIATE;[\s\S]*ON CONFLICT ROLLBACK[\s\S]*COMMIT;/);
});
