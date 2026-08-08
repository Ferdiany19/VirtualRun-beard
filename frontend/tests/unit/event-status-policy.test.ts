import { describe, expect, it } from "vitest";
import { canTransitionEventStatus } from "@/modules/events/domain/event-status";

describe("event status policy", () => {
  it("allows planned forward movement through the event lifecycle", () => {
    expect(canTransitionEventStatus("DRAFT", "SCHEDULED")).toBe(true);
    expect(canTransitionEventStatus("UPLOAD_OPEN", "REVIEW")).toBe(true);
    expect(canTransitionEventStatus("COMPLETED", "ARCHIVED")).toBe(true);
  });

  it("rejects reopening completed events without an explicit archive-only transition", () => {
    expect(canTransitionEventStatus("COMPLETED", "UPLOAD_OPEN")).toBe(false);
  });
});
