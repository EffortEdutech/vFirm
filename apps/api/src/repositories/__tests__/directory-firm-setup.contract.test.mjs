// HM-S6 item 4 -- repository contract tests (Directory & Firm Setup).
//
// For every table in this domain: seeds two independent tenant/firm scopes (via fixtures.mjs's
// generic seedRow()/buildRecord(), which walk schema-metadata.mjs to satisfy any required parent
// rows), creates a row in each scope through this domain's OWN createX function (proving createX
// itself, not just the generic insert helper it's built on), then asserts listXByFirm/ByTenant/All
// returns exactly the row(s) in scope and excludes the other scope's row, getX returns the exact
// row, and updateX persists a patched field. Every row is synthetic (fixtures.mjs's placeholder
// values) written to whatever disposable database DATABASE_URL points at -- never live data.
//
// Run with: DATABASE_URL=<disposable-postgres> node apps/api/src/repositories/__tests__/directory-firm-setup.contract.test.mjs
// Exits non-zero (and prints which table/assertion failed) on any failure, so it composes with
// `&&` the same way the rest of this repo's scripts/smoke-*.mjs suite does.

import assert from "node:assert/strict";
import * as repo from "../directory-firm-setup.repo.mjs";
import { seedRow, buildRecord } from "./fixtures.mjs";

const tests = [
  // --- tenants ---
  async () => {
    const recordA = await buildRecord("tenants", {});
    const createdA = await repo.createTenant(recordA);
    assert.equal(createdA.id, recordA.id, "tenants: createX must return the row with the id supplied");
    const listAll = await repo.listAllTenants();
    assert.ok(listAll.some((r) => r.id === createdA.id), "tenants: listAllX must include the created row");
    const fetched = await repo.getTenant(createdA.id);
    assert.ok(fetched, "tenants: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "tenants: getX must return the exact row requested");
    const updated = await repo.updateTenant(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "tenants: updateX must persist the patched metadata");
    const untouched = await repo.getTenant(createdA.id);
    assert.equal(untouched.id, createdA.id, "tenants: row must still exist and be fetchable after update");
    return "tenants";
  },
  // --- firms ---
  async () => {
    const tenantA = await seedRow("tenants");
    const tenantB = await seedRow("tenants");
    const recordA = await buildRecord("firms", { tenant_id: tenantA.id });
    const recordB = await buildRecord("firms", { tenant_id: tenantB.id });
    const createdA = await repo.createFirm(recordA);
    const createdB = await repo.createFirm(recordB);
    assert.equal(createdA.id, recordA.id, "firms: createX must return the row with the id supplied");
    const listA = await repo.listFirmsByTenant(tenantA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "firms: listXByTenant must include the row scoped to that tenant");
    assert.ok(!listA.some((r) => r.id === createdB.id), "firms: listXByTenant must NOT include a different tenant's row");
    const fetched = await repo.getFirm(createdA.id);
    assert.ok(fetched, "firms: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "firms: getX must return the exact row requested");
    const updated = await repo.updateFirm(createdA.id, { active_practices: { contractTestUpdated: true } });
    assert.deepEqual(updated.active_practices, { contractTestUpdated: true }, "firms: updateX must persist the patched active_practices");
    const untouched = await repo.getFirm(createdA.id);
    assert.equal(untouched.id, createdA.id, "firms: row must still exist and be fetchable after update");
    return "firms";
  },
  // --- firm_memberships ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("firm_memberships", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("firm_memberships", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createFirmMembership(recordA);
    const createdB = await repo.createFirmMembership(recordB);
    assert.equal(createdA.id, recordA.id, "firm_memberships: createX must return the row with the id supplied");
    const listA = await repo.listFirmMembershipsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "firm_memberships: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "firm_memberships: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getFirmMembership(createdA.id);
    assert.ok(fetched, "firm_memberships: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "firm_memberships: getX must return the exact row requested");
    const updated = await repo.updateFirmMembership(createdA.id, { permissions: { contractTestUpdated: true } });
    assert.deepEqual(updated.permissions, { contractTestUpdated: true }, "firm_memberships: updateX must persist the patched permissions");
    const untouched = await repo.getFirmMembership(createdA.id);
    assert.equal(untouched.id, createdA.id, "firm_memberships: row must still exist and be fetchable after update");
    return "firm_memberships";
  },
  // --- persons ---
  async () => {
    const tenantA = await seedRow("tenants");
    const tenantB = await seedRow("tenants");
    const recordA = await buildRecord("persons", { tenant_id: tenantA.id });
    const recordB = await buildRecord("persons", { tenant_id: tenantB.id });
    const createdA = await repo.createPerson(recordA);
    const createdB = await repo.createPerson(recordB);
    assert.equal(createdA.id, recordA.id, "persons: createX must return the row with the id supplied");
    const listA = await repo.listPersonsByTenant(tenantA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "persons: listXByTenant must include the row scoped to that tenant");
    assert.ok(!listA.some((r) => r.id === createdB.id), "persons: listXByTenant must NOT include a different tenant's row");
    const fetched = await repo.getPerson(createdA.id);
    assert.ok(fetched, "persons: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "persons: getX must return the exact row requested");
    const updated = await repo.updatePerson(createdA.id, { contact_refs: { contractTestUpdated: true } });
    assert.deepEqual(updated.contact_refs, { contractTestUpdated: true }, "persons: updateX must persist the patched contact_refs");
    const untouched = await repo.getPerson(createdA.id);
    assert.equal(untouched.id, createdA.id, "persons: row must still exist and be fetchable after update");
    return "persons";
  },
  // --- actors ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("actors", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("actors", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createActor(recordA);
    const createdB = await repo.createActor(recordB);
    assert.equal(createdA.id, recordA.id, "actors: createX must return the row with the id supplied");
    const listA = await repo.listActorsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "actors: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "actors: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getActor(createdA.id);
    assert.ok(fetched, "actors: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "actors: getX must return the exact row requested");
    const updated = await repo.updateActor(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "actors: updateX must persist the patched metadata");
    const untouched = await repo.getActor(createdA.id);
    assert.equal(untouched.id, createdA.id, "actors: row must still exist and be fetchable after update");
    return "actors";
  },
  // --- professional_profiles ---
  async () => {
    const tenantA = await seedRow("tenants");
    const tenantB = await seedRow("tenants");
    const recordA = await buildRecord("professional_profiles", { tenant_id: tenantA.id });
    const recordB = await buildRecord("professional_profiles", { tenant_id: tenantB.id });
    const createdA = await repo.createProfessionalProfile(recordA);
    const createdB = await repo.createProfessionalProfile(recordB);
    assert.equal(createdA.id, recordA.id, "professional_profiles: createX must return the row with the id supplied");
    const listA = await repo.listProfessionalProfilesByTenant(tenantA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "professional_profiles: listXByTenant must include the row scoped to that tenant");
    assert.ok(!listA.some((r) => r.id === createdB.id), "professional_profiles: listXByTenant must NOT include a different tenant's row");
    const fetched = await repo.getProfessionalProfile(createdA.id);
    assert.ok(fetched, "professional_profiles: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "professional_profiles: getX must return the exact row requested");
    const updated = await repo.updateProfessionalProfile(createdA.id, { disciplines: { contractTestUpdated: true } });
    assert.deepEqual(updated.disciplines, { contractTestUpdated: true }, "professional_profiles: updateX must persist the patched disciplines");
    const untouched = await repo.getProfessionalProfile(createdA.id);
    assert.equal(untouched.id, createdA.id, "professional_profiles: row must still exist and be fetchable after update");
    return "professional_profiles";
  },
  // --- professional_authorities ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("professional_authorities", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("professional_authorities", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createProfessionalAuthority(recordA);
    const createdB = await repo.createProfessionalAuthority(recordB);
    assert.equal(createdA.id, recordA.id, "professional_authorities: createX must return the row with the id supplied");
    const listA = await repo.listProfessionalAuthoritiesByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "professional_authorities: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "professional_authorities: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getProfessionalAuthority(createdA.id);
    assert.ok(fetched, "professional_authorities: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "professional_authorities: getX must return the exact row requested");
    const updated = await repo.updateProfessionalAuthority(createdA.id, { service_scope: { contractTestUpdated: true } });
    assert.deepEqual(updated.service_scope, { contractTestUpdated: true }, "professional_authorities: updateX must persist the patched service_scope");
    const untouched = await repo.getProfessionalAuthority(createdA.id);
    assert.equal(untouched.id, createdA.id, "professional_authorities: row must still exist and be fetchable after update");
    return "professional_authorities";
  },
  // --- service_packs ---
  async () => {
    const recordA = await buildRecord("service_packs", {});
    const createdA = await repo.createServicePack(recordA);
    assert.equal(createdA.id, recordA.id, "service_packs: createX must return the row with the id supplied");
    const listAll = await repo.listAllServicePacks();
    assert.ok(listAll.some((r) => r.id === createdA.id), "service_packs: listAllX must include the created row");
    const fetched = await repo.getServicePack(createdA.id);
    assert.ok(fetched, "service_packs: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "service_packs: getX must return the exact row requested");
    const updated = await repo.updateServicePack(createdA.id, { configuration: { contractTestUpdated: true } });
    assert.deepEqual(updated.configuration, { contractTestUpdated: true }, "service_packs: updateX must persist the patched configuration");
    const untouched = await repo.getServicePack(createdA.id);
    assert.equal(untouched.id, createdA.id, "service_packs: row must still exist and be fetchable after update");
    return "service_packs";
  },
  // --- service_skus ---
  async () => {
    const recordA = await buildRecord("service_skus", {});
    const createdA = await repo.createServiceSku(recordA);
    assert.equal(createdA.id, recordA.id, "service_skus: createX must return the row with the id supplied");
    const listAll = await repo.listAllServiceSkus();
    assert.ok(listAll.some((r) => r.id === createdA.id), "service_skus: listAllX must include the created row");
    const fetched = await repo.getServiceSku(createdA.id);
    assert.ok(fetched, "service_skus: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "service_skus: getX must return the exact row requested");
    const newValue = `updated-${Date.now()}`;
    const updated = await repo.updateServiceSku(createdA.id, { code: newValue });
    assert.equal(updated.code, newValue, "service_skus: updateX must persist the patched code");
    const untouched = await repo.getServiceSku(createdA.id);
    assert.equal(untouched.id, createdA.id, "service_skus: row must still exist and be fetchable after update");
    return "service_skus";
  },
];

const results = [];
for (const test of tests) {
  results.push(await test());
}
console.log(JSON.stringify({ suite: "directory-firm-setup.contract.test", tables_passed: results.length, tables: results }, null, 2));
