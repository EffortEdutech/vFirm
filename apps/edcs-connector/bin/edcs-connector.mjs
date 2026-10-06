#!/usr/bin/env node
// CE-S6 (ADR-101): the connector's command line.
//
//   edcs-connector run    [--config <file>]   keep running: poll, watch, deliver, heartbeat (what the Windows task runs)
//   edcs-connector once   [--config <file>]   one cycle, then exit (exit code 0 ok, 2 errors this cycle, 3 revoked)
//   edcs-connector status [--config <file>]   print the local status file
//
// The configuration file defaults to ./connector.config.json, or VFIRM_CONNECTOR_CONFIG.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ConfigError, loadConfig } from "../src/config.mjs";
import { createAgent } from "../src/agent.mjs";

const args = process.argv.slice(2);
const command = args[0] ?? "run";
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const configPath = flag("--config") ?? process.env.VFIRM_CONNECTOR_CONFIG ?? "connector.config.json";
const log = (level, message) => console[level === "error" ? "error" : "log"](`[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`);

try {
  const config = await loadConfig(configPath);
  if (command === "status") {
    try {
      console.log(await readFile(join(config.state_dir, "status.json"), "utf8"));
    } catch {
      console.log(JSON.stringify({ status: "no status yet: the connector has not completed a cycle" }));
    }
  } else if (command === "once") {
    const agent = createAgent({ config, log });
    const summary = await agent.runCycle();
    console.log(JSON.stringify({ register: summary.register, files: summary.files, flush: summary.flush, fatal: agent.health.fatal, errors: agent.health.errors, last_error: agent.health.last_error }, null, 2));
    process.exitCode = agent.health.fatal ? 3 : agent.health.last_error ? 2 : 0;
  } else if (command === "run") {
    const agent = createAgent({ config, log });
    log("info", `vFirm EDCS connector started (topology ${config.topology}); register ${config.register_file}`);
    agent.start();
    const stop = () => { agent.stop(); process.exit(0); };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
  } else {
    console.error(`Unknown command "${command}". Use run, once or status.`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof ConfigError ? error.message : `Connector failed: ${error.message}`);
  process.exitCode = 1;
}
