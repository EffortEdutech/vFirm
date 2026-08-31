---
id: VF-18
title: "Virtual Firm AI Governance, Agent Safety & Autonomous Operations"
version: "1.0"
status: "Architecture Baseline"
source_status: "DIRECT CONSOLIDATION FROM CHAT"
---

# VF-18 â€” Virtual Firm AI Governance, Agent Safety & Autonomous Operations

## Core principle

> **Autonomy must always be bounded by authority.**

24/7 autonomous operation does not mean unrestricted AI autonomy.

## Autonomy ladder

- A0 Observer â€” read/monitor/classify/summarize
- A1 Assistant â€” draft/recommend/prepare
- A2 Supervised Executor â€” execute with material approval
- A3 Conditional Autonomous â€” execute routine bounded actions
- A4 Autonomous Operator â€” manage an entire bounded workflow
- A5 Strategic Autonomous â€” heavily restricted; generally human-controlled

## Agent Authority Envelope (AAE)

Every agent defines:
- identity
- firm
- role
- allowed tools
- data scope
- allowed actions
- financial limits
- time/risk limits
- approval requirements
- escalation rules

## Deterministic workflow first

Business-critical lifecycle states should be explicit state machines. AI operates inside them.

## High-risk execution

`LLM â†’ structured parameters â†’ deterministic engine â†’ validation â†’ result â†’ QA â†’ professional review`

## AI risk classes

- R0 Harmless
- R1 Low
- R2 Moderate
- R3 Material
- R4 High
- R5 Critical

Risk determines maximum allowed autonomy.

## Human escalation

Agents escalate through:
- self-resolve
- another AI
- AI manager
- Principal
- external specialist

Human Control Inbox should prioritize exceptions rather than routine work.

## Quality controls

Before issuance:
`Generate â†’ Schema Validation â†’ Business Rules â†’ Source Validation â†’ Consistency â†’ Risk Assessment â†’ Approval Gate â†’ Issue`

High-risk workflows can use generator/reviewer/verifier separation and independent deterministic checks.

## Hallucination principle

LLM output is not truth. Authoritative truth comes from verified sources, deterministic calculations, approved records and human professional judgement.

## Prompt/model governance

Production prompts, models, tools and knowledge versions are governed assets.

Routing considers:
- task complexity
- cost
- privacy
- data classification
- availability
- fallback safety

## Cost governance

Track tokens, compute, tool costs, OCR, CAD/BIM/analysis costs and budgets at worker/task/project/firm level.

## Agent health

States:
- Healthy
- Degraded
- Blocked
- Failed
- Suspended
- Quarantined

Controls:
- watchdog
- max steps
- max runtime
- max tool calls
- max budget
- circuit breakers
- graceful degradation
- kill switch
- quarantine
- recovery

## Agent lifecycle

`Proposed â†’ Designed â†’ Tested â†’ Approved â†’ Shadow â†’ Canary â†’ Production â†’ Monitored â†’ Updated â†’ Retired`

## Core modules

- VF-18.01 AI Governance Engine
- VF-18.02 Agent Registry
- VF-18.03 Agent Manifest Service
- VF-18.04 Agent Lifecycle Management
- VF-18.05 Agent Authority Envelope
- VF-18.06 Agent Permission Engine
- VF-18.07 Agent Risk Engine
- VF-18.08 Agent Autonomy Engine
- VF-18.09 Agent Orchestrator
- VF-18.10 Agent State Machine
- VF-18.11 Agent Message Bus
- VF-18.12 Agent Tool Gateway
- VF-18.13 Agent Sandbox
- VF-18.14 Agent Watchdog
- VF-18.15 Circuit Breaker
- VF-18.16 Kill Switch
- VF-18.17 AI Model Gateway
- VF-18.18 Model Routing
- VF-18.19 Prompt Registry
- VF-18.20 RAG Governance
- VF-18.21 AI Data Policy
- VF-18.22 AI Cost Governance
- VF-18.23 AI Risk Classification
- VF-18.24 Human Escalation Engine
- VF-18.25 Approval Engine
- VF-18.26 Evidence Engine
- VF-18.27 AI Quality Gate
- VF-18.28 Independent Verification
- VF-18.29 Agent Evaluation
- VF-18.30 Benchmark Engine
- VF-18.31 Shadow Mode
- VF-18.32 Canary Deployment
- VF-18.33 Regression Testing
- VF-18.34 Agent Health Monitoring
- VF-18.35 Agent Incident Management
- VF-18.36 Agent Quarantine
- VF-18.37 Agent Recovery
- VF-18.38 Agent Retirement
- VF-18.39 AI Management Agent
- VF-18.40 Firm Monitoring
- VF-18.41 Autonomous Business Operations
- VF-18.42 Human Control Inbox
- VF-18.43 Daily Firm Brief
- VF-18.44 AI Workforce Analytics

