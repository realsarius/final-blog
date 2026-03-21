import type { AuditLogInput, AuditSeverity, NormalizedAuditLogInput } from "@/modules/audit/audit.types";

const VALID_SEVERITIES = new Set<AuditSeverity>(["info", "warn", "error"]);

function normalizeText(value: string | undefined, maxLength: number): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  return normalized.slice(0, maxLength);
}

function normalizeSeverity(value: AuditLogInput["severity"]): AuditSeverity {
  if (!value) {
    return "info";
  }
  return VALID_SEVERITIES.has(value) ? value : "info";
}

function normalizeContext(value: AuditLogInput["context"]): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  try {
    const serialized = JSON.stringify(value);
    const parsed = JSON.parse(serialized) as Record<string, unknown>;
    return Object.keys(parsed).length === 0 ? null : parsed;
  } catch {
    return null;
  }
}

export function validateAndNormalizeAuditLog(input: AuditLogInput): NormalizedAuditLogInput | null {
  const event = normalizeText(input.event, 120);
  if (!event) {
    return null;
  }

  return {
    channel: normalizeText(input.channel, 40) ?? "security",
    event,
    severity: normalizeSeverity(input.severity),
    requestId: normalizeText(input.requestId, 120),
    actorUserId: normalizeText(input.actorUserId, 120),
    path: normalizeText(input.path, 400),
    ipAddress: normalizeText(input.ipAddress, 120),
    context: normalizeContext(input.context),
  };
}
