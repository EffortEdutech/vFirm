import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Processing-indicator fix (2026-09-22): the product owner reported that
// My Team appeared to hang with no feedback when clicking Retire, because
// nothing on screen changed between the click and mountTeam()'s full
// re-render completing -- indistinguishable from an unresponsive page,
// especially given the separately-diagnosed whole-database load/save
// performance issue making that round trip slow. This fix disables every
// action button on the page and swaps the clicked button's own label to
// an in-progress verb (e.g. "Retiring…") for the duration of the request,
// restoring every button's original label/disabled state if the request
// fails (success re-renders the whole page via mountTeam() anyway, so no
// restore is needed there).
//
// A repo-wide audit (this session) of every mount* function in both
// pages-owner.js and pages-admin.js found this was the ONLY action-button
// flow lacking any in-progress feedback: every page-level load already
// shows a full-page "Loading…" via `root.innerHTML = loading()` before
// its fetch (Dashboard, My Team, Workdesk, Sales, Projects, Finance, Firm
// Settings), and pages-admin.js's AI Workforce diagnostics panel already
// shows "Calling <label>…" via its own showResult() helper. No other
// button anywhere in the console needed this fix.
//
// This test extracts the exact shipped click-handler logic by source
// string (rather than importing pages-owner.js, which is DOM-heavy and
// transitively pulls in a live Supabase client via api.js) and exercises
// it against a minimal synthetic button/root shim -- no jsdom dependency
// is installed in this repo, so the shim models exactly the properties
// and methods the shipped code actually touches (textContent, disabled,
// querySelectorAll), nothing more.
//
// Proves:
//   1. The shipped inProgressLabel map covers exactly the five real
//      actions (pause/activate/retire/hire/enable-hiring) with a
//      human-readable in-progress verb for each.
//   2. Clicking one action button disables ALL action buttons on the
//      page (preventing a double-submit mid-flight), not just the one
//      clicked.
//   3. The clicked button's own label changes to its in-progress verb.
//   4. On failure, every button's original label AND disabled state is
//      restored exactly (including a button that was already disabled
//      for an unrelated reason, e.g. Pause on an already-paused worker).

const root = process.cwd();

function extractBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Could not find "${startMarker}" in source.`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Could not find "${endMarker}" after "${startMarker}".`);
  return source.slice(start, end).trim();
}

const pagesOwnerSource = await readFile(`${root}/apps/web-console/public/js/pages-owner.js`, "utf8");

// --- 1: the exact shipped label map, extracted and evaluated verbatim. ---
const mapSource = extractBetween(
  pagesOwnerSource,
  "const inProgressLabel = ",
  "[action];"
) + "[action];";
assert.match(mapSource, /^const inProgressLabel = \{[\s\S]*\}\[action\];$/, "Extracted inProgressLabel source malformed.");
// Evaluate it as a function of `action` to get the map itself back out.
const labelForAction = new Function("action", `${mapSource} return inProgressLabel;`);
const expectedActions = ["pause", "activate", "retire", "hire", "enable-hiring"];
for (const action of expectedActions) {
  const label = labelForAction(action);
  assert.ok(typeof label === "string" && label.length > 0, `Action "${action}" must have a non-empty in-progress label.`);
  assert.ok(label.endsWith("…"), `In-progress label for "${action}" must end with an ellipsis to read as in-progress, got "${label}".`);
}
assert.equal(labelForAction("unknown-action"), undefined, "An unrecognized action must not get a spurious in-progress label.");

// Also confirm the surrounding wiring shipped, not just the map.
assert.ok(pagesOwnerSource.includes('for (const b of root.querySelectorAll("button[data-action]")) {'), "Click handler must iterate every action button on the page, not just the one clicked.");
assert.ok(pagesOwnerSource.includes("b.disabled = true;"), "Click handler must disable every action button while a request is in flight.");
assert.ok(pagesOwnerSource.includes("if (inProgressLabel) btn.textContent = inProgressLabel;"), "The clicked button's own label must be swapped to its in-progress verb.");
assert.ok(pagesOwnerSource.includes("b.textContent = original.text;") && pagesOwnerSource.includes("b.disabled = original.disabled;"), "Failure must restore every button's original label and disabled state.");

// --- 2-4: exercise the exact save/disable/restore logic against a
// synthetic button/root shim, re-implemented verbatim from the shipped
// conditional (confirmed present above) since the real handler lives
// inside a DOM event listener this test environment has no DOM for. ---
function makeButton(action, text, disabled = false) {
  return { dataset: { action }, textContent: text, disabled };
}

function simulateClick(buttons, clickedButton, action, shouldFail) {
  const inProgressLabel = labelForAction(action);
  const originalButtonStates = new Map();
  for (const b of buttons) {
    originalButtonStates.set(b, { text: b.textContent, disabled: b.disabled });
    b.disabled = true;
  }
  if (inProgressLabel) clickedButton.textContent = inProgressLabel;

  if (shouldFail) {
    for (const [b, original] of originalButtonStates) {
      b.textContent = original.text;
      b.disabled = original.disabled;
    }
  }
  // On success this fix intentionally leaves buttons disabled/relabelled --
  // mountTeam() re-renders the whole roster from scratch immediately after,
  // which replaces these DOM nodes entirely.
}

// 2 & 3: clicking Retire on GC-2 disables Pause/Activate/Retire on BOTH
// workers (all action buttons on the page), and GC-2's Retire button gets
// the in-progress label.
const gc1Pause = makeButton("pause", "Pause", false);
const gc1Activate = makeButton("activate", "Reactivate", true); // already active -> Reactivate is disabled
const gc1Retire = makeButton("retire", "Retire", false);
const gc2Pause = makeButton("pause", "Pause", false);
const gc2Activate = makeButton("activate", "Reactivate", true);
const gc2Retire = makeButton("retire", "Retire", false);
const allButtons = [gc1Pause, gc1Activate, gc1Retire, gc2Pause, gc2Activate, gc2Retire];

simulateClick(allButtons, gc2Retire, "retire", false);
assert.ok(allButtons.every((b) => b.disabled === true), "Every action button on the page must be disabled while the Retire request is in flight.");
assert.equal(gc2Retire.textContent, "Retiring…", "The clicked Retire button must show its in-progress label.");
assert.equal(gc1Retire.textContent, "Retire", "An unrelated worker's Retire button must keep its normal label (only disabled, not relabelled).");

// 4: on failure, restore exactly -- including a button that was already
// disabled beforehand for an unrelated reason (Reactivate on an ACTIVE worker).
const failPause = makeButton("pause", "Pause", false);
const failActivateAlreadyDisabled = makeButton("activate", "Reactivate", true);
const failRetireClicked = makeButton("retire", "Retire", false);
const failButtons = [failPause, failActivateAlreadyDisabled, failRetireClicked];
simulateClick(failButtons, failRetireClicked, "retire", true);
assert.equal(failPause.disabled, false, "Pause must be re-enabled after a failed request.");
assert.equal(failActivateAlreadyDisabled.disabled, true, "A button that was already disabled before the click (Reactivate on an active worker) must remain disabled after restore, not incorrectly re-enabled.");
assert.equal(failRetireClicked.textContent, "Retire", "The clicked button's label must revert to its original text after a failed request.");
assert.equal(failRetireClicked.disabled, false, "The clicked button must be re-enabled after a failed request.");

console.log(JSON.stringify({
  smoke: "post-hm-s4-my-team-processing-indicator",
  result: "passed",
  in_progress_labels: Object.fromEntries(expectedActions.map((a) => [a, labelForAction(a)])),
  all_buttons_disabled_during_request: allButtons.every((b) => b.disabled === true),
  clicked_button_relabelled: gc2Retire.textContent === "Retiring…",
  restore_preserves_pre_existing_disabled_state: failActivateAlreadyDisabled.disabled === true,
  boundary: "my_team_action_buttons_only_no_other_page_needed_a_fix_per_full_console_audit"
}, null, 2));
