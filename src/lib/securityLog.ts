import { parseBoolean } from "@/lib/parsing";

type SecuritySeverity = "info" | "warn" | "error";

type SecurityLogPayload = {
  event: string;
  severity?: SecuritySeverity;
  requestId?: string;
  actorUserId?: string;
  path?: string;
  ipAddress?: string;
  context?: Record<string, unknown>;
};

function shouldLogSecurityEvents() {
  return parseBoolean(process.env.SECURITY_LOG_ENABLED, true);
}

export function logSecurityEvent(payload: SecurityLogPayload) {
  if (!shouldLogSecurityEvents()) {
    return;
  }

  const severity = payload.severity ?? "info";
  const entry = {
    timestamp: new Date().toISOString(),
    type: "security_event",
    event: payload.event,
    severity,
    context: payload.context ?? {},
  };

  void persistSecurityAuditLog({
    event: payload.event,
    severity,
    requestId: payload.requestId,
    actorUserId: payload.actorUserId,
    path: payload.path,
    ipAddress: payload.ipAddress,
    context: payload.context,
  });

  const line = JSON.stringify(entry);
  if (severity === "error") {
    console.error(line);
    return;
  }
  if (severity === "warn") {
    console.warn(line);
    return;
  }
  console.info(line);
}

async function persistSecurityAuditLog(payload: {
  event: string;
  severity: SecuritySeverity;
  requestId?: string;
  actorUserId?: string;
  path?: string;
  ipAddress?: string;
  context?: Record<string, unknown>;
}) {
  const isEdgeRuntime = typeof (globalThis as { EdgeRuntime?: string }).EdgeRuntime === "string";
  if (isEdgeRuntime) {
    return;
  }

  try {
    const { writeAuditLog } = await import("@/modules/audit/audit.service");
    await writeAuditLog({
      channel: "security",
      event: payload.event,
      severity: payload.severity,
      requestId: payload.requestId,
      actorUserId: payload.actorUserId,
      path: payload.path,
      ipAddress: payload.ipAddress,
      context: payload.context,
    });
  } catch {
    // Intentionally swallow to avoid blocking request flow on logging failures.
  }
}
