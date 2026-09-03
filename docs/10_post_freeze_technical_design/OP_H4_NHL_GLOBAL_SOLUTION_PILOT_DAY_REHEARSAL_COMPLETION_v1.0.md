---
title: "OP-H4 NHL Global Solution Pilot Day Rehearsal Completion"
version: "1.0"
status: "completed"
date: "2026-09-03"
scope: "Controlled local/private NHL Global Solution organization-support pilot-day rehearsal"
---

# OP-H4 NHL Global Solution Pilot Day Rehearsal Completion v1.0

## 1. Completion statement

OP-H4 is complete. The Virtual Firm Platform now has an executable NHL pilot-day fixture that rehearses NHL Global Solution as an Organization Support workspace owned by Nur Hernieliana.

The rehearsal confirms that NHL Global Solution can run a controlled day-in-the-life virtual service workflow for project reporting, technical writing, clerical work, and BizKick EDCS documentation/control support without inheriting the Formwork Technical Delivery subscription.

## 2. Scope rehearsed

The OP-H4 rehearsal covers:

1. active firm workspace selection for NHL Global Solution;
2. organization-support subscription and service-line verification;
3. client enquiry capture and qualification;
4. proposal approval, dispatch, and acceptance;
5. project opening for BizKick EDCS and reporting support;
6. correspondence intake;
7. controlled document/register creation;
8. administrative deadline tracking;
9. AI worker assignment for project reporting, technical writing, and clerical/EDCS support;
10. human review before client-facing AI output can be issued;
11. invoice issue and receivable monitoring without live payment movement;
12. audit reconstruction; and
13. firm-scoped export.

## 3. Workspace and subscription boundary

NHL Global Solution remains bound to:

- firm type: `ORGANIZATION_SUPPORT`;
- subscription package: `VF-ORG-SUPPORT-PILOT`;
- services:
  - project reporting;
  - technical writing;
  - clerical work;
  - BizKick EDCS.

The rehearsal verifies that Formwork Technical Delivery is not subscribed for NHL Global Solution. This means the NHL workspace can operate organization-support services while keeping Formwork Engineering capability out of the active NHL workspace boundary.

## 4. Human authority and AI-worker boundary

The OP-H4 pilot-day path proves the following control points:

- AI workers can prepare draft outputs and tool-invocation records only.
- Draft proposal dispatch is denied until human approval exists.
- AI worker review of client-facing output is denied.
- Client-facing output cannot be issued before human review approval.
- Receivable follow-up remains a draft requiring human review.
- AI payment release is denied.
- No live payment movement is introduced.

The key OP-H4 control phrase is: human review before client-facing AI output is required.

The invoice/receivable monitoring without live payment movement condition is proven.

## 5. Pilot-day records created

The executable smoke creates or verifies these material records inside the NHL tenant/firm boundary:

- front desk enquiry;
- client relationship;
- client communication draft;
- intake session;
- proposal;
- proposal approval;
- proposal dispatch record;
- engagement;
- project;
- work package;
- task;
- correspondence record;
- document register entry;
- document revision record;
- administrative deadline;
- AI tool invocations;
- AI task output requiring human review;
- deliverable draft;
- evidence bundle;
- human deliverable review approval;
- issued deliverable;
- issued invoice;
- receivable follow-up draft;
- event log records;
- audit records; and
- data-protection export package.

## 6. Audit reconstruction

This section is the audit reconstruction evidence for the NHL pilot day.

The smoke verifies that the event log and audit log can reconstruct the material business and AI-worker actions for NHL Global Solution, including:

- `front_desk.enquiry_captured`;
- `front_desk.communication_draft_created`;
- `proposal.approved`;
- `proposal.dispatched`;
- `proposal.accepted`;
- `correspondence.recorded`;
- `document.registered`;
- `task.assigned_to_worker`;
- `tool_invocation.requested`;
- `task.output_produced`;
- `evidence_bundle.created`;
- `deliverable.review_approved`;
- `deliverable.issued`;
- `invoice.issued`; and
- `accounts.receivable_follow_up_drafted`.

## 7. Export sample

This section is the export sample evidence for the NHL tenant and firm scope.

The OP-H4 smoke verifies that the export package is explicitly scoped by NHL `tenant_id` and `firm_id`, and that the export includes the expected business records for clients, projects, correspondence, documents, deadlines, proposals, approvals, invoices, receivable follow-ups, worker instances, AI outputs, tool invocations, event log records, and audit records.

The smoke also verifies that the Formwork principal cannot read the NHL Today view or export NHL records.

## 8. Known limitation carried forward

The current deliverable-review engine still uses inherited reference-vertical evidence validator keys from the original Formwork service pack when a proposal is accepted and a project work package is opened.

OP-H4 satisfies those core validator keys so that the existing runtime gate remains deterministic, but the evidence bundle also includes NHL-specific organization-support evidence refs for project reporting, technical writing, clerical work, BizKick EDCS, and human review notes.

This should be considered a bounded implementation limitation for OP-H5/OP-H6 review or a later service-specific evidence-validator split. It does not block OP-H4 because no Formwork Technical Delivery module is subscribed or presented in the NHL workspace.

## 9. Evidence artifacts

- Executable smoke: `scripts/smoke-op-h4-nhl-global-solution-pilot-day-rehearsal.mjs`.
- Package command: `npm run check:op:h4`.
- Full regression chain: `npm run check` includes OP-H4.
- Checklist: `OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_CHECKLIST_v1.0.md`.
- Decision register: ADR-058.

## 10. Locked boundaries

OP-H4 does not authorize:

- OP-H5 pilot evidence closeout;
- OP-H6 acceptance;
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

## 11. Next active sprint

`OP-H5 - Pilot Evidence, Audit, Export, and Closeout Review`
