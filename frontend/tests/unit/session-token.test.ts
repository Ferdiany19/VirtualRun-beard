import { describe, expect, it } from "vitest";
import { createOpaqueToken, hashSensitiveToken } from "@/shared/security/token";

describe("sensitive token helpers", () => {
  it("creates random opaque token values", () => {
    const firstToken = createOpaqueToken();
    const secondToken = createOpaqueToken();

    expect(firstToken).not.toBe(secondToken);
    expect(firstToken.length).toBeGreaterThanOrEqual(32);
  });

  it("hashes tokens without returning the raw token", () => {
    const token = "sample-sensitive-token";
    const hash = hashSensitiveToken(token);

    expect(hash).not.toBe(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
