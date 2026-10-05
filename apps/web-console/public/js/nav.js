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
    // CE-S1 (ADR-095): Connected EDCS -- the firm's BizKick Smart Transaction Register, governed in vFirm.
    category: "BizKick",
    items: [
      { id: "bizkick-connection", label: "Connection", icon: "⇄" },
      { id: "bizkick-import", label: "Import register", icon: "⇪" },
      { id: "bizkick-transactions", label: "Transactions", icon: "▥" },
      { id: "bizkick-files", label: "Files", icon: "▤" },
      { id: "bizkick-chains", label: "Chains", icon: "⛓" },
      { id: "bizkick-history", label: "Sync history", icon: "◷" },
      { id: "bizkick-conflicts", label: "Conflicts", icon: "⚑" },
      { id: "bizkick-rules", label: "Rules", icon: "⚙" },
    ],
  },
  {
    category: "Firm",
    items: [
      // ADR-093 W4 (F3): the firm's document register -- uploads and filed work outputs.
      { id: "documents", label: "Documents", icon: "▧" },
      { id: "firm-settings", label: "Firm Settings", icon: "⚙" },
    ],
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
  documents: { eyebrow: "Firm", title: "Documents", desc: "Every file your firm keeps: uploads and approved work, with revisions." },
  "bizkick-connection": { eyebrow: "BizKick", title: "Connection", desc: "Link this firm to its BizKick company and choose what content vFirm may keep." },
  "bizkick-import": { eyebrow: "BizKick", title: "Import register", desc: "Upload the BizKick Transaction Register. vFirm reads it, never edits it." },
  "bizkick-transactions": { eyebrow: "BizKick", title: "Transactions", desc: "The governed record of every transaction BizKick has told vFirm about." },
  "bizkick-files": { eyebrow: "BizKick", title: "Files", desc: "Upload BizKick documents. vFirm matches each to its transaction by the ID in the file name and keeps the revision history." },
  "bizkick-chains": { eyebrow: "BizKick", title: "Chains", desc: "How transactions follow one another, from quotation to receipt, with the links that are missing." },
  "bizkick-history": { eyebrow: "BizKick", title: "Sync history", desc: "Every import, what it did to each row, and the file it came from." },
  "bizkick-conflicts": { eyebrow: "BizKick", title: "Conflicts", desc: "Rows where BizKick and vFirm disagree. You decide which stands." },
  "bizkick-rules": { eyebrow: "BizKick", title: "Rules", desc: "Let the register raise work for your team. Every rule starts off, and you preview it before turning it on." },
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
