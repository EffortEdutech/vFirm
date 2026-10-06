// CE-S6 (ADR-101): build the install package for the Windows PC.
//
//   node apps/edcs-connector/scripts/package.mjs [outDir]      (or: npm --prefix apps/edcs-connector run package)
//
// The connector shares three pure files with vFirm (the register reader, the row rules, the file-name ID
// parser). In the repository it imports them from packages/core-domain; in the package they are copied next to
// the connector (lib/) and the import paths are rewritten, so the result is a self-contained folder: no npm
// install, no internet, just Node 20 or newer. Zip the folder and copy it to the PC.

import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, "..");
const core = resolve(app, "../../packages/core-domain/src");
const out = resolve(process.argv[2] ?? join(app, "dist", "vfirm-edcs-connector"));
const SHARED = ["edcs-register.mjs", "tabular-file-reader.mjs", "edcs-chains.mjs"];
const FROM = "../../../packages/core-domain/src/";

await rm(out, { recursive: true, force: true });
await mkdir(join(out, "lib"), { recursive: true });
for (const name of SHARED) await cp(join(core, name), join(out, "lib", name));
for (const entry of ["bin", "src", "packaging"]) await cp(join(app, entry), join(out, entry), { recursive: true });
for (const entry of ["package.json", "config.example.json", "README.md"]) await cp(join(app, entry), join(out, entry));

// rewrite the shared imports in the copied connector sources
let rewritten = 0;
async function rewrite(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { await rewrite(path); continue; }
    if (!entry.name.endsWith(".mjs")) continue;
    const text = await readFile(path, "utf8");
    if (!text.includes(FROM)) continue;
    await writeFile(path, text.replaceAll(FROM, "../lib/"));
    rewritten += 1;
  }
}
await rewrite(join(out, "src"));
console.log(JSON.stringify({ package: out, shared_files: SHARED, sources_rewritten: rewritten }, null, 2));
