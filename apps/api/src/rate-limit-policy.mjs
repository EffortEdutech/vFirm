// Rate limiting (ADR-116, 2026-10-12): which calls count against which limit. Pure rules, no I/O.
//
// Owner decision ("Balanced"): normal calls 240 a minute; expensive actions 20 a minute; sign-in and invite routes
// 10 a minute per IP. Counted per signed-in user; per IP before sign-in. Over the limit -> HTTP 429 with a retry time.
// Fixed one-minute windows. Limits can be tuned by environment without a code change.

export const WINDOW_SECONDS = 60;
export const DEFAULTS = { NORMAL: 240, EXPENSIVE: 20, AUTH: 10 };

// Never counted: health checks, browser pre-flight, and routes that carry their own service/connector token.
const EXEMPT = new Set([
  "GET /health", "GET /auth/provider/config",
  "POST /automation/tick", "GET /mvp/store",
  "POST /edcs/connector/heartbeat", "POST /edcs/sync", "POST /edcs/sync/file", "POST /edcs/connector/outbox", "POST /edcs/connector/outbox/ack"
]);

// Sign-in and invitation routes: counted per IP, even when the caller is signed in.
const AUTH_ROUTES = new Set(["POST /auth/signup-firm", "POST /auth/invite"]);
const AUTH_PREFIXES = ["/pilot/users"];

// Work that is heavy (files, builds, exports, a whole-register sync).
const EXPENSIVE_ROUTES = new Set([
  "POST /awia/virtual-staff/workdesk-item/run-skill",
  "POST /files/upload", "POST /edcs/files/upload", "POST /edcs/register-imports",
  "POST /passports", "POST /passports/preview",
  "POST /standing/instructions/run-now", "POST /edcs/graph/sync",
  "GET /data-protection/export-manifest", "GET /data-protection/export-package"
]);
const EXPENSIVE_GET_PREFIXES = ["/passports/"]; // downloading a built passport

// -> "EXEMPT" | "AUTH" | "EXPENSIVE" | "NORMAL"
export function classify(method, pathname) {
  const m = String(method ?? "GET").toUpperCase();
  if (m === "OPTIONS") return "EXEMPT";
  const key = `${m} ${pathname}`;
  if (EXEMPT.has(key)) return "EXEMPT";
  if (AUTH_ROUTES.has(key) || (m !== "GET" && AUTH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)))) return "AUTH";
  if (EXPENSIVE_ROUTES.has(key)) return "EXPENSIVE";
  if (m === "GET" && EXPENSIVE_GET_PREFIXES.some((p) => pathname.startsWith(p))) return "EXPENSIVE";
  return "NORMAL";
}

function intFrom(value, fallback) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function limitsFrom(env = process.env) {
  return {
    NORMAL: intFrom(env.VFIRM_RATE_NORMAL, DEFAULTS.NORMAL),
    EXPENSIVE: intFrom(env.VFIRM_RATE_EXPENSIVE, DEFAULTS.EXPENSIVE),
    AUTH: intFrom(env.VFIRM_RATE_AUTH, DEFAULTS.AUTH)
  };
}

// On by default only where sign-in is enforced (production); VFIRM_RATE_LIMIT=on forces it, =off disables it.
export function rateLimitEnabled({ env = process.env, enforced = false } = {}) {
  const v = String(env.VFIRM_RATE_LIMIT ?? "").trim().toLowerCase();
  if (["off", "0", "false", "no"].includes(v)) return false;
  if (["on", "1", "true", "yes"].includes(v)) return true;
  return Boolean(enforced);
}

// The caller's address. Forwarded headers are believed only behind a proxy we trust (Vercel, or VFIRM_TRUST_PROXY=true).
export function clientIp({ headers = {}, socketAddress = "", env = process.env } = {}) {
  const trust = Boolean(env.VERCEL) || String(env.VFIRM_TRUST_PROXY ?? "").toLowerCase() === "true";
  if (trust) {
    const fwd = String(headers["x-forwarded-for"] ?? "").split(",")[0].trim();
    if (fwd) return fwd;
    const real = String(headers["x-real-ip"] ?? "").trim();
    if (real) return real;
  }
  return String(socketAddress || "unknown");
}

// -> { cls, limit, key } or null when exempt. A verified actor is counted by user; AUTH is always by IP.
export function rateKey({ method, pathname, actorId, ip, env = process.env }) {
  const cls = classify(method, pathname);
  if (cls === "EXEMPT") return null;
  const limits = limitsFrom(env);
  const who = cls !== "AUTH" && actorId ? `u:${actorId}` : `ip:${ip}`;
  return { cls, limit: limits[cls], key: `${who}|${cls}` };
}

export function windowStart(nowMs = Date.now()) {
  return Math.floor(nowMs / 1000 / WINDOW_SECONDS) * WINDOW_SECONDS;
}

export function retryAfterSeconds(nowMs = Date.now()) {
  return Math.max(1, windowStart(nowMs) + WINDOW_SECONDS - Math.floor(nowMs / 1000));
}
