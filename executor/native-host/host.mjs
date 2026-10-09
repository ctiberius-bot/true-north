#!/usr/bin/env node
import {decodeNativeFrames,encodeNativeMessage} from "./framing.js";
import {validatePreparedSubmission} from "../shared/executor-core.js";
import {canonicalBodyHash} from "../shared/canonical-json.js";
import {canonicalDeviceProof} from "./device-proof.js";
import {createMacKeychainSigner} from "./macos-keychain-signer.js";
import {execFile as rawExecFile} from "node:child_process";import {promisify} from "node:util";
let pending=new Uint8Array();
function reply(value){process.stdout.write(Buffer.from(encodeNativeMessage(value)))}
const helper=process.env.TRUE_NORTH_KEYCHAIN_SIGNER_PATH,signer=helper?createMacKeychainSigner({execFile:async(path,args,input)=>promisify(rawExecFile)(path,args,{input}),helperPath:helper}):null;
async function handle(message){if(message?.type==="status")return{ok:true,protocol_version:1,paired:Boolean(signer),installed_runtime:true,background_active:false};if(message?.type==="validate_prepared")try{return{ok:true,prepared:validatePreparedSubmission(message.prepared)}}catch{return{ok:false,error:"prepared_submission_invalid"}}if(message?.type==="sign_request"){if(!signer)return{ok:false,error:"device_not_paired"};const fields={device_id:String(message.device_id||""),method:String(message.method||""),path:String(message.path||""),body_hash:await canonicalBodyHash(message.body),timestamp:new Date().toISOString(),nonce:crypto.randomUUID().replaceAll("-","")},signature=await signer(new TextEncoder().encode(canonicalDeviceProof(fields)));return{...fields,signature}}return{ok:false,error:"unsupported_native_message"}}
process.stdin.on("data",chunk=>{const joined=new Uint8Array(pending.byteLength+chunk.byteLength);joined.set(pending);joined.set(chunk,pending.byteLength);const decoded=decodeNativeFrames(joined);pending=decoded.remainder;for(const message of decoded.messages)handle(message).then(reply).catch(()=>reply({ok:false,error:"native_host_failure"}))});
process.stdin.on("end",()=>{if(pending.byteLength)process.exitCode=2});
