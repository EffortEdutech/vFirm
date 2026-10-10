// CE-S6 (ADR-101): the one place the connector may write inside the BizKick folder.
//
// The connector is read-only on BizKick except for an optional <bizkick_root>/_vFirm_Outbox folder (CE-S8
// uses it to hand files back). This module is the only code that writes under bizkick_root, and it refuses
// anything that would land outside the outbox: absolute paths, "..", and drive tricks all throw. It does
// nothing at all unless outbox_enabled is true in the configuration.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export class OutboxError extends Error {}

export function createOutbox(config) {
  const root = resolve(config.outbox_dir);
  function target(name) {
    if (!config.outbox_enabled) throw new OutboxError("The outbox is not enabled (outbox_enabled is false).");
    const text = String(name ?? "");
    if (!text || isAbsolute(text) || /^[a-z]:/i.test(text)) throw new OutboxError("An outbox file name must be a plain relative name.");
    const path = resolve(join(root, text));
    const inside = relative(root, path);
    if (inside === "" || inside.startsWith("..") || isAbsolute(inside) || inside.split(sep).includes("..")) throw new OutboxError("Refused: that path is outside the outbox.");
    return path;
  }
  return {
    enabled: Boolean(config.outbox_enabled),
    root,
    // CE-S8: place a delivered file. Never overwrites: an existing file with the same bytes counts as already
    // delivered ("SAME"); an existing file with other bytes is left alone ("CONFLICT").
    async place(name, content) {
      const path = target(name);
      await mkdir(dirname(path), { recursive: true });
      try {
        await writeFile(path, content, { flag: "wx" });
        return { path, status: "WRITTEN" };
      } catch (error) {
        if (error?.code !== "EEXIST") throw error;
        const existing = await readFile(path);
        return { path, status: Buffer.compare(existing, Buffer.from(content)) === 0 ? "SAME" : "CONFLICT" };
      }
    },
    async write(name, content) {
      const path = target(name);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content);
      return path;
    }
  };
}
