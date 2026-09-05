---
id: VFIRM-AWIA-HIRE-A-VIRTUAL-WORKER-UNIFIED-SPRINT-PLAN
title: "vFirm AWIA Hire-a-Virtual-Worker Unified Sprint Plan and Checklist"
version: "1.0"
status: "Draft - Awaiting Product-Owner Authorization"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
date: "2026-09-05"
---

# vFirm AWIA Hire-a-Virtual-Worker Unified Sprint Plan and Checklist v1.0

## 1. Why this document exists

Several separate tracks already exist in this repository: Release 1 (accepted), the Solopreneur Firm build-out (SF-S1 to SF-S6, complete), the AWIA Virtual Staff feature and its five expansion bundles (complete, 2026-09-05), the drafted-but-unexecuted OP-H1 to OP-H6 multi-firm pilot operations plan, and Release 4/Release 5 product targets that were written but not executed or accepted.

No single document previously sequenced these into one path from "AWIA is built and pilot-ready" to "a real, paying client signs up and hires a named AWIA virtual staff member." This document is that single path. It is Phase A through Phase G.

This document does not reopen Architecture Baseline v1.0. It does not replace any of the source documents it references — it sequences them, calls out what is genuinely new work, and gives one place to authorize the whole route.

## 2. What this is not

- Not a new architecture. Every locked boundary in `AGENTS.md` (no autonomous regulated approval, no direct-LLM-to-regulated-output, no final client deliverable issue by virtual staff, no live payment release without explicit commercial decision, no public marketplace, no production launch) applies unchanged through every phase below.
- Not Release 5. Release 5 (`VFIRM_RELEASE_5_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md`) is a trusted specialist / firm-to-firm collaboration network. It is not required for a client to onboard a firm and hire an AWIA virtual staff member. It is explicitly deferred out of this critical path (see section 5).
- Not a replacement for Release 4's own checklist. Phase D below points at `VFIRM_RELEASE_4_IMPLEMENTATION_CHECKLIST_v1.0.md` and asks the product owner to run and accept it, rather than re-specifying it here.

## 3. Current state snapshot (2026-09-05)

- Release 1: accepted for controlled local pilot (`RC-LOCAL-PILOT`, `R1_S5_RELEASE_CANDIDATE_ACCEPTANCE_REVIEW_v1.0.md`).
- Solopreneur Firm build-out: SF-S1 through SF-S6 complete (`VFIRM_SOLOPRENEUR_IMPLEMENTATION_CHECKLIST_v1.0.md`).
- NHL-Q (NHL Global Solution BOQ/image quotation workflow): accepted for controlled local/private pilot, decision `ACCEPT_NHL_Q_CONTROLLED_LOCAL_PRIVATE_PILOT`, 2026-09-05.
- AWIA Virtual Staff: `AWIA_CONTROLLED_LOCAL_PILOT_READY`, locked in `AWIA_CONTROLLED_LOCAL_PILOT_ACCEPTANCE_LOCK_v1.0.md`, 0 mandatory authorizations remaining.
- AWIA expansion bundles (memory/conversation workspace, department dashboards, payroll and seat billing polish, multi-firm staff template scaling, staging preparation): all 5 completed 2026-09-05.
- Open gap: TD-009 in `TECHNICAL_DEBT_REGISTER_v1.0.md` — AWIA has no Postgres schema or backend-aware id generation yet; JSON-store local pilot is unaffected, but staging/production is blocked on this.
- Release 3 (Virtual Firm Factory): accepted, Release 4 authorized (`VFIRM_RELEASE_3_IMPLEMENTATION_CHECKLIST_v1.0.md`).
- Release 4 (staging / private pilot operations): product target and checklist written, entry criteria met, but sprints R4-S1 through R4-S6 have not been executed or accepted (`status: "Technical Recommendation Ready"`).
- OP-H1 to OP-H6 (controlled multi-firm pilot operations for Amanah Formwork Pilot Firm and NHL Global Solution): plan written, `status: "draft-for-product-owner-execution"`, not yet run.
- Stage 18/19/20 (controlled expansion, usage-limits/billing readiness, commercial launch controls): delivered as metadata/config only — no live payment capture, subscription packages are definitions only.
- Client onboarding to date (`NHL_GLOBAL_SOLUTION_ONBOARDING_REHEARSAL_RESULT_v1.0.md`): operator-assisted, not self-service.
- No self-service "client signs up and hires a virtual worker" flow exists yet in any document found in this repository.

## 4. The unified phase sequence

Each phase lists its objective, governing source (existing doc to run, or new work to author), entry criteria, exit criteria, and the authorization it needs. Nothing below is authorized by this document alone — each phase still needs its own explicit "Proceed Phase N ... Bismillah" the way every phase in this repository has been run.

### Phase A — Controlled AWIA Pilot-Day Rehearsal
- Objective: run a real client-facing pilot day using the existing operator script, on the AWIA feature exactly as it stands today.
- Governing source: `AWIA_PILOT_DAY_CLIENT_WALKTHROUGH_AND_OPERATOR_SCRIPT_v1.0.md` (16-step script already written, ready to run).
- Entry criteria: none outstanding. Zero further building required.
- Checklist:
  - [ ] Schedule pilot day and confirm operator + client availability.
  - [ ] Run the 16-step operator script end to end.
  - [ ] Capture the evidence-to-show list defined in the script.
  - [ ] Record client experience checklist results.
- Exit criteria: recommended result `GO_FOR_AWIA_CONTROLLED_LOCAL_PILOT_ACCEPTANCE_LOCK` reached, or issues logged.
- Authorization needed: none to run it (already cleared) — a decision record after the fact if the product owner wants one.

### Phase B — Close TD-009 (AWIA Postgres schema and id generation)
- Objective: give AWIA a real Postgres migration and backend-aware id generation (`storeBackend === "postgres" ? newUuid() : newId(...)`) so it is staging/production eligible, not just JSON-store eligible.
- Governing source: `TECHNICAL_DEBT_REGISTER_v1.0.md` TD-009; folds into Release 4's own R4-S2 (Staging Deployment and Data Protection) scope rather than standing alone.
- Entry criteria: Phase A evidence captured (not blocking, but sequenced first for a clean pilot record).
- Checklist:
  - [ ] Author `awia_*` Postgres tables mirroring `infra/database/schema.sql` / migration conventions (see `0006_ai_workforce_runtime.sql`, `0023_me_s4_directory_sql_persistence.sql` as pattern).
  - [ ] Wire backend-aware id generation into every AWIA store function.
  - [ ] Re-run all `check:awia:*` smoke tests against both JSON and Postgres backends.
  - [ ] Close TD-009 in the technical debt register with verification evidence.
- Exit criteria: AWIA staging-readiness check (built in the staging-preparation bundle) flips from `NOT_READY` to `READY`.
- Authorization needed: "Proceed Phase B ... Bismillah".

### Phase C — Controlled Multi-Firm Pilot Operations (OP-H1 to OP-H6)
- Objective: prove real day-to-day operation — including AWIA virtual staff in the daily workload — across both live firm workspaces (Amanah Formwork Pilot Firm and NHL Global Solution), with records kept separate and human approval boundaries preserved.
- Governing source: `OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_SPRINT_PLAN_v1.0.md` (already drafted, `status: "draft-for-product-owner-execution"`).
- Entry criteria: MT multi-tenant runtime binding acceptance already in place (per that plan's section 2).
- Checklist: run OP-H1 through OP-H6 exactly as specified in that document's own sprint sequence, ending in the OP-H6 acceptance gate.
- Exit criteria: product owner can accept, hold, or reject OP readiness per that document's completion definition (both firms run a controlled pilot day, records stay separate, evidence exports, closeout pack presented).
- Authorization needed: "Proceed Phase C ... Bismillah" (equivalently, "Proceed OP-H1 ... Bismillah" against the existing plan).

### Phase D — Release 4: Staging and Private Pilot Operations
- Objective: move from controlled local pilot to controlled staging/private pilot — real identity and tenant administration, staging deployment and data protection, support and incident controls, observability, and a named private pilot cohort.
- Governing source: `VFIRM_RELEASE_4_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md` and `VFIRM_RELEASE_4_IMPLEMENTATION_CHECKLIST_v1.0.md` (written, entry criteria met, sprints not yet executed or accepted).
- Entry criteria: Release 3 evidence pack accepted (already true); Phase B closed (AWIA now staging-eligible) folded into R4-S2.
- Checklist: run R4-S1 through R4-S6 exactly as specified in the Release 4 checklist; do not duplicate that checklist here.
- Exit criteria: Release 4 evidence pack accepted by product owner; Release 5 handoff readiness checkboxes in the Release 4 checklist satisfied (Release 5 itself remains deferred per section 5 below).
- Authorization needed: "Proceed Phase D ... Bismillah" (equivalently, "Proceed Release 4 ... Bismillah").

### Phase E — Commercial Activation for AWIA Staff Seats
- Objective: turn Stage 20's config-only commercial launch controls, Stage 19's billing-readiness plan, and this session's AWIA payroll/seat-billing bundle into a real, live-payment path so a client's staff-seat subscription can actually be billed.
- Governing source: `STAGE_20_PAYMENT_SUBSCRIPTION_COMMERCIAL_LAUNCH_PLAN_v1.0.md`, `STAGE_19_USAGE_LIMITS_BILLING_READINESS_PLAN_v1.0.md`, and `packages/core-domain/src/awia-virtual-staff-payroll.mjs` (seat billing state machine, built 2026-09-05) — but note these were deliberately built as metadata/config only, with no live payment capture. This phase is new work: selecting and integrating a real payment provider and lifting that boundary by explicit commercial decision.
- Entry criteria: Phase D accepted (billing needs a staging environment to run in, not local JSON only).
- Checklist:
  - [ ] Product-owner commercial decision: select payment provider(s) and record the decision (this is the specific boundary in `AGENTS.md` that must be explicitly lifted — it does not lift itself).
  - [ ] Integrate live payment capture against the existing `payment_provider_configs` / `subscription_packages` schema.
  - [ ] Connect AWIA seat billing status transitions to real invoicing/payment events.
  - [ ] Rehearse a full pay cycle (activation, invoice, payment, and a failure/dunning case) in staging.
- Exit criteria: a staff seat can go from `PENDING_ACTIVATION` to `BILLING_ACTIVE` against a real (sandboxed/test-mode) payment provider, with evidence.
- Authorization needed: "Proceed Phase E ... Bismillah", plus the explicit commercial decision named above.

### Phase F — Self-Service Client Onboarding and Hire-a-Worker Flow
- Objective: replace today's operator-assisted onboarding (`NHL_GLOBAL_SOLUTION_ONBOARDING_REHEARSAL_RESULT_v1.0.md`) with a flow a new client can complete themselves: sign up a firm workspace, choose a subscription package, and hire a named AWIA virtual staff member into a seat, without an operator driving each step by hand.
- Governing source: none exists yet. This is genuinely new work — no product-target or sprint-plan document for self-service onboarding was found anywhere in the repository. It should be authored in the same format as `VFIRM_RELEASE_1_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md` before implementation starts, reusing the Solopreneur firm-shape pattern and the AWIA template-scaling bundle (`packages/core-domain/src/awia-virtual-staff-templates.mjs`) for "pick a template, provision the staff" behavior.
- Entry criteria: Phase D (real tenant administration exists) and Phase E (billing is live) both accepted — self-service signup with no real auth or no real billing behind it is not meaningful.
- Checklist:
  - [ ] Author `VFIRM_SELF_SERVICE_ONBOARDING_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md` and its implementation checklist; get product-owner authorization on that plan specifically.
  - [ ] Build client-facing signup, firm-workspace creation, package selection, and "hire this virtual worker" flow.
  - [ ] Preserve every locked boundary: human approval before any regulated output, no silent acceptance of terms/commercial commitments.
  - [ ] Rehearse the flow with a real first-time client end to end.
- Exit criteria: a client the team has not manually onboarded completes signup and has a working AWIA staff seat, evidenced.
- Authorization needed: "Proceed Phase F ... Bismillah" — twice in effect: once to author the new plan, once to build against it.

### Phase G — First Real Paying Client and Production Launch Decision
- Objective: convert everything above into an actual Go/No-Go decision to launch, backed by a first real paying client who has hired an AWIA virtual staff member end to end.
- Governing source: none exists yet — this phase ends in a new acceptance-lock document modeled on `AWIA_CONTROLLED_LOCAL_PILOT_ACCEPTANCE_LOCK_v1.0.md` and `R1_S5_RELEASE_CANDIDATE_ACCEPTANCE_REVIEW_v1.0.md`.
- Entry criteria: Phases A through F all accepted with evidence.
- Checklist:
  - [ ] Onboard one real, paying client through the Phase F self-service flow (or an assisted variant if self-service is not yet fully trusted).
  - [ ] That client's AWIA virtual staff member completes at least one real task end to end, with full evidence trail and human approval preserved.
  - [ ] Consolidate evidence from Phases A-F into a single production-launch evidence pack.
  - [ ] Product-owner Go/No-Go decision recorded, naming exactly what "production launch" does and does not mean (no lifted boundaries beyond what was explicitly decided in Phase E).
- Exit criteria: a recorded, dated production-launch decision.
- Authorization needed: "Proceed Phase G ... Bismillah", the highest-stakes authorization in this whole sequence — recommend deliberate review, not a quick approval.

## 5. Explicitly deferred: Release 5

Release 5 (`VFIRM_RELEASE_5_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md`, trusted specialist network and firm-to-firm collaboration) is not on this critical path. It solves a different problem — one firm bringing in another firm or specialist — not a client hiring a virtual worker from one firm. It stays available to authorize separately if and when firm-to-firm collaboration becomes a real need, but doing it before Phase G would not move a real client any closer to hiring an AWIA virtual worker.

## 6. Cross-reference table

| Phase | Existing doc to run | New doc/work needed |
|---|---|---|
| A | `AWIA_PILOT_DAY_CLIENT_WALKTHROUGH_AND_OPERATOR_SCRIPT_v1.0.md` | none |
| B | `TECHNICAL_DEBT_REGISTER_v1.0.md` (TD-009), Release 4 R4-S2 scope | Postgres migration + id-gen code |
| C | `OP_H1_TO_H6_CONTROLLED_MULTI_FIRM_PILOT_OPERATIONS_SPRINT_PLAN_v1.0.md` | none |
| D | `VFIRM_RELEASE_4_PRODUCT_TARGET_AND_SPRINT_PLAN_v1.0.md` + its checklist | none (execute what is written) |
| E | `STAGE_20_PAYMENT_SUBSCRIPTION_COMMERCIAL_LAUNCH_PLAN_v1.0.md`, `STAGE_19_USAGE_LIMITS_BILLING_READINESS_PLAN_v1.0.md` | live payment provider integration + commercial decision |
| F | Solopreneur firm-shape pattern, AWIA template-scaling module | new `VFIRM_SELF_SERVICE_ONBOARDING_...` plan (does not exist yet) |
| G | `AWIA_CONTROLLED_LOCAL_PILOT_ACCEPTANCE_LOCK_v1.0.md` (as template) | new production-launch acceptance-lock doc |

## 7. Authorization protocol (unchanged)

Every phase above still needs its own explicit "Proceed Phase N ... Bismillah" before any building starts, exactly as every other phase in this repository has been run. This document authorizes nothing by itself — it only gives the product owner one place to see and authorize the whole route from today to Phase G.

## 8. Recommended immediate next action

Phase A needs zero further building and can be authorized today. Phase B is the next piece of real engineering work, and it is small and bounded (one migration, one id-generation fix, re-run existing smoke tests).
