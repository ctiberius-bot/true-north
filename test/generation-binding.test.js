import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import worker,{AI_PACKAGE_AUTHORIZATION_MICROUSD,ARSENAL_MASTER_FILE_ID,createMemoryRepo} from "../worker.js";

const html=readFileSync(new URL("../true-north-career-workspace.html",import.meta.url),"utf8");

test("workspace rejects out-of-order detail and document responses and never leaves a hidden generation form",()=>{
  for(const marker of ["state.selectionGeneration !== generation","detail.id !== id","state.rendered?.token!==token","root.dataset.detailToken===String(token)","currentDetailContext(form)","data-listing-version=","data-detail-token="])assert.ok(html.includes(marker),marker);
  const generateIndex=html.indexOf('data-generate-package');
  const hiddenPackageIndex=html.indexOf('data-panel="package" hidden');
  assert.ok(generateIndex>0&&hiddenPackageIndex>generateIndex,"Generate must be visible before the hidden package panel");
  assert.equal((html.match(/<form class="stack" data-generate-package/g)||[]).length,1,"only one current generation form may exist");
  assert.doesNotMatch(html,/name="arsenal_version"/);
  assert.doesNotMatch(html,/Enter your True North password to authorize/);
  assert.doesNotMatch(html,/Password confirmation authorizes/);
});

test("clicking Generate pins navigation to the exact role and every failure unlocks it",()=>{
  const generateBranch=html.indexOf("if(event.target.matches('[data-generate-package]'))"),lockAt=html.indexOf('state.generationLock=context;renderJobs()',generateBranch),postAt=html.indexOf('/select-for-generation',generateBranch),unlockAt=html.indexOf('finally{state.generationLock=null;renderJobs()',generateBranch);
  assert.ok(lockAt>0&&postAt>lockAt,"navigation must lock before the first mutation");
  assert.ok(unlockAt>postAt,"the finally path must always unlock navigation after success or failure");
  assert.match(html,/state\.generationLock&&state\.generationLock\.jobId!==id/);
  assert.match(html,/Job switching is locked until this exact request finishes/);
  assert.match(html,/state\.rendered\?\.token===context\.token/);
  assert.match(html,/popstate[\s\S]*history\.replaceState\(\{job:state\.generationLock\.jobId\}/);
});

test("generation mutations require an authenticated same-origin session",async()=>{
  const env={DASHBOARD_PASSWORD:"test-only",TEST_MODE:"true",TEST_REPOSITORY:createMemoryRepo()};
  const body=JSON.stringify({expected_job_id:"job"});
  const unauthorized=await worker.fetch(new Request("https://app.test/api/jobs/job/select-for-generation",{method:"POST",headers:{origin:"https://app.test","content-type":"application/json"},body}),env);
  assert.equal(unauthorized.status,401);
  const login=await worker.fetch(new Request("https://app.test/api/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password:"test-only"})}),env),cookie=login.headers.get("set-cookie").split(";")[0];
  const crossOrigin=await worker.fetch(new Request("https://app.test/api/jobs/job/select-for-generation",{method:"POST",headers:{cookie,origin:"https://evil.test","content-type":"application/json"},body}),env);
  assert.equal(crossOrigin.status,403);assert.equal((await crossOrigin.json()).error,"same_origin_required");
});

test("selection, authorization and package cap fail closed on stale explicit context",async()=>{
  const repo=createMemoryRepo();
  repo.state.jobs.set("job",{id:"job",title:"Chief Architect",company:"Acme",listing:{id:"lv1",title:"Chief Architect",company:"Acme"}});
  await repo.saveArsenalIndex({version:"arsenal-v1",source_file_id:ARSENAL_MASTER_FILE_ID,content_hash:"a".repeat(64),claims:[]});
  const base={expected_job_id:"job",expected_listing_version_id:"lv1",expected_title:"Chief Architect",expected_company:"Acme",arsenal_version:"arsenal-v1"};
  await assert.rejects(()=>repo.selectJobForGeneration("job",{...base,expected_listing_version_id:"stale"}),/displayed_job_context_stale/);
  const selection=await repo.selectJobForGeneration("job",base);
  await assert.rejects(()=>repo.authorizeSelectedPackage("job",{expected_selection_id:"stale",expected_listing_version_id:"lv1",authorized_microusd:AI_PACKAGE_AUTHORIZATION_MICROUSD}),/selected_job_context_changed/);
  const first=await repo.authorizeSelectedPackage("job",{expected_selection_id:selection.selection_id,expected_listing_version_id:"lv1",authorized_microusd:AI_PACKAGE_AUTHORIZATION_MICROUSD,authorization_scope:"user_triggered_selection_package"});
  const replay=await repo.authorizeSelectedPackage("job",{expected_selection_id:selection.selection_id,expected_listing_version_id:"lv1",authorized_microusd:AI_PACKAGE_AUTHORIZATION_MICROUSD,authorization_scope:"user_triggered_selection_package"});
  assert.equal(replay.id,first.id);assert.equal(replay.idempotent,true);assert.equal(repo.state.packageAuthorizations.size,1);
});
