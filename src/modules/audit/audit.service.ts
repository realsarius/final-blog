import { parseBoolean } from "@/lib/parsing";
import { createAuditLog } from "@/modules/audit/audit.repository";
import type { AuditLogInput } from "@/modules/audit/audit.types";
import { validateAndNormalizeAuditLog } from "@/modules/audit/audit.validator";

function isEdgeRuntime(): boolean {
  return typeof (globalThis as { EdgeRuntime?: string }).EdgeRuntime === "string";
}

function shouldPersistAuditLogToDb() {
  return parseBoolean(process.env.AUDIT_LOG_DB_ENABLED, true);
}

function shouldLogAuditFailures() {
  return parseBoolean(process.env.AUDIT_LOG_ERROR_VERBOSE, false);
}

export async function writeAuditLog(input: AuditLogInput) {
  const normalized = validateAndNormalizeAuditLog(input);
  if (!normalized) {
    return;
  }

  if (!shouldPersistAuditLogToDb() || isEdgeRuntime()) {
    return;
  }

  try {
    await createAuditLog(normalized);
  } catch (error) {
    if (!shouldLogAuditFailures()) {
      return;
    }
    const message = error instanceof Error ? error.message : "unknown";
    console.warn(JSON.stringify({
      type: "audit_log_persist_failed",
      event: normalized.event,
      message,
    }));
  }
}
