// VI-S4 (ADR-112): the scorecard service. Read-only and owner-only.
//
// Reads only this firm's own records (tenant AND firm on every list), hands them to the pure engine
// (packages/core-domain/src/edcs-scorecard.mjs) and returns the numbers. Nothing is saved and nothing is
// sent: scorecards are always computed from the records as they are now.

import { readStore } from "./store.mjs";
import { edcsRepository as repo } from "./edcs-repository.mjs";
import { isFirmOwner } from "./edcs-owner.mjs";
import { buildScorecards, resolvePeriod } from "../../../packages/core-domain/src/edcs-scorecard.mjs";
import { todayInKL } from "../../../packages/core-domain/src/edcs-standing.mjs";

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

// Today in Malaysia time. VFIRM_AUTOMATION_AS_OF pins it (YYYY-MM-DD) for tests and rehearsals only.
function today() {
  const pinned = process.env.VFIRM_AUTOMATION_AS_OF;
  return pinned && /^\d{4}-\d{2}-\d{2}$/.test(pinned) ? pinned : todayInKL();
}

export async function readScorecards({ scope, actor, params }) {
  if (!isFirmOwner(actor)) throw httpError(403, "EDCS_OWNER_REQUIRED", "Scorecards are for the firm owner.");
  const asOf = today();
  const window = resolvePeriod({ period: params.get("period") || "90d", from: params.get("from") || undefined, to: params.get("to") || undefined }, asOf);
  if (!window.ok) throw httpError(400, "VALIDATION_ERROR", window.error);
  const store = await readStore(scope.tenant_id, { ledger: false });
  const mine = (list) => (list ?? []).filter((record) => record.tenant_id === scope.tenant_id && record.firm_id === scope.firm_id);
  const transactions = (await repo.listTransactions(scope)).filter((record) => record.tenant_id === scope.tenant_id && record.firm_id === scope.firm_id);
  return buildScorecards({
    as_of: asOf, window,
    requests: mine(store.work_requests), items: mine(store.awia_staff_workdesk_items), drafts: mine(store.awia_staff_output_drafts),
    reviews: mine(store.awia_staff_output_reviews), messages: mine(store.awia_staff_conversation_messages),
    clients: mine(store.clients), relationships: mine(store.firm_client_relationships), invoices: mine(store.invoices),
    transactions
  });
}
