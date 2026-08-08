import { describe, expect, it } from "vitest";
import {
  normalizeEmail,
  normalizeIndonesianPhone,
} from "@/modules/participants/domain/participant-normalization";

describe("participant contact normalization", () => {
  it("trims and lowercases email", () => {
    expect(normalizeEmail("  Runner@Example.COM ")).toBe("runner@example.com");
  });

  it("normalizes Indonesian mobile numbers that start with 08", () => {
    expect(normalizeIndonesianPhone("0812-3456 7890")).toBe("+6281234567890");
  });

  it("normalizes Indonesian mobile numbers that start with 628", () => {
    expect(normalizeIndonesianPhone("62812 3456 7890")).toBe("+6281234567890");
  });

  it("rejects phone numbers outside the accepted Indonesian mobile format", () => {
    expect(() => normalizeIndonesianPhone("021-123456")).toThrow();
  });
});
