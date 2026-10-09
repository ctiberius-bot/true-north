import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFile} from "node:fs/promises";
import {webcrypto} from "node:crypto";

test("content script requires post-click employer confirmation and rejects validation errors",async()=>{
  const source=await readFile(new URL("../executor/chrome-extension/content-script.js",import.meta.url),"utf8");let listener,text="Thank you for applying. Your application has been received.";
  const context={crypto:webcrypto,TextEncoder,URL,location:{href:"https://employer.example/application/confirmation"},document:{body:{get innerText(){return text}},querySelectorAll:()=>[]},chrome:{runtime:{onMessage:{addListener:value=>{listener=value}}}}};vm.runInNewContext(source,context);
  const call=message=>new Promise(resolve=>listener(message,{},resolve));
  const accepted=await call({type:"TN_OBSERVE_SUBMISSION_CONFIRMATION",before_url:"https://employer.example/apply"});assert.equal(accepted.ok,true);assert.equal(accepted.value.confirmation_url,"https://employer.example/application/confirmation");assert.match(accepted.value.detail_hash,/^[a-f0-9]{64}$/);
  text="Please correct the required field. Thank you for applying.";const rejected=await call({type:"TN_OBSERVE_SUBMISSION_CONFIRMATION",before_url:"https://employer.example/apply"});assert.equal(rejected.ok,true);assert.equal(rejected.value,null);
});

test("checked-in manifest loads dashboard bridge and service worker accepts only exact-origin staged handoff",async()=>{
  const [manifest,source]=await Promise.all([readFile(new URL("../executor/chrome-extension/manifest.json",import.meta.url),"utf8"),readFile(new URL("../executor/chrome-extension/service-worker.js",import.meta.url),"utf8")]);const parsed=JSON.parse(manifest);assert.deepEqual(parsed.content_scripts,[{matches:["https://truenorth.justsignal.company/*"],js:["dashboard-bridge.js"],run_at:"document_start"}]);let internal;
  const permissions=[],context={URL,structuredClone,fetch:async()=>{throw new Error("not_called")},setTimeout,clearTimeout,chrome:{runtime:{sendNativeMessage(){},lastError:null,onMessage:{addListener:value=>{internal=value}}},tabs:{sendMessage(){},get:async()=>({status:"complete"}),create:async()=>({id:1})},scripting:{executeScript:async()=>{}},permissions:{request:async value=>(permissions.push(value),true),remove:async()=>true},action:{onClicked:{addListener(){}}}}};vm.runInNewContext(source,context);
  let response;internal({type:"TN_STAGE_EXECUTION_HANDOFF",handoff:{kind:"true_north_browser_execution_handoff",queue_id:"queue-123",destination_url:"https://employer.example/apply"}},{origin:"https://truenorth.justsignal.company",url:"https://truenorth.justsignal.company/"},value=>{response=value});assert.equal(response.ok,true);assert.equal(response.status,"staged_waiting_for_local_extension_gesture");
  response=undefined;internal({type:"TN_STAGE_EXECUTION_HANDOFF",handoff:{kind:"true_north_browser_execution_handoff",queue_id:"queue-456",destination_url:"https://employer.example/apply"}},{origin:"https://evil.example",url:"https://evil.example/"},value=>{response=value});assert.equal(response,undefined);
  await new Promise(resolve=>internal({type:"TN_GRANT_EXACT_ORIGIN",origin:"https://jobs.employer.example"},{origin:"https://truenorth.justsignal.company",url:"https://truenorth.justsignal.company/"},value=>{response=value;resolve()}));assert.equal(response.origin_pattern,"https://jobs.employer.example/*");assert.equal(permissions[0].origins[0],"https://jobs.employer.example/*");
});
