import { DEFAULT_MAX_FILE_SIZE_MB } from "@/lib/upload/constants";

export function resolveMaxUploadSizeBytes() {
  const parsedValue = Number(process.env.UPLOAD_MAX_FILE_SIZE_MB ?? DEFAULT_MAX_FILE_SIZE_MB);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return DEFAULT_MAX_FILE_SIZE_MB * 1024 * 1024;
  }
  const clampedMb = Math.min(40, Math.max(1, parsedValue));
  return Math.floor(clampedMb * 1024 * 1024);
}

export function formatMaxUploadSizeMb(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return Number.isInteger(mb) ? String(mb) : mb.toFixed(1);
}
