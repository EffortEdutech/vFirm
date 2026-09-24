// HM-S6 item 4 -- repository contract tests (Sales & Intake).
//
// For every table in this domain: seeds two independent tenant/firm scopes (via fixtures.mjs's
// generic seedRow()/buildRecord(), which walk schema-metadata.mjs to satisfy any required parent
// rows), creates a row in each scope through this domain's OWN createX function (proving createX
// itself, not just the generic insert helper it's built on), then asserts listXByFirm/ByTenant/All
// returns exactly the row(s) in scope and excludes the other scope's row, getX returns the exact
// row, and updateX persists a patched field. Every row is synthetic (fixtures.mjs's placeholder
// values) written to whatever disposable database DATABASE_URL points at -- never live data.
//
// Run with: DATABASE_URL=<disposable-postgres> node apps/api/src/repositories/__tests__/sales-intake.contract.test.mjs
// Exits non-zero (and prints which table/assertion failed) on any failure, so it composes with
// `&&` the same way the rest of this repo's scripts/smoke-*.mjs suite does.

import assert from "node:assert/strict";
import * as repo from "../sales-intake.repo.mjs";
import { seedRow, buildRecord } from "./fixtures.mjs";

const tests = [
  // --- clients ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("clients", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("clients", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createClient(recordA);
    const createdB = await repo.createClient(recordB);
    assert.equal(createdA.id, recordA.id, "clients: createX must return the row with the id supplied");
    const listA = await repo.listClientsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "clients: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "clients: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getClient(createdA.id);
    assert.ok(fetched, "clients: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "clients: getX must return the exact row requested");
    const updated = await repo.updateClient(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "clients: updateX must persist the patched metadata");
    const untouched = await repo.getClient(createdA.id);
    assert.equal(untouched.id, createdA.id, "clients: row must still exist and be fetchable after update");
    return "clients";
  },
  // --- firm_client_relationships ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("firm_client_relationships", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("firm_client_relationships", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createFirmClientRelationship(recordA);
    const createdB = await repo.createFirmClientRelationship(recordB);
    assert.equal(createdA.id, recordA.id, "firm_client_relationships: createX must return the row with the id supplied");
    const listA = await repo.listFirmClientRelationshipsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "firm_client_relationships: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "firm_client_relationships: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getFirmClientRelationship(createdA.id);
    assert.ok(fetched, "firm_client_relationships: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "firm_client_relationships: getX must return the exact row requested");
    const newValue = `updated-${Date.now()}`;
    const updated = await repo.updateFirmClientRelationship(createdA.id, { relationship_type: newValue });
    assert.equal(updated.relationship_type, newValue, "firm_client_relationships: updateX must persist the patched relationship_type");
    const untouched = await repo.getFirmClientRelationship(createdA.id);
    assert.equal(untouched.id, createdA.id, "firm_client_relationships: row must still exist and be fetchable after update");
    return "firm_client_relationships";
  },
  // --- front_desk_enquiries ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("front_desk_enquiries", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("front_desk_enquiries", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createFrontDeskEnquiry(recordA);
    const createdB = await repo.createFrontDeskEnquiry(recordB);
    assert.equal(createdA.id, recordA.id, "front_desk_enquiries: createX must return the row with the id supplied");
    const listA = await repo.listFrontDeskEnquiriesByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "front_desk_enquiries: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "front_desk_enquiries: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getFrontDeskEnquiry(createdA.id);
    assert.ok(fetched, "front_desk_enquiries: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "front_desk_enquiries: getX must return the exact row requested");
    const updated = await repo.updateFrontDeskEnquiry(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "front_desk_enquiries: updateX must persist the patched metadata");
    const untouched = await repo.getFrontDeskEnquiry(createdA.id);
    assert.equal(untouched.id, createdA.id, "front_desk_enquiries: row must still exist and be fetchable after update");
    return "front_desk_enquiries";
  },
  // --- client_communication_drafts ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("client_communication_drafts", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("client_communication_drafts", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createClientCommunicationDraft(recordA);
    const createdB = await repo.createClientCommunicationDraft(recordB);
    assert.equal(createdA.id, recordA.id, "client_communication_drafts: createX must return the row with the id supplied");
    const listA = await repo.listClientCommunicationDraftsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "client_communication_drafts: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "client_communication_drafts: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getClientCommunicationDraft(createdA.id);
    assert.ok(fetched, "client_communication_drafts: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "client_communication_drafts: getX must return the exact row requested");
    const updated = await repo.updateClientCommunicationDraft(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "client_communication_drafts: updateX must persist the patched metadata");
    const untouched = await repo.getClientCommunicationDraft(createdA.id);
    assert.equal(untouched.id, createdA.id, "client_communication_drafts: row must still exist and be fetchable after update");
    return "client_communication_drafts";
  },
  // --- leads ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("leads", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("leads", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createLead(recordA);
    const createdB = await repo.createLead(recordB);
    assert.equal(createdA.id, recordA.id, "leads: createX must return the row with the id supplied");
    const listA = await repo.listLeadsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "leads: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "leads: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getLead(createdA.id);
    assert.ok(fetched, "leads: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "leads: getX must return the exact row requested");
    const updated = await repo.updateLead(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "leads: updateX must persist the patched metadata");
    const untouched = await repo.getLead(createdA.id);
    assert.equal(untouched.id, createdA.id, "leads: row must still exist and be fetchable after update");
    return "leads";
  },
  // --- intake_sessions ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("intake_sessions", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("intake_sessions", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createIntakeSession(recordA);
    const createdB = await repo.createIntakeSession(recordB);
    assert.equal(createdA.id, recordA.id, "intake_sessions: createX must return the row with the id supplied");
    const listA = await repo.listIntakeSessionsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "intake_sessions: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "intake_sessions: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getIntakeSession(createdA.id);
    assert.ok(fetched, "intake_sessions: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "intake_sessions: getX must return the exact row requested");
    const updated = await repo.updateIntakeSession(createdA.id, { required_inputs: { contractTestUpdated: true } });
    assert.deepEqual(updated.required_inputs, { contractTestUpdated: true }, "intake_sessions: updateX must persist the patched required_inputs");
    const untouched = await repo.getIntakeSession(createdA.id);
    assert.equal(untouched.id, createdA.id, "intake_sessions: row must still exist and be fetchable after update");
    return "intake_sessions";
  },
  // --- sales_pipeline_records ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("sales_pipeline_records", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("sales_pipeline_records", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createSalesPipelineRecord(recordA);
    const createdB = await repo.createSalesPipelineRecord(recordB);
    assert.equal(createdA.id, recordA.id, "sales_pipeline_records: createX must return the row with the id supplied");
    const listA = await repo.listSalesPipelineRecordsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "sales_pipeline_records: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "sales_pipeline_records: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getSalesPipelineRecord(createdA.id);
    assert.ok(fetched, "sales_pipeline_records: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "sales_pipeline_records: getX must return the exact row requested");
    const updated = await repo.updateSalesPipelineRecord(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "sales_pipeline_records: updateX must persist the patched metadata");
    const untouched = await repo.getSalesPipelineRecord(createdA.id);
    assert.equal(untouched.id, createdA.id, "sales_pipeline_records: row must still exist and be fetchable after update");
    return "sales_pipeline_records";
  },
  // --- proposal_dispatch_records ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("proposal_dispatch_records", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("proposal_dispatch_records", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createProposalDispatchRecord(recordA);
    const createdB = await repo.createProposalDispatchRecord(recordB);
    assert.equal(createdA.id, recordA.id, "proposal_dispatch_records: createX must return the row with the id supplied");
    const listA = await repo.listProposalDispatchRecordsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "proposal_dispatch_records: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "proposal_dispatch_records: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getProposalDispatchRecord(createdA.id);
    assert.ok(fetched, "proposal_dispatch_records: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "proposal_dispatch_records: getX must return the exact row requested");
    const updated = await repo.updateProposalDispatchRecord(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "proposal_dispatch_records: updateX must persist the patched metadata");
    const untouched = await repo.getProposalDispatchRecord(createdA.id);
    assert.equal(untouched.id, createdA.id, "proposal_dispatch_records: row must still exist and be fetchable after update");
    return "proposal_dispatch_records";
  },
  // --- proposals ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("proposals", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("proposals", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createProposal(recordA);
    const createdB = await repo.createProposal(recordB);
    assert.equal(createdA.id, recordA.id, "proposals: createX must return the row with the id supplied");
    const listA = await repo.listProposalsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "proposals: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "proposals: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getProposal(createdA.id);
    assert.ok(fetched, "proposals: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "proposals: getX must return the exact row requested");
    const newValue = `updated-${Date.now()}`;
    const updated = await repo.updateProposal(createdA.id, { scope_summary: newValue });
    assert.equal(updated.scope_summary, newValue, "proposals: updateX must persist the patched scope_summary");
    const untouched = await repo.getProposal(createdA.id);
    assert.equal(untouched.id, createdA.id, "proposals: row must still exist and be fetchable after update");
    return "proposals";
  },
  // --- price_build_ups ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("price_build_ups", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("price_build_ups", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createPriceBuildUp(recordA);
    const createdB = await repo.createPriceBuildUp(recordB);
    assert.equal(createdA.id, recordA.id, "price_build_ups: createX must return the row with the id supplied");
    const listA = await repo.listPriceBuildUpsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "price_build_ups: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "price_build_ups: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getPriceBuildUp(createdA.id);
    assert.ok(fetched, "price_build_ups: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "price_build_ups: getX must return the exact row requested");
    const updated = await repo.updatePriceBuildUp(createdA.id, { scope_inputs: { contractTestUpdated: true } });
    assert.deepEqual(updated.scope_inputs, { contractTestUpdated: true }, "price_build_ups: updateX must persist the patched scope_inputs");
    const untouched = await repo.getPriceBuildUp(createdA.id);
    assert.equal(untouched.id, createdA.id, "price_build_ups: row must still exist and be fetchable after update");
    return "price_build_ups";
  },
  // --- commercial_skill_bindings ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("commercial_skill_bindings", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("commercial_skill_bindings", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createCommercialSkillBinding(recordA);
    const createdB = await repo.createCommercialSkillBinding(recordB);
    assert.equal(createdA.id, recordA.id, "commercial_skill_bindings: createX must return the row with the id supplied");
    const listA = await repo.listCommercialSkillBindingsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "commercial_skill_bindings: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "commercial_skill_bindings: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getCommercialSkillBinding(createdA.id);
    assert.ok(fetched, "commercial_skill_bindings: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "commercial_skill_bindings: getX must return the exact row requested");
    const updated = await repo.updateCommercialSkillBinding(createdA.id, { permissions: { contractTestUpdated: true } });
    assert.deepEqual(updated.permissions, { contractTestUpdated: true }, "commercial_skill_bindings: updateX must persist the patched permissions");
    const untouched = await repo.getCommercialSkillBinding(createdA.id);
    assert.equal(untouched.id, createdA.id, "commercial_skill_bindings: row must still exist and be fetchable after update");
    return "commercial_skill_bindings";
  },
  // --- quotation_cases ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("quotation_cases", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("quotation_cases", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createQuotationCase(recordA);
    const createdB = await repo.createQuotationCase(recordB);
    assert.equal(createdA.id, recordA.id, "quotation_cases: createX must return the row with the id supplied");
    const listA = await repo.listQuotationCasesByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "quotation_cases: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "quotation_cases: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getQuotationCase(createdA.id);
    assert.ok(fetched, "quotation_cases: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "quotation_cases: getX must return the exact row requested");
    const updated = await repo.updateQuotationCase(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "quotation_cases: updateX must persist the patched record");
    const untouched = await repo.getQuotationCase(createdA.id);
    assert.equal(untouched.id, createdA.id, "quotation_cases: row must still exist and be fetchable after update");
    return "quotation_cases";
  },
  // --- boq_extraction_aids ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("boq_extraction_aids", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("boq_extraction_aids", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createBoqExtractionAid(recordA);
    const createdB = await repo.createBoqExtractionAid(recordB);
    assert.equal(createdA.id, recordA.id, "boq_extraction_aids: createX must return the row with the id supplied");
    const listA = await repo.listBoqExtractionAidsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "boq_extraction_aids: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "boq_extraction_aids: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getBoqExtractionAid(createdA.id);
    assert.ok(fetched, "boq_extraction_aids: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "boq_extraction_aids: getX must return the exact row requested");
    const updated = await repo.updateBoqExtractionAid(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "boq_extraction_aids: updateX must persist the patched record");
    const untouched = await repo.getBoqExtractionAid(createdA.id);
    assert.equal(untouched.id, createdA.id, "boq_extraction_aids: row must still exist and be fetchable after update");
    return "boq_extraction_aids";
  },
  // --- quotation_draft_packs ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("quotation_draft_packs", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("quotation_draft_packs", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createQuotationDraftPack(recordA);
    const createdB = await repo.createQuotationDraftPack(recordB);
    assert.equal(createdA.id, recordA.id, "quotation_draft_packs: createX must return the row with the id supplied");
    const listA = await repo.listQuotationDraftPacksByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "quotation_draft_packs: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "quotation_draft_packs: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getQuotationDraftPack(createdA.id);
    assert.ok(fetched, "quotation_draft_packs: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "quotation_draft_packs: getX must return the exact row requested");
    const updated = await repo.updateQuotationDraftPack(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "quotation_draft_packs: updateX must persist the patched record");
    const untouched = await repo.getQuotationDraftPack(createdA.id);
    assert.equal(untouched.id, createdA.id, "quotation_draft_packs: row must still exist and be fetchable after update");
    return "quotation_draft_packs";
  },
  // --- quotation_issue_records ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("quotation_issue_records", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("quotation_issue_records", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createQuotationIssueRecord(recordA);
    const createdB = await repo.createQuotationIssueRecord(recordB);
    assert.equal(createdA.id, recordA.id, "quotation_issue_records: createX must return the row with the id supplied");
    const listA = await repo.listQuotationIssueRecordsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "quotation_issue_records: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "quotation_issue_records: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getQuotationIssueRecord(createdA.id);
    assert.ok(fetched, "quotation_issue_records: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "quotation_issue_records: getX must return the exact row requested");
    const updated = await repo.updateQuotationIssueRecord(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "quotation_issue_records: updateX must persist the patched record");
    const untouched = await repo.getQuotationIssueRecord(createdA.id);
    assert.equal(untouched.id, createdA.id, "quotation_issue_records: row must still exist and be fetchable after update");
    return "quotation_issue_records";
  },
  // --- quotation_receivable_preparations ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("quotation_receivable_preparations", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("quotation_receivable_preparations", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createQuotationReceivablePreparation(recordA);
    const createdB = await repo.createQuotationReceivablePreparation(recordB);
    assert.equal(createdA.id, recordA.id, "quotation_receivable_preparations: createX must return the row with the id supplied");
    const listA = await repo.listQuotationReceivablePreparationsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "quotation_receivable_preparations: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "quotation_receivable_preparations: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getQuotationReceivablePreparation(createdA.id);
    assert.ok(fetched, "quotation_receivable_preparations: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "quotation_receivable_preparations: getX must return the exact row requested");
    const updated = await repo.updateQuotationReceivablePreparation(createdA.id, { record: { contractTestUpdated: true } });
    assert.deepEqual(updated.record, { contractTestUpdated: true }, "quotation_receivable_preparations: updateX must persist the patched record");
    const untouched = await repo.getQuotationReceivablePreparation(createdA.id);
    assert.equal(untouched.id, createdA.id, "quotation_receivable_preparations: row must still exist and be fetchable after update");
    return "quotation_receivable_preparations";
  },
];

const results = [];
for (const test of tests) {
  results.push(await test());
}
console.log(JSON.stringify({ suite: "sales-intake.contract.test", tables_passed: results.length, tables: results }, null, 2));
