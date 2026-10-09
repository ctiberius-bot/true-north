function exact(value,keys){return !!value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).every(k=>keys.includes(k))}
function required(value,name,max=500){const v=String(value??"").trim();if(!v||v.length>max)throw new Error(`${name}_required`);return v}

export async function verifyTrustedEmployerReceipt(binding,queueId,receipt,request){
  if(!binding?.fetch)throw new Error("trusted_employer_receipt_verifier_unavailable");
  const deviceId=required(request.headers.get("x-executor-device-id"),"executor_device_id",200),proof=required(request.headers.get("x-executor-proof"),"executor_proof",4096);
  const response=await binding.fetch(new Request("https://trusted-employer-receipt/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({queue_id:queueId,device_id:deviceId,device_proof:proof,receipt})}));
  if(!response.ok)throw new Error("trusted_employer_confirmation_required");const value=await response.json();if(!exact(value,["queue_id","device_id","source","verified"])||value.queue_id!==queueId||value.device_id!==deviceId||value.source!=="trusted_browser_observation"||value.verified!==true)throw new Error("trusted_employer_confirmation_required");return{source:value.source,verified:true};
}

export async function verifyTrustedDriveArtifact(binding,artifactId,claim){
  if(!binding?.fetch)throw new Error("trusted_drive_artifact_verifier_unavailable");
  const response=await binding.fetch(new Request("https://trusted-drive-artifact/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({artifact_id:artifactId,claim})}));
  if(!response.ok)throw new Error("trusted_drive_artifact_verification_required");const value=await response.json();if(!exact(value,["artifact_id","drive_file_id","content_hash","byte_size","drive_modified_time","receipt_hash","verification_source","verified"])||value.artifact_id!==artifactId||value.verified!==true||value.verification_source!=="trusted_connector_receipt")throw new Error("trusted_drive_artifact_verification_required");return value;
}
