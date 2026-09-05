# AWIA Staff Memory and Conversation Workspace Completion v1.0

Status: completed
Authorization: AUTHORIZE_AWIA_STAFF_MEMORY_AND_CONVERSATION_WORKSPACE
Date: 2026-09-05
Classification: explicit user-approved scope expansion (optional bundle 1 of 5 from AWIA_CONTROLLED_LOCAL_PILOT_ACCEPTANCE_LOCK_v1.0.md)

## Purpose

Give each named AWIA virtual staff member a bounded, persisted memory of task context and a supervised conversation thread, without introducing hidden reasoning, unbounded free-form storage, or any new authority.

## Scope Completed

- New core-domain module `packages/core-domain/src/awia-virtual-staff-memory.mjs` defining:
  - `staffMemoryEntryKinds`: `TASK_CONTEXT_SUMMARY`, `DECISION_REFERENCE`, `CLIENT_PREFERENCE_NOTE`, `HANDOFF_NOTE`.
  - `conversationParticipantRoles`: `HUMAN_SUPERVISOR`, `VIRTUAL_STAFF`, `HUMAN_CLIENT_PROXY`.
  - `conversationMessageClassifications`: `INTERNAL_OPERATIONAL_CONTEXT`, `DRAFT_FOR_HUMAN_REVIEW`.
  - Deterministic boundary evaluation (`evaluateMemoryRetentionBoundary`, `evaluateConversationMessageBoundary`) and record builders (`buildStaffMemoryEntry`, `buildConversationThread`, `buildConversationMessage`).
  - A forbidden-field list (`raw_chain_of_thought`, `internal_reasoning_trace`, `hidden_reasoning`, `model_scratchpad`, `authority_grant`, and the three authority-claim fields already governed by the runtime authority gate) that is rejected outright if present on an inbound memory or message payload.
  - Bounded content length (4000 chars) and a mandatory evidence reference on every memory entry.
- Persisted API collections in `apps/api/src/store.mjs` / `apps/api/src/server.mjs`:
  - `GET /awia-staff-memory-entries`
  - `GET /awia-staff-conversation-threads`
  - `GET /awia-staff-conversation-messages`
- Controlled API commands, all tenant/firm scoped, actor-attributed, and audit/event recorded:
  - `POST /awia/virtual-staff/memory/append`
  - `POST /awia/virtual-staff/conversation/open`
  - `POST /awia/virtual-staff/conversation/message`
- Smoke coverage: `scripts/smoke-awia-staff-memory-and-conversation-workspace.mjs`, covering an accepted memory entry, a rejected chain-of-thought-smuggling attempt, a rejected no-evidence entry, an opened conversation thread, an accepted human and staff message, and a rejected unrecognized participant role, plus persistence and audit-trail assertions.

## Why This Does Not Reopen the Runtime Authority Gate

Memory entries and conversation messages are not actions: they carry no `action`, `tool`, or `risk_class`, and cannot be used to request or record task-readiness decisions. They are strictly descriptive records for continuity and human supervision. The forbidden-field list explicitly blocks any attempt to attach an authority claim (`salary_authority_claim`, `prompt_authority_claim`, `package_binding_authority_claim`) to a memory or conversation record, matching the existing principle that salary, package binding, and prompts do not create authority.

## Boundary Still Locked

This bundle does not authorize:
- exposing private chain-of-thought or hidden reasoning traces (rejected at the API boundary, not merely discouraged);
- autonomous regulated approval;
- direct LLM to regulated final output;
- final client deliverable issue by virtual staff;
- live payment release;
- public marketplace operation;
- production launch.

Virtual staff conversation messages default to `INTERNAL_OPERATIONAL_CONTEXT` and require an explicit `DRAFT_FOR_HUMAN_REVIEW` classification to be treated as review material; neither classification is client-facing or final.

## Verification

Passed:
- `node --check packages/core-domain/src/awia-virtual-staff-memory.mjs`
- `node --check apps/api/src/store.mjs`
- `node --check apps/api/src/server.mjs`
- `node --check apps/web/public/app.js`
- `npm run check:awia:staff-memory`
- `npm run check:awia:acceptance-lock` (no regression)
- `npm run check:awia:next-bundle` (no regression)

## Handoff

Recommended next action: proceed to bundle 2, `AUTHORIZE_AWIA_DEPARTMENT_DASHBOARDS`.
