import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
const root=process.cwd();
const tmp=await mkdtemp(join(tmpdir(),"vfirm-stage20-"));
const port=3100;
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
 const tenant=await post("/tenants",{name:"Stage 20 Tenant"});
 const firm=await post("/firms",{tenant_id:tenant.id,name:"Stage 20 Firm",principal_name:"Ir. Commercial"});
 const headers=authHeaders(firm);
 await post("/billing/readiness-reviews",{tenant_id:tenant.id,firm_id:firm.firm.id,readiness_status:"READY",decision_summary:"Billing readiness prepared for test-mode commercial launch.",actor:firm.principal_actor},headers);
 const provider=await post("/payments/provider-configs",{tenant_id:tenant.id,firm_id:firm.firm.id,provider_name:"stripe",provider_mode:"test",config_status:"READY_FOR_TEST",actor:firm.principal_actor},headers);
 if(provider.config_status!=="READY_FOR_TEST"||provider.provider_mode!=="test") throw new Error("Provider config not prepared.");
 const pack=await post("/subscriptions/packages",{tenant_id:tenant.id,firm_id:firm.firm.id,package_code:"VF-PILOT-PRO",package_name:"vFirm Pilot Pro",base_price:0,currency:"MYR",actor:firm.principal_actor},headers);
 if(pack.package_code!=="VF-PILOT-PRO") throw new Error("Subscription package not created.");
 const ready=await get(`/commercial-launch/summary?tenant_id=${tenant.id}`,headers);
 if(ready.status!=="COMMERCIAL_GATE_READY") throw new Error(`Expected commercial gate ready: ${JSON.stringify(ready)}`);
 const control=await post("/commercial-launch/controls",{tenant_id:tenant.id,firm_id:firm.firm.id,payment_provider_config_id:provider.id,subscription_package_id:pack.id,launch_status:"APPROVED_TEST_MODE",decision_summary:"Approved test-mode only. No live payment capture.",actor:firm.principal_actor},headers);
 if(control.launch_status!=="APPROVED_TEST_MODE"||!control.decided_at) throw new Error("Commercial launch control not recorded.");
 const finalSummary=await get(`/commercial-launch/summary?tenant_id=${tenant.id}`,headers);
 if(finalSummary.status!=="TEST_MODE_APPROVED"||finalSummary.boundary!=="payment_provider_preparation_only_no_live_payment_capture") throw new Error(`Bad final commercial summary: ${JSON.stringify(finalSummary)}`);
 console.log("Stage 20 payment provider preparation and commercial launch control smoke test passed.");
} finally { if(api.exitCode===null&&!api.killed){api.kill(); await once(api,"exit").catch(()=>{})} await rm(tmp,{recursive:true,force:true}); }
