// CE-S5 (ADR-099): one definition of "the firm owner" for the Connected EDCS services.
//
// `actor.role` is a free string: the dev header gives "principal"; production gives the pilot role, and
// signup sets it to "OWNER". The old per-service list did not include "OWNER", so a real production owner
// would have been refused EDCS writes. Comparison is case-insensitive and ignores spaces/dashes.
import { isOwnerRole } from "../../../packages/core-domain/src/edcs-delegation.mjs";

export const isFirmOwner = (actor) => actor?.actor_type === "HUMAN" && isOwnerRole(actor?.role ?? "principal");
