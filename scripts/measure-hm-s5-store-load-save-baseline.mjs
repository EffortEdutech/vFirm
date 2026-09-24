// HM-S5 item 1: Baseline & instrumentation (2026-09-22).
//
// This measures the ACTUAL cost of apps/api/src/store.mjs's readStore()
// (and, opt-in only, a full save round trip via withStore()) against
// whichever database this process's environment points at -- run it
// against the real live database (the same DATABASE_URL the running app
// uses) to get the sprint's "before" numbers, per HM-S5's checklist item
// 1 in the Claude Doc.
//
// SAFETY: reading is always safe (readStore() is read-only). Timing the
// SAVE path is not read-only -- withStore(async (store) => store) is an
// identity mutator (it does not change any data), but saveStore() still
// re-persists every row it iterates over, which is real write load
// against a real database. That half of this script is gated behind an
// explicit --with-write flag and is OFF by default, so simply running
// `node scripts/measure-hm-s5-store-load-save-baseline.mjs` never writes
// anything. Only pass --with-write once you're ready to measure the real
// write-path cost this sprint exists to fix.
//
// This intentionally does NOT run in the cloud session that authored it --
// per this engagement's established pattern, every live-database check is
// run by the product owner on their own device checkout (see every prior
// ADR's "Regression evidence" section), and this script is meant to be
// run the same way: `npm run measure:hm-s5:store-baseline` (read-only) or
// `npm run measure:hm-s5:store-baseline -- --with-write` (adds the write
// timing), with the output pasted back for the sprint record.

import { readStore, withStore, isPostgresStore } from "../apps/api/src/store.mjs";

const withWrite = process.argv.includes("--with-write");

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return {
    min_ms: Math.round(sorted[0]),
    median_ms: Math.round(sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2),
    max_ms: Math.round(sorted[sorted.length - 1]),
    samples_ms: sorted.map((v) => Math.round(v)),
  };
}

async function timeReadStore(iterations) {
  const samples = [];
  let lastStore = null;
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    lastStore = await readStore();
    samples.push(performance.now() - start);
  }
  return { samples, store: lastStore };
}

async function timeSaveRoundTrip(iterations) {
  const samples = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    // Identity mutator -- withStore() still runs the REAL loadStore() +
    // saveStore() pair, so this is a genuine measurement of the full
    // read-then-persist-everything round trip every write handler pays,
    // without changing any actual data (the mutator returns the store
    // object unmodified).
    await withStore(async (store) => store);
    samples.push(performance.now() - start);
  }
  return samples;
}

function collectionCounts(store) {
  const counts = {};
  for (const [key, value] of Object.entries(store)) {
    if (Array.isArray(value)) counts[key] = value.length;
  }
  return counts;
}

function firmAndTenantBreakdown(store) {
  const tenantCount = Array.isArray(store.tenants) ? store.tenants.length : null;
  const firmCount = Array.isArray(store.firms) ? store.firms.length : null;
  // The three collections that grow purely from historical activity and
  // are never pruned -- these are read AND re-persisted in full on every
  // request today, which is the exact cost HM-S5 exists to eliminate.
  const historicalTotal = ["audit_events", "event_log", "policy_decisions"].reduce(
    (sum, key) => sum + (Array.isArray(store[key]) ? store[key].length : 0),
    0
  );
  return { tenant_count: tenantCount, firm_count: firmCount, historical_ledger_row_total: historicalTotal };
}

console.log(`Backend: ${isPostgresStore() ? "postgres" : "json (local file)"}`);
console.log("Timing readStore() (read-only, safe) ...");

const READ_ITERATIONS = 3;
const { samples: readSamples, store } = await timeReadStore(READ_ITERATIONS);
const readStats = stats(readSamples);
const counts = collectionCounts(store);
const breakdown = firmAndTenantBreakdown(store);

let writeStats = null;
if (withWrite) {
  console.log("--with-write set: timing a full read+save round trip via withStore() (identity mutator, no data changed, but a REAL write to the live database) ...");
  const WRITE_ITERATIONS = 2; // fewer -- this is real write load, keep it short
  writeStats = stats(await timeSaveRoundTrip(WRITE_ITERATIONS));
} else {
  console.log("--with-write not set: skipping the save-path timing (read-only run). Pass --with-write to also measure the write path once ready.");
}

console.log(JSON.stringify({
  measurement: "hm-s5-item1-store-load-save-baseline",
  backend: isPostgresStore() ? "postgres" : "json",
  read_store_ms: readStats,
  save_round_trip_ms: writeStats,
  collection_counts: counts,
  summary: breakdown,
  boundary: "read_only_by_default_pass_--with-write_to_also_measure_the_real_save_path"
}, null, 2));
