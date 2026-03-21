import { describe, expect, it } from "vitest";
import { validateAndNormalizeAuditLog } from "@/modules/audit/audit.validator";

describe("validateAndNormalizeAuditLog", () => {
  it("returns null when event is missing", () => {
    const result = validateAndNormalizeAuditLog({
      event: "   ",
    });

    expect(result).toBeNull();
  });

  it("normalizes and trims fields", () => {
    const result = validateAndNormalizeAuditLog({
      channel: " security ",
      event: " user_login ",
      severity: "warn",
      requestId: " req-1 ",
      context: { ok: true },
    });

    expect(result).toEqual({
      channel: "security",
      event: "user_login",
      severity: "warn",
      requestId: "req-1",
      actorUserId: null,
      path: null,
      ipAddress: null,
      context: { ok: true },
    });
  });
});
