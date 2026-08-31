---
id: VF-06
title: "Project Operations"
version: "1.0"
status: "Architecture Baseline"
source_status: "RECOVERED FROM COMBINED VF-03 TO VF-08 BASELINE"
---

# VF-06 - Project Operations

VF-06 manages the operational work of delivering a contracted professional service. It turns engagement scope into project plans, tasks, deadlines, dependencies, work packages, reviews, issues, delivery status, and closeout.

## Scope

VF-06 owns project records, milestones, task planning, dependency tracking, work package status, issue management, internal coordination, client updates, and operational closeout.

VF-09 owns task execution mechanics. VF-19 owns the professional service delivery kernel and service-specific workflow. VF-08 owns document storage, issue, and portal presentation.

## Project lifecycle

```text
PROJECT_OPENED
  -> PLANNED
  -> IN_EXECUTION
  -> INTERNAL_QA
  -> PROFESSIONAL_REVIEW
  -> DELIVERED
  -> CLIENT_REVIEW
  -> ACCEPTED
  -> CLOSED
```

Exceptions include blocked, escalated, change requested, suspended, and cancelled.

## Core objects

```text
Project
Milestone
WorkPackage
Task
Dependency
Issue
Decision
Review
ClientUpdate
CloseoutRecord
```

## Project Manager Agent

The Project Manager Agent watches what is completed, waiting, blocked, due, missing, under review, unpaid, or at risk. It may coordinate within authority but must escalate technical, commercial, professional, or client-sensitive exceptions.

## Conformance

1. Every project references a Firm, Client relationship, service, and engagement.
2. Every task has an actor or responsible role, status, due state, and audit trail.
3. LLMs may operate inside workflow states but may not mutate high-risk states without deterministic policy checks.
4. Regulated deliverables cannot bypass professional review.

