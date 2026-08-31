import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { evaluatePolicy } from "../packages/policy-engine/src/index.mjs";

const root = process.cwd();
const parseJson = async (path) => JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/, ""));
const fixtures = await parseJson(join(root, "tests/policy/policy-fixtures.json"));
const failures = [];

for (const fixture of fixtures) {
  const actual = evaluatePolicy(fixture.input);
  if (actual.result !== fixture.expected_result) {
    failures.push(`${fixture.name}: expected ${fixture.expected_result}, got ${actual.result}. Reasons: ${actual.reasons.join("; ")}`);
  }
}

if (failures.length > 0) {
  console.error("Policy tests failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Policy tests passed (${fixtures.length} fixtures).`);
