// CE-S6 (ADR-101): the connector agent.
//
// One cycle (runCycle): tell vFirm we are alive (and learn the company code and content policy) -> look at the
// register and the controlled folders and queue what changed -> deliver the queue in order -> tell vFirm how
// it went. The loop (start) repeats the cycle on a timer and also when the file system reports a change in
// the register's or a controlled folder (fs.watch is only a nudge; the timer is the guarantee, which also
// covers UNC shares where change events are unreliable).
//
// What the agent will never do: write to a BizKick folder (outbox.mjs is the single, contained exception),
// send a file's bytes where the content policy says metadata only, or keep sending after vFirm says the
// connector is revoked.

import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { watch } from "node:fs";
import { hostname } from "node:os";
import { dirname, join } from "node:path";
import { AGENT_VERSION } from "./config.mjs";
import { ApiError, createApiClient } from "./api-client.mjs";
import { createQueue } from "./queue.mjs";
import { OutboxError, createOutbox } from "./outbox.mjs";
import { scanRegister } from "./register-sync.mjs";
import { scanControlledFolders } from "./file-sync.mjs";

async function loadState(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return {};
  }
}

async function saveState(path, state) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.tmp`;
  await writeFile(temp, JSON.stringify(state, null, 2), "utf8");
  await rename(temp, path);
}

export function createAgent({ config, log = () => {}, fetchImpl = globalThis.fetch, clock = () => Date.now() }) {
  const statePath = join(config.state_dir, "state.json");
  const queue = createQueue({ dir: config.state_dir, retry: config.retry, clock });
  const api = createApiClient({ baseUrl: config.vfirm_url, token: config.connector_token, fetchImpl });
  const outbox = createOutbox(config);
  let state = null;
  let running = false;
  let stopped = false;
  let timers = [];
  let watchers = [];
  const health = { errors: 0, last_error: null, last_error_at: null, fatal: null };

  const noteError = (message) => {
    health.errors += 1;
    health.last_error = String(message).slice(0, 500);
    health.last_error_at = new Date(clock()).toISOString();
    log("error", health.last_error);
  };

  async function heartbeat() {
    const answer = await api.heartbeat({
      agent_version: AGENT_VERSION, host: hostname(), heartbeat_interval_seconds: config.heartbeat_interval_seconds,
      queue_length: await queue.length(), error_count: health.errors, last_error: health.last_error, last_error_at: health.last_error_at
    });
    state.company_code = answer.connection?.company_code ?? state.company_code ?? null;
    state.content_policy = answer.connection?.content_policy ?? state.content_policy ?? null;
    return answer;
  }

  // Deliver the queue head by head, in order. Stops at the first delivery that must wait.
  async function flush() {
    const outcome = { delivered: 0, duplicates: 0, dead: 0, waiting: false };
    for (;;) {
      const { item, name, waitMs } = await queue.next();
      if (!item) { outcome.waiting = waitMs > 0; return outcome; }
      try {
        const answer = item.kind === "register" ? await api.syncRegister({ ...item.body, idempotency_key: item.idempotency_key }) : await api.syncFile(item.body);
        await queue.ack(name);
        if (answer?.duplicate_delivery) outcome.duplicates += 1;
        outcome.delivered += 1;
        state.last_delivery_at = new Date(clock()).toISOString();
        if (item.kind === "register" && answer?.run) state.last_run = { id: answer.run.id, run_number: answer.run.run_number, status: answer.run.status, counts: answer.run.counts };
      } catch (error) {
        if (!(error instanceof ApiError)) throw error;
        if (error.kind === "REVOKED") { health.fatal = error.code ?? "CONNECTOR_REVOKED"; noteError(`${error.message} The connector has stopped sending; the queue is kept.`); return outcome; }
        if (error.kind === "REJECTED") { await queue.deadLetter(name, error.message); outcome.dead += 1; noteError(`vFirm refused a delivery: ${error.message}`); continue; }
        await queue.retryLater(name, error.message);
        noteError(error.message);
        outcome.waiting = true;
        return outcome;
      }
    }
  }

  // CE-S8: collect approved drafts from vFirm and place each in _vFirm_Outbox (the one folder the connector may
  // write). A file that already exists there is never overwritten; identical bytes count as delivered.
  async function deliverOutbox() {
    const result = { placed: 0, same: 0, conflicts: 0 };
    if (!config.outbox_enabled) return result;
    const pending = await api.outbox();
    for (const item of pending.items ?? []) {
      const bytes = Buffer.from(String(item.content_base64 ?? ""), "base64");
      if (createHash("sha256").update(bytes).digest("hex") !== item.sha256) { noteError(`Outbox file ${item.filename} failed its integrity check; not written.`); continue; }
      const placed = await outbox.place(item.filename, bytes);
      if (placed.status === "CONFLICT") { result.conflicts += 1; noteError(`${item.filename} already exists in the outbox with different content; left untouched.`); continue; }
      await api.outboxAck({ draft_id: item.draft_id, sha256: item.sha256 });
      if (placed.status === "WRITTEN") result.placed += 1; else result.same += 1;
    }
    return result;
  }

  async function runCycle() {
    if (running) return { skipped: true };
    running = true;
    const summary = { heartbeat: null, register: null, files: null, flush: null };
    try {
      state ??= await loadState(statePath);
      if (health.fatal) return { ...summary, fatal: health.fatal };
      try {
        summary.heartbeat = await heartbeat();
      } catch (error) {
        if (!(error instanceof ApiError)) throw error;
        if (error.kind === "REVOKED") { health.fatal = error.code ?? "CONNECTOR_REVOKED"; noteError(error.message); return { ...summary, fatal: health.fatal }; }
        noteError(error.message); // offline: scanning and queuing still go ahead
      }
      try {
        summary.register = await scanRegister({ config, state, queue, companyCode: state.company_code });
        summary.files = await scanControlledFolders({ config, state, queue, companyCode: state.company_code, contentPolicy: state.content_policy });
      } catch (error) {
        noteError(`Cannot read the BizKick folder: ${error.code === "ENOENT" ? `${error.path ?? "a file"} was not found` : error.message}`);
      }
      await saveState(statePath, state); // the queue holds the deliveries; the state holds what they were measured against
      summary.flush = await flush();
      if (!health.fatal) {
        try {
          summary.outbox = await deliverOutbox();
        } catch (error) {
          if (!(error instanceof ApiError || error instanceof OutboxError)) throw error;
          if (error instanceof ApiError && error.kind === "REVOKED") health.fatal = error.code ?? "CONNECTOR_REVOKED";
          noteError(error.message);
        }
      }
      if (summary.flush.delivered > 0 && !summary.flush.waiting && !health.fatal) {
        // A clean round clears the visible error; the counter keeps counting for the record.
        health.last_error = null;
        health.last_error_at = null;
      }
      await saveState(statePath, state);
      try {
        if (!health.fatal) await heartbeat();
      } catch (error) {
        if (error instanceof ApiError && error.kind === "REVOKED") health.fatal = error.code ?? "CONNECTOR_REVOKED";
      }
      await writeFile(join(config.state_dir, "status.json"), JSON.stringify({
        at: new Date(clock()).toISOString(), agent_version: AGENT_VERSION, queue_length: await queue.length(), dead: await queue.deadCount(),
        errors: health.errors, last_error: health.last_error, fatal: health.fatal, last_run: state.last_run ?? null, last_delivery_at: state.last_delivery_at ?? null
      }, null, 2));
      return summary;
    } finally {
      running = false;
    }
  }

  function start() {
    stopped = false;
    const loop = async () => {
      if (stopped) return;
      try { await runCycle(); } catch (error) { noteError(`Unexpected error: ${error.message}`); }
      if (stopped || health.fatal) return;
      timers.push(setTimeout(loop, config.poll_interval_seconds * 1000));
    };
    void loop();
    if (config.watch) {
      let pending = null;
      const nudge = () => {
        if (stopped || pending) return;
        pending = setTimeout(() => { pending = null; void runCycle().catch((error) => noteError(`Unexpected error: ${error.message}`)); }, config.watch_debounce_ms);
        timers.push(pending);
      };
      for (const path of [dirname(config.register_file), ...config.controlled.map((folder) => folder.path)]) {
        try { watchers.push(watch(path, { recursive: true }, nudge)); } catch { /* not watchable here (UNC, Linux recursive): the timer covers it */ }
      }
    }
  }

  function stop() {
    stopped = true;
    for (const timer of timers) clearTimeout(timer);
    for (const watcher of watchers) watcher.close();
    timers = [];
    watchers = [];
  }

  return { runCycle, start, stop, health, queue, get state() { return state; } };
}
