import assert from "node:assert/strict";
import {test} from "node:test";
import worker,{ARSENAL_MASTER_FILE_ID,createMemoryRepo,DEFAULT_PROFILE,validateAuthenticatedListingCapture} from "../worker.js";

test("authenticated browser capture accepts only fresh evidence and no session material",()=>{const now=Date.parse("2026-10-08T12:00:00Z"),capture=validateAuthenticatedListingCapture({job_id:"job",source_url:"https://www.linkedin.com/jobs/view/123?trk=x",captured_at:"2026-10-08T11:59:00Z",availability:"open",full_description:"Exact visible listing text"},now);assert.equal(capture.source_url,"https://www.linkedin.com/jobs/view/123");assert.equal(capture.availability,"open");assert.throws(()=>validateAuthenticatedListingCapture({...capture,cookie:"secret"},now),/shape/);assert.throws(()=>validateAuthenticatedListingCapture({...capture,captured_at:"2026-10-08T11:50:00Z"},now),/invalid_authenticated_capture/);assert.throws(()=>validateAuthenticatedListingCapture({...capture,availability:"closed"},now),/must_not_include_description/);assert.equal(validateAuthenticatedListingCapture({job_id:"job",source_url:"https://www.linkedin.com/jobs/view/123",captured_at:"2026-10-08T11:59:00Z",availability:"inaccessible"},now).availability,"inaccessible")});

async function login(env){
  const r=await worker.fetch(new Request("https://app.test/api/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password:"test-only"})}),env);
  return r.headers.get("set-cookie").split(";")[0];
}

function fixture(){
  const repo=createMemoryRepo();
  repo.state.jobs.set("job",{id:"job",company:"Acme",listing:{id:"lv1",title:"CIO",company:"Acme",full_description:"Lead Acme transformation"},evidence:[{claim_text:"Lead Acme transformation",source_url:"https://jobs.example/cio"}]});
  return repo;
}

test("dossier, fit, package and review workflow enforce evidence and approval order",async()=>{
  const repo=fixture();
  const requirements=await repo.saveRequirements("job",{requirements:[{requirement_kind:"must_have",requirement_text:"Executive transformation leadership",source_anchor:"JobPosting.description"}]});
  assert.equal(requirements.listing_version_id,"lv1");
  assert.equal(requirements.requirements[0].requirement_kind,"must_have");
  await assert.rejects(()=>repo.saveCompanyDossier("job",{summary:"Research",sources:[]}),/evidence_sources_required/);
  const dossier=await repo.saveCompanyDossier("job",{summary:"Evidence-backed company analysis",sources:[{source_url:"https://acme.example/about",source_title:"About",claim_text:"Acme describes its transformation program."}]});
  assert.equal(dossier.status,"evidence_complete");
  await assert.rejects(()=>repo.saveFitReview("job",{verdict:"pursue",must_have_veto:true,gaps:[],quick_fixes:[]}),/must_have_veto_conflicts/);
  const fit=await repo.saveFitReview("job",{verdict:"pursue_with_fixes",gaps:["Industry specificity"],quick_fixes:["Lead with regulated transformation evidence"]});
  assert.equal(fit.listing_version_id,"lv1");
  const arsenal={version:"arsenal-2026-10-04",source_file_id:ARSENAL_MASTER_FILE_ID,content_hash:"b".repeat(64),claims:[{id:"impact-amex",source_anchor:"Quantified impact bank",claim_text:"$111M strategic investment",tags:["transformation"]}]};
  await repo.saveArsenalIndex(arsenal);
  await assert.rejects(()=>repo.createApplicationPackage("job",{arsenal_version:arsenal.version,artifacts:[{artifact_type:"tailored_resume",content_hash:"a".repeat(64),evidence_map:[{claim_id:"fabricated",source_anchor:"Nowhere"}]}]}),/provenance_mismatch/);
  const pkg=await repo.createApplicationPackage("job",{arsenal_version:arsenal.version,artifacts:[{artifact_type:"tailored_resume",drive_file_id:"draft-file",content_hash:"a".repeat(64),evidence_map:[{claim_id:"impact-amex",source_anchor:"Quantified impact bank"}]}]});
  assert.equal(pkg.generation_mode,"human_or_assistant_supplied");
  await assert.rejects(()=>repo.reviewPackage(pkg.id,{reviewer_role:"critic",decision:"approve"}),/out_of_order/);
  assert.equal((await repo.reviewPackage(pkg.id,{reviewer_role:"writer",decision:"approve"})).status,"critic_review");
  assert.equal((await repo.reviewPackage(pkg.id,{reviewer_role:"critic",decision:"approve"})).status,"chris_review");
  await assert.rejects(()=>repo.reviewPackage(pkg.id,{reviewer_role:"chris",decision:"approve"}),/human_reauthentication_required/);
  const env={DASHBOARD_PASSWORD:"test-only",TEST_MODE:"true",TEST_REPOSITORY:repo},cookie=await login(env),headers={cookie,"content-type":"application/json"};
  const blocked=await worker.fetch(new Request(`https://app.test/api/packages/${pkg.id}/review`,{method:"POST",headers,body:JSON.stringify({reviewer_role:"chris",decision:"approve",confirmation_password:"test-only"})}),env);
  assert.equal(blocked.status,500);
  assert.equal((await blocked.json()).error,"drive_artifact_readback_required_before_approval");
  const badClaim=await worker.fetch(new Request(`https://app.test/api/artifacts/${pkg.id}:0/readback-claim`,{method:"POST",headers,body:JSON.stringify({drive_file_id:"draft-file",content_hash:"f".repeat(64),byte_size:1234,drive_modified_time:"2026-10-07T20:00:00.000Z"})}),env);
  assert.equal(badClaim.status,500);
  assert.equal(repo.state.artifactVerifications.length,0);
  const claimed=await worker.fetch(new Request(`https://app.test/api/artifacts/${pkg.id}:0/readback-claim`,{method:"POST",headers,body:JSON.stringify({drive_file_id:"draft-file",content_hash:"a".repeat(64),byte_size:1234,drive_modified_time:"2026-10-07T20:00:00.000Z"})}),env),claim=await claimed.json();
  assert.equal(claimed.status,200);
  assert.equal(claim.status,"pending_external_verification");
  assert.equal(claim.blocks_chris_approval,true);
  assert.equal(repo.state.artifactVerifications.length,0);
  const stillBlocked=await worker.fetch(new Request(`https://app.test/api/packages/${pkg.id}/review`,{method:"POST",headers,body:JSON.stringify({reviewer_role:"chris",decision:"approve",confirmation_password:"test-only"})}),env);
  assert.equal(stillBlocked.status,500);
  assert.equal((await stillBlocked.json()).error,"drive_artifact_readback_required_before_approval");
  repo.state.artifactVerifications.push({artifact_id:`${pkg.id}:0`,drive_file_id:"draft-file",content_hash:"a".repeat(64),byte_size:1234,drive_modified_time:"2026-10-07T20:00:00.000Z",verification_source:"trusted_connector_receipt",receipt_hash:"b".repeat(64),verified_at:"2026-10-07T20:01:00.000Z"});
  const approved=await worker.fetch(new Request(`https://app.test/api/packages/${pkg.id}/review`,{method:"POST",headers,body:JSON.stringify({reviewer_role:"chris",decision:"approve",confirmation_password:"test-only"})}),env);
  assert.equal(approved.status,200);
  assert.equal((await approved.json()).status,"approved");
  assert.equal((await repo.savePipeline("job",{stage:"approved_to_send",next_action:"Chris decides whether to send"})).stage,"approved_to_send");
  await repo.reviewPackage(pkg.id,{reviewer_role:"critic",decision:"reject"});
  assert.equal(repo.state.pipeline[0].stage,"package_draft");
  const view=await repo.getWorkflow("job");
  assert.equal(view.automatic_generation,false);
  assert.equal(view.external_actions,"disabled");
  assert.equal(view.application_artifacts[0].evidence_map[0].claim_id,"impact-amex");
  assert.equal(view.artifact_verifications.length,1);
  assert.equal(view.artifact_verifications[0].content_hash,"a".repeat(64));
  assert.equal(repo.state.artifactReadbackClaims.length,1);
});

test("interview, Coach and private Doc paths are persisted with explicit gates",async()=>{
  const repo=fixture();
  await assert.rejects(()=>repo.createInterview("job",{}),/pipeline_required/);
  await repo.savePipeline("job",{stage:"conversation",next_action:"Schedule recruiter screen"});
  const interview=await repo.createInterview("job",{status:"scheduled",scheduled_at:"2026-10-10T15:00:00Z"});
  const dossier=await repo.saveInterviewerDossier(interview.id,{interviewer_name:"Alex Recruiter",company:"Acme",sources:[{source_url:"https://acme.example/team",claim_text:"Alex is listed on the recruiting team."}]});
  assert.equal(dossier.status,"evidence_complete");
  const record=await repo.saveInterviewRecord(interview.id,{record_kind:"recruiter_prep",status:"reviewed",content:{questions:["What is the mandate?"]}});
  assert.equal(record.record_kind,"recruiter_prep");
  const profile=await repo.saveProfile({id:"cio",...DEFAULT_PROFILE,name:"CIO"});
  const plan=await repo.saveCoachPlan({profile_id:profile.id,profile_version:profile.version,commitments:["Two conversations"],actuals:[],status:"active"});
  assert.equal(plan.status,"active");
  const session=await repo.savePrivateDocSession({private_notes:"Private, non-clinical reflection."});
  await assert.rejects(()=>repo.approveDocInsight({session_id:session.id,approved_text:"Use this",destination:"coach",explicit_approval:true}),/human_reauthentication_required/);
  const env={DASHBOARD_PASSWORD:"test-only",TEST_MODE:"true",TEST_REPOSITORY:repo},cookie=await login(env),response=await worker.fetch(new Request("https://app.test/api/doc/approved-insights",{method:"POST",headers:{cookie,"content-type":"application/json"},body:JSON.stringify({session_id:session.id,approved_text:"Use this approved insight",destination:"coach",confirmation_password:"test-only"})}),env),insight=await response.json();
  assert.equal(response.status,200);
  assert.equal(insight.destination,"coach");
  assert.equal(repo.state.approvedInsights.length,1);
});

test("authenticated workflow routes are usable and never imply automated generation or sending",async()=>{
  const repo=fixture(),env={DASHBOARD_PASSWORD:"test-only",TEST_MODE:"true",TEST_REPOSITORY:repo},cookie=await login(env),headers={cookie,"content-type":"application/json"};
  const dossier=await worker.fetch(new Request("https://app.test/api/workflows/job/dossier",{method:"POST",headers,body:JSON.stringify({summary:"Research",sources:[{source_url:"https://acme.example",claim_text:"Evidence"}]})}),env);
  assert.equal(dossier.status,200);
  const fit=await worker.fetch(new Request("https://app.test/api/workflows/job/fit-review",{method:"POST",headers,body:JSON.stringify({verdict:"manual_review",gaps:[],quick_fixes:[]})}),env);
  assert.equal(fit.status,200);
  const view=await(await worker.fetch(new Request("https://app.test/api/workflows/job",{headers:{cookie}}),env)).json();
  assert.equal(view.generation_mode,"workers_ai_source_bound_or_human_supplied");
  assert.equal(view.external_actions,"disabled");
  const page=await(await worker.fetch(new Request("https://app.test/legacy"),env)).text();
  for(const marker of ["requirementsForm","dossierForm","fitForm","packageForm","artifactVerificationForm","packageReviewForm","pipelineForm","interviewForm","interviewerDossierForm","interviewRecordForm","aiForm","aiBudget","coachForm","docSessionForm","docInsightForm","byte_size","drive_modified_time","confirmation_password"])assert.match(page,new RegExp(marker));
  const claimForm=page.slice(page.indexOf('<form id="artifactVerificationForm">'),page.indexOf('</form>',page.indexOf('<form id="artifactVerificationForm">')));
  assert.match(claimForm,/Advisory only/);
  assert.doesNotMatch(claimForm,/confirmation_password|codex_drive_connector|verified readback/i);
});
