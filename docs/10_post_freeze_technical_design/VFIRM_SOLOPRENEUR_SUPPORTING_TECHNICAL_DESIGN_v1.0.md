---
id: VFIRM-SOLOPRENEUR-SUPPORTING-TECHNICAL-DESIGN
title: "vFirm Solopreneur Supporting Technical Design"
version: "1.0"
status: "Active Build Design"
---

# vFirm Solopreneur Supporting Technical Design v1.0

## 1. Scope and authority

This design supports the approved bounded build of the first Formwork Engineering solopreneur Virtual Firm. It extends, but does not reopen, Architecture Baseline v1.0.

The client contracts with the Virtual Firm. The Virtual Principal owns the practice, brand, professional decisions, commercial commitments, and issue authority. Virtual workers operate only inside typed workflows, permissions, budgets, review gates, and audit identities.

## 2. Product composition

```text
Firm Blueprint
  -> Business modules
  -> Workforce Blueprint
  -> Worker template + bound role/worker skills
  -> Workflow + authority envelope + tool allowlist
  -> tenant-scoped runtime instance
```

The six initial modules are Front Desk, Administration, Accounts, Marketing and Sales, Technical Drawing Support, and Project Coordination. The Formwork Practice Pack supplies domain inputs, deterministic checks, evidence requirements, and professional approval rules.

A skill is capability content, not an autonomous employee. A worker binding must identify the skill and version, accepted input/output schemas, permissions, prohibited actions, supervisor, budget, evidence obligations, and escalation route before runtime activation.

## 3. Runtime contract

Every execution follows:

`Event -> Task -> Worker -> Context -> Permission -> Tools -> Execution -> Validation -> Escalation/Approval -> Output -> Audit -> Next Event`

Business state is deterministic. LLM output may draft, extract, classify, or recommend, but cannot change authoritative state unless a typed command validates the transition. High-risk calculations use deterministic engines. No regulated final output may pass directly from an LLM to a client.

## 4. Core records

Every material record is tenant- and firm-scoped and attributable.

| Record | Purpose |
|---|---|
| Firm / Firm Blueprint | Owned operating configuration and provisioned modules. |
| Worker Template / Instance | Versioned workforce definition and tenant runtime identity. |
| Skill Binding | Versioned capability bound to typed I/O and authority limits. |
| Workflow / Task | Deterministic business state and execution boundary. |
| Front Desk Enquiry | Pre-client enquiry and qualification control record. |
| Communication Draft | Human-review-required correspondence; not proof of sending. |
| Client / Relationship | Accepted client identity, consent/legal basis, and conflict reference. |
| Lead / Intake Session | Qualified service interest, required inputs, and missing-information state. |
| Event / Audit | Attributable state transition and evidence summary. |

## 5. SF-S2 Front Desk and Client Pipeline

### State machine

`NEW -> NEEDS_INFORMATION | QUALIFIED | NOT_A_FIT | CLOSED`

`QUALIFIED -> HANDED_OFF`

Handoff is denied unless:

1. enquiry state is `QUALIFIED`;
2. consent or another lawful basis reference is recorded;
3. the conflict prompt is `CLEARED`;
4. the acting identity matches the tenant and firm;
5. the target Firm exists.

Handoff creates a Client, Firm Client Relationship, Lead, and Intake Session. Missing Formwork inputs produce `NEEDS_INFORMATION`; they do not disappear or become inferred facts.

### Commands

| Command | Outcome |
|---|---|
| `POST /front-desk/enquiries` | Capture a pre-client enquiry. |
| `POST /front-desk/enquiries/qualify` | Record a controlled qualification decision. |
| `POST /front-desk/communication-drafts` | Save a review-required draft; never send. |
| `POST /front-desk/enquiries/handoff` | Create client/intake records after gates pass. |

Read endpoints are `GET /front-desk-enquiries` and `GET /client-communication-drafts`, with existing tenant/firm filtering and access checks.

### Events

- `front_desk.enquiry_captured`
- `front_desk.enquiry_qualified`
- `front_desk.enquiry_needs_information`
- `front_desk.enquiry_not_a_fit`
- `front_desk.communication_drafted`
- `front_desk.enquiry_handed_off`
- existing `client.created`
- existing intake completion or missing-information event

## 6. Persistence decision

SF-S2 records use the normalized vFirm application-state store in both JSON and PostgreSQL modes for the controlled local pilot. Client, relationship, lead, intake, event, and audit records continue to use their established relational front doors. Dedicated relational tables for enquiries and communication records are required before staging or multi-instance deployment; this is an explicit checklist gate, not hidden debt.

## 7. External tools

Graphify, Chunky, Marker, Langfuse, Qdrant, DSPy, Crawl4AI, Outlines, LiteLLM, and Instructor remain replaceable candidates. None is required for SF-S2. A tool is adopted only against a named acceptance gap after tenant isolation, licensing, portability, cost, security, and deterministic fallback review.

Likely later evaluations are document conversion for SF-S3/SF-S5, observability/model gateway at runtime hardening, and structured-output validation where native schemas are insufficient. Vector search never becomes the primary compliance mechanism.

## 8. Exit evidence

SF-S2 exits only when a smoke test proves capture, denied premature qualification/handoff, successful controlled qualification, review-only drafting, intake handoff, missing-information preservation, tenant isolation, and audit/event attribution; the full repository check must remain green.
