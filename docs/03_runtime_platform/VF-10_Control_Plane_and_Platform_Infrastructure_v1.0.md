---
id: VF-10
title: "Virtual Firm Control Plane & Platform Infrastructure"
version: "1.0"
status: "Architecture Baseline"
source_status: "CONSOLIDATED/RECONSTRUCTED FROM PRIOR CHAT SUMMARY"
---

# VF-10 â€” Virtual Firm Control Plane & Platform Infrastructure

## Purpose

Provision, secure, connect, govern, meter and monitor every Virtual Firm. The control plane decides what should exist and who may do what; VF-09 executes.

## Core principles

1. Strict multi-tenancy and tenant isolation.
2. Human and AI identities are first-class.
3. Platform billing is separate from firm/client billing.
4. Agents do not call model providers or secrets directly.
5. Workflow state is durable and deterministic.
6. Usage is metered for unit economics.
7. Professionals should be able to export firm data where legally permissible.

## Canonical flows

### Virtual Firm Factory

`Professional â†’ Select Practice â†’ FirmBlueprint â†’ Modules/Workforce/Packs â†’ Provision â†’ Ready for Client`

## Module catalogue

- **10.01 â€” Tenant & Firm Provisioning**
- **10.02 â€” Identity & Access Management**
- **10.03 â€” Subscription & Platform Billing**
- **10.04 â€” AI Model Gateway**
- **10.05 â€” Tool & Integration Gateway**
- **10.06 â€” Secrets & Credentials**
- **10.07 â€” Event & Message Infrastructure**
- **10.08 â€” File/Object Storage**
- **10.09 â€” Knowledge Infrastructure**
- **10.10 â€” Workflow Infrastructure**
- **10.11 â€” Usage Metering**
- **10.12 â€” Security & Policy Engine**
- **10.13 â€” Observability**
- **10.14 â€” Backup & Disaster Recovery**
- **10.15 â€” Notifications**
- **10.16 â€” Platform Administration**
- **10.17 â€” Marketplace Infrastructure**
- **10.18 â€” Developer/Plugin Infrastructure**

## Core data objects

- `FirmBlueprint`
- `Tenant`
- `Identity`
- `Subscription`
- `ModelRoute`
- `ToolConnection`
- `SecretReference`
- `UsageRecord`
- `Policy`
- `Notification`

## Architecture notes

- Likely stack: Next.js/PWA, PostgreSQL/Supabase, object storage, durable workflow/event infrastructure, Python deterministic engines, observability.
- Do not hard-code around one AI agent framework.
- AI Gateway abstracts providers and can support BYOK.

