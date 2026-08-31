import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const tmp = await mkdtemp(join(tmpdir(), "vfirm-stage6-"));
const port = 3098;
const base = `http://127.0.0.1:${port}`;
const requiredEvidence = ["formwork_intake_completeness", "document_revision_consistency", "unit_consistency", "geometry_positive_value_check", "risk_classification_completeness", "approval_presence_before_issue", "manufacturer_source_provenance_presence", "calculation_input_schema_validity"];
const api = spawn(process.execPath, ["apps/api/src/server.mjs"], { cwd: root, env: { ...process.env, VFIRM_API_PORT: String(port), VFIRM_STORE_PATH: join(tmp, "store.json"), VFIRM_DATABASE_URL: "" }, stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
api.stdout.on("data", (chunk) => { logs += chunk.toString(); });
api.stderr.on("data", (chunk) => { logs += chunk.toString(); });
async function waitForHealth(){ const started=Date.now(); while(Date.now()-started<10000){ try{ const r=await fetch(`${base}/health`); const j=await r.json(); if(r.ok&&j.ok)return; }catch{} await new Promise((resolve)=>setTimeout(resolve,100)); } throw new Error(`API did not become healthy. Logs:\n${logs}`); }
async function request(path,{method="GET",body,headers={}}={}){ const res=await fetch(`${base}${path}`,{method,headers:{"content-type":"application/json",...headers},body:body?JSON.stringify(body):undefined}); const json=await res.json(); return {res,json}; }
async function post(path,body,headers={}){ const {res,json}=await request(path,{method:"POST",body,headers}); if(!res.ok||!json.ok) throw new Error(`${path} failed: ${res.status} ${JSON.stringify(json)}`); return json.data; }
function authHeaders(firmResult){ return {"x-vfirm-actor-id":firmResult.principal_actor.id,"x-vfirm-tenant-id":firmResult.firm.tenant_id,"x-vfirm-firm-id":firmResult.firm.id,"x-vfirm-role":"principal"}; }
try {
  await waitForHealth();
  const tenant = await post("/tenants", { name: "Stage 6 Tenant" });
  const firm = await post("/firms", { tenant_id: tenant.id, name: "Stage 6 Firm", principal_name: "Ir. Commercial" });
  const headers = authHeaders(firm);
  const client = await post("/clients", { tenant_id: tenant.id, firm_id: firm.firm.id, name: "Stage 6 Contractor", actor: firm.principal_actor }, headers);
  const intake = await post("/intake-sessions", { tenant_id: tenant.id, firm_id: firm.firm.id, relationship_id: client.relationship.id, actor: firm.principal_actor, provided_inputs: { project_name:"Stage 6 Formwork", site_location:"Kuala Lumpur", client_organization:"Stage 6 Contractor", client_contact_name:"QS", client_contact_email:"qs@example.com", structure_type:"basement", formwork_element_type:"wall", height:3.5, length_or_area:120, concrete_grade:"C30", available_drawings:["S-100"], deadline:new Date(Date.now()+14*86400000).toISOString(), required_deliverables:["preliminary_support_report"] } }, headers);
  const proposal = await post("/proposals", { tenant_id:tenant.id, firm_id:firm.firm.id, relationship_id:client.relationship.id, intake_session_id:intake.intake.id, scope_summary:"Stage 6 commercial proposal", final_price:3200, actor:firm.principal_actor }, headers);
  const approval = await post("/proposals/approve", { tenant_id:tenant.id, firm_id:firm.firm.id, proposal_id:proposal.proposal.id }, headers);
  const delivery = await post("/proposals/accept", { tenant_id:tenant.id, firm_id:firm.firm.id, proposal_id:approval.proposal.id, project_name:"Stage 6 Formwork", actor:firm.principal_actor }, headers);
  const invoice = await post("/invoices", { tenant_id:tenant.id, firm_id:firm.firm.id, relationship_id:client.relationship.id, engagement_id:delivery.engagement.id, project_id:delivery.project.id, currency:"MYR", line_items:[{description:"Formwork preliminary report",amount:3200}], actor:firm.principal_actor }, headers);
  const earlyIssue = await request("/invoices/issue", { method:"POST", headers, body:{ tenant_id:tenant.id, firm_id:firm.firm.id, invoice_id:invoice.id } });
  if (earlyIssue.res.status < 400) throw new Error("Invoice issue before deliverable issue should fail.");
  const draft = await post("/deliverables/draft", { tenant_id:tenant.id, firm_id:firm.firm.id, project_id:delivery.project.id, relationship_id:client.relationship.id, title:"Stage 6 Report", actor:firm.principal_actor }, headers);
  const evidence = await post("/evidence-bundles", { tenant_id:tenant.id, firm_id:firm.firm.id, project_id:delivery.project.id, subject_type:"Project", subject_id:delivery.project.id, input_refs:requiredEvidence, actor:firm.principal_actor }, headers);
  const review = await post("/deliverables/review", { tenant_id:tenant.id, firm_id:firm.firm.id, project_id:delivery.project.id, document_version_id:draft.document_version.id, evidence_bundle_id:evidence.id }, headers);
  await post("/deliverables/issue", { tenant_id:tenant.id, firm_id:firm.firm.id, project_id:delivery.project.id, document_version_id:draft.document_version.id, evidence_bundle_id:evidence.id, approval_id:review.approval.id, subject_version_or_hash:draft.document_version.hash }, headers);
  const issuedInvoice = await post("/invoices/issue", { tenant_id:tenant.id, firm_id:firm.firm.id, invoice_id:invoice.id }, headers);
  if (issuedInvoice.status !== "ISSUED") throw new Error("Invoice was not issued.");
  const paid = await post("/payments/record", { tenant_id:tenant.id, firm_id:firm.firm.id, invoice_id:invoice.id, amount:3200, currency:"MYR", provider_ref:"manual-receipt-001", payment_status:"PAID" }, headers);
  if (paid.invoice.status !== "PAID" || paid.payment_status.payment_status !== "PAID") throw new Error("Payment did not update invoice status.");
  const payments = await request("/payment-statuses", { headers });
  if (!payments.res.ok || payments.json.data.length !== 1) throw new Error("Payment status read endpoint failed.");
  console.log("Stage 6 commercial operations smoke test passed.");
} finally { api.kill(); await once(api,"exit").catch(()=>{}); await rm(tmp,{recursive:true,force:true}); }
