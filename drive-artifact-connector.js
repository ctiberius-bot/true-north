const DRIVE_SCOPE="https://www.googleapis.com/auth/drive.file";
const DRIVE_API="https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_API="https://www.googleapis.com/upload/drive/v3/files";

function text(value,name,max=500){const out=String(value??"").trim();if(!out||out.length>max)throw new Error(`${name}_required`);return out}
function configured(env,name){return text(env?.[name],name.toLowerCase(),1000)}
function bytes(value){if(!Array.isArray(value)||!value.length||value.some(x=>!Number.isInteger(x)||x<0||x>255))throw new Error("drive_bytes_required");return new Uint8Array(value)}
function json(status,value){return Response.json(value,{status,headers:{"cache-control":"no-store"}})}
function bearer(value){return String(value||"").replace(/[\r\n]/g,"")}
function scopes(value){return new Set(String(value||"").trim().split(/\s+/).filter(Boolean))}
function fileId(value){const out=text(value,"drive_file_id",500);if(!/^[A-Za-z0-9_-]+$/.test(out))throw new Error("invalid_drive_file_id");return out}

async function token(env){
  if(!env?.DRIVE_TOKEN_PROVIDER?.fetch)throw new Error("drive_token_provider_required");
  const response=await env.DRIVE_TOKEN_PROVIDER.fetch("https://drive-token-provider/token",{headers:{accept:"application/json"}});
  if(!response.ok)throw new Error("drive_token_unavailable");
  const value=await response.json(),expectedAccount=configured(env,"DRIVE_ACCOUNT_EMAIL").toLowerCase();
  if(String(value?.account_email||"").trim().toLowerCase()!==expectedAccount)throw new Error("drive_account_mismatch");
  const granted=scopes(value?.scope);
  if(granted.size!==1||!granted.has(DRIVE_SCOPE))throw new Error("drive_scope_mismatch");
  const accessToken=bearer(value?.access_token);
  if(!accessToken)throw new Error("drive_token_unavailable");
  return accessToken;
}

function assertFolder(env,value){const fixed=configured(env,"DRIVE_ARTIFACT_FOLDER_ID"),requested=text(value,"drive_folder_id",500);if(requested!==fixed)throw new Error("drive_folder_not_approved");return fixed}
async function google(response,reason){if(!response.ok)throw new Error(`${reason}:${response.status}`);return response}

export async function createDriveArtifact(env,input,fetcher=fetch){
  const folder=assertFolder(env,input?.folder_id),name=text(input?.name,"drive_file_name",240),mime=text(input?.mime_type,"drive_mime_type",200),content=bytes(input?.bytes),accessToken=await token(env);
  const boundary=`tn_${crypto.randomUUID().replaceAll("-","")}`;
  const metadata=JSON.stringify({name,mimeType:mime,parents:[folder]});
  const prefix=new TextEncoder().encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`),suffix=new TextEncoder().encode(`\r\n--${boundary}--`),body=new Uint8Array(prefix.length+content.length+suffix.length);
  body.set(prefix);body.set(content,prefix.length);body.set(suffix,prefix.length+content.length);
  const url=`${DRIVE_UPLOAD_API}?uploadType=multipart&fields=id,modifiedTime,size,mimeType,parents`;
  const response=await google(await fetcher(url,{method:"POST",headers:{authorization:`Bearer ${accessToken}`,"content-type":`multipart/related; boundary=${boundary}`},body}),"drive_create_failed"),created=await response.json();
  const id=fileId(created?.id);
  if(created?.mimeType!==mime||!Array.isArray(created?.parents)||created.parents.length!==1||created.parents[0]!==folder)throw new Error("drive_create_metadata_mismatch");
  return{file_id:id};
}

export async function readDriveArtifact(env,id,fetcher=fetch){
  const approvedFolder=configured(env,"DRIVE_ARTIFACT_FOLDER_ID"),safeId=fileId(id),accessToken=await token(env),headers={authorization:`Bearer ${accessToken}`};
  const metadataUrl=`${DRIVE_API}/${encodeURIComponent(safeId)}?fields=id,modifiedTime,size,mimeType,parents`;
  const metadataResponse=await google(await fetcher(metadataUrl,{headers}),"drive_metadata_failed"),metadata=await metadataResponse.json();
  if(metadata?.id!==safeId||!Array.isArray(metadata?.parents)||metadata.parents.length!==1||metadata.parents[0]!==approvedFolder||!/^\d{4}-\d{2}-\d{2}T/.test(String(metadata?.modifiedTime||"")))throw new Error("drive_read_metadata_mismatch");
  const mediaResponse=await google(await fetcher(`${DRIVE_API}/${encodeURIComponent(safeId)}?alt=media`,{headers}),"drive_read_failed"),content=new Uint8Array(await mediaResponse.arrayBuffer());
  if(!content.byteLength||Number(metadata.size)!==content.byteLength)throw new Error("drive_read_size_mismatch");
  return{file_id:safeId,bytes:[...content],modified_time:metadata.modifiedTime};
}

export default{async fetch(request,env){
  try{
    const url=new URL(request.url);
    if(request.method==="POST"&&url.pathname==="/create")return json(200,await createDriveArtifact(env,await request.json()));
    const match=/^\/read\/([^/]+)$/.exec(url.pathname);
    if(request.method==="GET"&&match)return json(200,await readDriveArtifact(env,decodeURIComponent(match[1])));
    return json(404,{error:"not_found"});
  }catch(error){return json(400,{error:String(error?.message||error)})}
}};

export const DRIVE_CONNECTOR_SCOPE=DRIVE_SCOPE;
