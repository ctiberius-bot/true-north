const NATIVE_HOST="company.justsignal.truenorth_executor";
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(message?.type!=="TRUE_NORTH_EXECUTE_APPROVED_SUBMIT")return false;
  chrome.runtime.sendNativeMessage(NATIVE_HOST,message,response=>sendResponse(chrome.runtime.lastError?{ok:false,error:"native_host_unavailable"}:response));
  return true;
});
