import test from "node:test";
import assert from "node:assert/strict";
import {assertFinalSubmitObservation,canonicalFinalSubmitAuthorization} from "../application-execution/final-submit-authorization.js";

const now=Date.parse("2026-10-09T18:00:00.000Z"),hash=value=>value.repeat(64),fixture=()=>({
  version:1,action:"submit_once",authorization_id:"auth-1",device_id:"mac-1",queue_id:"queue-1",job_id:"job-1",package_id:"package-1",package_revision:3,listing_version_id:"listing-1",listing_check_id:"check-1",artifact_manifest_hash:hash("a"),artifacts:[{artifact_id:"resume",artifact_type:"tailored_resume",drive_file_id:"drive-1",content_hash:hash("b"),byte_size:1234,drive_modified_time:"2026-10-09T17:50:00.000Z"}],destination_url:"https://jobs.employer.example/apply/123#step",approval_origin:"https://truenorth.justsignal.company/dashboard",form_state_hash:hash("c"),authorized_at:"2026-10-09T17:59:00.000Z",expires_at:"2026-10-09T18:04:00.000Z"
});

test("canonical final-submit authorization binds one device, queue, form, destination, and exact artifacts",()=>{
  const value=canonicalFinalSubmitAuthorization(fixture(),{now});
  assert.equal(value.action,"submit_once");
  assert.equal(value.destination_host,"jobs.employer.example");
  assert.equal(value.destination_url,"https://jobs.employer.example/apply/123");
  assert.equal(value.approval_origin,"https://truenorth.justsignal.company");
  assert.equal(value.artifacts[0].content_hash,hash("b"));
});

test("authorization rejects expiry, broad shapes, insecure URLs, and same-origin destinations",()=>{
  for(const mutate of [v=>v.expires_at="2026-10-09T18:06:00.000Z",v=>v.destination_url="http://jobs.employer.example/apply",v=>v.destination_url="https://jobs.employer.example:444/apply",v=>v.destination_url="https://truenorth.justsignal.company/apply",v=>v.approval_origin="https://lookalike.example",v=>v.extra=true]){const value=fixture();mutate(value);assert.throws(()=>canonicalFinalSubmitAuthorization(value,{now}),/final_submit_/)}
});

test("observation rejects cross-host redirects, changed form state, expired capability, and binding replay",()=>{
  const authorization=fixture(),observation={authorization_id:"auth-1",queue_id:"queue-1",destination_url:"https://jobs.employer.example/confirmation",form_state_hash:hash("c"),observed_at:"2026-10-09T18:00:01.000Z"};
  assert.equal(assertFinalSubmitObservation(authorization,observation,{now:now+1000}).observation.queue_id,"queue-1");
  for(const mutate of [v=>v.destination_url="https://evil.example/confirmation",v=>v.form_state_hash=hash("d"),v=>v.queue_id="queue-2"]){const value={...observation};mutate(value);assert.throws(()=>assertFinalSubmitObservation(authorization,value,{now:now+1000}),/final_submit_/)}
  assert.throws(()=>assertFinalSubmitObservation(authorization,observation,{now:Date.parse("2026-10-09T18:05:00.000Z")}),/final_submit_expiry_invalid/);
});
