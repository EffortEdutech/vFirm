// Rate limiting (ADR-116): the counter. Postgres when the store is Postgres (shared by every Vercel copy), memory otherwise.
// A counter fault NEVER blocks real work: any database error or a slow answer falls back to a per-copy memory count.

import { getSharedPool, getStoreInfo } from "./store.mjs";
import { retryAfterSeconds, windowStart } from "./rate-limit-policy.mjs";

const memory = new Map(); // `${key}|${windowStart}` -> count
const DB_TIMEOUT_MS = 1500;
let lastSweep = 0;

function memoryCount(key, win) {
  const id = `${key}|${win}`;
  const next = (memory.get(id) ?? 0) + 1;
  memory.set(id, next);
  if (memory.size > 5000) {
    for (const k of memory.keys()) if (!k.endsWith(`|${win}`)) memory.delete(k);
  }
  return next;
}

async function dbCount(key, win) {
  const pool = getSharedPool();
  const run = pool.query(
    `insert into rate_limits (key, window_start, count) values ($1, $2, 1)
     on conflict (key, window_start) do update set count = rate_limits.count + 1
     returning count`,
    [key, win]
  );
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("rate limit store timeout")), DB_TIMEOUT_MS).unref?.());
  const result = await Promise.race([run, timeout]);
  return Number(result.rows[0].count);
}

// Old windows are removed now and then (at most once a minute per copy); never awaited.
function sweep(nowSec) {
  if (nowSec - lastSweep < 60) return;
  lastSweep = nowSec;
  try {
    getSharedPool().query("delete from rate_limits where window_start < $1", [nowSec - 3600]).catch(() => {});
  } catch { /* ignore */ }
}

// -> { allowed, count, limit, retry_after, store: "postgres" | "memory" | "memory-fallback" }
export async function consume({ key, limit, nowMs = Date.now() }) {
  const win = windowStart(nowMs);
  let count;
  let store = "memory";
  if (getStoreInfo().backend === "postgres") {
    try {
      count = await dbCount(key, win);
      store = "postgres";
      sweep(Math.floor(nowMs / 1000));
    } catch {
      count = memoryCount(key, win);
      store = "memory-fallback";
    }
  } else {
    count = memoryCount(key, win);
  }
  const allowed = count <= limit;
  return { allowed, count, limit, retry_after: allowed ? 0 : retryAfterSeconds(nowMs), store };
}

export function resetMemoryForTests() {
  memory.clear();
}
