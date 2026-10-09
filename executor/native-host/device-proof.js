const enc=new TextEncoder();
function out(bytes){let s="";for(const b of new Uint8Array(bytes))s+=String.fromCharCode(b);return btoa(s).replaceAll("+","-").replaceAll("/","_").replace(/=+$/g,"")}
export function canonicalDeviceProof({device_id,method,path,body_hash,timestamp,nonce}){return `${device_id}\n${method}\n${path}\n${body_hash}\n${timestamp}\n${nonce}`}
export async function signDeviceRequest(fields,privateKey){if(!privateKey)throw new Error("device_private_key_unavailable");const signature=await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},privateKey,enc.encode(canonicalDeviceProof(fields)));return{"x-executor-timestamp":fields.timestamp,"x-executor-nonce":fields.nonce,"x-executor-signature":out(signature)}}
