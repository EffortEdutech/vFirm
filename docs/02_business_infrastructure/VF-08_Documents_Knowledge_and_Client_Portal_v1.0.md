---
id: VF-08
title: "Documents, Knowledge & Client Portal"
version: "1.0"
status: "Architecture Baseline"
source_status: "RECOVERED FROM COMBINED VF-03 TO VF-08 BASELINE"
---

# VF-08 - Documents, Knowledge & Client Portal

VF-08 manages the business-facing document and client portal layer for a Virtual Firm. It ensures documents, revisions, submissions, knowledge, status updates, and client deliverables are controlled and visible through governed access.

## Scope

VF-08 owns document registers, versions, revisions, issue status, submission packages, client portal presentation, client file exchange, deliverable packaging, and business knowledge organization.

VF-16 owns the deeper data, knowledge, memory, object storage, vector/knowledge graph, provenance, and retention architecture.

## Document principles

Documents are not just files. A document record MUST know what it is, which project it belongs to, which revision is current, who issued it, who approved it, what status it has, and whether it supersedes another version.

## Core objects

```text
Document
DocumentVersion
DocumentRegister
SubmissionPackage
Deliverable
ClientPortalAccess
PortalMessage
KnowledgeItem
Template
Transmittal
```

## Document Controller Agent

The Document Controller Agent manages filenames, revisions, registers, status, transmittals, superseded documents, and client submissions. It may prepare packages, but final issuance follows service risk and approval policy.

## Client portal

The portal SHOULD expose project status, required client actions, document requests, submitted deliverables, invoices/payment status, messages, appointments, and accepted work. It MUST not reveal internal confidential notes, unrelated clients, unrelated firms, hidden audit data, or unapproved drafts.

## Conformance

1. Every document has tenant scope, firm scope where applicable, project or relationship context, status, version, owner, and provenance.
2. Superseded and approved versions remain traceable.
3. Client portal access is explicit, revocable, scoped, and audited.
4. AI may draft and organize documents but cannot issue regulated final deliverables without required approval.

