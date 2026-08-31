import { spawn } from "node:child_process";

const children = [];

function start(name, command, args, env) {
  const child = spawn(command, args, { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  child.stdout.on("data", (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  child.on("exit", (code) => {
    if (code !== 0 && code !== null) console.error(`[${name}] exited with code ${code}`);
  });
}

start("api", process.execPath, ["apps/api/src/server.mjs"], { VFIRM_API_PORT: process.env.VFIRM_API_PORT ?? "3091" });
start("web", process.execPath, ["apps/web/src/server.mjs"], { VFIRM_WEB_PORT: process.env.VFIRM_WEB_PORT ?? "3090" });

console.log("vFirm local dev starting:");
console.log("- Web: http://127.0.0.1:3090");
console.log("- API: http://127.0.0.1:3091");

function shutdown() {
  for (const child of children) child.kill();
}

process.on("SIGINT", () => { shutdown(); process.exit(0); });
process.on("SIGTERM", () => { shutdown(); process.exit(0); });
