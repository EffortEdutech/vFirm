---
id: NHL-GLOBAL-SOLUTIONS-ONBOARDING-REHEARSAL-RESULT
title: "NHL Global Solution Onboarding Rehearsal Result"
version: "1.0"
status: "Completed Test Evidence"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
created: "2026-09-02"
---

# NHL Global Solution Onboarding Rehearsal Result v1.0

## 1. Rehearsal purpose

This document records a controlled local onboarding rehearsal for NHL Global Solution as a Virtual Firm Platform tenant/firm setup.

The rehearsal does not create a legal company registration, production tenant, external account, public marketplace listing, or live client commitment. It tests whether the current vFirm implementation can model the firm, owner, AI workers, service enquiry, workflow, audit, and export evidence safely.

## 2. Firm profile tested

| Field | Value |
|---|---|
| Firm name | NHL Global Solution |
| Owner / Virtual Principal | Nur Hernieliana |
| Service profile | Virtual services for project reporting, technical writing, clerical work, and BizKick EDCS |
| Operating mode | Controlled local onboarding rehearsal |
| Authority model | AI workers prepare drafts, records, summaries, and follow-ups; Nur Hernieliana remains the human authority for approvals and commitments. |

## 3. AI worker setup tested

The rehearsal provisions and activates six AI workers:

| Worker | Template | Intended NHL use |
|---|---|---|
| NHL Front Desk AI Worker | front-desk-coordinator | Capture enquiries and draft acknowledgements. |
| NHL Admin and Clerical AI Worker | administration-clerk | Maintain correspondence, document registers, deadlines, and clerical records. |
| NHL Accounts and Receivables AI Worker | accounts-clerk | Prepare invoice drafts and receivable follow-up drafts. |
| NHL Sales and Proposal AI Worker | marketing-sales-coordinator | Support proposal and sales workflow preparation. |
| NHL Technical Writing and EDCS Document AI Worker | technical-drawing-assistant | Support technical writing and controlled document review/drafting as a document-support worker, not as professional approver. |
| NHL Project Reporting AI Worker | project-coordination-assistant | Prepare project reporting summaries and task follow-up drafts. |

## 4. Workflow tested

The rehearsal covers:

1. tenant creation;
2. firm creation for NHL Global Solution;
3. owner/principal actor creation for Nur Hernieliana;
4. six AI worker instances provisioned and activated;
5. client record creation;
6. front desk enquiry for project reporting, technical writing, clerical work, and BizKick EDCS;
7. enquiry qualification with consent/legal basis and conflict check reference;
8. communication draft requiring review;
9. intake handoff;
10. proposal draft, approval, dispatch, and acceptance;
11. project creation;
12. EDCS document register entry;
13. correspondence and deadline records;
14. project reporting AI task assignment;
15. AI output recorded as draft-only and requiring human review;
16. invoice draft, human-authorized invoice issue, and receivable follow-up draft;
17. daily operations summary;
18. export package count checks;
19. event/audit trace checks;
20. negative controls for unsafe actions.

## 5. Denial controls tested

The rehearsal confirms that vFirm denies or blocks:

- dispatching a draft proposal before human approval;
- AI worker payment release tooling;
- AI worker approval grant;
- cross-tenant operations read.

## 6. Rehearsal command

```bash
npm run check:onboarding:nhl
```

The test uses a temporary JSON store and does not persist production business records.

## 7. Result

Result:

```text
PASSED
```

NHL Global Solution can be represented in the current Virtual Firm Platform as a controlled solopreneur virtual-service firm with AI workers assisting day-to-day operations under human authority. The executable rehearsal also proves the invoice can only progress into receivable monitoring after the controlled delivery/evidence/review/issue path has completed.

## 8. Remaining limitations

This onboarding rehearsal does not authorize:

- legal company registration;
- production tenant activation;
- external email sending;
- live payment movement;
- public marketplace listing;
- live matching;
- ranking;
- capacity allocation;
- VF-24 observatory publication;
- pricing intelligence;
- autonomous award;
- autonomous regulated approval;
- uncontrolled tenant or client data sharing.

## 9. Recommended next step

If NHL Global Solution is intended to become a real pilot firm, the next step should be a controlled pilot setup checklist with:

- real owner confirmation;
- selected services and package names;
- client data handling policy;
- worker authority envelopes;
- document templates;
- approval rules;
- pilot success criteria;
- export/backup routine;
- issue and incident path.