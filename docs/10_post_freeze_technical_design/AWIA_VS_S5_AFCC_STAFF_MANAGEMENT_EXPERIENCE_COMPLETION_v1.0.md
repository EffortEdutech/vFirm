---
id: VFIRM-AWIA-VS-S5-AFCC-STAFF-MANAGEMENT-EXPERIENCE-COMPLETION
title: "AWIA Virtual Staff Sprint 5 AFCC Staff Management Experience Completion"
version: "1.0"
status: "AWIA-VS-S5 Complete"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
scope_classification: "Explicit User-Approved Scope Expansion"
authorization: "AUTHORIZE_AWIA_VS_S5_AFCC_STAFF_MANAGEMENT_EXPERIENCE"
---

# AWIA-VS-S5 AFCC Staff Management Experience Completion v1.0

## 1. Sprint outcome

AWIA-VS-S5 is complete for the first AFCC staff management and operating experience slice.

The web workspace now exposes an AFCC Staff Management surface inside the AI Workforce module. The surface shows named virtual staff, staff seat/salary plan information, package review status, lifecycle state, workload, approval queue context, assignment readiness, approval evidence semantics, and lifecycle control language.

This sprint does not create live staff execution, autonomous regulated approval, persistence migrations, or new side-effecting API commands.

## 2. Implemented artifacts

| Artifact | Purpose |
| --- | --- |
| `apps/web/public/app.js` | Adds the AFCC Staff Management roster, metrics, profile detail, assignment readiness, approval queue semantics, and lifecycle control markers. |
| `apps/web/public/styles.css` | Adds responsive AFCC staff experience, metric, and journey styling. |
| `scripts/smoke-awia-vs-s5-afcc-staff-management.mjs` | Validates AFCC UI markers and authority-boundary wording. |
| `package.json` | Adds `check:awia:vs:s5` validation command. |
| `docs/10_post_freeze_technical_design/README.md` | Adds this completion document to the post-freeze technical design index. |

## 3. Operator experience delivered

The first AFCC surface provides:

- staff roster
- virtual staff count
- active staff count
- human approval queue indicator
- candidate package indicator
- denied action indicator
- staff profile detail
- assignment readiness explanation
- approval evidence explanation
- lifecycle controls language

The UI explicitly preserves:

```text
Skill available is not action authorized
```

and:

```text
Monthly salary, package binding, chat, and model capability do not grant authority.
```

## 4. Staff shown in AFCC

The AFCC preview shows the first pilot staff set:

| Staff code | Experience role |
| --- | --- |
| `CFO-001` | Active executive finance supervision fixture |
| `FA-001` | Draft finance analyst |
| `FAO-AP-001` | Draft AP operator |
| `FAO-REV-001` | Draft revenue operator |
| `SAO-001` | Draft sales operations candidate |
| `OPO-001` | Draft project operations candidate |
| `ARO-001` | Draft administration/resources candidate |
| `DATA-001` | Draft data support assistant |

The S5 UI remains a preview/control surface grounded in S2-S4 contracts. It does not make these records persistent active workers.

## 5. Boundary controls preserved

AWIA-VS-S5 preserves:

- salary/staff plan non-authority
- package binding non-authority
- skill availability versus action authorization separation
- explicit human approval requirement
- no direct LLM to regulated final output
- no payment release
- no autonomous regulated approval
- deterministic authority gate retained as the source of runtime permission

## 6. Verification evidence

| Command | Result |
| --- | --- |
| `node --check apps/web/public/app.js` | PASS |
| `node --check scripts/smoke-awia-vs-s5-afcc-staff-management.mjs` | PASS |
| `npm run check:awia:vs:s5` | PASS |
| `node scripts/smoke-web-navigation-renderers.mjs` | PASS |
| `node scripts/smoke-web.mjs` | PASS |
| `git diff --check` | PASS |

S5 smoke result:

```json
{
  "smoke": "awia-vs-s5-afcc-staff-management",
  "result": "passed",
  "markers": 19,
  "boundary": "ui_preview_only_deterministic_authority_gate_retained"
}
```

## 7. Known carry-over items

| Item | Target |
| --- | --- |
| Persisted AFCC staff records | Later approved persistence sprint |
| Side-effecting lifecycle controls | Later approved API sprint |
| Staff task assignment command surface | Later approved runtime sprint |
| Ledger and evidence projection | AWIA-VS-S6 |
| Browser visual QA against live dev server | Before product-demo handoff |

## 8. Next sprint gate

Recommended next authorization:

```text
AUTHORIZE_AWIA_VS_S6_EVIDENCE_AND_PILOT_GATE
```

AWIA-VS-S6 should add evidence and pilot gate projections for AWIA virtual staff: evidence completeness, authority decision trace, denial evidence, lifecycle trace, AFCC audit/export summary, and go/no-go readiness. It must remain bounded and human-governed.
