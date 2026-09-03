---
title: "OP-H5 Pilot Evidence, Audit, Export, and Closeout Review"
version: "1.0"
status: "completed"
date: "2026-09-03"
scope: "Controlled local/private multi-firm pilot evidence, audit, export, and closeout review"
---

# OP-H5 Pilot Evidence, Audit, Export, and Closeout Review v1.0

## 1. Completion statement

OP-H5 is complete. The Virtual Firm Platform now has a firm-scoped evidence, audit, export, and closeout review structure for the controlled local/private pilot operation of:

- Amanah Formwork Pilot Firm; and
- NHL Global Solution.

OP-H5 does not claim that a real external production pilot has been completed. It also does not claim that actual production pilot closeout has occurred. It assembles the controlled rehearsal evidence from OP-H3 and OP-H4 and prepares a repeatable closeout structure for human pilot operation and OP-H6 product-owner acceptance.

## 2. Firm-scoped evidence pack template

Each pilot firm must maintain a separate evidence pack. Evidence must never be merged across tenants or firms except as an explicitly redacted product-owner summary.

| Evidence field | Required content | Formwork pilot evidence | NHL pilot evidence |
| --- | --- | --- | --- |
| Evidence pack ID | Stable pack identifier | `OP-H5-FORMWORK-EVIDENCE-PACK` | `OP-H5-NHL-EVIDENCE-PACK` |
| Tenant and firm scope | `tenant_id`, `firm_id`, firm name, principal | Formwork Pilot Tenant / Amanah Formwork Pilot Firm | NHL Global Solution Tenant / NHL Global Solution |
| Pilot-day reference | OP sprint and rehearsal reference | `OP-H3_FORMWORK_PILOT_DAY` | `OP-H4_NHL_PILOT_DAY` |
| Business workflow evidence | Enquiry, proposal, project, task, document, invoice, receivable records as applicable | Enquiry, proposal, project, drawing, QA, package, deliverable | Enquiry, proposal, project, correspondence, document register, task, deliverable, invoice |
| AI-worker evidence | Worker, task assignment, tool invocation, output, review flag | Technical support and QA boundaries | Project reporting, technical writing, clerical, EDCS support boundaries |
| Human approval evidence | Approval ID, approver actor, authority, evidence bundle, decided timestamp | Human professional review before issue | Nur Hernieliana review before client-facing issue |
| Exception evidence | Blocked/denied action, reason, status, owner | AI QA resolve denied, issue-before-approval denied, cross-firm technical access denied | Draft dispatch denied, AI review denied, payment release denied, cross-tenant read/export denied |
| Audit evidence | Event log and audit event counts, reconstruction statement | OP-H3 audit reconstruction | OP-H4 audit reconstruction |
| Export evidence | Export package scope and counts | Formwork tenant/firm export sample | NHL tenant/firm export sample |
| Privacy/redaction evidence | What is withheld from product-owner summaries | Private chain-of-thought, raw prompts, unnecessary client confidential content | Private chain-of-thought, raw prompts, unnecessary client confidential content |
| Closeout recommendation | Accept, hold, reject, or defer | Ready for OP-H6 evidence gate | Ready for OP-H6 evidence gate |

## 3. Pilot-day closeout review template

A pilot-day closeout review must contain:

1. firm name and firm type;
2. tenant boundary and firm boundary;
3. Virtual Principal or accountable human operator;
4. pilot-day objective;
5. completed workflow path;
6. incomplete workflow path, if any;
7. AI-worker actions and outputs;
8. human approvals and review decisions;
9. denied actions and policy decisions;
10. exceptions, incidents, and support cases;
11. evidence bundle references;
12. audit reconstruction result;
13. export package result;
14. privacy/redaction confirmation;
15. unresolved finding classification;
16. closeout recommendation; and
17. human sign-off or hold reason.

### Closeout decision options

| Option | Use when | Result |
| --- | --- | --- |
| Option A - Accept closeout | Evidence is complete, tenant boundaries hold, human approval controls are proven, and no blocker remains open. | Proceed to OP-H6 acceptance gate. |
| Option B - Hold closeout | Evidence is mostly complete but one or more blocker, incident, unclear export item, or missing sign-off remains. | Resolve named items before OP-H6. |
| Option C - Reject closeout | Evidence is unreliable, tenant boundary fails, approval controls fail, or a prohibited capability was introduced. | Stop OP acceptance and create blocker sprint. |
| Option D - Defer scope | Evidence is complete for current scope but new desired capability belongs outside OP. | Create later governed scope decision. |

## 4. Audit reconstruction checklist

The audit reconstruction checklist must be applied separately per firm.

- [x] Event log is scoped by `tenant_id` and `firm_id`.
- [x] Audit records are scoped by `tenant_id` and `firm_id`.
- [x] Business actions can be reconstructed from event/audit records.
- [x] AI-worker actions are attributable to worker instance and actor identity.
- [x] Human approvals include approver actor and authority reference where applicable.
- [x] Denied actions are visible as policy decisions or failed controlled requests.
- [x] Cross-tenant access attempts are denied.
- [x] Private chain-of-thought is not exposed as audit evidence.
- [x] Evidence summaries are sufficient for product-owner review.

OP-H5 audit reconstruction result: `PASS_FOR_CONTROLLED_REHEARSAL_EVIDENCE`.

## 5. Legally permissible export checklist

The export checklist must be applied separately per firm and only for legally permissible business records.

- [x] Export request is scoped by tenant and firm.
- [x] Export package contains top-level `tenant_id` and `firm_id`.
- [x] Export excludes records outside the selected firm boundary.
- [x] Client, project, document, evidence, invoice, receivable, event, and audit records are included where created.
- [x] Cross-tenant export attempt is denied.
- [x] Export result is treated as business-record portability, not as permission to disclose confidential third-party data.
- [x] Product-owner summary may use counts and record categories instead of raw sensitive content.

OP-H5 export result: `PASS_FOR_FIRM_SCOPED_EXPORT_REHEARSAL`.

## 6. Unresolved finding classification

OP-H5 uses the following unresolved finding classification model.

| Classification | Meaning | Required action before OP-H6 |
| --- | --- | --- |
| Blocker | Prevents safe controlled pilot operation, audit reconstruction, tenant isolation, human approval control, or export scoping. | Hold OP-H6 until resolved. |
| Incident | A fault or security/privacy event occurred during pilot operation. | Resolve or explicitly accept with mitigation before OP-H6. |
| Evidence gap | Required proof is missing or unclear. | Fill evidence or mark accepted limitation. |
| Accepted limitation | Known limitation does not invalidate current controlled pilot scope. | Record owner and target release/sprint. |
| Backlog improvement | Useful improvement but not required for current OP acceptance. | Add to governed backlog. |
| Out-of-scope request | Capability belongs outside OP authorization. | Require separate scope decision. |

## 7. Current OP-H5 findings

| Finding | Classification | Owner | OP-H6 impact |
| --- | --- | --- | --- |
| Core deliverable-review gate still carries inherited reference-vertical evidence validator keys. | Accepted limitation | Platform architecture / future service-pack runtime | Does not block OP-H6 if recorded; candidate for later service-specific evidence validator split. |
| NHL organization-support worker template still reuses `technical-drawing-assistant` for technical writing/document support. | Backlog improvement | Workforce Blueprint / worker template refinement | Does not block OP-H6 because authority envelope remains bounded and no Formwork Technical Delivery module is subscribed. |
| Real human pilot logs are not yet filled from external production use. | Evidence gap | Pilot operator | Does not block controlled rehearsal acceptance; blocks any claim of completed production pilot operation. |
| No production multi-tenant onboarding is authorized. | Out-of-scope request if requested | Product owner | Must remain out of OP-H6 unless separately authorized. |

Current blocker count: `0`.

## 8. Privacy and redaction notes for pilot evidence

OP-H5 evidence summaries may include:

- firm names;
- tenant/firm identifiers for internal review;
- record categories and counts;
- workflow states;
- approval state and approver identity;
- denied-action summaries;
- export scope summaries; and
- evidence references.

OP-H5 evidence summaries must not include:

- private chain-of-thought;
- raw hidden prompts or completions;
- unnecessary client confidential content;
- bank/payment credentials;
- passwords, access tokens, or secrets;
- sensitive personal data not required for the review; or
- cross-tenant raw records.

## 9. Separate firm evidence records

### Amanah Formwork Pilot Firm

OP-H3 provides the Formwork pilot evidence source. The OP-H5 smoke replays OP-H3 and verifies:

- Formwork pilot day completes;
- regulated technical issue remains blocked until valid human professional review exists;
- AI cannot silently resolve regulated QA or approve deliverable issue;
- NHL cannot access Formwork technical delivery records;
- audit reconstruction exists; and
- export is Formwork tenant/firm scoped.

### NHL Global Solution

OP-H4 provides the NHL pilot evidence source. The OP-H5 smoke replays OP-H4 and verifies:

- NHL organization-support pilot day completes;
- project reporting, technical writing, clerical work, and BizKick EDCS are represented;
- Formwork Technical Delivery is not subscribed;
- client-facing AI output requires human review before issue;
- invoice and receivable monitoring remain non-autonomous;
- Formwork principal cannot read or export NHL records;
- audit reconstruction exists; and
- export is NHL tenant/firm scoped.

## 10. OP-H5 closeout recommendation

OP-H5 recommendation: `GO_FOR_OP_H6_ACCEPTANCE_GATE_PREPARATION`.

Reason:

- OP-H3 and OP-H4 both pass executable rehearsal gates;
- each firm has separate evidence, audit, and export proof;
- no cross-tenant leakage is observed in the rehearsal evidence;
- human approval boundaries remain explicit;
- no live payment movement is introduced; and
- remaining findings are classified as accepted limitations, evidence gaps for real pilot logs, backlog improvements, or out-of-scope requests rather than blockers.

## 11. Locked boundaries

OP-H5 does not authorize:

- OP-H6 acceptance by itself;
- production multi-tenant onboarding;
- public marketplace;
- live matching;
- ranking;
- capacity allocation;
- VF-24 observatory publication;
- pricing intelligence;
- autonomous award;
- autonomous regulated approval;
- live payment movement; or
- uncontrolled tenant/client data sharing.

## 12. Evidence artifacts

- OP-H3 evidence: `OP_H3_FORMWORK_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md`.
- OP-H4 evidence: `OP_H4_NHL_GLOBAL_SOLUTION_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md`.
- OP-H5 closeout/evidence document: `OP_H5_PILOT_EVIDENCE_AUDIT_EXPORT_CLOSEOUT_REVIEW_v1.0.md`.
- Executable smoke: `scripts/smoke-op-h5-pilot-evidence-audit-export-closeout.mjs`.
- Package command: `npm run check:op:h5`.

## 13. Next active sprint

`OP-H6 - Controlled Multi-Firm Pilot Operations Acceptance Gate`
