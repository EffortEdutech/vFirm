import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-stage15-"));
const port = 3095;
const base = `http://127.0.0.1:${port}`;
const api = spawn(process.execPath, ["apps/api/src/server.mjs"], { cwd: root, env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: join(tmp, "store.json"), DATABASE_URL: "", VFIRM_STORE_BACKEND: "json", VFIRM_AUTH_PROVIDER: "clerk", VFIRM_AUTH_MODE: "staging", VFIRM_AUTH_ISSUER: "https://auth.example.test", VFIRM_AUTH_AUDIENCE: "vfirm-staging", VFIRM_AUTH_JWKS_URL: "https://auth.example.test/.well-known/jwks.json", VFIRM_ALLOWED_ORIGINS: "http://127.0.0.1:3090", VFIRM_BACKUP_POLICY: "pilot-daily", VFIRM_RELEASE_CHANNEL: "staging-pilot" }, stdio: ["ignore", "pipe", "pipe"] });
let logs = ""; api.stdout.on("data", c=>logs+=c.toString()); api.stderr.on("data", c=>logs+=c.toString());
async function waitForHealth(){const started=Date.now();while(Date.now()-started<10000){try{const r=await fetch(`${base}/health`);const j=await r.json();if(r.ok&&j.ok)return;}catch{} await new Promise(res=>setTimeout(res,100));}throw new Error(`API did not become healthy. Logs:\n${logs}`)}
async function request(path,{method="GET",body,headers={}}={}){const res=await fetch(`${base}${path}`,{method,headers:{"content-type":"application/json",...headers},body:body?JSON.stringify(body):undefined});const json=await res.json();return{res,json}}
async function post(path,body,headers={}){const {res,json}=await request(path,{method:"POST",body,headers});if(!res.ok||!json.ok)throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`);return json.data}
async function get(path,headers={}){const {res,json}=await request(path,{headers});if(!res.ok||!json.ok)throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`);return json.data}
function authHeaders(firm){return {"x-vfirm-actor-id":firm.principal_actor.id,"x-vfirm-tenant-id":firm.firm.tenant_id,"x-vfirm-firm-id":firm.firm.id,"x-vfirm-role":"principal"}}
try{
 await waitForHealth();
 const tenant=await post("/tenants",{name:"Stage 15 Tenant"});
 const firm=await post("/firms",{tenant_id:tenant.id,name:"Stage 15 Firm",principal_name:"Ir. Operator"});
 const headers=authHeaders(firm);
 const supportCase=await post("/support/cases",{tenant_id:tenant.id,firm_id:firm.firm.id,case_type:"PILOT_OBSERVABILITY",severity:"CRITICAL",subject:"Pilot control room test",description:"Critical support signal for incident workflow.",actor:firm.principal_actor},headers);
 const incident=await post("/ops/incidents",{tenant_id:tenant.id,firm_id:firm.firm.id,support_case_id:supportCase.id,incident_type:"PILOT_WORKFLOW",severity:"SEV2",title:"Pilot incident smoke",description:"Operator observed a pilot workflow issue.",impact_summary:"Pilot support queue requires immediate review.",detection_source:"smoke-test",actor:firm.principal_actor},headers);
 if(incident.status!=="OPEN"||incident.severity!=="SEV2") throw new Error("Incident did not open correctly.");
 const activeMetrics=await get(`/ops/operator-metrics?tenant_id=${tenant.id}`,headers);
 if(activeMetrics.status!=="INCIDENT_ACTIVE"||activeMetrics.counts.active_incidents!==1||activeMetrics.counts.critical_incidents!==1) throw new Error(`Bad active metrics: ${JSON.stringify(activeMetrics)}`);
 const resolved=await post("/ops/incidents/update",{tenant_id:tenant.id,firm_id:firm.firm.id,incident_id:incident.id,status:"RESOLVED",mitigation_summary:"Operator mitigation recorded.",root_cause_summary:"Smoke test confirmed incident response path.",actor:firm.principal_actor},headers);
 if(resolved.status!=="RESOLVED"||!resolved.resolved_at) throw new Error("Incident did not resolve correctly.");
 const finalMetrics=await get(`/ops/operator-metrics?tenant_id=${tenant.id}`,headers);
 if(finalMetrics.counts.active_incidents!==0||finalMetrics.counts.incidents!==1) throw new Error(`Bad final metrics: ${JSON.stringify(finalMetrics)}`);
 const listed=await get(`/pilot-incidents?tenant_id=${tenant.id}`,headers);
 if(listed.length!==1||listed[0].status!=="RESOLVED") throw new Error(`Incident list mismatch: ${JSON.stringify(listed)}`);
 console.log("Stage 15 pilot observability and incident response smoke test passed.");
} finally { if(api.exitCode===null&&!api.killed){api.kill(); await once(api,"exit").catch(()=>{})} await rm(tmp,{recursive:true,force:true}); }
