import { spawn } from "node:child_process";

const checks = [
  ["Release 1 JSON end-to-end", ["scripts/smoke-r1-end-to-end.mjs"]],
  ["Release 1 PostgreSQL end-to-end", ["scripts/smoke-r1-end-to-end.mjs", "--postgres"]],
  ["Release 1 hardening guards", ["scripts/smoke-r1-hardening.mjs"]]
];

for (const [label, args] of checks) {
  console.log(`\n[R1-S4] ${label}`);
  await runNode(args);
}

console.log("\nR1-S4 pilot operations dress rehearsal smoke passed.");

function runNode(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: process.cwd(), stdio: "inherit", env: process.env });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${args.join(" ")} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}
