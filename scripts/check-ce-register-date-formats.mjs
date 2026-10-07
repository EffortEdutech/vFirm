// ADR-105: the register date reader accepts day-month-year (read DAY FIRST) as well as ISO and Excel serials.
// Pure check on normalizeRegisterDate; no server, no database.
import assert from "node:assert/strict";
import { normalizeRegisterDate } from "../packages/core-domain/src/edcs-register.mjs";

const ok = (input, expected) => {
  const result = normalizeRegisterDate(input);
  assert.deepEqual(result, { ok: true, value: expected }, `${JSON.stringify(input)} should read as ${expected}, got ${JSON.stringify(result)}`);
};
const bad = (input) => {
  const result = normalizeRegisterDate(input);
  assert.equal(result.ok, false, `${JSON.stringify(input)} must be INVALID, got ${JSON.stringify(result)}`);
  assert.equal(result.value, null);
};

// unchanged behaviour
ok("", null);
ok("   ", null);
ok(null, null);
ok("2026-09-01", "2026-09-01");
ok("2026-12-31", "2026-12-31");
ok("46266", "2026-09-01");           // Excel serial
bad("2026-02-30");
bad("next Friday");
bad("RM 1,200");
bad("0");

// the case from the Windows test: Excel rewrote 2026-09-01 as 01-09-26
ok("01-09-26", "2026-09-01");
ok("02-09-26", "2026-09-02");
ok("31-12-26", "2026-12-31");

// day first, never month first: 03-04-26 is 3 April, not 4 March
ok("03-04-26", "2026-04-03");
ok("13-01-26", "2026-01-13");        // only valid if day first
bad("01-13-26");                      // month 13 -> invalid, proves day-first

// the other separators and four-digit years
ok("01/09/26", "2026-09-01");
ok("01.09.26", "2026-09-01");
ok("01-09-2026", "2026-09-01");
ok("1/9/26", "2026-09-01");
ok("1-9-2026", "2026-09-01");
ok("2026/09/01", "2026-09-01");

// two-digit years mean 20YY
ok("01-01-00", "2000-01-01");
ok("01-01-99", "2099-01-01");

// leap days are real dates only in leap years
ok("29-02-28", "2028-02-29");
bad("29-02-27");
bad("31-04-26");
bad("31-02-26");
bad("00-09-26");
bad("32-01-26");

// mixed separators and stray text stay invalid
bad("01-09/26");
bad("01-09-2");
bad("01-09-202");
bad("01 Sep 2026");
bad("2026-9-1");
bad("1-9");

console.log(JSON.stringify({ ok: true, check: "ce-register-date-formats" }));
