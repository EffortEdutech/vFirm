import { spawn } from "node:child_process";

const port = 3098;
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["apps/web/src/server.mjs"], {
  env: { ...process.env, VFIRM_WEB_PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"]
});

const logs = [];
child.stdout.on("data", (chunk) => logs.push(chunk.toString()));
child.stderr.on("data", (chunk) => logs.push(chunk.toString()));

async function waitForPage() {
  const started = Date.now();
  while (Date.now() - started < 5000) {
    try {
      const res = await fetch(baseUrl);
      if (res.ok) return await res.text();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Web smoke timed out. Logs:\n${logs.join("")}`);
}

try {
  const html = await waitForPage();
  if (!html.includes("Solopreneur Firm Workspace")) throw new Error("Web shell title not found.");
  const js = await (await fetch(`${baseUrl}/app.js`)).text();
  if (!js.includes("/api")) throw new Error("Web API base is not using same-origin /api proxy.");
  console.log("Web smoke test passed.");
} finally {
  child.kill();
}



