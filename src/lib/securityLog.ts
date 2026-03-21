import { parseBoolean } from "@/lib/parsing";

type SecuritySeverity = "info" | "warn" | "error";

type SecurityLogPayload = {
  event: string;
  severity?: SecuritySeverity;
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
