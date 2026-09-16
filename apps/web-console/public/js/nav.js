// Categorized sidebar configuration for both modes. Ported from the
// validated "Firm Console" prototype (Artifact HV1PMuNs9amaq4WkVUgN5C) --
// same category grouping and page ids, adapted to route to the real
// pages-owner.js / pages-admin.js render functions instead of mock data.

export const OWNER_NAV = [
  {
    category: "Overview",
    items: [{ id: "dashboard", label: "Dashboard", icon: "▣" }],
  },
  {
    category: "Workforce",
    items: [
      { id: "team", label: "My Team", icon: "◉" },
      { id: "workdesk", label: "Workdesk", icon: "▤" },
    ],
  },
  {
    category: "Clients",
    items: [
      { id: "sales", label: "Clients & Sales", icon: "◈" },
      { id: "projects", label: "Projects", icon: "▦" },
    ],
  },
  {
    category: "Finance",
    items: [{ id: "finance", label: "Finance", icon: "◊" }],
  },
  {
    category: "Firm",
    items: [{ id: "firm-settings", label: "Firm Settings", icon: "⚙" }],
  },
];

export const ADMIN_NAV = [
  {
    category: "Platform",
    items: [
      { id: "admin-firms", label: "Firms & Tenants", icon: "▣" },
      { id: "admin-users", label: "Users & Access", icon: "◉" },
    ],
  },
  {
    category: "Operations",
    items: [
      { id: "admin-ops", label: "Ops Console", icon: "▤" },
      { id: "admin-technical", label: "Technical Delivery", icon: "⚙" },
      { id: "admin-audit", label: "Audit & Compliance", icon: "☑" },
    ],
  },
  {
    category: "Commercial",
    items: [
      { id: "admin-sales-accounts", label: "Sales & Accounts", icon: "◈" },
      { id: "admin-billing", label: "Service Packs & Billing", icon: "◊" },
      { id: "admin-growth", label: "Growth", icon: "▲" },
    ],
  },
  {
    category: "Engineering",
    items: [{ id: "admin-engineering", label: "Engineering Console", icon: "⌘" }],
  },
];

export const PAGE_META = {
  dashboard: { eyebrow: "Overview", title: "Dashboard", desc: "Where the firm stands right now." },
  team: { eyebrow: "Workforce", title: "My Team", desc: "Hire, assign and manage your virtual staff." },
  workdesk: { eyebrow: "Workforce", title: "Workdesk", desc: "Track work from intake to client delivery." },
  sales: { eyebrow: "Clients", title: "Clients & Sales", desc: "Enquiries, opportunities and proposals." },
  projects: { eyebrow: "Clients", title: "Projects", desc: "Active and delivered client engagements." },
  finance: { eyebrow: "Finance", title: "Finance", desc: "Cash position, invoices and expenses." },
  "firm-settings": { eyebrow: "Firm", title: "Firm Settings", desc: "Profile, workspace and governance settings." },

  "admin-firms": { eyebrow: "Platform", title: "Firms & Tenants", desc: "Every firm running on the platform." },
  "admin-users": { eyebrow: "Platform", title: "Users & Access", desc: "Platform users, roles and permissions." },
  "admin-ops": { eyebrow: "Operations", title: "Ops Console", desc: "Operational readiness and daily operations." },
  "admin-technical": { eyebrow: "Operations", title: "Technical Delivery", desc: "Releases, service packs and workflow runs." },
  "admin-audit": { eyebrow: "Operations", title: "Audit & Compliance", desc: "Approvals, review board and audit trail." },
  "admin-sales-accounts": { eyebrow: "Commercial", title: "Sales & Accounts", desc: "Platform-side sales pipeline and receivables." },
  "admin-billing": { eyebrow: "Commercial", title: "Service Packs & Billing", desc: "Pack catalogue and billing state." },
  "admin-growth": { eyebrow: "Commercial", title: "Growth", desc: "Expansion, pilots and launch checklist." },
  "admin-engineering": { eyebrow: "Engineering", title: "Engineering Console", desc: "Raw diagnostics for the AI workforce engine." },
};

export function defaultPageForMode(mode) {
  return mode === "admin" ? "admin-firms" : "dashboard";
}

export function navForMode(mode) {
  return mode === "admin" ? ADMIN_NAV : OWNER_NAV;
}
