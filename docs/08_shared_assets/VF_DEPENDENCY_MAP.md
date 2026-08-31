# vFirm Cross-Module Dependency Map v1.0

## Purpose

This map defines the main dependencies between VF modules so implementation teams know which module owns each concern and which modules consume it.

## Dependency principles

1. Foundation identity comes before workflow automation.
2. Professional authority and tenant isolation are cross-cutting gates.
3. Runtime executes work but does not own business domain logic.
4. Marketplace and observatory depend on trusted operational data; they do not come first.
5. Service packs configure the platform; they do not redefine foundation objects.

## Ownership matrix

| Domain | Owning module | Consumed by |
|---|---|---|
| Tenant, Firm, Person, Principal, ProfessionalAuthority | VF-01 | All modules |
| Workforce catalogue and blueprints | VF-02 | VF-09, VF-18, VF-21, VF-19/VF-20 |
| Client and relationship records | VF-03 | VF-04, VF-05, VF-06, VF-07, VF-08, VF-15 |
| Intake, scope, quote/proposal workflow | VF-04 | VF-05, VF-06, VF-12, VF-15, VF-19 |
| Engagement and contract terms | VF-05 | VF-06, VF-07, VF-08, VF-19 |
| Project operations | VF-06 | VF-08, VF-09, VF-13, VF-19 |
| Finance/accounting/billing records | VF-07 | VF-12, VF-13, VF-15, VF-24 |
| Documents and client portal records | VF-08 | VF-16, VF-19, VF-15, VF-17 |
| Worker runtime | VF-09 | VF-03 to VF-08, VF-12 to VF-15, VF-19 |
| Control plane/platform infrastructure | VF-10 | All runtime and provisioning modules |
| Professional governance | VF-11 | VF-04 to VF-09, VF-12, VF-14, VF-17, VF-18, VF-19, VF-21 |
| Commercial/economic logic | VF-12 | VF-04, VF-05, VF-07, VF-13, VF-14, VF-23 |
| Firm intelligence | VF-13 | Principal UI, VF-06, VF-07, VF-09, VF-12 |
| Marketplace/network matching | VF-14 | VF-22, VF-23, VF-24 |
| Client experience | VF-15 | VF-03 to VF-08, VF-12, VF-19 |
| Data/knowledge/memory | VF-16 | All modules |
| Security/identity/trust | VF-17 | All modules |
| AI governance/autonomy | VF-18 | VF-02, VF-09, all AI-assisted workflows |
| Service delivery kernel | VF-19 | VF-04 to VF-09, VF-11, VF-12, VF-16, VF-20 |
| Productization/service packs | VF-20 | VF-02, VF-04, VF-09, VF-11, VF-12, VF-19, VF-21 |
| Firm launch/factory | VF-21 | VF-01, VF-02, VF-10, VF-11, VF-17, VF-18, VF-20 |
| Federation/collaboration | VF-22 | VF-14, VF-17, VF-19, VF-23 |
| Capacity economy | VF-23 | VF-09, VF-12, VF-14, VF-22, VF-24 |
| Market observatory/benchmarking | VF-24 | VF-13, VF-23, platform leadership |

## Critical dependency chains

### Firm launch

```text
VF-01 identity/authority
  -> VF-02 workforce blueprint
  -> VF-10 provisioning
  -> VF-11/VF-17/VF-18 controls
  -> VF-20 service packs
  -> VF-21 readiness and launch
```

### Client-to-cash loop

```text
VF-15 front door
  -> VF-03 client relationship
  -> VF-04 intake/proposal
  -> VF-12 pricing
  -> VF-05 engagement
  -> VF-06 project
  -> VF-19 service delivery
  -> VF-08 deliverables
  -> VF-07 invoice/payment
  -> VF-16 memory
```

### AI worker execution

```text
VF-02 worker definition
  -> VF-18 autonomy policy
  -> VF-17 identity/access
  -> VF-09 task runtime
  -> VF-11 approval/evidence where required
  -> VF-16 audit/memory
```

### Regulated deliverable

```text
VF-19 work package
  -> VF-11 governance requirements
  -> VF-17 credential/identity trust
  -> VF-18 AI safety boundary
  -> VF-08 document version
  -> EvidenceBundle
  -> human Approval
  -> deliverable.issued event
```

### Marketplace growth

```text
single Firm operations
  -> trusted service delivery records
  -> private specialist network
  -> VF-14 matching
  -> VF-22 collaboration
  -> VF-23 capacity signals
  -> VF-24 benchmarking
```

## Build order implication

Build VF-01, VF-02, VF-03 to VF-08, VF-09, VF-11/VF-17/VF-18, and VF-19 enough to prove the first operating loop before building VF-14/VF-22/VF-23/VF-24 at scale.

## Prohibited dependency inversions

- Marketplace must not define professional authority.
- AI runtime must not define business domain truth.
- Service packs must not redefine Tenant, Firm, Professional, Client, Approval, or EvidenceBundle.
- Client portal must not become the system of record for project or document state.
- Intelligence recommendations must not bypass policy or approval.
- Global observatory must not expose tenant/private client data.

