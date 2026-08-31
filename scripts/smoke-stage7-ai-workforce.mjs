import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-stage7-"));
const port = 3099;
const base = `http://127.0.0.1:${port}`;
const api = spawn(process.execPath, ["apps/api/src/server.mjs"], { cwd: root, env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: join(tmp, "store.json"), VFIRM_DATABASE_URL: "" }, stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
api.stdout.on("data", (chunk) => { logs += chunk.toString(); });
api.stderr.on("data", (chunk) => { logs += chunk.toString(); });
async function waitForHealth(){ const started=Date.now(); while(Date.now()-started<10000){ try{ const r=await fetch(`${base}/health`); const j=await r.json(); if(r.ok&&j.ok)return; }catch{} await new Promise((resolve)=>setTimeout(resolve,100)); } throw new Error(`API did not become healthy. Logs:\n${logs}`); }
async function request(path,{method="GET",body,headers={}}={}){ const res=await fetch(`${base}${path}`,{method,headers:{"content-type":"application/json",...headers},body:body?JSON.stringify(body):undefined}); const json=await res.json(); return {res,json}; }
async function post(path,body,headers={}){ const {res,json}=await request(path,{method:"POST",body,headers}); if(!res.ok||!json.ok) throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`); return json.data; }
function authHeaders(firm){ return {"x-vfirm-actor-id":firm.principal_actor.id,"x-vfirm-tenant-id":firm.firm.tenant_id,"x-vfirm-firm-id":firm.firm.id,"x-vfirm-role":"principal"}; }
try {
  await waitForHealth();
  const templatesResponse = await request("/worker-templates");
  const templateCodes = new Set(templatesResponse.json.data.map((template) => template.code));
  const solopreneurCodes = ["front-desk-coordinator", "administration-clerk", "accounts-clerk", "marketing-sales-coordinator", "technical-drawing-assistant", "project-coordination-assistant"];
  if (solopreneurCodes.some((code) => !templateCodes.has(code))) throw new Error("Solopreneur worker templates are incomplete.");
  const tenant = await post("/tenants", { name:"Stage 7 Tenant" });
  const firm = await post("/firms", { tenant_id:tenant.id, name:"Stage 7 Firm", principal_name:"Ir. AI Supervisor" });
  const headers = authHeaders(firm);
  const client = await post("/clients", { tenant_id:tenant.id, firm_id:firm.firm.id, name:"Stage 7 Contractor", actor:firm.principal_actor }, headers);
  const intake = await post("/intake-sessions", { tenant_id:tenant.id, firm_id:firm.firm.id, relationship_id:client.relationship.id, actor:firm.principal_actor, provided_inputs:{ project_name:"AI assisted formwork", site_location:"Kuala Lumpur", client_organization:"Stage 7 Contractor", client_contact_name:"PM", client_contact_email:"pm@example.com", structure_type:"basement", formwork_element_type:"wall", height:3.5, length_or_area:120, concrete_grade:"C30", available_drawings:["S-100"], deadline:new Date(Date.now()+14*86400000).toISOString(), required_deliverables:["preliminary_support_report"] } }, headers);
  const proposal = await post("/proposals", { tenant_id:tenant.id, firm_id:firm.firm.id, relationship_id:client.relationship.id, intake_session_id:intake.intake.id, scope_summary:"AI assisted Formwork proposal", final_price:2500, actor:firm.principal_actor }, headers);
  const approval = await post("/proposals/approve", { tenant_id:tenant.id, firm_id:firm.firm.id, proposal_id:proposal.proposal.id }, headers);
  const delivery = await post("/proposals/accept", { tenant_id:tenant.id, firm_id:firm.firm.id, proposal_id:approval.proposal.id, project_name:"AI assisted formwork", actor:firm.principal_actor }, headers);
  const worker = await post("/worker-instances", { tenant_id:tenant.id, firm_id:firm.firm.id, worker_template_code:"formwork-intake-agent", name:"Formwork Intake AI", actor:firm.principal_actor }, headers);
  const active = await post("/worker-instances/activate", { tenant_id:tenant.id, firm_id:firm.firm.id, worker_instance_id:worker.worker_instance.id, actor:firm.principal_actor }, headers);
  if(active.runtime_status !== "ACTIVE") throw new Error("Worker did not activate.");
  const assigned = await post("/runtime/tasks/assign-ai", { tenant_id:tenant.id, firm_id:firm.firm.id, task_id:delivery.task.id, worker_instance_id:worker.worker_instance.id, actor:firm.principal_actor }, headers);
  if(assigned.task.assigned_actor_or_worker_ref !== worker.worker_instance.id) throw new Error("Task not assigned to worker.");
  const tool = await post("/runtime/tool-invocations", { tenant_id:tenant.id, firm_id:firm.firm.id, worker_instance_id:worker.worker_instance.id, task_id:delivery.task.id, tool_name:"formwork.input.extract", input_summary:"Extract structured Formwork intake facts" });
  if(tool.invocation_status !== "REQUESTED") throw new Error("Tool invocation was not requested.");
  const deniedTool = await request("/runtime/tool-invocations", { method:"POST", body:{ tenant_id:tenant.id, firm_id:firm.firm.id, worker_instance_id:worker.worker_instance.id, task_id:delivery.task.id, tool_name:"payments.release" } });
  if(deniedTool.res.status < 400) throw new Error("Unallowed tool invocation should fail.");
  const output = await post("/runtime/tasks/output", { tenant_id:tenant.id, firm_id:firm.firm.id, task_id:delivery.task.id, worker_instance_id:worker.worker_instance.id, output_ref:"ai://outputs/formwork-intake-summary", evidence_refs:["formwork_intake_completeness"], quality_flags:["requires_human_review"], requires_human_review:true });
  if(!output.task_output.requires_human_review || output.task.state !== "OUTPUT_PRODUCED") throw new Error("AI output did not preserve human review requirement.");
  const aiApproval = await request("/policy/evaluate", { method:"POST", body:{ actor:{ actor_id:worker.actor.id, actor_type:"AI_AGENT", tenant_id:tenant.id, firm_id:firm.firm.id, worker_instance_id:worker.worker_instance.id }, action:"approval.grant", resource:{ resource_type:"Proposal", resource_id:proposal.proposal.id, tenant_id:tenant.id, firm_id:firm.firm.id }, context:{ professional_authority_valid:true } } });
  if(aiApproval.json.data.result !== "DENY") throw new Error("AI approval policy should deny.");
  console.log("Stage 7 AI workforce smoke test passed.");
} finally { api.kill(); await once(api,"exit").catch(()=>{}); await rm(tmp,{recursive:true,force:true}); }
