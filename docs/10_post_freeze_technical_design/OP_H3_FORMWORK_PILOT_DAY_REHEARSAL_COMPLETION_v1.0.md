---
id: OP-H3-FORMWORK-PILOT-DAY-REHEARSAL-COMPLETION
title: "OP-H3 Formwork Pilot Day Rehearsal Completion"
version: "1.0"
status: "Completed"
date: "2026-09-03"
scope: "Controlled Formwork Engineering pilot-day rehearsal"
---

# OP-H3 Formwork Pilot Day Rehearsal Completion v1.0

## Completion statement

OP-H3 is complete.

The Virtual Firm Platform now has an executable Formwork pilot-day fixture that rehearses the controlled operating loop for Amanah Formwork Pilot Firm while keeping NHL Global Solution outside the Formwork technical delivery boundary.

## What OP-H3 proves

### 1. Formwork pilot-day fixture

The OP-H3 smoke creates a clean local pilot-day fixture by:

- starting a temporary JSON-backed API;
- seeding the multi-tenant pilot workspaces;
- selecting Amanah Formwork Pilot Firm as the active rehearsal firm;
- confirming the workspace is `FORMWORK_ENGINEERING` and subscribes to Technical Delivery.

### 2. Client enquiry intake

The rehearsal captures and qualifies a Formwork enquiry, records consent/conflict evidence, hands it off into client/intake records, prepares a proposal, records explicit proposal approval, and opens a project.

### 3. Project, drawing, and QA activity

The rehearsal registers a controlled technical drawing, adds a new revision, creates a drawing review, validates calculation inputs using the deterministic validator, raises a HIGH QA finding, and prepares delivery package records.

### 4. Technical issue blocked until valid human professional approval exists

The technical issue blocked condition is proven: the first delivery package remains `BLOCKED` while the HIGH QA finding is open. The package has no professional approval id and no issued document version id.

The smoke also verifies these denials:

- an AI actor cannot silently resolve the regulated QA finding;
- a deliverable cannot be issued before an approved human review exists;
- an AI actor cannot grant deliverable review approval;
- NHL Global Solution cannot access Formwork technical delivery records.

### 5. Human professional review and controlled issue

After the Virtual Principal resolves the QA finding and prepares a complete evidence bundle, the deliverable is reviewed by the human professional authority and can then be issued through the existing explicit review/issue state path.

### 6. Formwork evidence trail

The evidence bundle includes:

- intake completeness evidence;
- document revision evidence;
- calculation input validation evidence;
- drawing review evidence;
- resolved QA evidence;
- delivery package readiness evidence;
- professional approval evidence before issue.

### 7. Audit reconstruction

This section is the audit reconstruction evidence for the Formwork pilot day.

The smoke verifies material Formwork pilot-day events exist, including:

- `front_desk.enquiry_captured`;
- `proposal.accepted`;
- `technical.drawing_revisions_checked`;
- `technical.qa_finding_raised`;
- `technical.delivery_package_blocked`;
- `technical.qa_finding_resolved`;
- `technical.delivery_package_ready_for_principal_review`;
- `deliverable.review_approved`;
- `deliverable.issued`.

Audit records are checked against the same tenant and firm so the pilot day can be reconstructed from auditable records.

### 8. Export sample

This section is the export sample evidence for the Formwork tenant and firm scope.

The smoke verifies the data-protection export package is scoped to the Formwork tenant and firm and includes controlled business records, technical records, evidence, events, and audit records.

## Verification evidence

Executable evidence:

```bash
npm run check:op:h3
```

The OP-H3 smoke validates:

- Formwork Technical Delivery is available in the Formwork workspace;
- NHL does not access Formwork technical records;
- regulated technical work is blocked without valid human professional approval;
- AI workers cannot silently approve or resolve regulated technical work;
- drawing, QA, evidence, approval, issue, audit, and export records are reconstructable.

## Limitations

OP-H3 does not implement:

- OP-H4 NHL Global Solution pilot-day rehearsal;
- OP-H5 evidence/export/closeout review templates;
- OP-H6 OP acceptance gate;
- production multi-tenant onboarding;
- public marketplace;
- live matching;
- ranking;
- capacity allocation;
- VF-24 observatory publication;
- pricing intelligence;
- autonomous award;
- autonomous regulated approval;
- live payment movement.

## Handoff

The next active sprint is:

`OP-H4 - NHL Global Solution Pilot Day Rehearsal`