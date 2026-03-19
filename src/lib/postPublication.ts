import type { PostStatus } from "@prisma/client";

export function parsePostStatus(value: unknown): PostStatus {
  return value === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
}

export function resolvePublishedAt(status: PostStatus, currentPublishedAt?: Date | null) {
  if (status === "PUBLISHED") {
    return currentPublishedAt ?? new Date();
  }
  return null;
}
