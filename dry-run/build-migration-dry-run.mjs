import {execFileSync} from "node:child_process";
import {readFileSync,writeFileSync} from "node:fs";
import {classifyLink,makeResearchTasks} from "../worker.js";

const db=new URL("./production.sqlite",import.meta.url).pathname;
const query=sql=>JSON.parse(execFileSync("sqlite3",["-json",db,sql],{encoding:"utf8"})||"[]");
const rows=query(`SELECT o.id observation_id,o.email_id,o.source,o.url,o.title_hint,o.link_kind,
 CASE WHEN c.observation_id IS NULL THEN 0 ELSE 1 END is_candidate,
 t.id task_id,t.task_kind,t.status,t.attempts,t.error_code,t.canonical_job_id,t.updated_at,
 cp.state_json checkpoint_json
 FROM observations o
 LEFT JOIN candidate_observations c ON c.observation_id=o.id
 LEFT JOIN research_tasks t ON t.observation_id=o.id
 LEFT JOIN research_checkpoints cp ON cp.task_id=t.id
 ORDER BY o.id,t.id`);
const unbound=query("SELECT id,source,task_kind,url,status,attempts,error_code,canonical_job_id FROM research_tasks WHERE observation_id IS NULL ORDER BY id");
const groups=new Map(),unrelated=[];
for(const row of rows){
  const classified=classifyLink(row.url,row.title_hint||"",row.source);
  if(["navigation","ignore"].includes(classified.kind)){unrelated.push({...row,new_kind:classified.kind,normalized_url:classified.url});continue}
  const link={source:row.source,text:row.title_hint||"",...classified};
  const [canonical]=await makeResearchTasks({message_id:"migration",links:[link]});
  const key=canonical.id;
  if(!groups.has(key))groups.set(key,{canonical_task:canonical,observations:[],legacy_tasks:new Map()});
  const group=groups.get(key);group.observations.push(row.observation_id);
  if(row.task_id)group.legacy_tasks.set(row.task_id,row);
}

const conflicts=[],mappings=[];
for(const [canonical_id,group] of groups){
  const legacy=[...group.legacy_tasks.values()],jobs=[...new Set(legacy.map(x=>x.canonical_job_id).filter(Boolean))],checkpoints=[...new Set(legacy.map(x=>x.checkpoint_json).filter(Boolean))];
  if(jobs.length>1)conflicts.push({canonical_id,type:"canonical_job_conflict",values:jobs});
  if(checkpoints.length>1)conflicts.push({canonical_id,type:"checkpoint_conflict",count:checkpoints.length});
  const running=legacy.filter(x=>x.status==="running");
  if(running.length)conflicts.push({canonical_id,type:"running_task_conflict",task_ids:running.map(x=>x.task_id)});
  mappings.push({canonical_id,source:group.canonical_task.source,task_kind:group.canonical_task.task_kind,url:group.canonical_task.url,observation_count:group.observations.length,legacy_task_ids:legacy.map(x=>x.task_id),statuses:[...new Set(legacy.map(x=>x.status))],canonical_job_ids:jobs,checkpoint_count:checkpoints.length});
}
mappings.sort((a,b)=>a.canonical_id.localeCompare(b.canonical_id));
const bySource=Object.fromEntries([...new Set(mappings.map(x=>x.source))].sort().map(source=>[source,{active_tasks:mappings.filter(x=>x.source===source).length,observations:mappings.filter(x=>x.source===source).reduce((n,x)=>n+x.observation_count,0)}]));
const report={generated_at:new Date().toISOString(),input_sql_sha256:null,input_counts:{observations:rows.length,research_tasks:query("SELECT COUNT(*) n FROM research_tasks")[0].n,unbound_tasks:unbound.length},projected:{active_deduplicated_tasks:mappings.length+unbound.length,actionable_deduplicated_tasks:mappings.length,unrelated_observations:unrelated.length,legacy_occurrence_tasks_superseded:[...new Set(mappings.flatMap(x=>x.legacy_task_ids))].length,by_source:bySource},conflicts,unbound_tasks:unbound,mappings,unrelated:unrelated.map(x=>({observation_id:x.observation_id,source:x.source,url:x.normalized_url,title_hint:x.title_hint,legacy_task_id:x.task_id}))};
writeFileSync(new URL("./migration-dry-run.json",import.meta.url),JSON.stringify(report,null,2)+"\n");
const lines=["# Production D1 deduplication dry-run","",`Generated: ${report.generated_at}`,"",`- Observations: ${report.input_counts.observations}`,`- Legacy research tasks: ${report.input_counts.research_tasks}`,`- Projected actionable deduplicated tasks: ${report.projected.actionable_deduplicated_tasks}`,`- Preserved unbound tasks: ${report.input_counts.unbound_tasks}`,`- Projected total active tasks: ${report.projected.active_deduplicated_tasks}`,`- Unrelated observations removed from executable queue: ${report.projected.unrelated_observations}`,`- Conflicts: ${conflicts.length}`,"","## By source","",...Object.entries(bySource).map(([source,x])=>`- ${source}: ${x.active_tasks} active tasks from ${x.observations} observations`),"","## Conflict policy","",conflicts.length?"Migration is blocked until every conflict is reviewed.":"No canonical-job or checkpoint conflicts were detected. The migration still requires explicit approval and a transaction/readback rehearsal.","","## Important limitation","","This report classifies stored URLs only. It does not fetch them and does not establish that any provider link is accessible or research-complete.",""];
writeFileSync(new URL("./migration-dry-run.md",import.meta.url),lines.join("\n"));
console.log(JSON.stringify({input:report.input_counts,projected:report.projected,conflicts:conflicts.length},null,2));
