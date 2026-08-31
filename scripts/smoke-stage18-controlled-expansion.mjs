import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
const root=process.cwd();
const tmp=await mkdtemp(join(tmpdir(),"vfirm-stage18-"));
const port=3098;
const base=`http://127.0.0.1:${port}`;
const api=spawn(process.execPath,["apps/api/src/server.mjs"],{cwd:root,env:{...process.env,VFIRM_API_PORT:String(port),VFIRM_STORE_PATH:join(tmp,"store.json"),DATABASE_URL:"",VFIRM_STORE_BACKEND:"json"},stdio:["ignore","pipe","pipe"]});
let logs="";api.stdout.on("data",c=>logs+=c.toString());api.stderr.on("data",c=>logs+=c.toString());
async function waitForHealth(){const started=Date.now();while(Date.now()-started<10000){try{const r=await fetch(`${base}/health`);const j=await r.json();if(r.ok&&j.ok)return;}catch{} await new Promise(res=>setTimeout(res,100));}throw new Error(`API did not become healthy. Logs:\n${logs}`)}
async function request(path,{method="GET",body,headers={}}={}){const res=await fetch(`${base}${path}`,{method,headers:{"content-type":"application/json",...headers},body:body?JSON.stringify(body):undefined});const json=await res.json();return{res,json}}
async function post(path,body,headers={}){const {res,json}=await request(path,{method:"POST",body,headers});if(!res.ok||!json.ok)throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`);return json.data}
async function get(path,headers={}){const {res,json}=await request(path,{headers});if(!res.ok||!json.ok)throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`);return json.data}
function authHeaders(firm){return {"x-vfirm-actor-id":firm.principal_actor.id,"x-vfirm-tenant-id":firm.firm.tenant_id,"x-vfirm-firm-id":firm.firm.id,"x-vfirm-role":"principal"}}
try{
 await waitForHealth();
 const tenant=await post("/tenants",{name:"Stage 18 Tenant"});
 const firm=await post("/firms",{tenant_id:tenant.id,name:"Stage 18 Firm",principal_name:"Ir. Expansion"});
 const headers=authHeaders(firm);
 const report=await post("/pilot/report-packs",{tenant_id:tenant.id,firm_id:firm.firm.id,actor:firm.principal_actor},headers);
 const board=await post("/stakeholder-review/boards",{tenant_id:tenant.id,firm_id:firm.firm.id,report_pack_id:report.id,actor:firm.principal_actor},headers);
 const decision=await post("/stakeholder-review/decisions",{tenant_id:tenant.id,firm_id:firm.firm.id,board_id:board.id,decision:"APPROVE_EXPANSION",decision_summary:"Approve controlled pilot expansion.",next_stage:"Stage 18",actor:firm.principal_actor},headers);
 const initial=await get(`/pilot/expansion-summary?tenant_id=${tenant.id}`,headers);
 if(initial.status!=="COHORT_REQUIRED") throw new Error(`Expected cohort required: ${JSON.stringify(initial)}`);
 const cohort=await post("/pilot/expansion-cohorts",{tenant_id:tenant.id,firm_id:firm.firm.id,stakeholder_decision_id:decision.id,cohort_name:"Stage 18 Controlled Cohort",max_tenants:1,max_pilot_users:5,actor:firm.principal_actor},headers);
 if(cohort.expansion_status!=="PROPOSED") throw new Error("Cohort not created as proposed.");
 const approved=await post("/pilot/expansion-cohorts/update",{tenant_id:tenant.id,firm_id:firm.firm.id,expansion_cohort_id:cohort.id,expansion_status:"APPROVED",actor:firm.principal_actor},headers);
 if(approved.expansion_status!=="APPROVED") throw new Error("Cohort not approved.");
 const plan=await post("/tenant-onboarding/plans",{tenant_id:tenant.id,firm_id:firm.firm.id,expansion_cohort_id:cohort.id,actor:firm.principal_actor},headers);
 if(plan.onboarding_status!=="DRAFT") throw new Error("Onboarding plan not created.");
 const completed=await post("/tenant-onboarding/plans/update",{tenant_id:tenant.id,firm_id:firm.firm.id,onboarding_plan_id:plan.id,onboarding_status:"COMPLETE",actor:firm.principal_actor},headers);
 if(completed.onboarding_status!=="COMPLETE"||!completed.completed_at) throw new Error("Onboarding not completed.");
 const gate=await post("/release-candidate/gates",{tenant_id:tenant.id,firm_id:firm.firm.id,expansion_cohort_id:cohort.id,release_candidate:"RC-STAGE-18",gate_status:"APPROVED",decision_summary:"RC approved for controlled pilot expansion.",actor:firm.principal_actor},headers);
 if(gate.gate_status!=="APPROVED"||!gate.decided_at) throw new Error("RC gate not approved.");
 const finalSummary=await get(`/pilot/expansion-summary?tenant_id=${tenant.id}`,headers);
 if(finalSummary.status!=="RELEASE_CANDIDATE_APPROVED"||finalSummary.counts.approved_release_gates!==1||finalSummary.counts.completed_onboarding_plans!==1) throw new Error(`Bad final summary: ${JSON.stringify(finalSummary)}`);
 console.log("Stage 18 controlled pilot expansion and RC governance smoke test passed.");
} finally { if(api.exitCode===null&&!api.killed){api.kill(); await once(api,"exit").catch(()=>{})} await rm(tmp,{recursive:true,force:true}); }
