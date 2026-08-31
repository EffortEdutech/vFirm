import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
const root=process.cwd();
const tmp=await mkdtemp(join(tmpdir(),"vfirm-stage16-"));
const port=3096;
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
 const tenant=await post("/tenants",{name:"Stage 16 Tenant"});
 const firm=await post("/firms",{tenant_id:tenant.id,name:"Stage 16 Firm",principal_name:"Ir. Learning"});
 const headers=authHeaders(firm);
 const feedback=await post("/pilot/feedback",{tenant_id:tenant.id,firm_id:firm.firm.id,feedback_type:"USABILITY",sentiment:"NEGATIVE",rating:2,subject:"Pilot flow needs clearer next actions",feedback_text:"Operator could complete the flow but needed clearer guidance.",actor:firm.principal_actor},headers);
 if(feedback.sentiment!=="NEGATIVE"||feedback.rating!==2) throw new Error("Feedback not captured correctly.");
 const review=await post("/pilot/acceptance-reviews",{tenant_id:tenant.id,firm_id:firm.firm.id,decision:"CONDITIONAL_PASS",criteria:[{criterion:"Workflow can be completed",result:"PASS"},{criterion:"Operator guidance is clear",result:"CONDITIONAL"}],notes:"Pilot passes with UX improvement required.",actor:firm.principal_actor},headers);
 if(review.decision!=="CONDITIONAL_PASS") throw new Error("Acceptance review not captured correctly.");
 const item=await post("/pilot/improvement-items",{tenant_id:tenant.id,firm_id:firm.firm.id,feedback_id:feedback.id,acceptance_review_id:review.id,priority:"P1",title:"Clarify pilot next-action guidance",description:"Improve guidance after each workflow command.",target_stage:"Pilot UX polish",actor:firm.principal_actor},headers);
 if(item.priority!=="P1"||item.status!=="OPEN") throw new Error("Improvement item not created correctly.");
 const activeLoop=await get(`/pilot/learning-loop?tenant_id=${tenant.id}`,headers);
 if(activeLoop.status!=="IMPROVEMENT_REQUIRED"||activeLoop.counts.feedback!==1||activeLoop.counts.high_priority_improvements!==1) throw new Error(`Bad active learning loop: ${JSON.stringify(activeLoop)}`);
 const closed=await post("/pilot/improvement-items/update",{tenant_id:tenant.id,firm_id:firm.firm.id,improvement_item_id:item.id,status:"DONE",actor:firm.principal_actor},headers);
 if(closed.status!=="DONE"||!closed.closed_at) throw new Error("Improvement item did not close.");
 const finalLoop=await get(`/pilot/learning-loop?tenant_id=${tenant.id}`,headers);
 if(finalLoop.counts.open_improvements!==0||finalLoop.counts.improvement_items!==1) throw new Error(`Bad final learning loop: ${JSON.stringify(finalLoop)}`);
 const listed=await get(`/pilot-improvement-items?tenant_id=${tenant.id}`,headers);
 if(listed.length!==1||listed[0].status!=="DONE") throw new Error(`Improvement list mismatch: ${JSON.stringify(listed)}`);
 console.log("Stage 16 pilot feedback and improvement loop smoke test passed.");
} finally { if(api.exitCode===null&&!api.killed){api.kill(); await once(api,"exit").catch(()=>{})} await rm(tmp,{recursive:true,force:true}); }
