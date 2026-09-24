// HM-S6 item 4 -- repository contract tests (Documents & Correspondence (Administration)).
//
// For every table in this domain: seeds two independent tenant/firm scopes (via fixtures.mjs's
// generic seedRow()/buildRecord(), which walk schema-metadata.mjs to satisfy any required parent
// rows), creates a row in each scope through this domain's OWN createX function (proving createX
// itself, not just the generic insert helper it's built on), then asserts listXByFirm/ByTenant/All
// returns exactly the row(s) in scope and excludes the other scope's row, getX returns the exact
// row, and updateX persists a patched field. Every row is synthetic (fixtures.mjs's placeholder
// values) written to whatever disposable database DATABASE_URL points at -- never live data.
//
// Run with: DATABASE_URL=<disposable-postgres> node apps/api/src/repositories/__tests__/documents-correspondence.contract.test.mjs
// Exits non-zero (and prints which table/assertion failed) on any failure, so it composes with
// `&&` the same way the rest of this repo's scripts/smoke-*.mjs suite does.

import assert from "node:assert/strict";
import * as repo from "../documents-correspondence.repo.mjs";
import { seedRow, buildRecord } from "./fixtures.mjs";

const tests = [
  // --- documents ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("documents", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("documents", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createDocument(recordA);
    const createdB = await repo.createDocument(recordB);
    assert.equal(createdA.id, recordA.id, "documents: createX must return the row with the id supplied");
    const listA = await repo.listDocumentsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "documents: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "documents: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getDocument(createdA.id);
    assert.ok(fetched, "documents: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "documents: getX must return the exact row requested");
    const newValue = `updated-${Date.now()}`;
    const updated = await repo.updateDocument(createdA.id, { document_type: newValue });
    assert.equal(updated.document_type, newValue, "documents: updateX must persist the patched document_type");
    const untouched = await repo.getDocument(createdA.id);
    assert.equal(untouched.id, createdA.id, "documents: row must still exist and be fetchable after update");
    return "documents";
  },
  // --- document_versions ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("document_versions", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("document_versions", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createDocumentVersion(recordA);
    const createdB = await repo.createDocumentVersion(recordB);
    assert.equal(createdA.id, recordA.id, "document_versions: createX must return the row with the id supplied");
    const listA = await repo.listDocumentVersionsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "document_versions: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "document_versions: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getDocumentVersion(createdA.id);
    assert.ok(fetched, "document_versions: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "document_versions: getX must return the exact row requested");
    const newValue = `updated-${Date.now()}`;
    const updated = await repo.updateDocumentVersion(createdA.id, { version_label: newValue });
    assert.equal(updated.version_label, newValue, "document_versions: updateX must persist the patched version_label");
    const untouched = await repo.getDocumentVersion(createdA.id);
    assert.equal(untouched.id, createdA.id, "document_versions: row must still exist and be fetchable after update");
    return "document_versions";
  },
  // --- document_register_entries ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("document_register_entries", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("document_register_entries", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createDocumentRegisterEntry(recordA);
    const createdB = await repo.createDocumentRegisterEntry(recordB);
    assert.equal(createdA.id, recordA.id, "document_register_entries: createX must return the row with the id supplied");
    const listA = await repo.listDocumentRegisterEntriesByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "document_register_entries: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "document_register_entries: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getDocumentRegisterEntry(createdA.id);
    assert.ok(fetched, "document_register_entries: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "document_register_entries: getX must return the exact row requested");
    const updated = await repo.updateDocumentRegisterEntry(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "document_register_entries: updateX must persist the patched metadata");
    const untouched = await repo.getDocumentRegisterEntry(createdA.id);
    assert.equal(untouched.id, createdA.id, "document_register_entries: row must still exist and be fetchable after update");
    return "document_register_entries";
  },
  // --- document_revision_records ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("document_revision_records", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("document_revision_records", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createDocumentRevisionRecord(recordA);
    const createdB = await repo.createDocumentRevisionRecord(recordB);
    assert.equal(createdA.id, recordA.id, "document_revision_records: createX must return the row with the id supplied");
    const listA = await repo.listDocumentRevisionRecordsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "document_revision_records: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "document_revision_records: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getDocumentRevisionRecord(createdA.id);
    assert.ok(fetched, "document_revision_records: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "document_revision_records: getX must return the exact row requested");
    const updated = await repo.updateDocumentRevisionRecord(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "document_revision_records: updateX must persist the patched metadata");
    const untouched = await repo.getDocumentRevisionRecord(createdA.id);
    assert.equal(untouched.id, createdA.id, "document_revision_records: row must still exist and be fetchable after update");
    return "document_revision_records";
  },
  // --- correspondence_records ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("correspondence_records", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("correspondence_records", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createCorrespondenceRecord(recordA);
    const createdB = await repo.createCorrespondenceRecord(recordB);
    assert.equal(createdA.id, recordA.id, "correspondence_records: createX must return the row with the id supplied");
    const listA = await repo.listCorrespondenceRecordsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "correspondence_records: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "correspondence_records: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getCorrespondenceRecord(createdA.id);
    assert.ok(fetched, "correspondence_records: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "correspondence_records: getX must return the exact row requested");
    const updated = await repo.updateCorrespondenceRecord(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "correspondence_records: updateX must persist the patched metadata");
    const untouched = await repo.getCorrespondenceRecord(createdA.id);
    assert.equal(untouched.id, createdA.id, "correspondence_records: row must still exist and be fetchable after update");
    return "correspondence_records";
  },
  // --- administrative_deadlines ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("administrative_deadlines", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("administrative_deadlines", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createAdministrativeDeadline(recordA);
    const createdB = await repo.createAdministrativeDeadline(recordB);
    assert.equal(createdA.id, recordA.id, "administrative_deadlines: createX must return the row with the id supplied");
    const listA = await repo.listAdministrativeDeadlinesByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "administrative_deadlines: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "administrative_deadlines: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getAdministrativeDeadline(createdA.id);
    assert.ok(fetched, "administrative_deadlines: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "administrative_deadlines: getX must return the exact row requested");
    const updated = await repo.updateAdministrativeDeadline(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "administrative_deadlines: updateX must persist the patched metadata");
    const untouched = await repo.getAdministrativeDeadline(createdA.id);
    assert.equal(untouched.id, createdA.id, "administrative_deadlines: row must still exist and be fetchable after update");
    return "administrative_deadlines";
  },
  // --- transmittal_drafts ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("transmittal_drafts", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("transmittal_drafts", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createTransmittalDraft(recordA);
    const createdB = await repo.createTransmittalDraft(recordB);
    assert.equal(createdA.id, recordA.id, "transmittal_drafts: createX must return the row with the id supplied");
    const listA = await repo.listTransmittalDraftsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "transmittal_drafts: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "transmittal_drafts: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getTransmittalDraft(createdA.id);
    assert.ok(fetched, "transmittal_drafts: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "transmittal_drafts: getX must return the exact row requested");
    const updated = await repo.updateTransmittalDraft(createdA.id, { document_revision_refs: { contractTestUpdated: true } });
    assert.deepEqual(updated.document_revision_refs, { contractTestUpdated: true }, "transmittal_drafts: updateX must persist the patched document_revision_refs");
    const untouched = await repo.getTransmittalDraft(createdA.id);
    assert.equal(untouched.id, createdA.id, "transmittal_drafts: row must still exist and be fetchable after update");
    return "transmittal_drafts";
  },
  // --- evidence_bundles ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("evidence_bundles", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("evidence_bundles", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createEvidenceBundle(recordA);
    const createdB = await repo.createEvidenceBundle(recordB);
    assert.equal(createdA.id, recordA.id, "evidence_bundles: createX must return the row with the id supplied");
    const listA = await repo.listEvidenceBundlesByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "evidence_bundles: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "evidence_bundles: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getEvidenceBundle(createdA.id);
    assert.ok(fetched, "evidence_bundles: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "evidence_bundles: getX must return the exact row requested");
    const updated = await repo.updateEvidenceBundle(createdA.id, { source_document_refs: { contractTestUpdated: true } });
    assert.deepEqual(updated.source_document_refs, { contractTestUpdated: true }, "evidence_bundles: updateX must persist the patched source_document_refs");
    const untouched = await repo.getEvidenceBundle(createdA.id);
    assert.equal(untouched.id, createdA.id, "evidence_bundles: row must still exist and be fetchable after update");
    return "evidence_bundles";
  },
  // --- administration_skill_bindings ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("administration_skill_bindings", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("administration_skill_bindings", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createAdministrationSkillBinding(recordA);
    const createdB = await repo.createAdministrationSkillBinding(recordB);
    assert.equal(createdA.id, recordA.id, "administration_skill_bindings: createX must return the row with the id supplied");
    const listA = await repo.listAdministrationSkillBindingsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "administration_skill_bindings: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "administration_skill_bindings: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getAdministrationSkillBinding(createdA.id);
    assert.ok(fetched, "administration_skill_bindings: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "administration_skill_bindings: getX must return the exact row requested");
    const updated = await repo.updateAdministrationSkillBinding(createdA.id, { permissions: { contractTestUpdated: true } });
    assert.deepEqual(updated.permissions, { contractTestUpdated: true }, "administration_skill_bindings: updateX must persist the patched permissions");
    const untouched = await repo.getAdministrationSkillBinding(createdA.id);
    assert.equal(untouched.id, createdA.id, "administration_skill_bindings: row must still exist and be fetchable after update");
    return "administration_skill_bindings";
  },
];

const results = [];
for (const test of tests) {
  results.push(await test());
}
console.log(JSON.stringify({ suite: "documents-correspondence.contract.test", tables_passed: results.length, tables: results }, null, 2));
