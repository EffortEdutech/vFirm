import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-stage14-"));
const port = 3094;
const base = `http://127.0.0.1:${port}`;
const api = spawn(process.execPath, ["apps/api/src/server.mjs"], { cwd: root, env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: join(tmp, "store.json"), VFIRM_DATABASE_URL: "", VFIRM_AUTH_PROVIDER: "clerk", VFIRM_AUTH_MODE: "staging", VFIRM_AUTH_ISSUER: "https://auth.example.test", VFIRM_AUTH_AUDIENCE: "vfirm-staging", VFIRM_AUTH_JWKS_URL: "https://auth.example.test/.well-known/jwks.json", VFIRM_ALLOWED_ORIGINS: "http://127.0.0.1:3090", VFIRM_BACKUP_POLICY: "pilot-daily", VFIRM_RELEASE_CHANNEL: "staging-pilot" }, stdio: ["ignore", "pipe", "pipe"] });
let logs = ""; api.stdout.on("data", c=>logs+=c.toString()); api.stderr.on("data", c=>logs+=c.toString());
async function waitForHealth(){const started=Date.now();while(Date.now()-started<10000){try{const r=await fetch(`${base}/health`);const j=await r.json();if(r.ok&&j.ok)return;}catch{} await new Promise(res=>setTimeout(res,100));}throw new Error(`API did not become healthy. Logs:\n${logs}`)}
async function request(path,{method="GET",body,headers={}}={}){const res=await fetch(`${base}${path}`,{method,headers:{"content-type":"application/json",...headers},body:body?JSON.stringify(body):undefined});const json=await res.json();return{res,json}}
async function post(path,body,headers={}){const {res,json}=await request(path,{method:"POST",body,headers});if(!res.ok||!json.ok)throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`);return json.data}
async function get(path,headers={}){const {res,json}=await request(path,{headers});if(!res.ok||!json.ok)throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`);return json.data}
function authHeaders(firm){return {"x-vfirm-actor-id":firm.principal_actor.id,"x-vfirm-tenant-id":firm.firm.tenant_id,"x-vfirm-firm-id":firm.firm.id,"x-vfirm-role":"principal"}}
try{
 await waitForHealth();
 const tenant=await post("/tenants",{name:"Stage 14 Tenant"});
 const firm=await post("/firms",{tenant_id:tenant.id,name:"Stage 14 Firm",principal_name:"Ir. Support"});
 const headers=authHeaders(firm);
 const invited=await post("/pilot/users/invite",{tenant_id:tenant.id,firm_id:firm.firm.id,email:"support.user@example.com",display_name:"Support User",pilot_role:"PILOT_OPERATOR",auth_provider:"clerk",actor:firm.principal_actor},headers);
 const active=await post("/pilot/users/activate",{tenant_id:tenant.id,firm_id:firm.firm.id,pilot_user_id:invited.id,external_subject:"support-user-001",actor:firm.principal_actor},headers);
 if(active.invite_status!=="ACTIVE") throw new Error("Pilot user not active before support flow.");
 const supportCase=await post("/support/cases",{tenant_id:tenant.id,firm_id:firm.firm.id,related_pilot_user_id:active.id,case_type:"ACCESS_SUPPORT",severity:"HIGH",subject:"Pilot login support",description:"User needs help accessing pilot workspace.",actor:firm.principal_actor},headers);
 if(supportCase.status!=="OPEN"||supportCase.severity!=="HIGH") throw new Error("Support case not opened correctly.");
 const closed=await post("/support/cases/update",{tenant_id:tenant.id,firm_id:firm.firm.id,support_case_id:supportCase.id,status:"CLOSED",resolution_summary:"Access issue resolved then user revoked for test.",actor:firm.principal_actor},headers);
 if(closed.status!=="CLOSED"||!closed.closed_at) throw new Error("Support case not closed.");
 const revoked=await post("/pilot/users/revoke",{tenant_id:tenant.id,firm_id:firm.firm.id,pilot_user_id:active.id,revocation_reason:"stage14_smoke_revocation",actor:firm.principal_actor},headers);
 if(revoked.invite_status!=="REVOKED"||!revoked.revoked_at) throw new Error("Pilot user not revoked.");
 const context=await get("/auth/provider-context",{"x-vfirm-auth-provider":"clerk","x-vfirm-user-email":"support.user@example.com","x-vfirm-user-subject":"support-user-001","x-vfirm-auth-verified":"true"});
 if(context.active) throw new Error("Revoked user should not resolve active auth context.");
 const summary=await get(`/support/summary?tenant_id=${tenant.id}`,headers);
 if(summary.counts.revoked_pilot_users!==1||summary.counts.support_cases!==1||summary.counts.open_cases!==0) throw new Error(`Bad support summary: ${JSON.stringify(summary)}`);
 console.log("Stage 14 pilot tenant operations and support desk smoke test passed.");
} finally { if(api.exitCode===null&&!api.killed){api.kill(); await once(api,"exit").catch(()=>{})} await rm(tmp,{recursive:true,force:true}); }
