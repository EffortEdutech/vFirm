export const formworkServicePack = {
  service_pack_id: "VF-SP-001",
  name: "Formwork Engineering / Temporary Works",
  version: "1.0",
  mvp_service: "Formwork Design Support - Preliminary Wall/Slab Package",
  risk_profile: "CONTROLLED",
  professional_authority_required: true,
  intake_required_fields: [
    "project_name",
    "site_location",
    "client_organization",
    "client_contact_name",
    "client_contact_email",
    "structure_type",
    "formwork_element_type",
    "height",
    "length_or_area",
    "concrete_grade",
    "available_drawings",
    "deadline",
    "required_deliverables"
  ],
  allowed_formwork_element_types: ["wall", "slab", "column", "beam", "core", "stair", "foundation", "other"],
  required_documents: [
    { code: "structural_drawings", required: true },
    { code: "revision_register", required: true },
    { code: "architectural_drawings", required: false },
    { code: "client_scope_or_purchase_request", required: false },
    { code: "site_constraints", required: false },
    { code: "manufacturer_system_data", required: false, requires_provenance: true }
  ],
  validators: [
    "formwork_intake_completeness",
    "document_revision_consistency",
    "unit_consistency",
    "geometry_positive_value_check",
    "risk_classification_completeness",
    "approval_presence_before_issue",
    "manufacturer_source_provenance_presence",
    "calculation_input_schema_validity"
  ],
  worker_templates: [
    "Front Desk Coordinator",
    "Administration Clerk",
    "Accounts Clerk",
    "Marketing & Sales Coordinator",
    "Technical Drawing Assistant",
    "Project Coordination Assistant",
    "Formwork Intake Agent",
    "Document Controller Agent",
    "Geometry Agent",
    "Calculation Preparation Agent",
    "QA Agent",
    "Proposal Agent",
    "Billing Agent"
  ],
  solopreneur_modules: [
    { code: "front_desk", name: "Front Desk", worker_template_code: "front-desk-coordinator", outcome: "Enquiries are captured, acknowledged, and routed without giving technical advice." },
    { code: "administration", name: "Administration", worker_template_code: "administration-clerk", outcome: "Records, correspondence, documents, and follow-ups remain controlled." },
    { code: "accounts", name: "Accounts", worker_template_code: "accounts-clerk", outcome: "Invoices, receivables, and expense records are prepared for principal control." },
    { code: "marketing_sales", name: "Marketing & Sales", worker_template_code: "marketing-sales-coordinator", outcome: "Leads and proposals progress without autonomous commercial commitment." },
    { code: "technical_drawing", name: "Technical Drawing Support", worker_template_code: "technical-drawing-assistant", outcome: "Drawing inputs and revisions are checked while professional authority remains human." },
    { code: "project_coordination", name: "Project Coordination", worker_template_code: "project-coordination-assistant", outcome: "Tasks, evidence, and delivery status are coordinated for the Virtual Principal." }
  ],
  output_templates: [
    "formwork_intake_summary",
    "missing_information_request",
    "scope_and_proposal_draft",
    "document_register",
    "calculation_input_sheet",
    "qa_checklist",
    "draft_formwork_design_support_report",
    "professional_review_record",
    "issued_deliverable_package_metadata",
    "invoice_draft"
  ]
} as const;

export type FormworkServicePack = typeof formworkServicePack;
