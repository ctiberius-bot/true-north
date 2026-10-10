import {canonicalBodyHash} from "../executor/shared/canonical-json.js";
function exact(value,keys){return !!value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).every(k=>keys.includes(k))}
function required(value,name,max=500){const v=String(value??"").trim();if(!v||v.length>max)throw new Error(`${name}_required`);return v}

export async function verifyTrustedEmployerReceipt(binding,queueId,receipt,request){
  if(!binding?.fetch)throw new Error("trusted_employer_receipt_verifier_unavailable");
  const deviceId=required(request.headers.get("x-executor-device-id"),"executor_device_id",200),timestamp=required(request.headers.get("x-executor-timestamp"),"executor_timestamp",80),nonce=required(request.headers.get("x-executor-nonce"),"executor_nonce",200),signature_b64url=required(request.headers.get("x-executor-signature"),"executor_signature",4096),path=new URL(request.url).pathname,body_hash=await canonicalBodyHash(receipt);
  const response=await binding.fetch(new Request("https://executor-device-verifier/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({device_id:deviceId,method:request.method,path,body_hash,timestamp,nonce,signature_b64url})}));
  if(!response.ok)throw new Error("trusted_employer_confirmation_required");const value=await response.json();if(!exact(value,["device_id","verified"])||value.device_id!==deviceId||value.verified!==true)throw new Error("trusted_employer_confirmation_required");return{source:"trusted_browser_observation",verified:true,device_id:value.device_id};
}

export async function verifyTrustedDriveArtifact(binding,artifactId,claim){
  if(!binding?.fetch)throw new Error("trusted_drive_artifact_verifier_unavailable");
  const response=await binding.fetch(new Request("https://trusted-drive-artifact/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({artifact_id:artifactId,claim})}));
  if(!response.ok)throw new Error("trusted_drive_artifact_verification_required");const value=await response.json();if(!exact(value,["artifact_id","drive_file_id","content_hash","byte_size","drive_modified_time","receipt_hash","verification_source","verified"])||value.artifact_id!==artifactId||value.verified!==true||value.verification_source!=="trusted_connector_receipt")throw new Error("trusted_drive_artifact_verification_required");return value;
}
