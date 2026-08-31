---
id: VF-STAGE-8-MARKETPLACE-NETWORK-LAYER-PLAN
title: "Stage 8 - Marketplace and Network Layer Plan"
version: "1.0"
status: "Implementation Plan"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
---

# Stage 8 - Marketplace and Network Layer Plan v1.0

## Purpose

Stage 8 prepares vFirm to operate beyond a single firm and single service pack. It introduces the controlled network layer needed for service-pack listings, capacity offers, collaboration requests, and privacy-safe observatory metrics.

This is not an open public marketplace yet. Stage 8 is a trusted/private network foundation so we can validate the model without exposing confidential client, firm, project, or professional data.

## Scope

Stage 8 implements four build-facing capabilities:

1. Private marketplace listings for service packs.
2. Capacity offers expressed as professional-capacity units.
3. Collaboration requests between firms with explicit data-room policy.
4. Observatory snapshots that aggregate operational metrics safely.

## Domain records

| Record | Purpose |
|---|---|
| `marketplace_listings` | Publishes a service-pack capability into the trusted network. |
| `capacity_offers` | Declares available professional capacity for a service pack or capability area. |
| `collaboration_requests` | Captures a request for support, capacity, or co-delivery under controlled access policy. |
| `observatory_snapshots` | Stores aggregated metrics for internal benchmarking and future intelligence. |

## API surface

| Endpoint | Purpose |
|---|---|
| `GET /marketplace-listings` | Read trusted-network listings. |
| `POST /marketplace/listings` | Publish a private service-pack listing. |
| `GET /capacity-offers` | Read capacity offers. |
| `POST /capacity/offers` | Create a capacity offer. |
| `GET /collaboration-requests` | Read collaboration requests. |
| `POST /collaboration/requests` | Request controlled collaboration. |
| `GET /observatory-snapshots` | Read privacy-safe observatory snapshots. |
| `POST /observatory/snapshots` | Generate an internal aggregated snapshot. |

## Policy posture

- Network reads remain tenant-scoped.
- Collaboration requests include `data_room_policy` by default.
- Observatory metrics are stored as aggregated internal snapshots.
- No public listing discovery, public checkout, anonymous access, or cross-tenant marketplace browsing is introduced in this stage.

## UI scope

The web workspace receives a `Network` tab containing:

- listing publishing action;
- capacity offer action;
- collaboration request action;
- observatory snapshot action;
- listings table;
- capacity/collaboration/observatory summary.

## Exit criteria

Stage 8 can close when:

- migration `0007_marketplace_network_layer.sql` exists and applies to PostgreSQL;
- JSON fallback/dev mode still works;
- API contracts include Stage 8 endpoints;
- web shell exposes the Network workspace;
- smoke test proves listing, capacity, collaboration, observatory snapshot, and tenant read isolation.

