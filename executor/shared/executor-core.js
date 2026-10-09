const SHA=/^[a-f0-9]{64}$/;
function required(value,name){const v=String(value??"").trim();if(!v)throw new Error(`executor_${name}_required`);return v}
function exact(value,keys){if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k)))throw new Error("executor_message_shape_invalid")}
function https(value){const u=new URL(required(value,"destination_url"));if(u.protocol!=="https:"||u.username||u.password||u.port)throw new Error("executor_destination_invalid");u.hash="";return u}

export function validatePreparedSubmission(value){
  exact(value,["authorization_id","capability_token","device_id","queue_id","destination_url","form_state_hash"]);const form=required(value.form_state_hash,"form_state_hash").toLowerCase();if(!SHA.test(form))throw new Error("executor_form_state_hash_invalid");return{authorization_id:required(value.authorization_id,"authorization_id"),capability_token:required(value.capability_token,"capability_token"),device_id:required(value.device_id,"device_id"),queue_id:required(value.queue_id,"queue_id"),destination_url:https(value.destination_url).toString(),form_state_hash:form};
}

// The server consumes the capability before the adapter clicks. Any error after
// consumption is terminal/uncertain and must never retry the submit operation.
export async function executeFinalSubmit(prepared,{consume,observe,submitOnce}){
  const expected=validatePreparedSubmission(prepared),observed=await observe();const current=validatePreparedSubmission({...expected,...observed,authorization_id:expected.authorization_id,capability_token:expected.capability_token,device_id:expected.device_id,queue_id:expected.queue_id});
  if(new URL(current.destination_url).hostname!==new URL(expected.destination_url).hostname)throw new Error("executor_destination_changed");if(current.form_state_hash!==expected.form_state_hash)throw new Error("executor_form_state_changed");
  const consumed=await consume(expected);if(consumed?.authorization_id!==expected.authorization_id||consumed?.queue_id!==expected.queue_id||consumed?.device_id!==expected.device_id||consumed?.action!=="submit_once"||!consumed?.consumed_at)throw new Error("executor_capability_not_consumed");
  try{const receipt=await submitOnce();return{status:"submitted_pending_receipt",authorization_id:expected.authorization_id,receipt}}catch(error){return{status:"submission_uncertain",authorization_id:expected.authorization_id,error_code:"submit_after_capability_consumption_failed"}}
}
