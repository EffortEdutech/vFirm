---
title: "OP Evidence Pack Completion"
version: "1.0"
status: "completed"
date: "2026-09-03"
scope: "Controlled multi-firm pilot operations evidence pack for OP-H1 through OP-H5"
---

# OP Evidence Pack Completion v1.0

## 1. Completion statement

The OP-H1 through OP-H5 controlled multi-firm pilot operations evidence pack is complete and ready for product-owner acceptance review in OP-H6.

This evidence pack applies only to controlled local/private pilot operation of verified active firm workspaces inside the Virtual Firm Platform.

Reference pilot firms:

- Amanah Formwork Pilot Firm;
- NHL Global Solution.

## 2. Technical recommendation

Technical recommendation: `GO_FOR_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_ACCEPTANCE_REVIEW`.

Reason:

- OP-H1 locked the controlled operating foundation.
- OP-H2 made the selected-firm Today view operational.
- OP-H3 completed the Formwork pilot-day rehearsal.
- OP-H4 completed the NHL Global Solution pilot-day rehearsal.
- OP-H5 assembled evidence, audit, export, closeout, privacy, and unresolved-finding classification.
- Current blocker count is `0`.

## 3. Sprint evidence summary

| Sprint | Evidence artifact | Smoke command | Result |
| --- | --- | --- | --- |
| OP-H1 | `OP_H1_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_FOUNDATION_COMPLETION_v1.0.md` | `npm run check:op:h1` | Pass |
| OP-H2 | `OP_H2_OPERATOR_DASHBOARD_AND_TODAY_VIEW_COMPLETION_v1.0.md` | `npm run check:op:h2` | Pass |
| OP-H3 | `OP_H3_FORMWORK_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md` | `npm run check:op:h3` | Pass |
| OP-H4 | `OP_H4_NHL_GLOBAL_SOLUTION_PILOT_DAY_REHEARSAL_COMPLETION_v1.0.md` | `npm run check:op:h4` | Pass |
| OP-H5 | `OP_H5_PILOT_EVIDENCE_AUDIT_EXPORT_CLOSEOUT_REVIEW_v1.0.md` | `npm run check:op:h5` | Pass |

## 4. Pilot firm readiness evidence

### Amanah Formwork Pilot Firm

Evidence status: `CONTROLLED_FORMWORK_PILOT_DAY_REHEARSAL_PASSED`.

Proven capabilities:

- active Formwork workspace selection;
- Formwork Technical Delivery subscription visible only for the Formwork workspace;
- client enquiry to project setup;
- drawing review and QA finding path;
- technical issue blocked until valid human professional approval exists;
- no AI silent regulated approval;
- controlled deliverable issue after human review;
- audit reconstruction; and
- firm-scoped export.

### NHL Global Solution

Evidence status: `CONTROLLED_NHL_ORGANIZATION_SUPPORT_PILOT_DAY_REHEARSAL_PASSED`.

Proven capabilities:

- active NHL workspace selection;
- organization-support subscription and service lines;
- project reporting workflow;
- technical writing workflow;
- clerical work workflow;
- BizKick EDCS workflow;
- client-facing AI output requires human review before issue;
- invoice and receivable monitoring without live payment movement;
- audit reconstruction; and
- firm-scoped export.

## 5. Tenant and firm isolation evidence

The evidence pack confirms:

- Formwork and NHL records remain separated by `tenant_id` and `firm_id`;
- Formwork principal cannot read or export NHL records;
- NHL cannot access Formwork technical delivery records;
- selected-firm UI and backend summary stay bound to the active firm workspace; and
- export packages contain top-level tenant and firm scope.

Result: `NO_CROSS_TENANT_LEAKAGE_OBSERVED_IN_CONTROLLED_REHEARSAL`.

## 6. Human approval and AI authority evidence

The evidence pack confirms:

- AI workers prepare drafts, records, summaries, and reviewable outputs only;
- proposal dispatch requires human approval;
- regulated Formwork issue requires valid human professional approval;
- NHL client-facing output requires human review before issue;
- AI approval grant attempts are denied;
- AI payment release attempts are denied; and
- every material action is reconstructable from audit/event records.

Result: `HUMAN_AUTHORITY_BOUNDARY_PRESERVED`.

## 7. Evidence, audit, and export evidence

The OP-H5 smoke replays OP-H3 and OP-H4 and verifies:

- Formwork evidence pack has event, audit, and export evidence;
- NHL evidence pack has event, audit, and export evidence;
- audit reconstruction exists per firm;
- firm-scoped export exists per firm;
- private chain-of-thought, raw prompts, and cross-tenant raw records are excluded from product-owner summaries.

Result: `EVIDENCE_AUDIT_EXPORT_READY_FOR_ACCEPTANCE_REVIEW`.

## 8. Known limitations and findings

| Finding | Classification | Blocking? | Recommended next treatment |
| --- | --- | --- | --- |
| Core deliverable-review gate still carries inherited reference-vertical evidence validator keys. | Accepted limitation | No | Later service-specific evidence-validator split. |
| NHL organization-support worker template still reuses `technical-drawing-assistant` for technical writing/document support. | Backlog improvement | No | Later Workforce Blueprint / worker-template refinement. |
| Real human pilot logs are not yet filled from external production use. | Evidence gap | No for controlled rehearsal acceptance; yes for claiming production pilot closeout. | Fill during controlled human pilot operation. |
| Production multi-tenant onboarding remains unauthorized. | Out-of-scope request if requested | No | Separate future scope decision. |

Current blocker count: `0`.

## 9. Locked boundaries

This evidence pack does not authorize:

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

## 10. OP-H6 readiness statement

The OP evidence pack is ready for the OP-H6 Controlled Multi-Firm Pilot Operations Acceptance Gate.

Recommended decision: product owner may accept controlled local/private pilot operations readiness with the listed limitations, or hold/reject if additional evidence is required.
