import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-stage8-"));
const port = 3094;
const base = `http://127.0.0.1:${port}`;
const api = spawn(process.execPath, ["apps/api/src/server.mjs"], { cwd: root, env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: join(tmp, "store.json"), VFIRM_DATABASE_URL: "" }, stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
api.stdout.on("data", (chunk)=>{logs+=chunk.toString();});
api.stderr.on("data", (chunk)=>{logs+=chunk.toString();});
async function waitForHealth(){const started=Date.now();while(Date.now()-started<10000){try{const r=await fetch(`${base}/health`);const j=await r.json();if(r.ok&&j.ok)return;}catch{} await new Promise((resolve)=>setTimeout(resolve,100));}throw new Error(`API did not become healthy. Logs:\n${logs}`);}
async function request(path,{method="GET",body,headers={}}={}){const res=await fetch(`${base}${path}`,{method,headers:{"content-type":"application/json",...headers},body:body?JSON.stringify(body):undefined});const json=await res.json();return{res,json};}
async function post(path,body,headers={}){const {res,json}=await request(path,{method:"POST",body,headers});if(!res.ok||!json.ok)throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`);return json.data;}
function authHeaders(firm){return {"x-vfirm-actor-id":firm.principal_actor.id,"x-vfirm-tenant-id":firm.firm.tenant_id,"x-vfirm-firm-id":firm.firm.id,"x-vfirm-role":"principal"};}
try {
  await waitForHealth();
  const tenant = await post("/tenants", { name:"Stage 8 Tenant" });
  const firm = await post("/firms", { tenant_id:tenant.id, name:"Stage 8 Network Firm", principal_name:"Ir. Network" });
  const headers = authHeaders(firm);
  const listing = await post("/marketplace/listings", { tenant_id:tenant.id, firm_id:firm.firm.id, title:"Trusted Formwork Support", description:"Private network Formwork capability", actor:firm.principal_actor }, headers);
  if(listing.status !== "PUBLISHED" || listing.visibility !== "TRUSTED_NETWORK") throw new Error("Listing was not published in trusted network mode.");
  const capacity = await post("/capacity/offers", { tenant_id:tenant.id, firm_id:firm.firm.id, pce_units:2, capacity_type:"FORMWORK_REVIEW_CAPACITY", actor:firm.principal_actor }, headers);
  if(capacity.status !== "OPEN" || Number(capacity.pce_units) !== 2) throw new Error("Capacity offer was not opened.");
  const collaboration = await post("/collaboration/requests", { tenant_id:tenant.id, requesting_firm_id:firm.firm.id, capacity_offer_id:capacity.id, request_summary:"Need Formwork review capacity for pilot job", actor:firm.principal_actor }, headers);
  if(collaboration.status !== "REQUESTED" || !collaboration.data_room_policy.audit_required) throw new Error("Collaboration request did not preserve data-room policy.");
  const snapshot = await post("/observatory/snapshots", { tenant_id:tenant.id, firm_id:firm.firm.id, snapshot_scope:"PRIVATE_NETWORK_INTERNAL", actor:firm.principal_actor }, headers);
  if(snapshot.privacy_class !== "AGGREGATED_INTERNAL" || snapshot.metrics.open_capacity_offers < 1 || snapshot.metrics.marketplace_listings < 1) throw new Error(`Snapshot metrics are wrong: ${JSON.stringify(snapshot)}`);
  const listings = await request("/marketplace-listings", { headers });
  if(!listings.res.ok || listings.json.data.length !== 1) throw new Error("Marketplace listing read failed.");
  const otherTenant = await post("/tenants", { name:"Stage 8 Other Tenant" });
  const denied = await request(`/marketplace-listings?tenant_id=${otherTenant.id}`, { headers });
  if(denied.res.status !== 403) throw new Error("Cross-tenant marketplace read should be denied.");
  console.log("Stage 8 marketplace network smoke test passed.");
} finally { api.kill(); await once(api,"exit").catch(()=>{}); await rm(tmp,{recursive:true,force:true}); }

