import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { NormalizedAuditLogInput } from "@/modules/audit/audit.types";

export async function createAuditLog(input: NormalizedAuditLogInput) {
  await prisma.auditLog.create({
    data: {
      channel: input.channel,
      event: input.event,
      severity: input.severity,
      requestId: input.requestId,
      actorUserId: input.actorUserId,
      path: input.path,
      ipAddress: input.ipAddress,
      context: input.context ? (input.context as Prisma.InputJsonValue) : undefined,
    },
  });
}
