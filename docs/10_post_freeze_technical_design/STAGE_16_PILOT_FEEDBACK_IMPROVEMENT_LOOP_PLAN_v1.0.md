---
title: "Stage 16 - Pilot Feedback, Acceptance Criteria, and Product Improvement Loop Plan"
version: "1.0"
status: "implemented"
---

# Stage 16 - Pilot Feedback, Acceptance Criteria, and Product Improvement Loop Plan v1.0

Stage 16 turns the controlled pilot into a learning system.

It captures:

- structured pilot feedback;
- pilot acceptance reviews;
- product improvement backlog items;
- learning-loop summary metrics.

## API surface

| Endpoint | Purpose |
|---|---|
| `GET /pilot/learning-loop` | Read feedback, acceptance, and improvement summary. |
| `GET /pilot-feedback` | List pilot feedback. |
| `GET /pilot-acceptance-reviews` | List pilot acceptance reviews. |
| `GET /pilot-improvement-items` | List pilot improvement backlog. |
| `POST /pilot/feedback` | Submit structured pilot feedback. |
| `POST /pilot/acceptance-reviews` | Record pilot acceptance criteria review. |
| `POST /pilot/improvement-items` | Create product improvement item. |
| `POST /pilot/improvement-items/update` | Update or close product improvement item. |

## Persistence

Stage 16 adds `pilot_feedback`, `pilot_acceptance_reviews`, and `pilot_improvement_items`.

## Exit criteria

Stage 16 can close when feedback capture, acceptance review, improvement creation/update, learning-loop summary, JSON fallback, PostgreSQL migration, and full smoke validation pass.
