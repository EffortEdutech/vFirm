---
id: VF-03
title: "Client & CRM"
version: "1.0"
status: "Architecture Baseline"
source_status: "RECOVERED FROM COMBINED VF-03 TO VF-08 BASELINE"
---

# VF-03 - Client & CRM

VF-03 is the Virtual Firm's relationship memory. It answers who the client is, what they need, what the Firm has done for them, what has been agreed, and what should happen next.

## Scope

VF-03 owns client profiles, contacts, organizations, relationship history, lead linkage, project linkage, communication history, client preferences, relationship status, and Client 360 views.

VF-01 owns the canonical `Client` and `FirmClientRelationship` identity model. VF-03 extends those objects with CRM-specific state.

## Core objects

```text
Client
  -> Organization
  -> Contacts
  -> Addresses
  -> Industry
  -> Relationship status
  -> Opportunities
  -> Projects
  -> Contracts
  -> Invoices
  -> Documents
  -> Communications
  -> Preferences
```

## Client 360

Every Firm SHOULD have one unified client view showing open opportunities, active projects, completed work, outstanding invoices, last contact, next action, key contacts, relationship status, documents, issues, and communication history.

The system MUST prevent client information from disappearing inside private messaging channels. Every qualified enquiry becomes a structured lead or client record.

## AI workforce support

Relevant workers include Receptionist Agent, Client Intake Agent, CRM Agent, Client Success Agent, Relationship Agent, Communication Agent, and Follow-up Agent.

These workers may maintain records and recommend actions. They MUST NOT provide regulated advice, alter professional conclusions, or commit the Firm beyond authority.

## Event model

Baseline CRM events include:

```text
client.created
client.updated
contact.created
relationship.created
relationship.activated
relationship.restricted
lead.created
intake.started
opportunity.created
project.created
quote.sent
contract.signed
project.completed
invoice.paid
follow_up.created
```

## Conformance

1. Every CRM record is tenant-scoped and firm-scoped where applicable.
2. Client records reference VF-01 canonical IDs.
3. Client communications preserve attribution, channel, time, consent/legal basis, and confidentiality metadata.
4. AI-generated relationship recommendations require policy checks before external action.

