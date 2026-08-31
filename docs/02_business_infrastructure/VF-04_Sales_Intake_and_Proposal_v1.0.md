---
id: VF-04
title: "Sales, Intake & Proposal"
version: "1.0"
status: "Architecture Baseline"
source_status: "RECOVERED FROM COMBINED VF-03 TO VF-08 BASELINE"
---

# VF-04 - Sales, Intake & Proposal

VF-04 is the Virtual Firm's commercial front office. It converts enquiry into qualified opportunity, structured scope, price, proposal, and accepted work.

## Intake funnel

```text
ENQUIRY
  -> CLIENT IDENTIFICATION
  -> SERVICE IDENTIFICATION
  -> REQUIREMENTS COLLECTION
  -> DOCUMENT COLLECTION
  -> TECHNICAL TRIAGE
  -> SCOPE DEFINITION
  -> PRICING
  -> PROPOSAL
  -> NEGOTIATION
  -> ACCEPTED
```

## Scope

VF-04 owns lead qualification, intake questionnaires, missing information detection, preliminary scoping, proposal drafting, quotation workflows, negotiation support, and handoff to contracts/projects.

VF-12 owns commercial pricing engine behavior. VF-19 owns service delivery lifecycle. VF-01 owns Firm, Client, Professional, and authority identity.

## Intake requirements

Intake MUST be service-aware. A formwork service asks for project type, location, drawings, wall/slab/column scope, height, pour height, concrete grade, deadline, and required submission authority. A technical writing service asks for document type, audience, source material, standards, word count, delivery date, and review process.

The Intake Agent MUST be able to say that work cannot proceed because required information is missing.

## Proposal control

Proposal generation may be AI-assisted, but sending a proposal is governed by authority, risk, price, contract terms, and firm policy.

High-risk, high-value, regulated, unusual, or materially discounted proposals MUST require human approval.

## Core objects

```text
Lead
Opportunity
IntakeSession
Requirement
MissingInformationItem
ScopeDraft
QuoteDraft
Proposal
ProposalApproval
AcceptedProposal
```

## Conformance

1. No proposal may be sent without a Firm, Client or prospect, service, scope, price basis, validity period, and responsible actor.
2. AI may draft but cannot silently approve.
3. Regulated service proposals must disclose required professional review/approval boundaries.
4. Accepted proposals must hand off deterministically to VF-05 and VF-06.

