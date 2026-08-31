---
id: VFIRM-ME-S3-PRIVATE-DIRECTORY-GOVERNANCE-ENQUIRY-RENEWAL-COMPLETION
title: "ME-S3 Private Directory Governance, Enquiry, and Renewal Controls Completion"
version: "1.0"
status: "Completed"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
completed_on: "2026-08-31"
---

# ME-S3 Private Directory Governance, Enquiry, and Renewal Controls Completion v1.0

## 1. Scope authorized

ME-S3 was authorized as a controlled private-directory governance sprint covering:

1. Directory Review Board operations;
2. private enquiry-to-collaboration request workflow without live matching;
3. qualification renewal and expiry monitoring.

ME-S3 does not authorize or implement public marketplace, live matching, ranking, capacity allocation, VF-24 observatory publication, autonomous award, or autonomous regulated approval.

## 2. Product outcome

ME-S3 turns the ME-S2 qualified private directory into a governed operating surface. A tenant can now record review board decisions, receive private enquiries against qualified listings, progress a private enquiry into a manual collaboration request, and record qualification renewal/expiry reviews.

This remains a private discovery and governance workflow. It does not rank, match, award, allocate capacity, publish observatory intelligence, or approve regulated work.

## 3. Implemented controls

- Added Directory Review Board decision record: `POST /marketplace/directory-review-board/decisions`.
- Added private directory enquiry record: `POST /marketplace/private-directory/enquiries`.
- Added manual enquiry-to-collaboration request transition: `POST /marketplace/private-directory/enquiries/request-collaboration`.
- Added qualification renewal/expiry review: `POST /marketplace/qualification-renewal-reviews`.
- Added ME-S3 readiness summary: `GET /marketplace/private-directory-governance-summary`.
- Required human governance actors for all ME-S3 actions.
- Preserved ME-S2 qualification gate, verified credential evidence, jurisdiction scope, tenant confidentiality, suspension, revocation, and audit boundaries.
- Denied ranking, live matching, award request, capacity allocation, autonomous award, and autonomous regulated approval flags.
- Progressed enquiry to collaboration request with `capacity_offer_id: null`, no data room by default, manual review only, and no award metadata.
- Recorded qualification renewal/expiry evidence and allowed expiry-driven suspension of a private directory listing.

## 4. Evidence

Executable smoke gate:

```bash
npm run check:me:s3
```

The smoke validates:

1. ME-S3 API contracts exist.
2. A qualified private directory listing is created through ME-S2 controls.
3. Review board ranking authorization is denied.
4. Review board decision is recorded.
5. Live-matching private enquiry is denied.
6. Manual private enquiry is recorded.
7. Award-requested collaboration transition is denied.
8. Manual enquiry-to-collaboration request is recorded without matching, ranking, award, or capacity offer.
9. AI renewal governance is denied.
10. Human qualification renewal/expiry review is recorded.
11. Tenant-level ME-S3 summary reports ready only when review, enquiry, collaboration, renewal, private-boundary, and audit checks pass.

## 5. Runtime boundaries retained

- Directory Review Board decision does not grant professional authority.
- Private enquiry does not create an appointment or award.
- Collaboration request does not create regulated approval.
- Qualification renewal review can suspend listing publication but cannot approve regulated deliverables.
- Marketplace qualification remains ahead of price.
- VF-13 firm intelligence and VF-24 ecosystem intelligence remain separate.
- All material actions are attributable and auditable.

## 6. Completion decision

ME-S3 is complete for controlled private directory governance, private enquiry workflow, and renewal/expiry monitoring.

ME-S4 is not automatically authorized. The next scope decision should choose whether to continue private-directory hardening, build operator UI surfaces, strengthen SQL persistence, or pause marketplace work and return to pilot operations.