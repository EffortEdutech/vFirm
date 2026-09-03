# NHL BOQ Quotation Workflow Sample v1.0

Status: Controlled local pilot workflow note  
Firm: NHL Global Solution  
Virtual Principal: Nur Hernieliana  
Sample reference: NHL-QT-2026-0001  
Date recorded: 2026-09-03  

## 1. Purpose

This note records a real NHL Global Solution work pattern that vFirm must support for a solo business firm:

Client-provided BOQ images are received as quotation input, NHL prepares a quotation package, and a PDF quotation is submitted back to the client. The work may include clerical review, technical/document interpretation, pricing preparation, quotation document control, and client correspondence.

The raw sample files are local/private evidence and must not be committed to the repository unless they are sanitized.

## 2. Local evidence observed

Local controlled copy path:

`data/pilot_samples/nhl_qt_2026_0001/`

Observed intake files:

- `IMG-20260819-WA0007.jpg`
- `IMG-20260819-WA0008.jpg`
- `IMG-20260819-WA0009.jpg`
- `IMG-20260819-WA0010.jpg`

Observed submitted evidence:

- `NHL-QT-2026-0001.pdf`

Metadata observed:

- Intake format: four JPEG phone images.
- Image dimensions: 720 x 1280 each.
- Submitted quotation PDF exists as controlled sent-client evidence.
- PDF text extraction was not performed because the local pypdf runtime requires an additional crypto backend for this protected/encrypted PDF.

## 3. Required vFirm workflow capability

vFirm should support this as a controlled NHL organization-support workflow:

1. Client enquiry/intake is created for a quotation request.
2. BOQ images are registered as client-supplied evidence.
3. Intake worker classifies the request as quotation support, not autonomous award or payment action.
4. Admin/document worker creates a document control record for each incoming image and links them to one quotation case.
5. Technical/document support worker extracts or summarizes BOQ scope for human review.
6. Sales/proposal worker prepares a quotation draft with line items, assumptions, exclusions, validity, and commercial terms.
7. Human principal reviews and approves the quotation before issue.
8. Submitted PDF is registered as controlled outgoing correspondence/evidence.
9. Audit trail reconstructs intake, worker actions, human decisions, quotation issue, and correspondence.
10. Export package can include legally permissible client, quotation, correspondence, document, and audit records.

## 4. Worker boundary

Allowed worker support:

- Front Desk AI Worker: receive and classify client quotation request.
- Admin and Clerical AI Worker: register files, maintain document/correspondence records, create task checklist.
- Sales and Proposal AI Worker: draft quotation structure and commercial checklist for human review.
- Technical Writing and EDCS Document AI Worker: summarize BOQ/document content and prepare controlled document references.
- Project Reporting AI Worker: maintain status and closeout record after quotation submission.
- Accounts and Receivables AI Worker: may prepare invoice/receivable follow-up only after valid accepted engagement or authorized billing trigger.

Not allowed:

- No autonomous quotation approval.
- No autonomous regulated technical certification.
- No live payment movement.
- No uncontrolled client data sharing.
- No public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, pricing intelligence, autonomous award, or autonomous regulated approval.

## 5. Product gap created by this sample

This sample shows that vFirm needs a dedicated "Quotation Case" capability for small firms:

- Quote intake from photos, scans, PDFs, and messages.
- Controlled document register for incoming and outgoing quotation evidence.
- BOQ extraction/review checklist.
- Human approval state before quotation issue.
- Submitted quotation evidence registration.
- Client follow-up and acceptance/decline state.
- Optional conversion from quotation to project/engagement/invoice.

## 6. Recommended next development scope

Create a bounded NHL pilot sprint:

`NHL-Q1 — BOQ Quotation Intake and Issue Workflow`

Acceptance target:

vFirm can register this sample as a controlled quotation case for NHL Global Solution, link the four BOQ images and submitted PDF as evidence records, show the case in Sales & Accounts / Intake / Administration, and reconstruct the workflow from audit records without exposing private files publicly or allowing autonomous approval.
