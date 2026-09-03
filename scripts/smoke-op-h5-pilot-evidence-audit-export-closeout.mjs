import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile, access } from "node:fs/promises";
import { spawn } from "node:child_process";

const requiredDocs = [
  "docs/10_post_freeze_technical_design/OP_H3_FORMWORK_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/OP_H4_NHL_GLOBAL_SOLUTION_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md",
  "docs/10_post_freeze_technical_design/OP_H5_PILOT_EVIDENCE_AUDIT_EXPORT_CLOSEOUT_REVIEW_v1.0.md"
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

for (const doc of requiredDocs) {
  assert(await exists(doc), `Required OP-H5 evidence source missing: ${doc}`);
}

const closeout = await readFile("docs/10_post_freeze_technical_design/OP_H5_PILOT_EVIDENCE_AUDIT_EXPORT_CLOSEOUT_REVIEW_v1.0.md", "utf8");
const checklist = await readFile("docs/10_post_freeze_technical_design/OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_CHECKLIST_v1.0.md", "utf8");
const readme = await readFile("docs/10_post_freeze_technical_design/README.md", "utf8");
const decisions = await readFile("docs/00_project_control/DECISION_REGISTER.md", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));

const requiredSections = [
  "Firm-scoped evidence pack template",
  "Pilot-day closeout review template",
  "Audit reconstruction checklist",
  "Legally permissible export checklist",
  "Unresolved finding classification",
  "Privacy and redaction notes for pilot evidence",
  "Separate firm evidence records",
  "GO_FOR_OP_H6_ACCEPTANCE_GATE_PREPARATION"
];
for (const section of requiredSections) {
  assert(closeout.includes(section), `OP-H5 closeout missing section/marker: ${section}`);
}

for (const phrase of [
  "Amanah Formwork Pilot Firm",
  "NHL Global Solution",
  "OP-H5-FORMWORK-EVIDENCE-PACK",
  "OP-H5-NHL-EVIDENCE-PACK",
  "PASS_FOR_CONTROLLED_REHEARSAL_EVIDENCE",
  "PASS_FOR_FIRM_SCOPED_EXPORT_REHEARSAL",
  "Current blocker count: `0`",
  "actual production pilot closeout",
  "private chain-of-thought",
  "cross-tenant raw records"
]) {
  assert(closeout.includes(phrase), `OP-H5 closeout missing required phrase: ${phrase}`);
}

for (const classification of ["Blocker", "Incident", "Evidence gap", "Accepted limitation", "Backlog improvement", "Out-of-scope request"]) {
  assert(closeout.includes(classification), `OP-H5 closeout missing classification: ${classification}`);
}

for (const option of ["Option A - Accept closeout", "Option B - Hold closeout", "Option C - Reject closeout", "Option D - Defer scope"]) {
  assert(closeout.includes(option), `OP-H5 closeout missing decision option: ${option}`);
}

for (const item of [
  "- [x] Create firm-scoped evidence pack template.",
  "- [x] Create pilot-day closeout review template.",
  "- [x] Create audit reconstruction checklist.",
  "- [x] Create legally permissible export checklist.",
  "- [x] Classify unresolved findings.",
  "- [x] Add privacy/redaction notes for pilot evidence.",
  "- [x] Verify separate evidence records for Formwork and NHL.",
  "- [x] Verify export records are tenant/firm scoped.",
  "- [x] Add evidence/export smoke test.",
  "- [x] Update decision register."
]) {
  assert(checklist.includes(item), `OP-H5 checklist item not checked: ${item}`);
}

assert(readme.includes("OP_H5_PILOT_EVIDENCE_AUDIT_EXPORT_CLOSEOUT_REVIEW_v1.0.md"), "README missing OP-H5 closeout doc.");
assert(decisions.includes("ADR-059 - OP-H5 pilot evidence audit export and closeout review completed"), "ADR-059 missing from decision register.");
assert(packageJson.scripts["check:op:h5"] === "node scripts/smoke-op-h5-pilot-evidence-audit-export-closeout.mjs", "check:op:h5 package script missing.");
assert(packageJson.scripts.check.includes("smoke-op-h5-pilot-evidence-audit-export-closeout.mjs"), "Full check chain must include OP-H5 smoke.");

const formwork = await runNodeScript("scripts/smoke-op-h3-formwork-pilot-day-rehearsal.mjs");
const nhl = await runNodeScript("scripts/smoke-op-h4-nhl-global-solution-pilot-day-rehearsal.mjs");

assert.equal(formwork.result, "passed", "OP-H3 replay must pass for OP-H5.");
assert.equal(nhl.result, "passed", "OP-H4 replay must pass for OP-H5.");
assert.equal(formwork.firm, "Amanah Formwork Pilot Firm", "Formwork evidence must remain separate.");
assert.equal(nhl.firm, "NHL Global Solution", "NHL evidence must remain separate.");
assert.notEqual(formwork.tenant, nhl.tenant, "Formwork and NHL evidence must not collapse into one tenant.");
assert(formwork.evidence.events >= 1 && formwork.evidence.audit_events >= 1, "Formwork audit/event evidence missing.");
assert(nhl.evidence.events >= 1 && nhl.evidence.audit_events >= 1, "NHL audit/event evidence missing.");
assert(formwork.evidence.export_counts.event_log >= 1 && formwork.evidence.export_counts.audit_events >= 1, "Formwork export counts missing audit/event records.");
assert(nhl.evidence.export_counts.event_log >= 1 && nhl.evidence.export_counts.audit_events >= 1, "NHL export counts missing audit/event records.");
assert(formwork.denials.includes("nhl_cross_firm_technical_access_denied"), "Formwork replay must prove NHL technical access denial.");
assert(nhl.denials.includes("cross_tenant_export_denied"), "NHL replay must prove cross-tenant export denial.");
assert(nhl.known_limitations.some((item) => item.includes("service-specific evidence validators")), "NHL limitation must remain visible in OP-H5.");

console.log(JSON.stringify({
  smoke: "op-h5-pilot-evidence-audit-export-closeout",
  result: "passed",
  recommendation: "GO_FOR_OP_H6_ACCEPTANCE_GATE_PREPARATION",
  evidence_packs: {
    formwork: {
      firm: formwork.firm,
      tenant: formwork.tenant,
      events: formwork.evidence.events,
      audit_events: formwork.evidence.audit_events,
      export_event_log: formwork.evidence.export_counts.event_log,
      export_audit_events: formwork.evidence.export_counts.audit_events
    },
    nhl: {
      firm: nhl.firm,
      tenant: nhl.tenant,
      events: nhl.evidence.events,
      audit_events: nhl.evidence.audit_events,
      export_event_log: nhl.evidence.export_counts.event_log,
      export_audit_events: nhl.evidence.export_counts.audit_events
    }
  },
  unresolved_findings: {
    blockers: 0,
    accepted_limitations: 1,
    backlog_improvements: 1,
    evidence_gaps: 1,
    out_of_scope_requests: 1
  },
  privacy_redaction: ["private_chain_of_thought_excluded", "raw_prompts_excluded", "cross_tenant_raw_records_excluded"],
  next_active_sprint: "OP-H6 - Controlled Multi-Firm Pilot Operations Acceptance Gate"
}, null, 2));
