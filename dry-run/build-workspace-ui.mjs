import {readFile,writeFile} from "node:fs/promises";

const html=await readFile(new URL("../true-north-career-workspace.html",import.meta.url),"utf8");
const modulePath=new URL("../workspace-ui.js",import.meta.url);
const current=await readFile(modulePath,"utf8");
const encoded=Buffer.from(html,"utf8").toString("base64");
const next=current.replace(/export const workspaceHtml=decode\("[A-Za-z0-9+/=]+"\);/,`export const workspaceHtml=decode("${encoded}");`);
if(next===current)throw new Error("workspace_html_export_not_found");
await writeFile(modulePath,next);
