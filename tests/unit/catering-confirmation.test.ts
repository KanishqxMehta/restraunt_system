import { describe, it, expect } from "vitest";
import { z } from "zod";
import { validateCateringLeadTime } from "@/features/catering/calculator";

const confirmCateringSchema = z.object({
  action: z.enum(["CONFIRM", "DECLINE"]),
  notes: z.string().trim().max(250).optional(),
});

describe("Party Catering Manager Confirmation Workflow (Brief Requirement)", () => {
  it("enforces minimum 4-hour advance preparation notice", () => {
    const now = new Date("2026-11-06T12:00:00Z");

    // 2 hours in advance (too short)
    const tooSoon = new Date("2026-11-06T14:00:00Z");
    const checkTooSoon = validateCateringLeadTime(tooSoon, now);
    expect(checkTooSoon.isValid).toBe(false);
    expect(checkTooSoon.leadTimeHours).toBe(2);

    // Exactly 4 hours in advance (valid)
    const validSlot = new Date("2026-11-06T16:00:00Z");
    const checkValid = validateCateringLeadTime(validSlot, now);
    expect(checkValid.isValid).toBe(true);
    expect(checkValid.leadTimeHours).toBe(4);

    // 24 hours in advance (valid)
    const nextDay = new Date("2026-11-07T12:00:00Z");
    const checkNextDay = validateCateringLeadTime(nextDay, now);
    expect(checkNextDay.isValid).toBe(true);
    expect(checkNextDay.leadTimeHours).toBe(24);
  });

  it("validates catering manager confirmation action payload", () => {
    const validConfirm = {
      action: "CONFIRM" as const,
      notes: "Dedicated dum station and chef assigned. 10kg handis locked.",
    };
    const result = confirmCateringSchema.safeParse(validConfirm);
    expect(result.success).toBe(true);

    const validDecline = {
      action: "DECLINE" as const,
      notes: "Kitchen booked to max capacity during dinner rush.",
    };
    expect(confirmCateringSchema.safeParse(validDecline).success).toBe(true);
  });

  it("rejects unauthorized actions in catering confirmation schema", () => {
    const invalidAction = {
      action: "CANCEL_EVERYTHING",
      notes: "Invalid action",
    };
    expect(confirmCateringSchema.safeParse(invalidAction).success).toBe(false);
  });
});
