import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile, access } from "node:fs/promises";
import { spawn } from "node:child_process";

const docs = [
  "docs/10_post_freeze_technical_design/VFIRM_AWIA_VIRTUAL_STAFF_MODEL_AND_IMPLEMENTATION_PLAN_v1.0.md",
  "docs/10_post_freeze_technical_design/AWIA_VS_S1_CONTRACT_LOCK_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/AWIA_VS_S2_PACKAGE_REGISTRY_MAPPING_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/AWIA_VS_S3_STAFF_PROVISIONING_KERNEL_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/AWIA_VS_S4_AUTHORITY_AND_RUNTIME_GATE_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/AWIA_VS_S5_AFCC_STAFF_MANAGEMENT_EXPERIENCE_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/AWIA_VS_S6_EVIDENCE_AND_PILOT_GATE_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/AWIA_VIRTUAL_STAFF_CONTROLLED_PILOT_REHEARSAL_RUNBOOK_AND_RESULT_v1.0.md",
  "docs/10_post_freeze_technical_design/AWIA_NEXT_IMPLEMENTATION_BUNDLE_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/AWIA_CLIENT_STAFF_OPERATING_EXPERIENCE_AND_WORKDESK_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/AWIA_STAFF_OUTPUT_REVIEW_AND_CLIENT_DELIVERY_DRAFT_LOOP_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/AWIA_PILOT_DAY_CLIENT_WALKTHROUGH_AND_OPERATOR_SCRIPT_v1.0.md",
  "docs/10_post_freeze_technical_design/AWIA_CONTROLLED_LOCAL_PILOT_ACCEPTANCE_LOCK_v1.0.md"
];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function runNodeScript(script) {
  const child = spawn(process.execPath, [script], { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  const [code] = await once(child, "exit");
  assert.equal(code, 0, `${script} failed.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  return stdout;
}

for (const doc of docs) assert(await exists(doc), `Required AWIA acceptance evidence missing: ${doc}`);

const scriptDoc = await readFile("docs/10_post_freeze_technical_design/AWIA_PILOT_DAY_CLIENT_WALKTHROUGH_AND_OPERATOR_SCRIPT_v1.0.md", "utf8");
const lockDoc = await readFile("docs/10_post_freeze_technical_design/AWIA_CONTROLLED_LOCAL_PILOT_ACCEPTANCE_LOCK_v1.0.md", "utf8");
const readme = await readFile("docs/10_post_freeze_technical_design/README.md", "utf8");
const packageJson = JSON.parse((await readFile("package.json", "utf8")).replace(/^\uFEFF/, ""));

for (const marker of [
  "GO_FOR_AWIA_CONTROLLED_LOCAL_PILOT_ACCEPTANCE_LOCK",
  "Provision Pilot Staff",
  "Run readiness check",
  "Assign the task to the named staff workdesk",
  "Produce a draft-only staff output",
  "Perform human review",
  "Prepare client delivery draft",
  "final issue is still blocked"
]) assert(scriptDoc.includes(marker), `AWIA walkthrough script missing marker: ${marker}`);

for (const marker of [
  "accepted-for-controlled-local-pilot",
  "AWIA_CONTROLLED_LOCAL_PILOT_READY",
  "No further mandatory AWIA authorization is required",
  "autonomous regulated approval",
  "direct LLM to regulated final output",
  "live payment release",
  "production launch",
  "cross-tenant data mixing"
]) assert(lockDoc.includes(marker), `AWIA acceptance lock missing marker: ${marker}`);

assert(readme.includes("AWIA_PILOT_DAY_CLIENT_WALKTHROUGH_AND_OPERATOR_SCRIPT_v1.0.md"), "README missing AWIA walkthrough script.");
assert(readme.includes("AWIA_CONTROLLED_LOCAL_PILOT_ACCEPTANCE_LOCK_v1.0.md"), "README missing AWIA acceptance lock.");
assert.equal(packageJson.scripts["check:awia:acceptance-lock"], "node scripts/smoke-awia-controlled-local-pilot-acceptance-lock.mjs");

const outputLoop = await runNodeScript("scripts/smoke-awia-next-implementation-bundle.mjs");
assert(outputLoop.includes("AWIA next implementation bundle smoke passed."), "AWIA output-loop replay did not pass.");

const s6 = await runNodeScript("scripts/smoke-awia-vs-s6-evidence-pilot-gate.mjs");
assert(s6.includes("GO_FOR_CONTROLLED_HUMAN_GOVERNED_PILOT_REHEARSAL"), "AWIA S6 gate no longer recommends controlled pilot rehearsal.");

console.log(JSON.stringify({
  smoke: "awia-controlled-local-pilot-acceptance-lock",
  result: "passed",
  acceptance_status: "AWIA_CONTROLLED_LOCAL_PILOT_READY",
  docs_checked: docs.length,
  mandatory_authorizations_remaining: 0,
  optional_future_bundles: [
    "payroll_and_seat_billing_polish",
    "department_dashboards",
    "staff_memory_and_conversation_workspace",
    "multi_firm_staff_template_scaling",
    "staging_preparation"
  ],
  locked_boundaries: [
    "no_autonomous_regulated_approval",
    "no_direct_llm_regulated_final_output",
    "no_final_client_issue_by_virtual_staff",
    "no_live_payment_release",
    "no_public_marketplace",
    "no_production_launch",
    "no_uncontrolled_external_data_sharing"
  ]
}, null, 2));
