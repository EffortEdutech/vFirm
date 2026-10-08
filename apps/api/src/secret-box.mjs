// CE-S7 (ADR-106): small authenticated-encryption helper for secrets vFirm must be able to use again later
// (the Microsoft 365 app secret). AES-256-GCM, a fresh random IV per message, the key from the server
// environment (VFIRM_SECRET_KEY: 32 bytes as base64 or 64 hex characters). The key is never stored in the
// database, so a database copy alone cannot reveal a secret. Output looks like "v1.<iv>.<tag>.<ciphertext>".

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export class SecretKeyError extends Error {
  constructor(message) {
    super(message);
    this.status = 503;
    this.code = "SECRET_KEY_NOT_CONFIGURED";
  }
}

export function loadSecretKey(env = process.env) {
  const raw = String(env.VFIRM_SECRET_KEY ?? "").trim();
  if (!raw) throw new SecretKeyError("The server has no VFIRM_SECRET_KEY, so it cannot store a Microsoft 365 secret safely.");
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new SecretKeyError("VFIRM_SECRET_KEY must be 32 bytes (64 hex characters, or 44 base64 characters).");
  return key;
}

export const secretKeyConfigured = (env = process.env) => {
  try { loadSecretKey(env); return true; } catch { return false; }
};

export function encryptSecret(plain, env = process.env) {
  const key = loadSecretKey(env);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

export function decryptSecret(packed, env = process.env) {
  const key = loadSecretKey(env);
  const [version, iv, tag, body] = String(packed ?? "").split(".");
  if (version !== "v1" || !iv || !tag || !body) throw new SecretKeyError("The stored secret is not readable.");
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new SecretKeyError("The stored secret could not be decrypted with the current VFIRM_SECRET_KEY.");
  }
}
