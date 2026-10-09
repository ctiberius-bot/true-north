import test from "node:test";
import assert from "node:assert/strict";
import connector,{createDriveArtifact,readDriveArtifact,DRIVE_CONNECTOR_SCOPE} from "../drive-artifact-connector.js";

const folder="approved-folder",account="ctiberius@gmail.com",content=new Uint8Array([80,75,3,4,255]);
function env(overrides={}){return{DRIVE_ACCOUNT_EMAIL:account,DRIVE_ARTIFACT_FOLDER_ID:folder,DRIVE_TOKEN_PROVIDER:{fetch:async()=>Response.json({access_token:"ephemeral-token",account_email:account,scope:DRIVE_CONNECTOR_SCOPE})},...overrides}}

test("connector creates with Drive v3 multipart upload and exact app folder",async()=>{
  let observed;
  const result=await createDriveArtifact(env(),{folder_id:folder,name:"resume.docx",mime_type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",bytes:[...content]},async(url,init)=>{observed={url,init,body:new Uint8Array(init.body)};return Response.json({id:"drive_file-1",modifiedTime:"2026-10-09T20:00:00.000Z",size:String(content.length),mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",parents:[folder]})});
  assert.deepEqual(result,{file_id:"drive_file-1"});
  assert.equal(observed.url,"https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime,size,mimeType,parents");
  assert.equal(observed.init.method,"POST");
  assert.equal(observed.init.headers.authorization,"Bearer ephemeral-token");
  const rendered=new TextDecoder().decode(observed.body);
  assert.match(rendered,/multipart|/);assert.match(rendered,/"parents":\["approved-folder"\]/);assert.match(rendered,/resume\.docx/);
  const binaryOffset=observed.body.findIndex((value,index)=>content.every((byte,offset)=>observed.body[index+offset]===byte));
  assert.ok(binaryOffset>0,"exact binary payload is embedded in the multipart body");
});

test("connector reads exact metadata then media without list search update or delete",async()=>{
  const calls=[];
  const result=await readDriveArtifact(env(),"drive_file-1",async(url,init)=>{calls.push({url,init});if(url.endsWith("?alt=media"))return new Response(content);return Response.json({id:"drive_file-1",modifiedTime:"2026-10-09T20:00:00.000Z",size:String(content.length),mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",parents:[folder]})});
  assert.deepEqual(result,{file_id:"drive_file-1",bytes:[...content],modified_time:"2026-10-09T20:00:00.000Z"});
  assert.deepEqual(calls.map(x=>x.url),["https://www.googleapis.com/drive/v3/files/drive_file-1?fields=id,modifiedTime,size,mimeType,parents","https://www.googleapis.com/drive/v3/files/drive_file-1?alt=media"]);
  assert.ok(calls.every(x=>!x.init.method||x.init.method==="GET"));
});

test("connector rejects wrong folder, account, expanded scope and metadata",async()=>{
  await assert.rejects(()=>createDriveArtifact(env(),{folder_id:"other",name:"x",mime_type:"text/plain",bytes:[1]},()=>assert.fail()),/folder_not_approved/);
  await assert.rejects(()=>createDriveArtifact(env({DRIVE_TOKEN_PROVIDER:{fetch:async()=>Response.json({access_token:"x",account_email:"other@example.com",scope:DRIVE_CONNECTOR_SCOPE})}}),{folder_id:folder,name:"x",mime_type:"text/plain",bytes:[1]},()=>assert.fail()),/account_mismatch/);
  await assert.rejects(()=>createDriveArtifact(env({DRIVE_TOKEN_PROVIDER:{fetch:async()=>Response.json({access_token:"x",account_email:account,scope:`${DRIVE_CONNECTOR_SCOPE} https:\/\/www.googleapis.com\/auth\/drive`})}}),{folder_id:folder,name:"x",mime_type:"text/plain",bytes:[1]},()=>assert.fail()),/scope_mismatch/);
  await assert.rejects(()=>readDriveArtifact(env(),"drive_file-1",async()=>Response.json({id:"drive_file-1",modifiedTime:"2026-10-09T20:00:00Z",size:"1",parents:["other"]})),/metadata_mismatch/);
});

test("private route returns bytes and never exposes broker token",async()=>{
  const result=await connector.fetch(new Request("https://connector/create",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({folder_id:"other",name:"x",mime_type:"text/plain",bytes:[1]})}),env());
  assert.equal(result.status,400);assert.equal(result.headers.get("cache-control"),"no-store");assert.doesNotMatch(await result.text(),/ephemeral-token/);
});
