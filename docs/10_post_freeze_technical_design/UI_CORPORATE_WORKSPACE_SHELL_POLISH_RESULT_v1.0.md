---
id: UI-CORPORATE-WORKSPACE-SHELL-POLISH-RESULT
title: "UI Corporate Workspace Shell Polish Result"
version: "1.0"
status: "Completed Test Evidence"
source_status: "CREATED AFTER ARCHITECTURE BASELINE V1.0 FREEZE"
created: "2026-09-03"
scope: "Corporate app shell, hamburger sidebar, workspace command center, and development-mode full feature visibility"
---

# UI Corporate Workspace Shell Polish Result v1.0

## 1. Purpose

This note records the corporate UI polish pass for the Virtual Firm Platform web workspace after OP-H1 through OP-H6 controlled multi-firm pilot operations acceptance.

The immediate driver is to move away from a noticeboard-style page and toward a future user-facing workspace shell while keeping the UI useful for development.

## 2. Completed changes

- Replaced the wide top navigation strip with a left corporate sidebar menu.
- Added a hamburger menu and scrim for smaller screens.
- Reworked the page header into a compact topbar with API status.
- Moved workspace description, pilot banner, active firm selector, and tenant context into a cleaner workspace command center.
- Replaced compressed one-line tenant/subscription metadata with structured context cards.
- Updated NHL Global Solution workspace copy to include BizKick EDCS documentation/control support.
- Removed visible mojibake separators from workspace and record dropdown labels.
- Kept all future workspace feature areas visible for development review, even when a selected firm's subscription does not include that module.
- Preserved subscription metadata, worker binding, active firm scoping, and tenant boundary evidence.

## 3. Development-mode visibility rule

The web UI is currently used both as a future user interface and as a development control surface.

Therefore, all major feature areas remain visible in the sidebar:

- Dashboard;
- My Firm;
- Workflow;
- Clients;
- Front Desk;
- Administration;
- Sales & Accounts;
- Technical Delivery;
- Intake;
- Proposals;
- Projects;
- Approvals;
- Invoices;
- AI Workforce;
- Network;
- Ops;
- Audit;
- Service Pack;
- Pilot;
- Users;
- Support;
- Review Board;
- Expansion;
- Usage/Billing;
- Commercial Launch.

This visibility does not mean the active firm subscribes to every module. The selected firm's subscription still controls business meaning, worker defaults, and authority evidence. Production role/tenant enforcement remains a separate future scope.

## 4. Evidence

Validated commands:

```bash
node --check apps/web/public/app.js
npm run check:web:navigation
npm run check:web:multitenant
npm run check:mt:h5
npm run check:mt:h6
npm run check
npm run seed:pilot-workspaces
```

Local live-asset verification confirmed the running web server serves:

- `/` with `workspaceSidebar`, `sidebarToggle`, and `workspace-command-center`;
- `/app.js` with `development-visible`, BizKick EDCS copy, sidebar open/close handling, and workspace development-mode note;
- `/styles.css` with corporate sidebar and hamburger styling.

## 5. Verification limitation

The in-app browser bridge and the agent-browser CLI were unavailable from this task due local tooling/ACL limitations, so no automated screenshot was captured in this pass. Static, live-asset, focused UI, multi-tenant rehearsal, and full regression checks passed.

## 6. Boundaries preserved

This UI polish does not authorize:

- production multi-tenant onboarding;
- public marketplace;
- live matching;
- ranking;
- capacity allocation;
- VF-24 observatory publication;
- pricing intelligence;
- autonomous award;
- autonomous regulated approval;
- live payment movement;
- uncontrolled tenant/client data sharing.

## 7. Recommended next UI hardening

Recommended next UI improvements:

1. add browser screenshot regression once browser automation is available on the host;
2. split remaining Formwork-specific form labels from generic organization-support labels;
3. add a proper design token file before larger component refactoring;
4. add production-mode role/tenant visibility enforcement only after a separate authorization.
