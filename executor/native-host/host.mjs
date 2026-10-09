#!/usr/bin/env node
import {decodeNativeFrames,encodeNativeMessage} from "./framing.js";
import {validatePreparedSubmission} from "../shared/executor-core.js";
let pending=new Uint8Array();
function reply(value){process.stdout.write(Buffer.from(encodeNativeMessage(value)))}
function handle(message){if(message?.type==="status")return{ok:true,protocol_version:1,paired:false,installed_runtime:true,background_active:false};if(message?.type==="validate_prepared")try{return{ok:true,prepared:validatePreparedSubmission(message.prepared)}}catch{return{ok:false,error:"prepared_submission_invalid"}}return{ok:false,error:"unsupported_native_message"}}
process.stdin.on("data",chunk=>{const joined=new Uint8Array(pending.byteLength+chunk.byteLength);joined.set(pending);joined.set(chunk,pending.byteLength);const decoded=decodeNativeFrames(joined);pending=decoded.remainder;for(const message of decoded.messages)reply(handle(message))});
process.stdin.on("end",()=>{if(pending.byteLength)process.exitCode=2});
