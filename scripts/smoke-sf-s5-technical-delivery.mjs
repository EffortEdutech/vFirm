import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const postgres=process.argv.includes("--postgres"),root=process.cwd(),tmp=await mkdtemp(join(tmpdir(),"vfirm-sf-s5-")),port=3115,base=`http://127.0.0.1:${port}`;
const env={...process.env,VFIRM_API_PORT:String(port)};
if(!postgres){env.VFIRM_STORE_BACKEND="json";env.VFIRM_STORE_PATH=join(tmp,"store.json");env.DATABASE_URL="";}else{env.VFIRM_STORE_BACKEND="postgres";delete env.VFIRM_STORE_PATH;}
const child=spawn(process.execPath,["apps/api/src/server.mjs"],{cwd:root,env,stdio:["ignore","pipe","pipe"]});let logs="";child.stdout.on("data",x=>logs+=x);child.stderr.on("data",x=>logs+=x);
async function wait(){for(let i=0;i<100;i++){try{if((await fetch(base+"/health")).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw new Error(logs);}
async function req(path,{method="GET",body,headers={}}={}){const r=await fetch(base+path,{method,headers:{"content-type":"application/json",...headers},body:body?JSON.stringify(body):undefined});return{r,j:await r.json()};}
async function post(path,body,headers={}){const{r,j}=await req(path,{method:"POST",body,headers});if(!r.ok||!j.ok)throw new Error(`${path}: ${r.status} ${JSON.stringify(j)}`);return j.data;}

try{
  await wait();const stamp=Date.now(),tenant=await post("/tenants",{name:`SF-S5 Tenant ${stamp}`}),firm=await post("/firms",{tenant_id:tenant.id,name:`SF-S5 Firm ${stamp}`,principal_name:"Ir. Principal"});
  const h={"x-vfirm-actor-id":firm.principal_actor.id,"x-vfirm-tenant-id":tenant.id,"x-vfirm-firm-id":firm.firm.id,"x-vfirm-role":"principal"};
  for(const code of ["technical-drawing-assistant","formwork-qa-agent"]){const binding=await post("/technical/skill-bindings",{tenant_id:tenant.id,firm_id:firm.firm.id,worker_template_code:code,role_skill_ref:`skills://roles/${code}/v1`,worker_skill_ref:`skills://workers/${code}/v1`},h);assert(binding.forbidden_actions.includes("professional.certify"));}
  const client=await post("/clients",{tenant_id:tenant.id,firm_id:firm.firm.id,name:"Formwork Contractor"},h);
  const input={project_name:"Podium Formwork",site_location:"Kuala Lumpur",client_organization:"Formwork Contractor",client_contact_name:"Site Manager",client_contact_email:"site@example.com",structure_type:"podium",formwork_element_type:"slab",height:3.2,length_or_area:450,concrete_grade:"C35",available_drawings:["S-201"],deadline:new Date(Date.now()+1209600000).toISOString(),required_deliverables:["drawing_support_pack"]};
  const intake=await post("/intake-sessions",{tenant_id:tenant.id,firm_id:firm.firm.id,relationship_id:client.relationship.id,provided_inputs:input},h);
  const proposal=await post("/proposals",{tenant_id:tenant.id,firm_id:firm.firm.id,relationship_id:client.relationship.id,intake_session_id:intake.intake.id,scope_summary:"Technical drawing and delivery support",final_price:5200},h);
  const approved=await post("/proposals/approve",{tenant_id:tenant.id,firm_id:firm.firm.id,proposal_id:proposal.proposal.id},h);
  const delivery=await post("/proposals/accept",{tenant_id:tenant.id,firm_id:firm.firm.id,proposal_id:approved.proposal.id,project_name:"Podium Formwork"},h);
  const registered=await post("/administration/documents",{tenant_id:tenant.id,firm_id:firm.firm.id,relationship_id:client.relationship.id,project_id:delivery.project.id,document_number:`S5-${stamp}`,title:"Podium formwork drawing",document_type:"TECHNICAL_DRAWING",discipline:"TEMPORARY_WORKS",classification:"CONFIDENTIAL",revision:"P01",storage_ref:"doc://drawing-p01",content_hash:"hash-p01"},h);
  const next=await post("/administration/document-revisions",{tenant_id:tenant.id,firm_id:firm.firm.id,document_register_entry_id:registered.document.id,revision:"P02",storage_ref:"doc://drawing-p02",content_hash:"hash-p02"},h);
  const review=await post("/technical/drawing-reviews",{tenant_id:tenant.id,firm_id:firm.firm.id,project_id:delivery.project.id,document_register_entry_id:registered.document.id,base_revision_id:registered.revision.id,compared_revision_id:next.revision.id},h);assert.equal(review.status,"CHECKED_REVIEW_REQUIRED");assert.equal(review.requires_professional_review,true);
  const invalid=await post("/technical/calculation-input-sets",{tenant_id:tenant.id,firm_id:firm.firm.id,project_id:delivery.project.id,intake_session_id:intake.intake.id,source_revision_refs:[next.revision.id],input_values:{...input,height:-1}},h);assert.equal(invalid.validation_status,"INVALID");
  const valid=await post("/technical/calculation-input-sets",{tenant_id:tenant.id,firm_id:firm.firm.id,project_id:delivery.project.id,intake_session_id:intake.intake.id,source_revision_refs:[next.revision.id],input_values:input,unit_system:"SI"},h);assert.equal(valid.validation_status,"VALID");assert.match(valid.deterministic_engine_ref,/validator/);
  const finding=await post("/technical/qa-findings",{tenant_id:tenant.id,firm_id:firm.firm.id,project_id:delivery.project.id,subject_type:"DrawingRevision",subject_id:next.revision.id,finding_code:"EDGE_CLEARANCE_REVIEW",severity:"HIGH",description:"Edge clearance requires principal review."},h);
  const blocked=await post("/technical/delivery-packages",{tenant_id:tenant.id,firm_id:firm.firm.id,project_id:delivery.project.id,drawing_revision_refs:[next.revision.id],calculation_input_set_id:valid.id,evidence_refs:[review.id]},h);assert.equal(blocked.package_status,"BLOCKED");assert.equal(blocked.professional_approval_id,null);assert.equal(blocked.issued_document_version_id,null);
  const systemActor={actor_id:"00000000-0000-0000-0000-000000000000",actor_type:"SYSTEM",tenant_id:tenant.id,firm_id:firm.firm.id,role:"system"};
  const denied=await req("/technical/qa-findings/resolve",{method:"POST",headers:h,body:{tenant_id:tenant.id,firm_id:firm.firm.id,finding_id:finding.id,resolution_summary:"Unsafe silent resolution",actor:systemActor}});assert(denied.r.status>=400);
  const resolved=await post("/technical/qa-findings/resolve",{tenant_id:tenant.id,firm_id:firm.firm.id,finding_id:finding.id,resolution_summary:"Principal checked revised edge condition."},h);assert.equal(resolved.status,"RESOLVED");
  const ready=await post("/technical/delivery-packages",{tenant_id:tenant.id,firm_id:firm.firm.id,project_id:delivery.project.id,drawing_revision_refs:[next.revision.id],calculation_input_set_id:valid.id,evidence_refs:[review.id,resolved.id]},h);assert.equal(ready.package_status,"READY_FOR_PRINCIPAL_REVIEW");assert.equal(ready.requires_professional_review,true);assert.equal(ready.professional_approval_id,null);assert.equal(ready.issued_document_version_id,null);
  const otherTenant=await post("/tenants",{name:`Other Tenant ${stamp}`}),otherFirm=await post("/firms",{tenant_id:otherTenant.id,name:`Other Firm ${stamp}`,principal_name:"Other Principal"}),oh={"x-vfirm-actor-id":otherFirm.principal_actor.id,"x-vfirm-tenant-id":otherTenant.id,"x-vfirm-firm-id":otherFirm.firm.id,"x-vfirm-role":"principal"};
  const isolated=await req("/technical/delivery-packages",{method:"POST",headers:oh,body:{tenant_id:otherTenant.id,firm_id:otherFirm.firm.id,project_id:delivery.project.id,drawing_revision_refs:[next.revision.id],calculation_input_set_id:valid.id,evidence_refs:[review.id]}});assert(isolated.r.status>=400);
  const events=(await req(`/event-log?tenant_id=${tenant.id}&firm_id=${firm.firm.id}`,{headers:h})).j.data;assert(events.some(x=>x.event_type==="technical.delivery_package_blocked"));assert(events.some(x=>x.event_type==="technical.delivery_package_ready_for_principal_review"));
  console.log(`SF-S5 Technical Drawing and Delivery Support smoke passed (${postgres?"postgres":"json"}).`);
}finally{if(child.exitCode===null){child.kill();await once(child,"exit").catch(()=>{});}await rm(tmp,{recursive:true,force:true});}
