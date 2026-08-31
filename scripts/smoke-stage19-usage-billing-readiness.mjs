import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
const root=process.cwd();
const tmp=await mkdtemp(join(tmpdir(),"vfirm-stage19-"));
const port=3099;
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
 const tenant=await post("/tenants",{name:"Stage 19 Tenant"});
 const firm=await post("/firms",{tenant_id:tenant.id,name:"Stage 19 Firm",principal_name:"Ir. Usage"});
 const headers=authHeaders(firm);
 const control=await post("/tenant-pilot/controls",{tenant_id:tenant.id,firm_id:firm.firm.id,plan_code:"PILOT_FREE_CONTROLLED",limits:{projects:1,pilot_users:2,ai_tool_invocations:3,storage_mb:500},actor:firm.principal_actor},headers);
 if(control.control_status!=="ACTIVE"||control.limits.projects!==1) throw new Error("Tenant pilot control not created correctly.");
 await post("/tenant-usage/events",{tenant_id:tenant.id,firm_id:firm.firm.id,usage_type:"projects",quantity:1,unit:"project",source_ref:"stage19-smoke",actor:firm.principal_actor},headers);
 await post("/tenant-usage/events",{tenant_id:tenant.id,firm_id:firm.firm.id,usage_type:"ai_tool_invocations",quantity:2,unit:"call",source_ref:"stage19-smoke",actor:firm.principal_actor},headers);
 const controlled=await get(`/tenant-usage/summary?tenant_id=${tenant.id}`,headers);
 if(controlled.status!=="USAGE_CONTROLLED"||controlled.usage_totals.projects!==1||!controlled.limit_warnings.some((item)=>item.includes("projects"))) throw new Error(`Bad controlled usage summary: ${JSON.stringify(controlled)}`);
 const review=await post("/billing/readiness-reviews",{tenant_id:tenant.id,firm_id:firm.firm.id,readiness_status:"READY",pricing_model:"PILOT_USAGE_REVIEW",decision_summary:"Billing readiness reviewed without live payment capture.",actor:firm.principal_actor},headers);
 if(review.readiness_status!=="READY") throw new Error("Billing review not ready.");
 const ready=await get(`/tenant-usage/summary?tenant_id=${tenant.id}`,headers);
 if(ready.status!=="BILLING_READY"||ready.counts.ready_reviews!==1) throw new Error(`Bad billing-ready summary: ${JSON.stringify(ready)}`);
 console.log("Stage 19 multi-tenant usage limits and billing readiness smoke test passed.");
} finally { if(api.exitCode===null&&!api.killed){api.kill(); await once(api,"exit").catch(()=>{})} await rm(tmp,{recursive:true,force:true}); }
