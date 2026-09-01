---
id: PD-H4-CONTROLLED-PRIVATE-DIRECTORY-PILOT-OPERATION-RUNBOOK-AND-LOG
title: "PD-H4 Controlled Private Directory Pilot Operation Runbook and Log"
version: "1.0"
status: "Completed"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
created: "2026-09-01"
---

# PD-H4 Controlled Private Directory Pilot Operation Runbook and Log v1.0

## 1. Purpose

PD-H4 translates the accepted PD-H3 private directory pilot readiness decision into a controlled operating routine.

The runbook gives a human pilot operator a repeatable way to operate the private directory, record evidence, handle issues, and close the pilot day without widening into public marketplace behavior.

## 2. Authorized operating scope

Authorized:

- controlled human pilot operation for the private directory only;
- qualified private directory listing review;
- Directory Review Board operation;
- private enquiry recording;
- manual enquiry-to-collaboration request handling;
- qualification renewal and expiry monitoring;
- private directory readiness review;
- audit evidence review;
- issue and incident logging;
- pilot closeout evidence capture.

Not authorized:

- public marketplace;
- live matching;
- ranking;
- capacity allocation;
- VF-24 observatory publication;
- pricing intelligence;
- autonomous award;
- autonomous regulated approval;
- external sending;
- live payment movement;
- uncontrolled tenant or client data sharing;
- production legal, regulatory, insurance, or liability determination.

## 3. Pilot roles and responsibility boundaries

| Role | Responsibility | Authority boundary |
|---|---|---|
| Product owner | Accepts/holds/rejects pilot closeout and scope changes. | Cannot treat undocumented behavior as accepted evidence. |
| Pilot operator | Runs the private directory daily routine and records the pilot log. | Cannot approve regulated work or widen marketplace scope. |
| Directory Review Board | Reviews listing governance, suspension, revocation, and renewal concerns. | Does not create professional authority or award work. |
| Requesting firm principal | Reviews private enquiry and collaboration request intent. | Must approve any real client/professional engagement outside this rehearsal. |
| Provider firm principal | Maintains profile, credential, capability, and listing evidence. | Qualification evidence does not authorize autonomous regulated approval. |
| Support/incident owner | Handles pilot issues and incident escalation. | Cannot silently suppress material incidents from pilot evidence. |

## 4. Daily controlled pilot routine

1. Confirm the pilot date, operator, tenant, requesting firm, and provider firm.
2. Open the Virtual Firm workspace and navigate to the private directory cockpit.
3. Review the private directory readiness summary.
4. Inspect qualified listings and confirm qualification evidence is present.
5. Check pending Review Board items.
6. Record or review private enquiries.
7. Progress only approved manual enquiry-to-collaboration requests.
8. Review qualification renewal and expiry risks.
9. Confirm suspension or revocation paths are available where needed.
10. Review audit evidence for material actions.
11. Record pilot issues, incidents, operator observations, and follow-up actions.
12. Close the pilot day with a human operator sign-off.

## 5. Pilot operation log template

Use one log row for each material pilot action.

| Field | Required? | Example |
|---|---:|---|
| log_id | Yes | PDH4-LOG-001 |
| date | Yes | 2026-09-01 |
| tenant_id | Yes | tenant-private-directory-pilot |
| operator_name | Yes | Pilot Operator |
| action_type | Yes | READINESS_REVIEW |
| object_ref | Yes | private-directory-intelligence-summary |
| action_summary | Yes | Reviewed pending actions and renewal risks. |
| evidence_refs | Yes | audit-event-id, screenshot-ref, smoke-output-ref |
| issue_ref | No | PDH4-ISSUE-001 |
| boundary_checked | Yes | no public marketplace/live matching/ranking/capacity allocation |
| operator_signoff | Yes | Human operator sign-off recorded. |

## 6. Issue and incident path

Classify pilot observations as:

| Class | Meaning | Required response |
|---|---|---|
| Observation | Usability note or non-blocking improvement. | Record in pilot log and backlog candidate list. |
| Issue | Workaround needed, evidence unclear, or operator confusion. | Assign owner, target date, and evidence required before closeout. |
| Incident | Tenant isolation, authority, data protection, audit, or boundary breach concern. | Escalate immediately to support/incident owner and product owner. Stop affected operation until resolved. |
| Scope breach | Any request for public marketplace, live matching, ranking, capacity allocation, VF-24 publication, pricing intelligence, autonomous award, or autonomous regulated approval. | Reject as out of PD-H4 scope and require new product-owner authorization before any implementation. |

## 7. Evidence capture routine

At minimum, each pilot day must capture:

- readiness summary status;
- listing review evidence;
- Review Board action or no-action reason;
- private enquiry action or no-action reason;
- collaboration request action or no-action reason;
- renewal and expiry risk review;
- audit event sample proving attributable actions;
- issue/incident register status;
- operator sign-off;
- boundary confirmation.

## 8. Pilot closeout checklist

The pilot day can close only when:

- all material actions have log rows;
- unresolved issues have owners and target dates;
- incidents are resolved or explicitly held open with product-owner visibility;
- no unauthorized public marketplace behavior occurred;
- no live matching, ranking, capacity allocation, VF-24 publication, pricing intelligence, autonomous award, or autonomous regulated approval occurred;
- audit evidence can reconstruct the material business and AI-worker actions;
- legally permissible evidence records are ready for export if requested;
- human operator sign-off is recorded.

## 9. Pilot log sample

| log_id | action_type | action_summary | evidence_refs | boundary_checked | operator_signoff |
|---|---|---|---|---|---|
| PDH4-LOG-001 | READINESS_REVIEW | Reviewed private directory readiness summary and pending actions. | pd-h2-smoke-output, me-s6-summary | no public marketplace/live matching/ranking/capacity allocation | Recorded |
| PDH4-LOG-002 | REVIEW_BOARD_CHECK | Confirmed pending Review Board listing and human review path. | pd-h2-review-board-record | no autonomous award or autonomous regulated approval | Recorded |
| PDH4-LOG-003 | ENQUIRY_REVIEW | Reviewed private enquiry and confirmed manual follow-up only. | pd-h2-private-enquiry-record | no live matching | Recorded |
| PDH4-LOG-004 | RENEWAL_RISK_REVIEW | Reviewed qualification renewal risk and suspension path. | pd-h2-renewal-risk-record | no professional authority created by software | Recorded |
| PDH4-LOG-005 | CLOSEOUT | Confirmed audit evidence, no incidents, and pilot day closeout. | audit-events-sample | private-directory-only boundary confirmed | Recorded |

## 10. Completion summary

PD-H4 is completed as a controlled private directory pilot operation runbook and pilot log template.

The next safe step is to run a real or simulated controlled pilot day using this log, then prepare a pilot closeout review.

Recommended next step:

`PD-H5 - Controlled Private Directory Pilot Closeout Review`