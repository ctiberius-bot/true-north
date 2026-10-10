const PAGE_ORIGIN="https://truenorth.justsignal.company";
function pageMessage(type,detail={}){window.postMessage({source:"true-north-executor",type,...detail},PAGE_ORIGIN)}
pageMessage("TN_EXECUTOR_BRIDGE_READY");
window.addEventListener("message",event=>{if(event.source!==window||event.origin!==PAGE_ORIGIN||event.data?.source!=="true-north-dashboard")return;const {type}=event.data;if(!["TN_STAGE_EXECUTION_HANDOFF","TN_QUEUE_EXACT_SUBMIT","TN_GRANT_EXACT_ORIGIN","TN_REVOKE_EXACT_ORIGIN","TN_DEVICE_IDENTITY","TN_REVOKE_LOCAL_KEY","TN_SIGN_ISSUANCE_INTENT"].includes(type))return;chrome.runtime.sendMessage(event.data,response=>pageMessage("TN_EXECUTOR_BRIDGE_RESULT",{request_type:type,response:chrome.runtime.lastError?{ok:false,error:"extension_unavailable"}:response}))});
