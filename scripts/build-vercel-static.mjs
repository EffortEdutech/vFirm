// Vercel build step (ADR-104): assemble the console's static files into dist/.
// Mirrors what apps/web-console/src/server.mjs serves: the public folder at /, and the shared
// identity-resolution module at /shared/identity-resolution.mjs. API calls (/api/...) go to api/index.mjs.
import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");
await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, "shared"), { recursive: true });
await cp(join(root, "apps/web-console/public"), dist, { recursive: true });
await cp(join(root, "packages/core-domain/src/identity-resolution.mjs"), join(dist, "shared/identity-resolution.mjs"));
console.log("vFirm console static files written to dist/");
