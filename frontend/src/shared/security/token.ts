import { createHash, randomBytes } from "node:crypto";

export function createOpaqueToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

export function hashSensitiveToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
