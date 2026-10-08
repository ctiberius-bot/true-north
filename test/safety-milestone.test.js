import test from "node:test";
import assert from "node:assert/strict";
import {
  ARSENAL_MASTER_FILE_ID,
  classifyAlertSender,
  classifyLink,
  createMemoryRepo,
  DEFAULT_PROFILE,
  ingestMailbox,
  PARSER_VERSION,
  PublicListingAdapter,
  researchOne,
  scoreJob
} from "../worker.js";

test("provider-specific redirect links are classified and deduplicated without losing provenance", async () => {
  assert.equal(classifyLink("https://indeed.com/rc/clk?jk=abc", "Open role","indeed").kind, "listing");
  const repo = createMemoryRepo();
  const message = { id:"candidate", source:"indeed", html:"<a href='https://indeed.com/rc/clk?jk=abc'>Open role</a>", base_url:"https://indeed.com", received_at:"2026-10-07", is_verified_job_alert:true, is_job_newsletter:true };
  const gmail = { profile:async()=>({emailAddress:"ctiberius@gmail.com"}), listMessages:async()=>({messages:[{id:message.id}]}), getMessage:async()=>message };
  await ingestMailbox({ gmail, repo, arsenalVersion:"v" });
  const task=[...repo.state.tasks.values()][0];
  assert.equal(task.task_kind, "fetch_listing");
  assert.equal(task.classification, "listing");
  assert.equal(repo.state.taskObservations.size,1);
  assert.equal(repo.state.parseSnapshots.get(`candidate:${PARSER_VERSION}`).raw_html, message.html);
});

test("DKIM identity must be the provider domain or its subdomain", () => {
  assert.equal(classifyAlertSender("jobs@linkedin.com", "mx; dkim=pass header.d=linkedin.com.evil.example").ok, false);
  assert.equal(classifyAlertSender("jobs@linkedin.com", "mx; dkim=pass header.d=mail.linkedin.com").ok, true);
  assert.equal(classifyAlertSender("jobs@linkedin.com", "mx; dkim=pass header.i=@mail.linkedin.com header.s=x").ok, true);
  assert.equal(classifyAlertSender("jobs@linkedin.com", "mx; dkim=pass header.i=jobs@linkedin.com header.s=x").ok, true);
  assert.equal(classifyAlertSender("jobs@linkedin.com", "mx; dkim=pass header.d=evil.example header.i=linkedin.com@evil.example").ok, false);
  assert.equal(classifyAlertSender("jobs@linkedin.com", "mx; dkim=pass header.d=evil.example header.i=jobs@linkedin.com").ok, false);
  assert.equal(classifyAlertSender("jobs@linkedin.com", "mx; dkim=fail header.d=evil.example;\r\n dkim=pass header.d=linkedin.com\r\n header.i=jobs@mail.linkedin.com; spf=pass").ok, true);
  assert.equal(classifyAlertSender("jobs@linkedin.com", "mx; dkim=pass header.i=@evil.example header.s=x").reason_code, "dkim_provider_mismatch");
  assert.equal(classifyAlertSender("jobs@linkedin.com", "mx; spf=pass").reason_code, "dkim_pass_domain_missing");
});

test("partial discovery is checkpointed and resumes without losing found listings", async () => {
  const repo=createMemoryRepo(), task={id:"d",message_id:"m",source:"indeed",task_kind:"walk_discovery",url:"https://indeed.test/search",status:"pending",attempts:0};
  repo.state.tasks.set(task.id,task);
  await researchOne({task,provider:{fetch:async()=>({discovery_complete:false,error_code:"provider_http_503",discovered_tasks:[{url:"https://indeed.test/viewjob?jk=1"}],pages:1,next_url:"https://indeed.test/search?page=2",seen_urls:["https://indeed.test/search"]})},repo});
  assert.equal([...repo.state.tasks.values()].find(x=>x.parent_task_id==="d").status,"pending");
  assert.equal(repo.state.checkpoints.get("d").next_url,"https://indeed.test/search?page=2");
  assert.equal((await repo.listRunnableTasks({limit:1}))[0].checkpoint.discovered_tasks.length,1);
});

test("adapter returns partial discoveries when a later page fails", async () => {
  const pages={"https://indeed.test/search":"<a href='/viewjob?jk=1'>One</a><a rel='next' href='/search?page=2'>Next</a>"};
  const adapter=new PublicListingAdapter({source:"indeed",allowedHosts:["indeed.test"],fetchImpl:async url=>pages[url]?new Response(pages[url]):new Response("busy",{status:503})});
  const result=await adapter.fetch({task_kind:"walk_discovery",url:"https://indeed.test/search"});
  assert.equal(result.discovery_complete,false);
  assert.equal(result.discovered_tasks.length,1);
  assert.equal(result.next_url,"https://indeed.test/search?page=2");
});

test("discovery quarantines genuinely unknown job-like candidates and cannot claim completion", async () => {
  const body="<a href='/viewjob?jk=known'>Known</a><a href='/company/opportunity/unknown'>Unknown role</a><span aria-label='next' aria-disabled='true'>End</span>";
  const adapter=new PublicListingAdapter({source:"indeed",allowedHosts:["indeed.test"],fetchImpl:async()=>new Response(body)});
  const result=await adapter.fetch({task_kind:"walk_discovery",url:"https://indeed.test/search"});
  assert.equal(result.discovery_complete,false);
  assert.equal(result.error_code,"discovery_candidates_unresolved");
  assert.equal(result.discovered_tasks.length,2);
  assert.equal(result.unresolved_candidates[0].classification,"candidate");
  const repo=createMemoryRepo(),task={id:"candidate-discovery",message_id:"m",source:"indeed",task_kind:"walk_discovery",url:"https://indeed.test/search",status:"pending",attempts:0};
  repo.state.tasks.set(task.id,task);
  await researchOne({task,provider:{fetch:async()=>result},repo});
  assert.equal([...repo.state.tasks.values()].find(x=>x.parent_task_id==="candidate-discovery"&&x.classification==="candidate").classification,"candidate");
  assert.equal(repo.state.tasks.get(task.id).status,"incomplete_retry");
});

test("pagination budget resets per invocation while cumulative pages remain auditable", async () => {
  let fetched=0;
  const adapter=new PublicListingAdapter({source:"indeed",allowedHosts:["indeed.test"],maxPages:1,fetchImpl:async()=>{fetched++;return new Response("<a href='/viewjob?jk=21'>Role</a><span aria-label='next' aria-disabled='true'>End</span>")}});
  const result=await adapter.fetch({task_kind:"walk_discovery",url:"https://indeed.test/search",checkpoint:{next_url:"https://indeed.test/search?page=21",pages:20,seen_urls:[],discovered_tasks:[]}});
  assert.equal(fetched,1);
  assert.equal(result.discovery_complete,true);
  assert.equal(result.pages,21);
});

test("manual retry resets a bounded exhausted budget and retains prior error in audit", async () => {
  const repo=createMemoryRepo();
  repo.state.tasks.set("exhausted",{id:"exhausted",status:"incomplete_retry",attempts:5,error_code:"provider_http_503",updated_at:"2026-10-07T00:00:00.000Z"});
  assert.equal((await repo.listRunnableTasks()).length,0);
  const result=await repo.retryTask("exhausted");
  assert.equal(result.attempts,0);
  assert.equal(result.retry_generation,1);
  assert.equal((await repo.listRunnableTasks())[0].id,"exhausted");
  assert.equal(repo.state.audit[0].detail.previous_attempts,5);
  assert.equal(repo.state.audit[0].detail.previous_error_code,"provider_http_503");
});

test("listing research cannot complete without sourced evidence", async () => {
  const repo=createMemoryRepo(),task={id:"t",source:"indeed",task_kind:"fetch_listing",url:"https://indeed.test/viewjob",status:"pending"};
  repo.state.tasks.set(task.id,task);
  await researchOne({task,provider:{fetch:async()=>({full_description:"Role text",evidence:[]})},repo});
  assert.equal(repo.state.tasks.get("t").status,"incomplete_retry");
  assert.equal(repo.state.tasks.get("t").error_code,"listing_evidence_missing");
});

test("hard constraints veto ranking and unknowns require review", () => {
  const below=scoreJob({title:"Chief Architect",full_description:"remote",location:"Remote",engagement_type:"full time",salary_min:100000},DEFAULT_PROFILE,{claims:[]});
  assert.equal(below.band,"blocked");
  assert.ok(below.hard_constraints.vetoes.includes("compensation_below_floor"));
  const unknown=scoreJob({title:"Chief Architect"},DEFAULT_PROFILE,{claims:[]});
  assert.equal(unknown.band,"review");
  assert.ok(unknown.hard_constraints.review_reasons.includes("compensation_unknown"));
  const noRemote=scoreJob({title:"Chief Architect",full_description:"remote",location:"Remote",engagement_type:"full time",salary_min:300000},{...DEFAULT_PROFILE,geography:{...DEFAULT_PROFILE.geography,remote:false}},{claims:[]});
  assert.equal(noRemote.band,"blocked");
  assert.ok(noRemote.hard_constraints.vetoes.includes("remote_not_allowed"));
});

test("navigation words in a legitimate job title do not override listing URL evidence", () => {
  assert.equal(classifyLink("https://indeed.com/viewjob?jk=support","Chief Customer Support Officer").kind,"listing");
});

test("Arsenal versions are immutable and restricted to the Drive master", async () => {
  const repo=createMemoryRepo(),base={version:"v1",source_file_id:ARSENAL_MASTER_FILE_ID,content_hash:"hash-a",claims:[{id:"c1",source_anchor:"Section",claim_text:"Supported fact",tags:[]}]};
  assert.equal((await repo.saveArsenalIndex(base)).claim_count,1);
  assert.equal((await repo.saveArsenalIndex(base)).idempotent,true);
  await assert.rejects(()=>repo.saveArsenalIndex({...base,content_hash:"hash-b"}),/immutable_conflict/);
  await assert.rejects(()=>repo.saveArsenalIndex({...base,version:"v2",source_file_id:"shadow"}),/invalid_arsenal_index/);
});
