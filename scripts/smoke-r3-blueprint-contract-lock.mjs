import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { validateFactoryBlueprintBundle, requiredStarterModules } from "../packages/core-domain/src/factory-blueprints.mjs";

const root = process.cwd();
const fixturesDir = join(root, "tests", "factory-blueprints");
const readFixture = async (name) => JSON.parse(await readFile(join(fixturesDir, name), "utf8"));
const expectCode = (result, code) => assert(result.findings.some((finding) => finding.code === code), `Expected finding ${code}, got ${JSON.stringify(result.findings)}`);

const valid = validateFactoryBlueprintBundle(await readFixture("valid-formwork-firm.fixture.json"));
assert.equal(valid.ok, true, JSON.stringify(valid.findings));
for (const moduleCode of requiredStarterModules) {
  assert((await readFixture("valid-formwork-firm.fixture.json")).firm_blueprint.modules.some((item) => item.code === moduleCode && item.enabled === true));
}

const second = validateFactoryBlueprintBundle(await readFixture("second-formwork-firm.fixture.json"));
assert.equal(second.ok, true, JSON.stringify(second.findings));

const missingPrincipal = validateFactoryBlueprintBundle(await readFixture("invalid-missing-principal.fixture.json"));
assert.equal(missingPrincipal.ok, false);
expectCode(missingPrincipal, "VIRTUAL_PRINCIPAL_REQUIRED");

const missingResponsible = validateFactoryBlueprintBundle(await readFixture("invalid-missing-responsible-professional.fixture.json"));
assert.equal(missingResponsible.ok, false);
expectCode(missingResponsible, "RESPONSIBLE_PROFESSIONAL_REQUIRED");

const invalidJurisdiction = validateFactoryBlueprintBundle(await readFixture("invalid-jurisdiction.fixture.json"));
assert.equal(invalidJurisdiction.ok, false);
expectCode(invalidJurisdiction, "SERVICE_JURISDICTION_NOT_ACTIVE");

const unsafeWorker = validateFactoryBlueprintBundle(await readFixture("invalid-unsafe-worker-authority.fixture.json"));
assert.equal(unsafeWorker.ok, false);
expectCode(unsafeWorker, "UNSAFE_WORKER_AUTHORITY");

const approvalBypass = validateFactoryBlueprintBundle(await readFixture("invalid-approval-bypass-pack.fixture.json"));
assert.equal(approvalBypass.ok, false);
expectCode(approvalBypass, "APPROVAL_BYPASS_STATE_DENIED");

console.log("R3-S1 Blueprint Contract Lock smoke passed.");