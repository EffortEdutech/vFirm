import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
const root=process.cwd();
const tmp=await mkdtemp(join(tmpdir(),"vfirm-stage17-"));
const port=3097;
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
 const tenant=await post("/tenants",{name:"Stage 17 Tenant"});
 const firm=await post("/firms",{tenant_id:tenant.id,name:"Stage 17 Firm",principal_name:"Ir. Board"});
 const headers=authHeaders(firm);
 await post("/pilot/feedback",{tenant_id:tenant.id,firm_id:firm.firm.id,sentiment:"POSITIVE",rating:5,subject:"Pilot acceptable",feedback_text:"Pilot package is ready for stakeholder review.",actor:firm.principal_actor},headers);
 const report=await post("/pilot/report-packs",{tenant_id:tenant.id,firm_id:firm.firm.id,report_scope:"FORMWORK_PILOT",actor:firm.principal_actor},headers);
 if(report.report_status!=="GENERATED"||!report.export_manifest?.tenant_scoped) throw new Error("Report pack not generated correctly.");
 const board=await post("/stakeholder-review/boards",{tenant_id:tenant.id,firm_id:firm.firm.id,report_pack_id:report.id,board_name:"Stage 17 Review Board",attendees:["Principal","Operator","Stakeholder"],actor:firm.principal_actor},headers);
 if(board.review_status!=="OPEN"||board.report_pack_id!==report.id) throw new Error("Review board not opened correctly.");
 const openSummary=await get(`/stakeholder-review/summary?tenant_id=${tenant.id}`,headers);
 if(openSummary.status!=="BOARD_REVIEW_OPEN"||openSummary.counts.report_packs!==1||openSummary.counts.open_boards!==1) throw new Error(`Bad open summary: ${JSON.stringify(openSummary)}`);
 const decision=await post("/stakeholder-review/decisions",{tenant_id:tenant.id,firm_id:firm.firm.id,board_id:board.id,decision:"APPROVE_EXPANSION",decision_summary:"Pilot approved for next controlled stage.",conditions:["Keep human approval gates"],next_stage:"Stage 18",actor:firm.principal_actor},headers);
 if(decision.decision!=="APPROVE_EXPANSION") throw new Error("Decision not recorded correctly.");
 const finalSummary=await get(`/stakeholder-review/summary?tenant_id=${tenant.id}`,headers);
 if(finalSummary.status!=="EXPANSION_APPROVED"||finalSummary.counts.decisions!==1||finalSummary.counts.open_boards!==0) throw new Error(`Bad final summary: ${JSON.stringify(finalSummary)}`);
 const boards=await get(`/stakeholder-review-boards?tenant_id=${tenant.id}`,headers);
 if(boards.length!==1||boards[0].review_status!=="CLOSED") throw new Error(`Board did not close after decision: ${JSON.stringify(boards)}`);
 console.log("Stage 17 pilot reporting and stakeholder review board smoke test passed.");
} finally { if(api.exitCode===null&&!api.killed){api.kill(); await once(api,"exit").catch(()=>{})} await rm(tmp,{recursive:true,force:true}); }
