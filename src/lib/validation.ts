import { z } from "zod";
import { getContentText } from "./content";

const contentSchema = z.string().trim().superRefine((value, ctx) => {
  const normalized = getContentText(value);
  if (normalized.trim().length < 10) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "İçerik en az 10 karakter olmalı.",
    });
  }
});

function isValidCoverImageValue(value: string) {
  if (!value) {
    return true;
  }

  if (value.startsWith("/")) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export const postSchema = z.object({
  title: z.string().trim().min(3, "Başlık en az 3 karakter olmalı."),
  slug: z.string().trim().optional(),
  excerpt: z.string().trim().max(300, "Özet en fazla 300 karakter olmalı.").optional(),
  content: contentSchema,
  coverImageUrl: z.string().trim().refine(
    (value) => isValidCoverImageValue(value),
    "Kapak görseli URL formatı geçersiz. Tam URL veya / ile başlayan yol girin.",
  ).optional().or(z.literal("")),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  categories: z.array(z.string().trim()).default([]),
  tags: z.array(z.string().trim()).default([]),
});

export const nameSchema = z
  .string()
  .trim()
  .min(2, "İsim en az 2 karakter olmalı.")
  .max(40, "İsim en fazla 40 karakter olmalı.");

export const passwordSchema = z
  .string()
  .min(8, "Yeni parola en az 8 karakter olmalı.");

export function splitCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getFirstErrorMessage(result: z.SafeParseReturnType<unknown, unknown>) {
  if (result.success) {
    return "";
  }
  return result.error.issues[0]?.message ?? "Geçersiz veri.";
}
