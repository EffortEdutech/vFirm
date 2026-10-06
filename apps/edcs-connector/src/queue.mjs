// CE-S6 (ADR-101): the connector's offline queue.
//
// One JSON file per delivery in <state_dir>/queue. A delivery is written BEFORE it is sent and removed only
// after vFirm acknowledged it, so a crash, a power cut or a dropped network never loses a change. Each one
// carries an idempotency key chosen when it was queued (and kept across retries), so a delivery that reached
// vFirm but whose acknowledgement was lost is recognised and not applied twice.
//
// Order matters (a later change may depend on an earlier one), so the queue is strictly first-in first-out:
// while the head is waiting out a backoff nothing behind it is sent. A delivery vFirm rejects as invalid is
// moved to queue/dead for a person to look at, and does not block the ones behind it.

import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export function createQueue({ dir, retry, clock = () => Date.now() }) {
  const live = join(dir, "queue");
  const dead = join(dir, "queue", "dead");
  let sequence = 0;

  async function ready() {
    await mkdir(dead, { recursive: true });
  }

  async function writeAtomic(path, value) {
    const temp = `${path}.tmp`;
    await writeFile(temp, JSON.stringify(value, null, 2), "utf8");
    await rename(temp, path);
  }

  async function names() {
    await ready();
    return (await readdir(live)).filter((name) => name.endsWith(".json")).sort();
  }

  async function load(name) {
    return JSON.parse(await readFile(join(live, name), "utf8"));
  }

  return {
    async enqueue(kind, body, { idempotencyKey = null } = {}) {
      await ready();
      sequence += 1;
      const id = randomUUID();
      const item = {
        id, kind, idempotency_key: idempotencyKey ?? `${kind}-${id}`, body, attempts: 0,
        queued_at: new Date(clock()).toISOString(), next_attempt_at: 0, last_error: null
      };
      const name = `${String(clock()).padStart(15, "0")}-${String(sequence).padStart(6, "0")}-${kind}-${id}.json`;
      await writeAtomic(join(live, name), item);
      return item;
    },

    async length() {
      return (await names()).length;
    },

    // The head of the queue if it is due now, else null (and when it will be due).
    async next() {
      const all = await names();
      if (!all.length) return { item: null, name: null, waitMs: 0 };
      const item = await load(all[0]);
      const waitMs = Math.max(0, (item.next_attempt_at ?? 0) - clock());
      return waitMs > 0 ? { item: null, name: all[0], waitMs } : { item, name: all[0], waitMs: 0 };
    },

    async ack(name) {
      await rm(join(live, name), { force: true });
    },

    // Retryable failure: keep the delivery, back off exponentially (base, 2x base, 4x ... up to max).
    async retryLater(name, message) {
      const item = await load(name);
      item.attempts += 1;
      item.last_error = String(message).slice(0, 500);
      item.next_attempt_at = clock() + Math.min(retry.max_ms, retry.base_ms * 2 ** (item.attempts - 1));
      await writeAtomic(join(live, name), item);
      return item;
    },

    // Permanent failure: park it in queue/dead with the reason.
    async deadLetter(name, message) {
      const item = await load(name);
      item.last_error = String(message).slice(0, 500);
      item.dead_at = new Date(clock()).toISOString();
      await writeAtomic(join(dead, name), item);
      await rm(join(live, name), { force: true });
      return item;
    },

    async deadCount() {
      await ready();
      return (await readdir(dead)).filter((name) => name.endsWith(".json")).length;
    }
  };
}
