const B64URL=/^[A-Za-z0-9_-]+$/;
function exact(value,keys){return !!value&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).every(k=>keys.includes(k))}
function b64urlBytes(value){if(!B64URL.test(value)||value.length<100||value.length>500)throw new Error("device_public_key_invalid");const s=value.replaceAll("-","+").replaceAll("_","/")+"=".repeat((4-value.length%4)%4);return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
function hex(bytes){return[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("")}
export async function devicePublicKeyFingerprint(value){const bytes=b64urlBytes(String(value||""));try{await crypto.subtle.importKey("spki",bytes,{name:"ECDSA",namedCurve:"P-256"},false,["verify"])}catch{throw new Error("device_public_key_invalid")}return hex(await crypto.subtle.digest("SHA-256",bytes))}
export function createExecutorDeviceRegistry(db,{clock=Date.now}={}){
  if(!db?.prepare)throw new Error("device_registry_db_required");
  return{
    async pair(input,auth){
      if(auth?.actor!=="chris"||auth?.reauthenticated!==true)throw new Error("human_reauthentication_required");
      if(!exact(input,["device_label","public_key_spki_b64url","confirm_public_key_fingerprint"]))throw new Error("invalid_device_pairing_shape");
      const label=String(input.device_label||"").trim(),publicKey=String(input.public_key_spki_b64url||"").trim(),confirm=String(input.confirm_public_key_fingerprint||"").toLowerCase();
      if(!label||label.length>120)throw new Error("device_label_invalid");const fingerprint=await devicePublicKeyFingerprint(publicKey);if(confirm!==fingerprint)throw new Error("device_fingerprint_confirmation_required");
      const id=`executor_device_${fingerprint.slice(0,32)}`,pairedAt=new Date(clock()).toISOString();
      const result=await db.prepare("INSERT INTO executor_devices(id,public_key_spki_b64url,status,paired_at,revoked_at,device_label,public_key_fingerprint) VALUES(?,?,'active',?,NULL,?,?) ON CONFLICT(id) DO UPDATE SET status='active',paired_at=excluded.paired_at,revoked_at=NULL,device_label=excluded.device_label WHERE executor_devices.public_key_spki_b64url=excluded.public_key_spki_b64url").bind(id,publicKey,pairedAt,label,fingerprint).run();
      if(Number(result?.meta?.changes??result?.changes)!==1)throw new Error("device_pairing_conflict");return{id,device_label:label,status:"active",public_key_fingerprint:fingerprint,paired_at:pairedAt};
    },
    async revoke(id,auth){
      if(auth?.actor!=="chris"||auth?.reauthenticated!==true)throw new Error("human_reauthentication_required");id=String(id||"").trim();if(!/^executor_device_[a-f0-9]{32}$/.test(id))throw new Error("device_id_invalid");const revokedAt=new Date(clock()).toISOString(),result=await db.prepare("UPDATE executor_devices SET status='revoked',revoked_at=? WHERE id=? AND status='active'").bind(revokedAt,id).run();if(Number(result?.meta?.changes??result?.changes)!==1)throw new Error("active_device_not_found");return{id,status:"revoked",revoked_at:revokedAt};
    }
  }
}
export async function routeExecutorDeviceRegistry(request,{registry,reauthenticate}={}){
  const u=new URL(request.url);if(request.method!=="POST")return null;
  if(u.pathname==="/api/applications/devices/pair"){const value=await request.json(),auth=await reauthenticate(value.confirmation_password);delete value.confirmation_password;return Response.json(await registry.pair(value,auth))}
  const match=u.pathname.match(/^\/api\/applications\/devices\/([^/]+)\/revoke$/);if(match){const value=await request.json();if(!exact(value,["confirmation_password"]))throw new Error("invalid_device_revocation_shape");const auth=await reauthenticate(value.confirmation_password);return Response.json(await registry.revoke(decodeURIComponent(match[1]),auth))}
  return null;
}
