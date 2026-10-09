import path from "node:path";
import {renderNativeHostManifest} from "../native-host/manifest-renderer.js";

const EXTENSION_ID=/^[a-p]{32}$/;
const DEVICE_ID=/^executor_device_[A-Za-z0-9_-]{8,120}$/;
const NATIVE_TEMPLATE=`{"name":"company.justsignal.truenorth_executor","description":"True North exact-approval native messaging host","path":"__ABSOLUTE_HOST_PATH__","type":"stdio","allowed_origins":["chrome-extension://__EXTENSION_ID__/"]}`;
function absolute(value,name){const v=String(value||"");if(!path.isAbsolute(v)||v.includes("\0"))throw new Error(`${name}_absolute_path_required`);return path.normalize(v)}
function sh(value){return `'${String(value).replaceAll("'","'\\''")}'`}

export function buildMacInstallPlan({userHome,sourceRoot,extensionId,deviceId}){
  const home=absolute(userHome,"user_home"),source=absolute(sourceRoot,"source_root");if(!EXTENSION_ID.test(String(extensionId||"")))throw new Error("extension_id_invalid");if(!DEVICE_ID.test(String(deviceId||"")))throw new Error("device_id_invalid");
  const appDir=path.join(home,"Library/Application Support/TrueNorthExecutor"),hostDir=path.join(home,"Library/Application Support/Google/Chrome/NativeMessagingHosts"),hostPath=path.join(appDir,"true-north-native-host"),helperPath=path.join(appDir,"KeychainSigner"),wrapper=`#!/bin/zsh\nexport TRUE_NORTH_KEYCHAIN_SIGNER_PATH=${sh(helperPath)}\nexport TRUE_NORTH_EXECUTOR_DEVICE_ID=${sh(deviceId)}\nexec /usr/bin/env node ${sh(path.join(appDir,"native-host/host.mjs"))}\n`,manifest=renderNativeHostManifest(NATIVE_TEMPLATE,{hostPath,extensionId});
  return{version:1,mode:"local_gesture",mutates_system:false,requires_user_approval:true,appDir,hostDir,extensionSource:path.join(source,"executor/chrome-extension"),operations:[{kind:"mkdir",path:appDir},{kind:"mkdir",path:hostDir},{kind:"copy_tree",from:path.join(source,"executor/native-host"),to:path.join(appDir,"native-host")},{kind:"compile_swift",source:path.join(source,"executor/native-host/KeychainSigner.swift"),output:helperPath},{kind:"write",path:hostPath,mode:0o700,content:wrapper},{kind:"write",path:path.join(hostDir,"company.justsignal.truenorth_executor.json"),mode:0o600,content:manifest}],manual_steps:["Load the reviewed unpacked extension from extensionSource in Chrome Developer Mode.","Confirm the displayed public-key fingerprint in True North before pairing.","Use the extension only from an explicit local gesture."]};
}

export async function executeMacInstallPlan(plan,io){if(plan?.requires_user_approval!==true||plan?.mode!=="local_gesture")throw new Error("approved_install_plan_required");for(const op of plan.operations){if(op.kind==="mkdir")await io.mkdir(op.path);else if(op.kind==="copy_tree")await io.copyTree(op.from,op.to);else if(op.kind==="compile_swift")await io.compileSwift(op.source,op.output);else if(op.kind==="write")await io.writeFile(op.path,op.content,op.mode);else throw new Error("unsupported_install_operation")}}
