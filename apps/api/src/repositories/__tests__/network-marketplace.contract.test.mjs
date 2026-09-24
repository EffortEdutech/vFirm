// HM-S6 item 4 -- repository contract tests (Network & Marketplace).
//
// For every table in this domain: seeds two independent tenant/firm scopes (via fixtures.mjs's
// generic seedRow()/buildRecord(), which walk schema-metadata.mjs to satisfy any required parent
// rows), creates a row in each scope through this domain's OWN createX function (proving createX
// itself, not just the generic insert helper it's built on), then asserts listXByFirm/ByTenant/All
// returns exactly the row(s) in scope and excludes the other scope's row, getX returns the exact
// row, and updateX persists a patched field. Every row is synthetic (fixtures.mjs's placeholder
// values) written to whatever disposable database DATABASE_URL points at -- never live data.
//
// Run with: DATABASE_URL=<disposable-postgres> node apps/api/src/repositories/__tests__/network-marketplace.contract.test.mjs
// Exits non-zero (and prints which table/assertion failed) on any failure, so it composes with
// `&&` the same way the rest of this repo's scripts/smoke-*.mjs suite does.

import assert from "node:assert/strict";
import * as repo from "../network-marketplace.repo.mjs";
import { seedRow, buildRecord } from "./fixtures.mjs";

const tests = [
  // --- marketplace_listings ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("marketplace_listings", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("marketplace_listings", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createMarketplaceListing(recordA);
    const createdB = await repo.createMarketplaceListing(recordB);
    assert.equal(createdA.id, recordA.id, "marketplace_listings: createX must return the row with the id supplied");
    const listA = await repo.listMarketplaceListingsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "marketplace_listings: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "marketplace_listings: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getMarketplaceListing(createdA.id);
    assert.ok(fetched, "marketplace_listings: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "marketplace_listings: getX must return the exact row requested");
    const updated = await repo.updateMarketplaceListing(createdA.id, { qualification_requirements: { contractTestUpdated: true } });
    assert.deepEqual(updated.qualification_requirements, { contractTestUpdated: true }, "marketplace_listings: updateX must persist the patched qualification_requirements");
    const untouched = await repo.getMarketplaceListing(createdA.id);
    assert.equal(untouched.id, createdA.id, "marketplace_listings: row must still exist and be fetchable after update");
    return "marketplace_listings";
  },
  // --- directory_review_board_decisions ---
  async () => {
    const tenantA = await seedRow("tenants");
    const tenantB = await seedRow("tenants");
    const recordA = await buildRecord("directory_review_board_decisions", { tenant_id: tenantA.id });
    const recordB = await buildRecord("directory_review_board_decisions", { tenant_id: tenantB.id });
    const createdA = await repo.createDirectoryReviewBoardDecision(recordA);
    const createdB = await repo.createDirectoryReviewBoardDecision(recordB);
    assert.equal(createdA.id, recordA.id, "directory_review_board_decisions: createX must return the row with the id supplied");
    const listA = await repo.listDirectoryReviewBoardDecisionsByTenant(tenantA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "directory_review_board_decisions: listXByTenant must include the row scoped to that tenant");
    assert.ok(!listA.some((r) => r.id === createdB.id), "directory_review_board_decisions: listXByTenant must NOT include a different tenant's row");
    const fetched = await repo.getDirectoryReviewBoardDecision(createdA.id);
    assert.ok(fetched, "directory_review_board_decisions: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "directory_review_board_decisions: getX must return the exact row requested");
    const updated = await repo.updateDirectoryReviewBoardDecision(createdA.id, { evidence_refs: { contractTestUpdated: true } });
    assert.deepEqual(updated.evidence_refs, { contractTestUpdated: true }, "directory_review_board_decisions: updateX must persist the patched evidence_refs");
    const untouched = await repo.getDirectoryReviewBoardDecision(createdA.id);
    assert.equal(untouched.id, createdA.id, "directory_review_board_decisions: row must still exist and be fetchable after update");
    return "directory_review_board_decisions";
  },
  // --- directory_private_enquiries ---
  async () => {
    const tenantA = await seedRow("tenants");
    const tenantB = await seedRow("tenants");
    const recordA = await buildRecord("directory_private_enquiries", { tenant_id: tenantA.id });
    const recordB = await buildRecord("directory_private_enquiries", { tenant_id: tenantB.id });
    const createdA = await repo.createDirectoryPrivateEnquiry(recordA);
    const createdB = await repo.createDirectoryPrivateEnquiry(recordB);
    assert.equal(createdA.id, recordA.id, "directory_private_enquiries: createX must return the row with the id supplied");
    const listA = await repo.listDirectoryPrivateEnquiriesByTenant(tenantA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "directory_private_enquiries: listXByTenant must include the row scoped to that tenant");
    assert.ok(!listA.some((r) => r.id === createdB.id), "directory_private_enquiries: listXByTenant must NOT include a different tenant's row");
    const fetched = await repo.getDirectoryPrivateEnquiry(createdA.id);
    assert.ok(fetched, "directory_private_enquiries: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "directory_private_enquiries: getX must return the exact row requested");
    const updated = await repo.updateDirectoryPrivateEnquiry(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "directory_private_enquiries: updateX must persist the patched metadata");
    const untouched = await repo.getDirectoryPrivateEnquiry(createdA.id);
    assert.equal(untouched.id, createdA.id, "directory_private_enquiries: row must still exist and be fetchable after update");
    return "directory_private_enquiries";
  },
  // --- qualification_renewal_reviews ---
  async () => {
    const tenantA = await seedRow("tenants");
    const tenantB = await seedRow("tenants");
    const recordA = await buildRecord("qualification_renewal_reviews", { tenant_id: tenantA.id });
    const recordB = await buildRecord("qualification_renewal_reviews", { tenant_id: tenantB.id });
    const createdA = await repo.createQualificationRenewalReview(recordA);
    const createdB = await repo.createQualificationRenewalReview(recordB);
    assert.equal(createdA.id, recordA.id, "qualification_renewal_reviews: createX must return the row with the id supplied");
    const listA = await repo.listQualificationRenewalReviewsByTenant(tenantA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "qualification_renewal_reviews: listXByTenant must include the row scoped to that tenant");
    assert.ok(!listA.some((r) => r.id === createdB.id), "qualification_renewal_reviews: listXByTenant must NOT include a different tenant's row");
    const fetched = await repo.getQualificationRenewalReview(createdA.id);
    assert.ok(fetched, "qualification_renewal_reviews: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "qualification_renewal_reviews: getX must return the exact row requested");
    const updated = await repo.updateQualificationRenewalReview(createdA.id, { evidence_refs: { contractTestUpdated: true } });
    assert.deepEqual(updated.evidence_refs, { contractTestUpdated: true }, "qualification_renewal_reviews: updateX must persist the patched evidence_refs");
    const untouched = await repo.getQualificationRenewalReview(createdA.id);
    assert.equal(untouched.id, createdA.id, "qualification_renewal_reviews: row must still exist and be fetchable after update");
    return "qualification_renewal_reviews";
  },
  // --- capacity_offers ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("capacity_offers", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("capacity_offers", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createCapacityOffer(recordA);
    const createdB = await repo.createCapacityOffer(recordB);
    assert.equal(createdA.id, recordA.id, "capacity_offers: createX must return the row with the id supplied");
    const listA = await repo.listCapacityOffersByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "capacity_offers: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "capacity_offers: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getCapacityOffer(createdA.id);
    assert.ok(fetched, "capacity_offers: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "capacity_offers: getX must return the exact row requested");
    const updated = await repo.updateCapacityOffer(createdA.id, { jurisdiction_refs: { contractTestUpdated: true } });
    assert.deepEqual(updated.jurisdiction_refs, { contractTestUpdated: true }, "capacity_offers: updateX must persist the patched jurisdiction_refs");
    const untouched = await repo.getCapacityOffer(createdA.id);
    assert.equal(untouched.id, createdA.id, "capacity_offers: row must still exist and be fetchable after update");
    return "capacity_offers";
  },
  // --- collaboration_requests ---
  async () => {
    const tenantA = await seedRow("tenants");
    const tenantB = await seedRow("tenants");
    const recordA = await buildRecord("collaboration_requests", { tenant_id: tenantA.id });
    const recordB = await buildRecord("collaboration_requests", { tenant_id: tenantB.id });
    const createdA = await repo.createCollaborationRequest(recordA);
    const createdB = await repo.createCollaborationRequest(recordB);
    assert.equal(createdA.id, recordA.id, "collaboration_requests: createX must return the row with the id supplied");
    const listA = await repo.listCollaborationRequestsByTenant(tenantA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "collaboration_requests: listXByTenant must include the row scoped to that tenant");
    assert.ok(!listA.some((r) => r.id === createdB.id), "collaboration_requests: listXByTenant must NOT include a different tenant's row");
    const fetched = await repo.getCollaborationRequest(createdA.id);
    assert.ok(fetched, "collaboration_requests: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "collaboration_requests: getX must return the exact row requested");
    const updated = await repo.updateCollaborationRequest(createdA.id, { data_room_policy: { contractTestUpdated: true } });
    assert.deepEqual(updated.data_room_policy, { contractTestUpdated: true }, "collaboration_requests: updateX must persist the patched data_room_policy");
    const untouched = await repo.getCollaborationRequest(createdA.id);
    assert.equal(untouched.id, createdA.id, "collaboration_requests: row must still exist and be fetchable after update");
    return "collaboration_requests";
  },
  // --- network_professional_profiles ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("network_professional_profiles", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("network_professional_profiles", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createNetworkProfessionalProfile(recordA);
    const createdB = await repo.createNetworkProfessionalProfile(recordB);
    assert.equal(createdA.id, recordA.id, "network_professional_profiles: createX must return the row with the id supplied");
    const listA = await repo.listNetworkProfessionalProfilesByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "network_professional_profiles: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "network_professional_profiles: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getNetworkProfessionalProfile(createdA.id);
    assert.ok(fetched, "network_professional_profiles: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "network_professional_profiles: getX must return the exact row requested");
    const updated = await repo.updateNetworkProfessionalProfile(createdA.id, { jurisdiction_refs: { contractTestUpdated: true } });
    assert.deepEqual(updated.jurisdiction_refs, { contractTestUpdated: true }, "network_professional_profiles: updateX must persist the patched jurisdiction_refs");
    const untouched = await repo.getNetworkProfessionalProfile(createdA.id);
    assert.equal(untouched.id, createdA.id, "network_professional_profiles: row must still exist and be fetchable after update");
    return "network_professional_profiles";
  },
  // --- network_firm_profiles ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("network_firm_profiles", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("network_firm_profiles", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createNetworkFirmProfile(recordA);
    const createdB = await repo.createNetworkFirmProfile(recordB);
    assert.equal(createdA.id, recordA.id, "network_firm_profiles: createX must return the row with the id supplied");
    const listA = await repo.listNetworkFirmProfilesByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "network_firm_profiles: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "network_firm_profiles: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getNetworkFirmProfile(createdA.id);
    assert.ok(fetched, "network_firm_profiles: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "network_firm_profiles: getX must return the exact row requested");
    const updated = await repo.updateNetworkFirmProfile(createdA.id, { jurisdiction_refs: { contractTestUpdated: true } });
    assert.deepEqual(updated.jurisdiction_refs, { contractTestUpdated: true }, "network_firm_profiles: updateX must persist the patched jurisdiction_refs");
    const untouched = await repo.getNetworkFirmProfile(createdA.id);
    assert.equal(untouched.id, createdA.id, "network_firm_profiles: row must still exist and be fetchable after update");
    return "network_firm_profiles";
  },
  // --- network_capabilities ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("network_capabilities", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("network_capabilities", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createNetworkCapability(recordA);
    const createdB = await repo.createNetworkCapability(recordB);
    assert.equal(createdA.id, recordA.id, "network_capabilities: createX must return the row with the id supplied");
    const listA = await repo.listNetworkCapabilitiesByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "network_capabilities: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "network_capabilities: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getNetworkCapability(createdA.id);
    assert.ok(fetched, "network_capabilities: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "network_capabilities: getX must return the exact row requested");
    const updated = await repo.updateNetworkCapability(createdA.id, { jurisdiction_refs: { contractTestUpdated: true } });
    assert.deepEqual(updated.jurisdiction_refs, { contractTestUpdated: true }, "network_capabilities: updateX must persist the patched jurisdiction_refs");
    const untouched = await repo.getNetworkCapability(createdA.id);
    assert.equal(untouched.id, createdA.id, "network_capabilities: row must still exist and be fetchable after update");
    return "network_capabilities";
  },
  // --- network_credentials ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("network_credentials", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("network_credentials", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createNetworkCredential(recordA);
    const createdB = await repo.createNetworkCredential(recordB);
    assert.equal(createdA.id, recordA.id, "network_credentials: createX must return the row with the id supplied");
    const listA = await repo.listNetworkCredentialsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "network_credentials: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "network_credentials: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getNetworkCredential(createdA.id);
    assert.ok(fetched, "network_credentials: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "network_credentials: getX must return the exact row requested");
    const updated = await repo.updateNetworkCredential(createdA.id, { jurisdiction_refs: { contractTestUpdated: true } });
    assert.deepEqual(updated.jurisdiction_refs, { contractTestUpdated: true }, "network_credentials: updateX must persist the patched jurisdiction_refs");
    const untouched = await repo.getNetworkCredential(createdA.id);
    assert.equal(untouched.id, createdA.id, "network_credentials: row must still exist and be fetchable after update");
    return "network_credentials";
  },
  // --- network_trust_signals ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("network_trust_signals", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("network_trust_signals", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createNetworkTrustSignal(recordA);
    const createdB = await repo.createNetworkTrustSignal(recordB);
    assert.equal(createdA.id, recordA.id, "network_trust_signals: createX must return the row with the id supplied");
    const listA = await repo.listNetworkTrustSignalsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "network_trust_signals: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "network_trust_signals: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getNetworkTrustSignal(createdA.id);
    assert.ok(fetched, "network_trust_signals: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "network_trust_signals: getX must return the exact row requested");
    const updated = await repo.updateNetworkTrustSignal(createdA.id, { evidence_refs: { contractTestUpdated: true } });
    assert.deepEqual(updated.evidence_refs, { contractTestUpdated: true }, "network_trust_signals: updateX must persist the patched evidence_refs");
    const untouched = await repo.getNetworkTrustSignal(createdA.id);
    assert.equal(untouched.id, createdA.id, "network_trust_signals: row must still exist and be fetchable after update");
    return "network_trust_signals";
  },
  // --- network_conflict_checks ---
  async () => {
    const tenantA = await seedRow("tenants");
    const tenantB = await seedRow("tenants");
    const recordA = await buildRecord("network_conflict_checks", { tenant_id: tenantA.id });
    const recordB = await buildRecord("network_conflict_checks", { tenant_id: tenantB.id });
    const createdA = await repo.createNetworkConflictCheck(recordA);
    const createdB = await repo.createNetworkConflictCheck(recordB);
    assert.equal(createdA.id, recordA.id, "network_conflict_checks: createX must return the row with the id supplied");
    const listA = await repo.listNetworkConflictChecksByTenant(tenantA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "network_conflict_checks: listXByTenant must include the row scoped to that tenant");
    assert.ok(!listA.some((r) => r.id === createdB.id), "network_conflict_checks: listXByTenant must NOT include a different tenant's row");
    const fetched = await repo.getNetworkConflictCheck(createdA.id);
    assert.ok(fetched, "network_conflict_checks: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "network_conflict_checks: getX must return the exact row requested");
    const updated = await repo.updateNetworkConflictCheck(createdA.id, { evidence_refs: { contractTestUpdated: true } });
    assert.deepEqual(updated.evidence_refs, { contractTestUpdated: true }, "network_conflict_checks: updateX must persist the patched evidence_refs");
    const untouched = await repo.getNetworkConflictCheck(createdA.id);
    assert.equal(untouched.id, createdA.id, "network_conflict_checks: row must still exist and be fetchable after update");
    return "network_conflict_checks";
  },
  // --- network_qualification_gates ---
  async () => {
    const tenantA = await seedRow("tenants");
    const tenantB = await seedRow("tenants");
    const recordA = await buildRecord("network_qualification_gates", { tenant_id: tenantA.id });
    const recordB = await buildRecord("network_qualification_gates", { tenant_id: tenantB.id });
    const createdA = await repo.createNetworkQualificationGate(recordA);
    const createdB = await repo.createNetworkQualificationGate(recordB);
    assert.equal(createdA.id, recordA.id, "network_qualification_gates: createX must return the row with the id supplied");
    const listA = await repo.listNetworkQualificationGatesByTenant(tenantA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "network_qualification_gates: listXByTenant must include the row scoped to that tenant");
    assert.ok(!listA.some((r) => r.id === createdB.id), "network_qualification_gates: listXByTenant must NOT include a different tenant's row");
    const fetched = await repo.getNetworkQualificationGate(createdA.id);
    assert.ok(fetched, "network_qualification_gates: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "network_qualification_gates: getX must return the exact row requested");
    const updated = await repo.updateNetworkQualificationGate(createdA.id, { denial_reasons: { contractTestUpdated: true } });
    assert.deepEqual(updated.denial_reasons, { contractTestUpdated: true }, "network_qualification_gates: updateX must persist the patched denial_reasons");
    const untouched = await repo.getNetworkQualificationGate(createdA.id);
    assert.equal(untouched.id, createdA.id, "network_qualification_gates: row must still exist and be fetchable after update");
    return "network_qualification_gates";
  },
  // --- specialist_invitations ---
  async () => {
    const tenantA = await seedRow("tenants");
    const tenantB = await seedRow("tenants");
    const recordA = await buildRecord("specialist_invitations", { tenant_id: tenantA.id });
    const recordB = await buildRecord("specialist_invitations", { tenant_id: tenantB.id });
    const createdA = await repo.createSpecialistInvitation(recordA);
    const createdB = await repo.createSpecialistInvitation(recordB);
    assert.equal(createdA.id, recordA.id, "specialist_invitations: createX must return the row with the id supplied");
    const listA = await repo.listSpecialistInvitationsByTenant(tenantA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "specialist_invitations: listXByTenant must include the row scoped to that tenant");
    assert.ok(!listA.some((r) => r.id === createdB.id), "specialist_invitations: listXByTenant must NOT include a different tenant's row");
    const fetched = await repo.getSpecialistInvitation(createdA.id);
    assert.ok(fetched, "specialist_invitations: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "specialist_invitations: getX must return the exact row requested");
    const updated = await repo.updateSpecialistInvitation(createdA.id, { denial_reasons: { contractTestUpdated: true } });
    assert.deepEqual(updated.denial_reasons, { contractTestUpdated: true }, "specialist_invitations: updateX must persist the patched denial_reasons");
    const untouched = await repo.getSpecialistInvitation(createdA.id);
    assert.equal(untouched.id, createdA.id, "specialist_invitations: row must still exist and be fetchable after update");
    return "specialist_invitations";
  },
  // --- collaboration_workspaces ---
  async () => {
    const tenantA = await seedRow("tenants");
    const tenantB = await seedRow("tenants");
    const recordA = await buildRecord("collaboration_workspaces", { tenant_id: tenantA.id });
    const recordB = await buildRecord("collaboration_workspaces", { tenant_id: tenantB.id });
    const createdA = await repo.createCollaborationWorkspace(recordA);
    const createdB = await repo.createCollaborationWorkspace(recordB);
    assert.equal(createdA.id, recordA.id, "collaboration_workspaces: createX must return the row with the id supplied");
    const listA = await repo.listCollaborationWorkspacesByTenant(tenantA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "collaboration_workspaces: listXByTenant must include the row scoped to that tenant");
    assert.ok(!listA.some((r) => r.id === createdB.id), "collaboration_workspaces: listXByTenant must NOT include a different tenant's row");
    const fetched = await repo.getCollaborationWorkspace(createdA.id);
    assert.ok(fetched, "collaboration_workspaces: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "collaboration_workspaces: getX must return the exact row requested");
    const updated = await repo.updateCollaborationWorkspace(createdA.id, { data_room_policy: { contractTestUpdated: true } });
    assert.deepEqual(updated.data_room_policy, { contractTestUpdated: true }, "collaboration_workspaces: updateX must persist the patched data_room_policy");
    const untouched = await repo.getCollaborationWorkspace(createdA.id);
    assert.equal(untouched.id, createdA.id, "collaboration_workspaces: row must still exist and be fetchable after update");
    return "collaboration_workspaces";
  },
  // --- collaboration_workspace_participants ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("collaboration_workspace_participants", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("collaboration_workspace_participants", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createCollaborationWorkspaceParticipant(recordA);
    const createdB = await repo.createCollaborationWorkspaceParticipant(recordB);
    assert.equal(createdA.id, recordA.id, "collaboration_workspace_participants: createX must return the row with the id supplied");
    const listA = await repo.listCollaborationWorkspaceParticipantsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "collaboration_workspace_participants: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "collaboration_workspace_participants: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getCollaborationWorkspaceParticipant(createdA.id);
    assert.ok(fetched, "collaboration_workspace_participants: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "collaboration_workspace_participants: getX must return the exact row requested");
    const updated = await repo.updateCollaborationWorkspaceParticipant(createdA.id, { permissions: { contractTestUpdated: true } });
    assert.deepEqual(updated.permissions, { contractTestUpdated: true }, "collaboration_workspace_participants: updateX must persist the patched permissions");
    const untouched = await repo.getCollaborationWorkspaceParticipant(createdA.id);
    assert.equal(untouched.id, createdA.id, "collaboration_workspace_participants: row must still exist and be fetchable after update");
    return "collaboration_workspace_participants";
  },
  // --- collaboration_workspace_evidence ---
  async () => {
    const tenantA = await seedRow("tenants");
    const tenantB = await seedRow("tenants");
    const recordA = await buildRecord("collaboration_workspace_evidence", { tenant_id: tenantA.id });
    const recordB = await buildRecord("collaboration_workspace_evidence", { tenant_id: tenantB.id });
    const createdA = await repo.createCollaborationWorkspaceEvidence(recordA);
    const createdB = await repo.createCollaborationWorkspaceEvidence(recordB);
    assert.equal(createdA.id, recordA.id, "collaboration_workspace_evidence: createX must return the row with the id supplied");
    const listA = await repo.listCollaborationWorkspaceEvidenceByTenant(tenantA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "collaboration_workspace_evidence: listXByTenant must include the row scoped to that tenant");
    assert.ok(!listA.some((r) => r.id === createdB.id), "collaboration_workspace_evidence: listXByTenant must NOT include a different tenant's row");
    const fetched = await repo.getCollaborationWorkspaceEvidence(createdA.id);
    assert.ok(fetched, "collaboration_workspace_evidence: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "collaboration_workspace_evidence: getX must return the exact row requested");
    const updated = await repo.updateCollaborationWorkspaceEvidence(createdA.id, { metadata: { contractTestUpdated: true } });
    assert.deepEqual(updated.metadata, { contractTestUpdated: true }, "collaboration_workspace_evidence: updateX must persist the patched metadata");
    const untouched = await repo.getCollaborationWorkspaceEvidence(createdA.id);
    assert.equal(untouched.id, createdA.id, "collaboration_workspace_evidence: row must still exist and be fetchable after update");
    return "collaboration_workspace_evidence";
  },
  // --- responsibility_matrices ---
  async () => {
    const tenantA = await seedRow("tenants");
    const tenantB = await seedRow("tenants");
    const recordA = await buildRecord("responsibility_matrices", { tenant_id: tenantA.id });
    const recordB = await buildRecord("responsibility_matrices", { tenant_id: tenantB.id });
    const createdA = await repo.createResponsibilityMatrix(recordA);
    const createdB = await repo.createResponsibilityMatrix(recordB);
    assert.equal(createdA.id, recordA.id, "responsibility_matrices: createX must return the row with the id supplied");
    const listA = await repo.listResponsibilityMatricesByTenant(tenantA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "responsibility_matrices: listXByTenant must include the row scoped to that tenant");
    assert.ok(!listA.some((r) => r.id === createdB.id), "responsibility_matrices: listXByTenant must NOT include a different tenant's row");
    const fetched = await repo.getResponsibilityMatrix(createdA.id);
    assert.ok(fetched, "responsibility_matrices: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "responsibility_matrices: getX must return the exact row requested");
    const updated = await repo.updateResponsibilityMatrix(createdA.id, { permitted_worker_actions: { contractTestUpdated: true } });
    assert.deepEqual(updated.permitted_worker_actions, { contractTestUpdated: true }, "responsibility_matrices: updateX must persist the patched permitted_worker_actions");
    const untouched = await repo.getResponsibilityMatrix(createdA.id);
    assert.equal(untouched.id, createdA.id, "responsibility_matrices: row must still exist and be fetchable after update");
    return "responsibility_matrices";
  },
  // --- specialist_assignments ---
  async () => {
    const tenantA = await seedRow("tenants");
    const tenantB = await seedRow("tenants");
    const recordA = await buildRecord("specialist_assignments", { tenant_id: tenantA.id });
    const recordB = await buildRecord("specialist_assignments", { tenant_id: tenantB.id });
    const createdA = await repo.createSpecialistAssignment(recordA);
    const createdB = await repo.createSpecialistAssignment(recordB);
    assert.equal(createdA.id, recordA.id, "specialist_assignments: createX must return the row with the id supplied");
    const listA = await repo.listSpecialistAssignmentsByTenant(tenantA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "specialist_assignments: listXByTenant must include the row scoped to that tenant");
    assert.ok(!listA.some((r) => r.id === createdB.id), "specialist_assignments: listXByTenant must NOT include a different tenant's row");
    const fetched = await repo.getSpecialistAssignment(createdA.id);
    assert.ok(fetched, "specialist_assignments: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "specialist_assignments: getX must return the exact row requested");
    const updated = await repo.updateSpecialistAssignment(createdA.id, { evidence_refs: { contractTestUpdated: true } });
    assert.deepEqual(updated.evidence_refs, { contractTestUpdated: true }, "specialist_assignments: updateX must persist the patched evidence_refs");
    const untouched = await repo.getSpecialistAssignment(createdA.id);
    assert.equal(untouched.id, createdA.id, "specialist_assignments: row must still exist and be fetchable after update");
    return "specialist_assignments";
  },
  // --- observatory_snapshots ---
  async () => {
    const tenantA = await seedRow("tenants");
    const firmA = await seedRow("firms", { tenant_id: tenantA.id });
    const tenantB = await seedRow("tenants");
    const firmB = await seedRow("firms", { tenant_id: tenantB.id });
    const recordA = await buildRecord("observatory_snapshots", { tenant_id: tenantA.id, firm_id: firmA.id });
    const recordB = await buildRecord("observatory_snapshots", { tenant_id: tenantB.id, firm_id: firmB.id });
    const createdA = await repo.createObservatorySnapshot(recordA);
    const createdB = await repo.createObservatorySnapshot(recordB);
    assert.equal(createdA.id, recordA.id, "observatory_snapshots: createX must return the row with the id supplied");
    const listA = await repo.listObservatorySnapshotsByFirm(tenantA.id, firmA.id);
    assert.ok(listA.some((r) => r.id === createdA.id), "observatory_snapshots: listXByFirm must include the row scoped to that firm");
    assert.ok(!listA.some((r) => r.id === createdB.id), "observatory_snapshots: listXByFirm must NOT include a different firm's row");
    const fetched = await repo.getObservatorySnapshot(createdA.id);
    assert.ok(fetched, "observatory_snapshots: getX must find the row by id");
    assert.equal(fetched.id, createdA.id, "observatory_snapshots: getX must return the exact row requested");
    const updated = await repo.updateObservatorySnapshot(createdA.id, { metrics: { contractTestUpdated: true } });
    assert.deepEqual(updated.metrics, { contractTestUpdated: true }, "observatory_snapshots: updateX must persist the patched metrics");
    const untouched = await repo.getObservatorySnapshot(createdA.id);
    assert.equal(untouched.id, createdA.id, "observatory_snapshots: row must still exist and be fetchable after update");
    return "observatory_snapshots";
  },
];

const results = [];
for (const test of tests) {
  results.push(await test());
}
console.log(JSON.stringify({ suite: "network-marketplace.contract.test", tables_passed: results.length, tables: results }, null, 2));
