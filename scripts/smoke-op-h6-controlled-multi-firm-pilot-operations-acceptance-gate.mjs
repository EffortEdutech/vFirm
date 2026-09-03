import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile, access } from "node:fs/promises";
import { spawn } from "node:child_process";

const docs = [
  "docs/10_post_freeze_technical_design/OP_H1_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_FOUNDATION_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/OP_H2_OPERATOR_DASHBOARD_AND_TODAY_VIEW_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/OP_H3_FORMWORK_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/OP_H4_NHL_GLOBAL_SOLUTION_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/OP_H5_PILOT_EVIDENCE_AUDIT_EXPORT_CLOSEOUT_REVIEW_v1.0.md",
  "docs/10_post_freeze_technical_design/OP_EVIDENCE_PACK_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/OP_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE_GATE_v1.0.md"
];

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function runNodeScript(script) {
  const child = spawn(process.execPath, [script], { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  const [code] = await once(child, "exit");
  assert.equal(code, 0, `${script} failed.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  const jsonStart = stdout.indexOf("{");
  assert(jsonStart >= 0, `${script} did not print JSON evidence.`);
  return JSON.parse(stdout.slice(jsonStart));
}

for (const doc of docs) assert(await exists(doc), `Required OP acceptance evidence missing: ${doc}`);

const evidencePack = await readFile("docs/10_post_freeze_technical_design/OP_EVIDENCE_PACK_COMPLETION_v1.0.md", "utf8");
const gate = await readFile("docs/10_post_freeze_technical_design/OP_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE_GATE_v1.0.md", "utf8");
const checklist = await readFile("docs/10_post_freeze_technical_design/OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_CHECKLIST_v1.0.md", "utf8");
const readme = await readFile("docs/10_post_freeze_technical_design/README.md", "utf8");
const decisions = await readFile("docs/00_project_control/DECISION_REGISTER.md", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

for (const marker of [
  "GO_FOR_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE_REVIEW",
  "Amanah Formwork Pilot Firm",
  "NHL Global Solution",
  "NO_CROSS_TENANT_LEAKAGE_OBSERVED_IN_CONTROLLED_REHEARSAL",
  "HUMAN_AUTHORITY_BOUNDARY_PRESERVED",
  "EVIDENCE_AUDIT_EXPORT_READY_FOR_ACCEPTANCE_REVIEW",
  "Current blocker count: `0`"
]) assert(evidencePack.includes(marker), `OP evidence pack missing marker: ${marker}`);

for (const marker of [
  "Pending Product-Owner Decision",
  "GO_FOR_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE",
  "Option A - Accept OP readiness",
  "Option B - Hold OP readiness",
  "Option C - Reject OP readiness",
  "Option D - Defer next scope decision",
  "Bismillah... I accept OP-H1 through OP-H6 controlled multi-firm pilot operations readiness",
  "service-specific evidence validator split"
]) assert(gate.includes(marker), `OP-H6 acceptance gate missing marker: ${marker}`);

for (const boundary of [
  "production multi-tenant onboarding",
  "public marketplace",
  "live matching",
  "ranking",
  "capacity allocation",
  "VF-24 observatory publication",
  "pricing intelligence",
  "autonomous award",
  "autonomous regulated approval",
  "live payment movement",
  "uncontrolled tenant/client data sharing"
]) assert(gate.toLowerCase().includes(boundary.toLowerCase()), `OP-H6 acceptance gate missing boundary: ${boundary}`);

for (const item of [
  "- [x] Create OP evidence pack completion document.",
  "- [x] Create OP acceptance decision gate.",
  "- [x] Verify OP-H1 through OP-H5 evidence is complete.",
  "- [x] Verify both pilot firms complete controlled pilot-day rehearsal.",
  "- [x] Verify no cross-tenant leakage in OP evidence.",
  "- [x] Verify locked boundaries remain visible.",
  "- [x] Add OP-H6 acceptance-gate smoke test.",
  "- [x] Run `npm run check`.",
  "- [x] Commit and push to GitHub."
]) assert(checklist.includes(item), `OP-H6 checklist item not checked: ${item}`);

assert(readme.includes("OP_EVIDENCE_PACK_COMPLETION_v1.0.md"), "README missing OP evidence pack document.");
assert(readme.includes("OP_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE_GATE_v1.0.md"), "README missing OP-H6 acceptance gate document.");
assert(decisions.includes("ADR-060 - OP-H6 controlled multi-firm pilot operations acceptance gate prepared"), "ADR-060 missing from decision register.");
assert(packageJson.scripts["check:op:h6"] === "node scripts/smoke-op-h6-controlled-multi-firm-pilot-operations-acceptance-gate.mjs", "check:op:h6 package script missing.");
assert(packageJson.scripts.check.includes("smoke-op-h6-controlled-multi-firm-pilot-operations-acceptance-gate.mjs"), "Full check chain must include OP-H6 smoke.");

const opH5 = await runNodeScript("scripts/smoke-op-h5-pilot-evidence-audit-export-closeout.mjs");
assert.equal(opH5.result, "passed", "OP-H5 replay must pass before OP-H6 acceptance gate.");
assert.equal(opH5.recommendation, "GO_FOR_OP_H6_ACCEPTANCE_GATE_PREPARATION");
assert.equal(opH5.unresolved_findings.blockers, 0, "OP-H6 must not proceed with blockers.");
assert.equal(opH5.evidence_packs.formwork.firm, "Amanah Formwork Pilot Firm");
assert.equal(opH5.evidence_packs.nhl.firm, "NHL Global Solution");
assert.notEqual(opH5.evidence_packs.formwork.tenant, opH5.evidence_packs.nhl.tenant, "Firm evidence packs must stay tenant-separated.");

console.log(JSON.stringify({
  smoke: "op-h6-controlled-multi-firm-pilot-operations-acceptance-gate",
  result: "passed",
  gate_status: "pending_product_owner_decision",
  technical_recommendation: "GO_FOR_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE",
  docs_checked: docs.length,
  evidence_packs: ["Amanah Formwork Pilot Firm", "NHL Global Solution"],
  blocker_count: opH5.unresolved_findings.blockers,
  decision_options: ["accept", "hold", "reject", "defer"],
  locked_boundaries: [
    "production multi-tenant onboarding",
    "public marketplace",
    "live matching",
    "ranking",
    "capacity allocation",
    "VF-24 observatory publication",
    "pricing intelligence",
    "autonomous award",
    "autonomous regulated approval",
    "live payment movement",
    "uncontrolled tenant/client data sharing"
  ],
  next_required_user_action: "Product owner acceptance, hold, reject, or defer decision"
}, null, 2));
