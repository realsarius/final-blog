export type UploadValidationResult =
  | { ok: true; detectedMime: string }
  | { ok: false; error: string; status: number; auditEvent?: string; auditContext?: Record<string, unknown> };

export type UploadServiceInput = {
  file: File;
  folder?: string;
  requestId: string;
  actorUserId?: string | null;
};
