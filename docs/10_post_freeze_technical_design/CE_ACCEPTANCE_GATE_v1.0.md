# Connected EDCS: acceptance gate (CE-S9)

Version 1.0, 2026-10-12. This document is where the product owner decides. Nothing is accepted silently: an empty decision means "not accepted".

## 1. The four possible decisions

| Decision | Meaning | What happens next |
|---|---|---|
| **Accept** | Everything below is met. | Connected EDCS may be offered to customers. |
| **Accept with limitations** | Met, except items listed in section 5, each with an owner and a date. | May be offered only with the limitations told to the customer in writing. |
| **Hold** | Not yet met, but fixable. | List what is needed; pilot days restart if an S1 issue was found. |
| **Reject** | The approach does not work. | Stop; write the reason in the Decision Register. |

## 2. Entry conditions (all must be true before deciding)

| # | Condition | Where to look | Met? (yes / no / date) |
|---|---|---|---|
| 1 | Evidence pack run on the final commit; every check passes (JSON; and, on a scratch database, Postgres) | `docs/10_post_freeze_technical_design/evidence/CE_EVIDENCE_PACK_<date>.md` | |
| 2 | Phase A pilot: at least 14 days, weekly tests done | `CE_S9_PILOT_PLAN_AND_LOG_v1.0.md` section 6 | |
| 3 | No unresolved S1 (data-integrity) issue | Pilot log | |
| 4 | A generated document opened in Excel by a person and judged usable | Pilot log | |
| 5 | Export test and isolation test passed during the pilot | Pilot weekly tests | |
| 6 | Support playbook read by the people who will give L1 and L2 support | `CE_SUPPORT_PLAYBOOK_v1.0.md` | |
| 7 | Product Champion trained | `CE_PRODUCT_CHAMPION_TRAINING_ADDENDUM_v1.0.md` | |
| 8 | BizKick v1.1 release notes and QA completed or consciously deferred | `BIZKICK_V1_1_RELEASE_NOTES_AND_QA_DRAFT_v1.0.md` | |
| 9 | For a customer pilot (Phase B): customer agreed in writing; paid hosting plan in place | Pilot plan section 4 | |

## 3. Evidence summary (fill in from the pack)

- Evidence pack file and commit:
- Checks run / passed / failed:
- Pilot A: days run / S1 total / S1 unresolved / S2 open:
- Pilot B: days run / S1 total / S1 unresolved / S2 open (or "not started"):
- Production migrations applied (last number):
- Production URL and plan:

## 4. Known limitations (as of this version)

These are true today. Each must either be fixed or accepted below.

1. **Microsoft 365 route** was tested against a simulated Microsoft only. A real-tenant test (with an admin) has not been done.
2. **Per-route role audit** is not done: some routes check the sign-in and the firm but not every role.
3. **Rate limiting** is not in place on the API.
4. **Hosting plan:** Vercel Hobby is not for commercial use. A paid plan is needed before real client data.
5. **Audit written after the data commit** (not atomic). A crash between the two could leave a change without its audit line.
6. **Drafts:** Quotation, Invoice and Purchase Order only; Malaysian ringgit only.
7. **Previewers** may show empty formula cells in drafted documents until opened in Excel.
8. **Free-text role codes** in the approval limits: a typo means only the owner can approve that tier.
9. **Cumulative limits** are not applied; each approval limit is checked against that one transaction's amount.
10. **Responsibility Matrix** is stored and shown but not enforced.
11. **Mixed date conventions** in one register give wrong dates; day first is always assumed.
12. **Docs graph** (Graphify) does not include the documentation folders until an AI key is set on the owner's PC.

## 5. Decision record

- Decision (tick one):  [ ] Accept   [ ] Accept with limitations   [ ] Hold   [ ] Reject
- Limitations accepted (number from section 4, owner, date to close):

| Limitation # | Why acceptable now | Owner | Close by |
|---|---|---|---|
| | | | |

- Conditions attached to the decision (for Hold, what must be true to reconsider):
- Reason in the product owner's words:
- Decided by (name): ____________________
- Date: ____________
- Decision Register entry: ADR-____

## 6. After the decision

- Record the decision as a Decision Register entry and in the project status log.
- If Accept or Accept with limitations: tell each customer the limitations that apply to them before they start.
- If Hold: update the pilot log with the new start date and the fix that was verified.
