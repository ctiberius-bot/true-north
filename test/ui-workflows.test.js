import test from "node:test";
import assert from "node:assert/strict";
import worker,{createMemoryRepo,DEFAULT_PROFILE,normalizeRoleProfile,classifyLink} from "../worker.js";

async function session(env){
  const response=await worker.fetch(new Request("https://app.test/api/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password:"test-only"})}),env);
  return response.headers.get("set-cookie").split(";")[0];
}

test("role profiles are versioned, selectable and do not disturb retained jobs",async()=>{
  const repo=createMemoryRepo();
  repo.state.jobs.set("job",{id:"job",listing:{title:"CIO"},evidence:[]});
  const cio=await repo.saveProfile({id:"cio",...DEFAULT_PROFILE,name:"CIO",aliases:["cio"]});
  const board=await repo.saveProfile({id:"board",...DEFAULT_PROFILE,name:"Board",aliases:["board director"],engagement_types:["board"]});
  assert.equal((await repo.getActiveProfile()).id,"board");
  await repo.activateProfile(cio.id,cio.version);
  assert.equal((await repo.getActiveProfile()).id,"cio");
  assert.equal(repo.state.jobs.size,1);
  assert.equal((await repo.listProfiles()).length,2);
  assert.equal(repo.state.profiles.get(board.id).active,false);
});

test("profile input validates hard-constraint fields",()=>{
  assert.throws(()=>normalizeRoleProfile({...DEFAULT_PROFILE,id:"bad space"}),/invalid_profile_identity/);
  assert.throws(()=>normalizeRoleProfile({...DEFAULT_PROFILE,compensation:{...DEFAULT_PROFILE.compensation,full_time_base_floor:-1}}),/invalid_profile_threshold/);
});

test("authenticated profile selection and queue recovery routes are backed",async()=>{
  const repo=createMemoryRepo(),env={DASHBOARD_PASSWORD:"test-only",TEST_MODE:"true",TEST_REPOSITORY:repo};
  const cookie=await session(env),headers={cookie,"content-type":"application/json"};
  const saved=await(await worker.fetch(new Request("https://app.test/api/profile",{method:"PUT",headers,body:JSON.stringify({id:"architect",...DEFAULT_PROFILE,name:"Chief Architect"})}),env)).json();
  const profiles=await(await worker.fetch(new Request("https://app.test/api/profiles",{headers:{cookie}}),env)).json();
  assert.equal(profiles[0].id,"architect");
  assert.equal(saved.active,true);
  repo.state.tasks.set("blocked",{id:"blocked",status:"blocked",source:"indeed",task_kind:"fetch_listing",url:"https://indeed.test/1",attempts:1});
  const recovered=await(await worker.fetch(new Request("https://app.test/api/queue/retry",{method:"POST",headers,body:JSON.stringify({task_id:"blocked"})}),env)).json();
  assert.deepEqual(recovered,{id:"blocked",status:"pending",attempts:0,retry_generation:1});
  assert.equal(repo.state.tasks.get("blocked").error_code,null);
  assert.equal(repo.state.audit[0].action,"manual_retry_budget_reset");
});

test("job detail route returns listing evidence and assessment history",async()=>{
  const repo=createMemoryRepo(),env={DASHBOARD_PASSWORD:"test-only",TEST_MODE:"true",TEST_REPOSITORY:repo},cookie=await session(env);
  repo.state.jobs.set("job",{id:"job",listing:{title:"CIO",full_description:"Lead"},evidence:[{claim_text:"Lead",source_url:"https://source.test"}]});
  repo.state.assessments.push({id:"a",job_id:"job",band:"review"});
  const response=await worker.fetch(new Request("https://app.test/api/jobs/job",{headers:{cookie}}),env);
  assert.equal(response.status,200);
  const detail=await response.json();
  assert.equal(detail.evidence.length,1);
  assert.equal(detail.assessments.length,1);
});

test("dashboard exposes backed profile, recovery, pagination and evidence controls",async()=>{
  const page=await(await worker.fetch(new Request("https://app.test/legacy"),{})).text();
  for(const marker of ["profileSelect","activateProfile","full_time_base_floor","contract_hourly_floor","queuePrev","queueNext","data-retry","data-job","jobDetail","fitAssessment","evidence_and_gaps","assessment_id"])assert.match(page,new RegExp(marker));
  const script=page.match(/<script>([\s\S]*)<\/script>/)?.[1];
  assert.doesNotThrow(()=>new Function(script));
});

test("dashboard offers a manual bounded five-email intake test with in-flight protection",async()=>{
  const page=await(await worker.fetch(new Request("https://app.test/legacy"),{})).text();
  const endpoint="/api/run/intake?max_messages=5&window_hours=24";
  for(const marker of ["Run 5-email test","runIntakeTest","intakeResult","intakeError","intakeInFlight=true","runIntakeTest.disabled=true","runIntakeTest.disabled=false","method:'POST'"])assert.ok(page.includes(marker),marker);
  assert.equal(page.split(endpoint).length-1,1);
  assert.match(page,/runIntakeTest\.onclick=async\(\)=>\{if\(intakeInFlight\)return;/);
  assert.doesNotMatch(page,/runIntakeTest\.click\(/);
});

test("workspace stages a durable browser-executor handoff with a download fallback",async()=>{
  const page=await(await worker.fetch(new Request("https://app.test/"),{})).text();
  for(const marker of ["data-operator-handoff","true_north_browser_execution_handoff","claim_required_before_browser_actions:true","final_submit_requires_user_approval:true","receipt_required_before_applied:true","TN_STAGE_EXECUTION_HANDOFF","Handoff staged — still not claimed or submitted.","Installed executor unavailable; handoff downloaded instead."])assert.ok(page.includes(marker),marker);
  assert.doesNotMatch(page,/data-operator-claim/);
  assert.doesNotMatch(page,/window\.open\(claimed\.destination_url/);
  const script=page.match(/<script>([\s\S]*)<\/script>/)?.[1];
  assert.doesNotThrow(()=>new Function(script));
});

test("workspace shows global receipt-aware execution progress",async()=>{
  const page=await(await worker.fetch(new Request("https://app.test/"),{})).text();
  for(const marker of ['id="executionSummary"','id="refreshExecution"','progress_step','Receipt recorded:','loadExecutionSummary()'])assert.ok(page.includes(marker),marker);
});

test("non-HTTP links never enter intake evidence",()=>{
  assert.equal(classifyLink("javascript:alert(1)","Role").kind,"ignore");
  assert.equal(classifyLink("data:text/html,role","Role").kind,"ignore");
});
