const HEX_64=/^[a-f0-9]{64}$/;

function required(value,name,max=500){
  const text=String(value??"").trim();
  if(!text||text.length>max)throw new Error(`final_submit_${name}_required`);
  return text;
}

function exactObject(value,keys,name){
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error(`final_submit_${name}_invalid`);
  const actual=Object.keys(value).sort(),expected=[...keys].sort();
  if(actual.length!==expected.length||actual.some((key,index)=>key!==expected[index]))throw new Error(`final_submit_${name}_shape_invalid`);
}

function sha(value,name){
  const text=required(value,name,64).toLowerCase();
  if(!HEX_64.test(text))throw new Error(`final_submit_${name}_invalid`);
  return text;
}

function time(value,name){
  const text=required(value,name,40),millis=Date.parse(text);
  if(!Number.isFinite(millis))throw new Error(`final_submit_${name}_invalid`);
  return {text:new Date(millis).toISOString(),millis};
}

function httpsUrl(value,name){
  let url;
  try{url=new URL(required(value,name,2048))}catch{throw new Error(`final_submit_${name}_invalid`)}
  if(url.protocol!=="https:"||url.username||url.password||url.port)throw new Error(`final_submit_${name}_invalid`);
  url.hash="";
  return url;
}

function artifacts(value){
  if(!Array.isArray(value)||!value.length)throw new Error("final_submit_artifacts_required");
  const seen=new Set();
  return value.map((item,index)=>{
    exactObject(item,["artifact_id","artifact_type","byte_size","content_hash","drive_file_id","drive_modified_time"],`artifact_${index}`);
    const row={
      artifact_id:required(item.artifact_id,`artifact_${index}_id`,200),
      artifact_type:required(item.artifact_type,`artifact_${index}_type`,80),
      drive_file_id:required(item.drive_file_id,`artifact_${index}_drive_file_id`,500),
      content_hash:sha(item.content_hash,`artifact_${index}_content_hash`),
      byte_size:Number(item.byte_size),
      drive_modified_time:time(item.drive_modified_time,`artifact_${index}_drive_modified_time`).text
    };
    if(seen.has(row.artifact_id)||!Number.isSafeInteger(row.byte_size)||row.byte_size<1)throw new Error(`final_submit_artifact_${index}_invalid`);
    seen.add(row.artifact_id);
    return row;
  }).sort((a,b)=>a.artifact_id.localeCompare(b.artifact_id));
}

export function canonicalFinalSubmitAuthorization(input,{now=Date.now(),maxLifetimeMs=300_000,expectedApprovalOrigin="https://truenorth.justsignal.company"}={}){
  exactObject(input,["action","approval_origin","artifact_manifest_hash","artifacts","authorization_id","authorized_at","destination_url","device_id","expires_at","form_state_hash","job_id","listing_check_id","listing_version_id","package_id","package_revision","queue_id","version"],"authorization");
  if(input.version!==1||input.action!=="submit_once")throw new Error("final_submit_action_invalid");
  const destination=httpsUrl(input.destination_url,"destination_url"),approval=httpsUrl(input.approval_origin,"approval_origin"),authorized=time(input.authorized_at,"authorized_at"),expires=time(input.expires_at,"expires_at"),revision=Number(input.package_revision);
  if(approval.origin!==expectedApprovalOrigin||destination.origin===approval.origin)throw new Error("final_submit_destination_origin_invalid");
  if(!Number.isSafeInteger(revision)||revision<1)throw new Error("final_submit_package_revision_invalid");
  if(expires.millis<=now||expires.millis<=authorized.millis||expires.millis-authorized.millis>maxLifetimeMs)throw new Error("final_submit_expiry_invalid");
  return{
    version:1,
    action:"submit_once",
    authorization_id:required(input.authorization_id,"authorization_id",200),
    device_id:required(input.device_id,"device_id",200),
    queue_id:required(input.queue_id,"queue_id",200),
    job_id:required(input.job_id,"job_id",200),
    package_id:required(input.package_id,"package_id",200),
    package_revision:revision,
    listing_version_id:required(input.listing_version_id,"listing_version_id",200),
    listing_check_id:required(input.listing_check_id,"listing_check_id",200),
    artifact_manifest_hash:sha(input.artifact_manifest_hash,"artifact_manifest_hash"),
    artifacts:artifacts(input.artifacts),
    destination_url:destination.toString(),
    destination_host:destination.hostname.toLowerCase(),
    approval_origin:approval.origin,
    form_state_hash:sha(input.form_state_hash,"form_state_hash"),
    authorized_at:authorized.text,
    expires_at:expires.text
  };
}

export function assertFinalSubmitObservation(authorization,observation,{now=Date.now()}={}){
  exactObject(observation,["authorization_id","destination_url","form_state_hash","observed_at","queue_id"],"observation");
  const expected=canonicalFinalSubmitAuthorization(authorization,{now}),destination=httpsUrl(observation.destination_url,"observation_destination_url"),observed=time(observation.observed_at,"observation_observed_at");
  if(observation.authorization_id!==expected.authorization_id||observation.queue_id!==expected.queue_id)throw new Error("final_submit_observation_binding_mismatch");
  if(destination.hostname.toLowerCase()!==expected.destination_host||destination.origin===expected.approval_origin)throw new Error("final_submit_observation_host_mismatch");
  if(sha(observation.form_state_hash,"observation_form_state_hash")!==expected.form_state_hash)throw new Error("final_submit_observation_form_changed");
  if(observed.millis<Date.parse(expected.authorized_at)||observed.millis>now+60_000)throw new Error("final_submit_observation_time_invalid");
  return{authorization:expected,observation:{authorization_id:expected.authorization_id,queue_id:expected.queue_id,destination_url:destination.toString(),form_state_hash:expected.form_state_hash,observed_at:observed.text}};
}
