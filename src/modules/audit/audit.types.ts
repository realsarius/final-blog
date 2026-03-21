export type AuditSeverity = "info" | "warn" | "error";

export type AuditLogInput = {
  channel?: string;
  event: string;
  severity?: AuditSeverity;
  requestId?: string;
  actorUserId?: string;
  path?: string;
  ipAddress?: string;
  context?: Record<string, unknown>;
};

export type NormalizedAuditLogInput = {
  channel: string;
  event: string;
  severity: AuditSeverity;
  requestId: string | null;
  actorUserId: string | null;
  path: string | null;
  ipAddress: string | null;
  context: Record<string, unknown> | null;
};
