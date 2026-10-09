const B64URL=/^[A-Za-z0-9_-]+$/;
export function createMacKeychainSigner({execFile,helperPath,keyTag="company.justsignal.truenorth.executor"}){
  if(typeof execFile!=="function"||!String(helperPath||"").startsWith("/")||!keyTag)throw new Error("keychain_signer_configuration_invalid");
  const invoke=async(command,input)=>String((await execFile(helperPath,[command,"--key-tag",keyTag],input)).stdout||"").trim();
  const signer=async canonicalBytes=>{const signature=await invoke("sign",canonicalBytes);if(signature.length!==86||!B64URL.test(signature))throw new Error("keychain_signature_invalid");return signature};
  signer.create=async()=>{const publicKey=await invoke("create");if(publicKey.length<100||!B64URL.test(publicKey))throw new Error("keychain_public_key_invalid");return publicKey};
  signer.publicKey=async()=>{const publicKey=await invoke("public");if(publicKey.length<100||!B64URL.test(publicKey))throw new Error("keychain_public_key_invalid");return publicKey};
  signer.revoke=async()=>{if(await invoke("revoke")!=="revoked")throw new Error("keychain_revoke_failed");return true};
  return signer;
}
