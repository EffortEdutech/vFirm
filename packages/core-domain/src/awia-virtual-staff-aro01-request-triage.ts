// Type companion for awia-virtual-staff-aro01-request-triage.mjs.
// Declarations only -- no logic, per the .mjs/.ts file-pair convention used
// elsewhere in packages/core-domain/src.

export type Aro01TriageCategory =
  | "IT_SUPPORT"
  | "FACILITIES"
  | "HR_GENERAL"
  | "FINANCE_GENERAL"
  | "EXTERNAL_VENDOR"
  | "GENERAL_UNCLASSIFIED";

export type Aro01TriagePriority = "LOW" | "NORMAL" | "HIGH";

export interface Aro01TriageInput {
  request_subject?: string;
  request_body?: string;
  sender_type?: string;
  category_hint?: Aro01TriageCategory | null;
}

export interface Aro01TriageResult {
  category: Aro01TriageCategory;
  routed_to: string;
  priority: Aro01TriagePriority;
  matched_keywords: string[];
  sender_type: string;
  rationale: string;
  boundary: string;
}

export interface Aro01TriageValidationFinding {
  code: string;
  severity: "ERROR";
  [key: string]: unknown;
}

export interface Aro01TriageValidationResult {
  ok: boolean;
  findings: Aro01TriageValidationFinding[];
}

export interface Aro01TriageFixtureCase {
  input: Aro01TriageInput;
  expectedCategory: Aro01TriageCategory;
  expectedPriority: Aro01TriagePriority;
}

export interface Aro01TriageFixtureFailure {
  fixture: Aro01TriageInput;
  reason: string;
  [key: string]: unknown;
}

export interface Aro01TriageFixtureVerificationResult {
  ok: boolean;
  fixtures_checked: number;
  failures: Aro01TriageFixtureFailure[];
}
