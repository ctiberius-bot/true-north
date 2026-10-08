import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {buildTrustedOperatorSubmissionReceipt} from "../application-execution/trusted-operator-submission-receipt.mjs";

const a="a".repeat(64),fixture=()=>({
  queue_id:"application_execution_1",lease_token:"one-time-lease-secret",
  expected:{job_id:"job",package_id:"pkg",package_revision:7,listing_version_id:"lv",listing_check_id:"check",artifact_manifest_hash:"b".repeat(64),destination_url:"https://employer.example/job/apply",artifacts:[{artifact_id:"artifact",drive_file_id:"drive",content_hash:a,byte_size:123,drive_modified_time:"2026-10-08T15:00:00.000Z"}]},
  observation:{confirmation_url:"https://employer.example/job/confirmation",visible_confirmation_text:"Application submitted successfully",employer_confirmation_ref:"R-2004",capture_sha256:"c".repeat(64),observed_at:"2026-10-08T15:30:00.000Z",operator:"chris-browser-operator"}
}),options={recordedAt:"2026-10-08T15:30:10.000Z"};

test("operator dry-run is deterministic, exact-bound, idempotent, and never embeds lease secret",()=>{
  const first=buildTrustedOperatorSubmissionReceipt(fixture(),options),second=buildTrustedOperatorSubmissionReceipt(fixture(),options);
  assert.equal(first.receipt_id,second.receipt_id);assert.equal(first.detail_hash,second.detail_hash);assert.equal(first.dry_run,true);
  for(const marker of ["INSERT OR IGNORE","q.status='claimed'","q.lease_token_hash=","q.lease_expires_at>strftime","a.approved_at","a.package_revision=7","a.artifact_manifest_hash=","d.destination_url=","c.availability='open'","'now','-15 minutes'","application_execution_artifacts","artifact_verifications","q.status='submitted'","p.stage='applied'"])assert.match(first.sql,new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
  assert.doesNotMatch(first.sql,/one-time-lease-secret/);assert.match(first.trust_model,/not_cryptographic/);assert.match(first.receipt_label,/operator-observed.*not cryptographic/i);
});

test("delayed execution is evaluated against database now, never generation recordedAt",()=>{
  const result=buildTrustedOperatorSubmissionReceipt(fixture(),options),insert=result.statements[0];
  assert.match(insert,/q\.lease_expires_at>strftime\('%Y-%m-%dT%H:%M:%fZ','now'\)/);
  assert.match(insert,/c\.captured_at>=strftime\('%Y-%m-%dT%H:%M:%fZ','now','-15 minutes'\)/);
  assert.match(insert,/'2026-10-08T15:30:00\.000Z'>=a\.approved_at/);
  assert.match(insert,/'2026-10-08T15:30:00\.000Z'<=strftime\('%Y-%m-%dT%H:%M:%fZ','now'\)/);
  assert.doesNotMatch(insert,/q\.lease_expires_at>'2026-10-08T15:30:10\.000Z'/);
  assert.doesNotMatch(insert,/c\.captured_at>=strftime\([^)]*'2026-10-08T15:30:10\.000Z'/);
});

test("operator bridge rejects host mismatch, weak evidence, malformed binding, and future observation",()=>{
  for(const mutate of [v=>v.observation.confirmation_url="https://evil.example/ok",v=>v.observation.capture_sha256="bad",v=>v.observation.visible_confirmation_text="ok",v=>v.expected.package_revision=-1,v=>v.observation.observed_at="2026-10-08T15:32:00.000Z"]){const value=fixture();mutate(value);assert.throws(()=>buildTrustedOperatorSubmissionReceipt(value,options),/operator_receipt_/)}
});

test("observation evidence and every exact binding affect receipt identity",()=>{
  const original=buildTrustedOperatorSubmissionReceipt(fixture(),options).receipt_id;
  for(const mutate of [v=>v.expected.package_revision=8,v=>v.expected.artifacts[0].content_hash="d".repeat(64),v=>v.observation.visible_confirmation_text+="!",v=>v.observation.capture_sha256="e".repeat(64),v=>v.observation.employer_confirmation_ref="R-2005"]){const value=fixture();mutate(value);assert.notEqual(buildTrustedOperatorSubmissionReceipt(value,options).receipt_id,original)}
});

test("deployed-schema additive migration contains only the atomic receipt transition trigger",async()=>{
  const sql=await readFile(new URL("../migrations/0004-operator-submission-receipt.d1.sql",import.meta.url),"utf8");
  assert.match(sql,/DROP TRIGGER IF EXISTS apply_pipeline_after_submission_receipt;[\s\S]*CREATE TRIGGER apply_pipeline_after_submission_receipt/);
  assert.match(sql,/AFTER INSERT ON application_submission_receipts[\s\S]*status='submitted'[\s\S]*stage='applied'/);
  assert.match(sql,/operator_receipt_migration_complete[\s\S]*sqlite_master[\s\S]*DROP TABLE _operator_receipt_migration_assert/);
  assert.doesNotMatch(sql,/CREATE TABLE (?!_operator_receipt_migration_assert)|application_execution_approvals\s*\(/i);
});
