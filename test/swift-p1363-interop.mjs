import {mkdtemp,readFile,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {webcrypto} from "node:crypto";
const run=promisify(execFile),dir=await mkdtemp(join(tmpdir(),"tn-p1363-"));
try{
  const binary=join(dir,"KeychainSigner"),key=join(dir,"key.pem"),pub=join(dir,"pub.pem"),message=join(dir,"message.bin"),signature=join(dir,"signature.der"),payload=Buffer.from("true-north-p1363-cross-runtime-fixture");await writeFile(message,payload);
  await run("swiftc",[new URL("../executor/native-host/KeychainSigner.swift",import.meta.url).pathname,"-o",binary],{env:{...process.env,CLANG_MODULE_CACHE_PATH:join(dir,"clang-cache"),SWIFT_MODULECACHE_PATH:join(dir,"swift-cache")}});await run("openssl",["ecparam","-name","prime256v1","-genkey","-noout","-out",key]);await run("openssl",["ec","-in",key,"-pubout","-out",pub]);await run("openssl",["dgst","-sha256","-sign",key,"-out",signature,message]);const der=await readFile(signature),converted=await new Promise((resolve,reject)=>{const child=execFile(binary,["convert-der","--key-tag","fixture"],(error,stdout)=>error?reject(error):resolve(stdout.trim()));child.stdin.end(der)}),raw=Buffer.from(converted.replaceAll("-","+").replaceAll("_","/")+"=".repeat((4-converted.length%4)%4),"base64"),spki=await readFile(pub),publicKey=await webcrypto.subtle.importKey("spki",Buffer.from((await run("openssl",["pkey","-pubin","-in",pub,"-outform","DER"],{encoding:"buffer"})).stdout),{name:"ECDSA",namedCurve:"P-256"},false,["verify"]),verified=await webcrypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},publicKey,raw,payload);if(raw.length!==64||!verified||!spki.length)throw new Error("swift_p1363_interop_failed");console.log(`swift P1363 interoperability: PASS (DER ${der.length} bytes -> P1363 ${raw.length} bytes)`);
}finally{await rm(dir,{recursive:true,force:true})}
