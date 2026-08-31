---
id: VF-17
title: "Virtual Firm Security, Identity & Trust Infrastructure"
version: "1.0"
status: "Architecture Baseline"
source_status: "DIRECT CONSOLIDATION FROM CHAT"
---

# VF-17 â€” Virtual Firm Security, Identity & Trust Infrastructure

## Core principle

Every person, AI worker, client, document, decision, transaction and professional approval must have verifiable identity, permission, provenance and auditability.

## Trust equation

`Identity + Authorization + Context + Action + Provenance = Trusted Event`

## Identity types

- Human
- AI Agent
- System
- External Service

AI workers must not reuse a principal's credentials.

## Authentication

Support progressive trust:
- email/password
- social identity
- passkeys
- MFA
- hardware keys
- enterprise SSO
- step-up authentication for high-risk actions

## Authorization

Use RBAC + ABAC:
- role
- firm
- tenant
- project
- discipline
- credential
- jurisdiction
- resource
- action
- risk

## Least privilege

Every AI worker receives the minimum permissions required.

Tool authorization must include:
- tool
- action
- parameter limits
- resource scope
- approval requirement
- risk class

## Tool risk classes

- T0 Read-only
- T1 Draft
- T2 External communication
- T3 Financial transaction
- T4 Regulatory action
- T5 Professional approval
- T6 Irreversible action

## Professional credentials

Credential states:
- Unverified
- Pending
- Verified
- Expired
- Suspended
- Revoked

Credential/authority/jurisdiction state must gate regulated sign-off.

## Digital signatures

Distinguish electronic approval from cryptographic digital signature.

Signing record should bind:
- signatory
- credential
- document ID
- document hash
- timestamp
- signature type
- validity status

## Data protection

- TLS in transit
- encryption at rest
- encrypted backups
- secrets management
- key rotation/revocation
- strict RLS/tenant isolation
- scoped service-to-service tokens

## AI security

AI Gateway applies:
- model/provider policy
- data classification
- provider restrictions
- BYOK protection
- prompt injection defense
- tool injection defense
- sandboxing
- code execution controls

External documents are untrusted content, not instructions.

## Audit

Every material action should generate an immutable/append-only audit event.

Security events and business events are distinct.

## Evidence package

For high-risk deliverables retain:
- input documents
- input parameters
- standards/rules
- AI/tool activity
- calculation outputs
- QA
- review comments
- revision history
- approval/signature
- final hash

## Core services

- VF-17.01 Identity Service
- VF-17.02 Authentication Service
- VF-17.03 MFA Service
- VF-17.04 Session Service
- VF-17.05 RBAC Service
- VF-17.06 ABAC Policy Service
- VF-17.07 Tenant Isolation Service
- VF-17.08 Agent Identity Service
- VF-17.09 Agent Permission Service
- VF-17.10 Tool Authorization Service
- VF-17.11 Credential Registry
- VF-17.12 Credential Verification
- VF-17.13 Jurisdiction Authority
- VF-17.14 Professional Trust Profile
- VF-17.15 Encryption Service
- VF-17.16 Key Management
- VF-17.17 Secrets Management
- VF-17.18 Secure File Service
- VF-17.19 Digital Signature Service
- VF-17.20 Document Integrity Service
- VF-17.21 Approval Security Service
- VF-17.22 Audit Service
- VF-17.23 Security Event Service
- VF-17.24 Fraud Detection
- VF-17.25 AI Security Gateway
- VF-17.26 Prompt Injection Defense
- VF-17.27 Tool Security
- VF-17.28 Sandbox Service
- VF-17.29 Security Monitoring
- VF-17.30 Incident Response
- VF-17.31 Backup
- VF-17.32 Disaster Recovery
- VF-17.33 Business Continuity
- VF-17.34 Data Loss Prevention
- VF-17.35 Trust Evidence Service

## Locked rules

- No identity, no action.
- No authorization, no access.
- No provenance, no trusted knowledge.
- No approval, no regulated decision.
- No audit trail, no critical transaction.

