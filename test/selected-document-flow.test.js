import test from "node:test";
import assert from "node:assert/strict";
import {AI_PACKAGE_AUTHORIZATION_MICROUSD,ARSENAL_MASTER_FILE_ID,TARGETING_PROTOCOL_FILE_ID,TARGETING_PROTOCOL_VERSION,createMemoryRepo,renderDocxDocument,runSelectedApplicationDocumentGeneration,sha256Bytes} from "../worker.js";
const selectionInput={expected_job_id:"job",expected_listing_version_id:"listing-v1",expected_title:"Chief Architect",expected_company:"Acme",arsenal_version:"arsenal-v1"};
const generationInput=(repo,type,authorization)=>{const selection=repo.state.selectedJobs.get("job");return{job_id:"job",arsenal_version:"arsenal-v1",artifact_type:type,expected_selection_id:selection.selection_id,expected_listing_version_id:selection.listing_version_id,package_authorization_id:authorization.id}};

async function setup(){
  const repo=createMemoryRepo();
  repo.state.jobs.set("job",{id:"job",title:"Chief Architect",company:"Acme",listing:{id:"listing-v1",title:"Chief Architect",company:"Acme",location:"Remote",full_description:"Lead enterprise architecture, reduce complexity, and create reusable foundations for a regulated enterprise.",content_hash:"c".repeat(64)},evidence:[{claim_text:"Lead enterprise architecture and reduce complexity.",source_url:"https://jobs.example/1",source_anchor:"JobPosting.description"}]});
  await repo.saveArsenalIndex({version:"arsenal-v1",source_file_id:ARSENAL_MASTER_FILE_ID,content_hash:"a".repeat(64),claims:Array.from({length:6},(_,i)=>({id:`claim-${i+1}`,source_anchor:`Career evidence ${i+1}`,claim_text:`Led enterprise architecture transformation ${i+1}, creating reusable operating patterns and measurable governance across ${20+i*10}+ initiatives while delivering $${10+i*5}M in supported value and reducing execution risk for global teams.`,tags:["architecture","transformation"]}))});
  repo.state.fitReviews.push({job_id:"job",listing_version_id:"listing-v1",verdict:"pursue",must_have_veto:false,status:"final"});
  const selection=await repo.selectJobForGeneration("job",{...selectionInput,include_cover_letter:true});
  await repo.authorizeSelectedPackage("job",{expected_selection_id:selection.selection_id,expected_listing_version_id:selection.listing_version_id,authorized_microusd:AI_PACKAGE_AUTHORIZATION_MICROUSD});
  return repo;
}

test("assistant-prepared documents import only into the exact selected context and remain unreviewed",async()=>{
  const repo=await setup(),selection=repo.state.selectedJobs.get("job"),input={artifact_type:"tailored_resume",arsenal_version:"arsenal-v1",content:"Chris Lockhart\n\nAssistant-prepared evidence-bound resume for the exact Chief Architect listing. Led enterprise architecture transformation and reusable patterns. Human review is required before any use.",evidence_map:[{claim_id:"listing_version:listing-v1",source_anchor:"full_description"},{claim_id:"claim-1",source_anchor:"Career evidence 1"}],expected_company:"Acme",expected_job_id:"job",expected_listing_version_id:"listing-v1",expected_selection_id:selection.selection_id,expected_title:"Chief Architect",preparation_origin:"assistant_prepared",protocol_file_id:TARGETING_PROTOCOL_FILE_ID,protocol_version:TARGETING_PROTOCOL_VERSION,warnings:["Prepared without inference."]},row=await repo.importPreparedApplicationDocument("job",input);
  assert.equal(row.evidence_status,"requires_human_revalidation");assert.equal(row.preparation_origin,"assistant_prepared");assert.equal(row.ai_draft_id,null);assert.equal(repo.state.aiRequests.size,0);assert.match(row.warnings[0],/not recovered model output/);assert.equal(row.evidence_map.length,2);
  await assert.rejects(()=>repo.importPreparedApplicationDocument("job",{...input,expected_listing_version_id:"other"}),/prepared_document_context_changed/);
  await assert.rejects(()=>repo.importPreparedApplicationDocument("job",{...input,evidence_map:[{claim_id:"listing_version:listing-v1",source_anchor:"full_description"},{claim_id:"made-up",source_anchor:"none"}]}),/document_evidence_reference_unverified/);
});

test("selected job flows through DOCX render, edit, reload, exact approval and linked package",async()=>{
  const repo=await setup();let calls=0;
  const env={AI_GENERATION_ENABLED:"true",AI_APPLICATION_DOCUMENT_GENERATION_ENABLED:"true",AI:{async run(_model,request){calls++;assert.deepEqual(request.response_format,{type:"json_object"});const user=JSON.parse(request.messages[1].content);assert.equal(user.protocol.source_file_id,TARGETING_PROTOCOL_FILE_ID);assert.equal(user.protocol.version,TARGETING_PROTOCOL_VERSION);assert.ok(user.protocol.rules.length>=10);assert.ok(user.protocol.dossier.matrix.length);const ref=x=>({claim_id:x.claim_id,source_anchor:x.source_anchor}),cover=user.task.includes("cover_letter"),listing=user.sources.find(x=>["listing","listing_evidence","requirement"].includes(x.kind)),chronology=user.sources.find(x=>x.claim_id==="arsenal_profile:chronology"),education=user.sources.find(x=>x.claim_id==="arsenal_profile:education"),achievement_evidence=user.sources.filter(x=>x.kind==="arsenal"&&!x.claim_id.startsWith("arsenal_profile:")).slice(0,cover?2:4).map(ref),achievement_bullets=achievement_evidence.map((_,i)=>`Led enterprise architecture transformation ${i+1}, delivering $${10+i*5}M in supported value across ${20+i*10}+ initiatives while creating reusable governance for global teams.`);return{response:{summary:"Executive architecture and transformation leader who converts enterprise priorities into reusable operating foundations, measurable governance, and disciplined cross-functional execution.",capability_bullets:cover?[]:["Enterprise architecture strategy and transformation roadmaps","Reusable operating foundations that reduce complexity","Executive governance, prioritization, and decision cadence","Cross-functional leadership across global delivery teams"],cover_paragraphs:cover?["I am applying for the Chief Architect role at Acme because its mandate to reduce complexity and create reusable enterprise foundations aligns directly with my supported transformation leadership.","Across complex organizations, I have established measurable governance, reusable operating patterns, and executive decision practices that connected architecture priorities to accountable delivery and supported business value.","I would bring Acme a disciplined approach to enterprise architecture: clarify priorities, align cross-functional leaders, reduce execution risk, and scale repeatable foundations while omitting unsupported platform-specific claims."]:[],achievement_bullets,listing_evidence:[ref(listing)],chronology_evidence:ref(chronology),education_evidence:ref(education),achievement_evidence,omissions:["Unsupported platform claims"],warnings:[]},usage:{prompt_tokens:200,completion_tokens:120}}}}};
  const authorization=[...repo.state.packageAuthorizations.values()][0];
  const resume=await runSelectedApplicationDocumentGeneration(env,repo,generationInput(repo,"tailored_resume",authorization));
  const cover=await runSelectedApplicationDocumentGeneration(env,repo,generationInput(repo,"cover_letter",authorization));
  assert.equal(calls,2);assert.equal(resume.document_revision.protocol_version,TARGETING_PROTOCOL_VERSION);
  assert.equal(resume.budget.reserved_microusd,17000);assert.equal(cover.budget.reserved_microusd,12000);
  await assert.rejects(()=>runSelectedApplicationDocumentGeneration(env,repo,generationInput(repo,"cover_letter",authorization)),/ai_package_authorization_required/);
  assert.equal(calls,2);
  const firstAuthorization=[...repo.state.packageAuthorizations.values()][0];assert.equal(firstAuthorization.spent_microusd,29000);
  const selected=repo.state.selectedJobs.get("job"),newAuthorization=await repo.authorizeSelectedPackage("job",{expected_selection_id:selected.selection_id,expected_listing_version_id:selected.listing_version_id,authorized_microusd:AI_PACKAGE_AUTHORIZATION_MICROUSD});
  const retriedCover=await runSelectedApplicationDocumentGeneration(env,repo,generationInput(repo,"cover_letter",newAuthorization));
  assert.equal(calls,3);assert.equal(retriedCover.budget.reserved_microusd,12000);assert.equal(firstAuthorization.spent_microusd,29000);
  const docx=renderDocxDocument(resume.content);assert.equal(String.fromCharCode(...docx.slice(0,2)),"PK");assert.equal(await sha256Bytes(docx),resume.document_revision.content_hash);
  const edited=await repo.saveApplicationDocumentRevision({...resume.document_revision,parent_revision_id:resume.document_revision.id,ai_draft_id:null,content:resume.content+"\n\nReviewed wording remains evidence-bound."});
  assert.equal(edited.evidence_status,"requires_human_revalidation");
  assert.equal(repo.state.documentRevisions.filter(x=>x.job_id==="job"&&x.artifact_type==="tailored_resume").at(-1).id,edited.id);
  assert.equal(edited.content_hash.length,64);
  assert.equal(String(edited.content_hash).toLowerCase(),repo.state.documentRevisions.find(x=>x.id===edited.id).content_hash);
  assert.equal(Number(edited.revision),repo.state.documentRevisions.find(x=>x.id===edited.id).revision);
  await assert.rejects(()=>repo.approveApplicationDocument(edited.id,{expected_revision:edited.revision,expected_content_hash:edited.content_hash}),/edited_claims_revalidation_required/);
  assert.deepEqual(edited.evidence_map,[]);
  await assert.rejects(()=>repo.approveApplicationDocument(edited.id,{expected_revision:edited.revision,expected_content_hash:edited.content_hash,confirm_claims_revalidated:true,reviewed_evidence_map:[{claim_id:"fabricated",source_anchor:"Invented source"}]}),/document_evidence_reference_unverified/);
  const reviewedEvidence=[{claim_id:"claim-1",source_anchor:"Career evidence 1"},{claim_id:"listing_evidence:0",source_anchor:"JobPosting.description"}];
  await repo.approveApplicationDocument(edited.id,{expected_revision:edited.revision,expected_content_hash:edited.content_hash,confirm_claims_revalidated:true,reviewed_evidence_map:reviewedEvidence});
  await repo.approveApplicationDocument(retriedCover.document_revision.id,{expected_revision:retriedCover.document_revision.revision,expected_content_hash:retriedCover.document_revision.content_hash});
  const reloaded=await repo.listApplicationDocuments("job");assert.equal(reloaded.find(x=>x.id===edited.id).approved,true);assert.equal(reloaded.find(x=>x.id===resume.document_revision.id).approved,false);
  const pkg=await repo.createPackageFromApprovedDocuments("job");assert.equal(pkg.artifact_count,2);assert.deepEqual(pkg.source_document_revisions.map(x=>x.id).sort(),[edited.id,retriedCover.document_revision.id].sort());
  assert.equal(repo.state.artifacts.every(x=>x.drive_file_id===null&&x.status==="draft"&&x.source_document_revision_id),true);
});

test("selection remains pinned and requires reselection after listing changes",async()=>{
  const repo=await setup();repo.state.jobs.get("job").listing={...repo.state.jobs.get("job").listing,id:"listing-v2"};
  const env={AI_GENERATION_ENABLED:"true",AI_APPLICATION_DOCUMENT_GENERATION_ENABLED:"true",AI:{async run(){throw new Error("provider_should_not_run")}}};
  const authorization=[...repo.state.packageAuthorizations.values()][0];
  await assert.rejects(()=>runSelectedApplicationDocumentGeneration(env,repo,generationInput(repo,"tailored_resume",authorization)),/listing_changed_reselect_job/);
});

test("authorization selection skips a newer underfunded ledger",async()=>{
  const repo=await setup(),older=[...repo.state.packageAuthorizations.values()][0];
  older.spent_microusd=12000;
  const selection=repo.state.selectedJobs.get("job"),newer=await repo.authorizeSelectedPackage("job",{expected_selection_id:selection.selection_id,expected_listing_version_id:selection.listing_version_id,authorized_microusd:AI_PACKAGE_AUTHORIZATION_MICROUSD});
  newer.spent_microusd=17000;
  assert.equal((await repo.getPackageAuthorization("job",17000)).id,older.id);
  assert.equal((await repo.getPackageAuthorization("job",12000)).id,newer.id);
});

test("user-triggered authorization is idempotent per selection and allows a different selected job",async()=>{
  const repo=createMemoryRepo();
  repo.state.jobs.set("job",{id:"job",title:"Chief Architect",company:"Acme",listing:{id:"listing-v1",title:"Chief Architect",company:"Acme"}});
  await repo.saveArsenalIndex({version:"arsenal-v1",source_file_id:ARSENAL_MASTER_FILE_ID,content_hash:"a".repeat(64),claims:[]});
  const selection=await repo.selectJobForGeneration("job",selectionInput);
  const first=await repo.authorizeSelectedPackage("job",{expected_selection_id:selection.selection_id,expected_listing_version_id:selection.listing_version_id,authorized_microusd:AI_PACKAGE_AUTHORIZATION_MICROUSD,authorization_scope:"user_triggered_selection_package"});
  const replay=await repo.authorizeSelectedPackage("job",{expected_selection_id:selection.selection_id,expected_listing_version_id:selection.listing_version_id,authorized_microusd:AI_PACKAGE_AUTHORIZATION_MICROUSD,authorization_scope:"user_triggered_selection_package"});
  assert.equal(replay.id,first.id);assert.equal(replay.idempotent,true);assert.equal(repo.state.packageAuthorizations.size,1);
  repo.state.jobs.set("job-2",{id:"job-2",title:"Strategy Director",company:"Beta",listing:{id:"listing-v2",title:"Strategy Director",company:"Beta"}});
  const secondSelection=await repo.selectJobForGeneration("job-2",{expected_job_id:"job-2",expected_listing_version_id:"listing-v2",expected_title:"Strategy Director",expected_company:"Beta",arsenal_version:"arsenal-v1"});
  const second=await repo.authorizeSelectedPackage("job-2",{expected_selection_id:secondSelection.selection_id,expected_listing_version_id:secondSelection.listing_version_id,authorized_microusd:AI_PACKAGE_AUTHORIZATION_MICROUSD,authorization_scope:"user_triggered_selection_package"});
  assert.notEqual(second.id,first.id);assert.equal(repo.state.packageAuthorizations.size,2);
  await assert.rejects(()=>repo.authorizeSelectedPackage("job-2",{expected_selection_id:secondSelection.selection_id,expected_listing_version_id:secondSelection.listing_version_id,authorized_microusd:AI_PACKAGE_AUTHORIZATION_MICROUSD,authorization_scope:"first_user_selected_package"}),/invalid_package_authorization_scope/);
});
