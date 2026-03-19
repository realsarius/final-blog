import { randomUUID } from "crypto";
import { mkdir, readdir, unlink, writeFile } from "fs/promises";
import path from "path";
import type { S3Client } from "@aws-sdk/client-s3";

type UploadProvider = "local" | "r2";

type UploadImageInput = {
  buffer: Buffer;
  mimeType: string;
  folder?: string;
};

type UploadImageResult = {
  key: string;
  url: string;
  provider: UploadProvider;
};

type DeleteImageInput = {
  key?: string | null;
  url?: string | null;
};

type DeleteImageResult = {
  key: string;
  provider: UploadProvider;
};

type ListImagesInput = {
  folder?: string;
  limit?: number;
};

type ListedImage = {
  key: string;
  url: string;
  provider: UploadProvider;
  updatedAt: string | null;
};

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

let cachedR2Client: S3Client | null = null;

function normalizePathForUrl(value: string): string {
  return value.replace(/\\/g, "/");
}

function normalizePublicBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/+$/g, "");
  }
  return `https://${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

function resolveExtension(mimeType: string): string {
  return MIME_EXTENSIONS[mimeType] ?? ".bin";
}

function buildObjectKey(folder: string, mimeType: string): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const ext = resolveExtension(mimeType);
  return normalizePathForUrl(`${folder}/${yyyy}/${mm}/${dd}/${randomUUID()}${ext}`);
}

export function sanitizeUploadFolder(rawValue?: string | null): string {
  const fallback = "uploads";
  if (!rawValue) {
    return fallback;
  }

  const cleaned = rawValue
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => /^[a-zA-Z0-9_-]+$/.test(segment))
    .join("/");

  return cleaned || fallback;
}

function sanitizeUploadKey(rawValue?: string | null): string {
  if (!rawValue) {
    return "";
  }

  const normalized = normalizePathForUrl(rawValue)
    .trim()
    .replace(/^\/+|\/+$/g, "");

  if (!normalized || normalized.includes("..")) {
    return "";
  }

  const segments = normalized
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return "";
  }

  if (segments.some((segment) => !/^[a-zA-Z0-9._-]+$/.test(segment))) {
    return "";
  }

  return segments.join("/");
}

function hasR2Config() {
  return Boolean(
    process.env.R2_ACCOUNT_ID
      && process.env.R2_ACCESS_KEY_ID
      && process.env.R2_SECRET_ACCESS_KEY
      && process.env.R2_BUCKET_NAME
      && process.env.R2_PUBLIC_BASE_URL,
  );
}

function resolveUploadProvider(): UploadProvider {
  const value = (process.env.UPLOAD_PROVIDER ?? "local").trim().toLowerCase();
  if (value === "r2") {
    return "r2";
  }
  if (value === "auto" && hasR2Config()) {
    return "r2";
  }
  return "local";
}

function parseOrigin(value?: string): string | null {
  if (!value) {
    return null;
  }
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function clampLimit(limit: number | undefined, fallback = 60, max = 200) {
  if (!Number.isFinite(limit)) {
    return fallback;
  }
  return Math.max(1, Math.min(max, Math.floor(limit ?? fallback)));
}

function resolveLocalKeyFromUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("/")) {
    return sanitizeUploadKey(trimmed);
  }

  try {
    const parsed = new URL(trimmed);
    const allowedOrigins = [parseOrigin(process.env.NEXTAUTH_URL), parseOrigin(process.env.NEXT_PUBLIC_SITE_URL)]
      .filter((origin): origin is string => Boolean(origin));

    if (allowedOrigins.length > 0 && !allowedOrigins.includes(parsed.origin)) {
      return "";
    }

    return sanitizeUploadKey(parsed.pathname);
  } catch {
    return "";
  }
}

function resolveR2KeyFromUrl(rawUrl: string): string {
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
  if (!publicBaseUrl) {
    return "";
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const baseUrl = normalizePublicBaseUrl(publicBaseUrl);
    const base = new URL(baseUrl);
    const target = trimmed.startsWith("/")
      ? new URL(trimmed, base)
      : new URL(trimmed);

    if (target.origin !== base.origin) {
      return "";
    }

    const basePath = base.pathname.replace(/\/+$/g, "");
    const targetPath = target.pathname;

    if (basePath && !targetPath.startsWith(`${basePath}/`) && targetPath !== basePath) {
      return "";
    }

    const relativePath = targetPath.slice(basePath.length).replace(/^\/+/, "");
    return sanitizeUploadKey(relativePath);
  } catch {
    return "";
  }
}

async function getR2Client() {
  if (cachedR2Client) {
    return cachedR2Client;
  }

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");
  const region = process.env.R2_REGION || "auto";

  if (!accountId || !accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error("R2 yapılandırması eksik. R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY ve R2_ENDPOINT kontrol edin.");
  }

  const { S3Client } = await import("@aws-sdk/client-s3");

  cachedR2Client = new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return cachedR2Client;
}

async function uploadToLocal(input: UploadImageInput): Promise<UploadImageResult> {
  const folder = sanitizeUploadFolder(input.folder);
  const key = buildObjectKey(folder, input.mimeType);
  const absolutePath = path.join(process.cwd(), "public", ...key.split("/"));
  const absoluteDir = path.dirname(absolutePath);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(absolutePath, input.buffer);

  return {
    key,
    url: `/${normalizePathForUrl(key)}`,
    provider: "local",
  };
}

async function uploadToR2(input: UploadImageInput): Promise<UploadImageResult> {
  const bucket = process.env.R2_BUCKET_NAME;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

  if (!bucket || !publicBaseUrl) {
    throw new Error("R2_BUCKET_NAME ve R2_PUBLIC_BASE_URL zorunludur.");
  }

  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getR2Client();
  const folder = sanitizeUploadFolder(input.folder);
  const key = buildObjectKey(folder, input.mimeType);

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: input.buffer,
    ContentType: input.mimeType,
    CacheControl: "public, max-age=31536000, immutable",
  }));

  const base = normalizePublicBaseUrl(publicBaseUrl);

  return {
    key,
    url: `${base}/${key}`,
    provider: "r2",
  };
}

async function deleteFromLocal(key: string): Promise<DeleteImageResult> {
  const absolutePath = path.join(process.cwd(), "public", ...key.split("/"));

  try {
    await unlink(absolutePath);
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code !== "ENOENT") {
      throw error;
    }
  }

  return {
    key,
    provider: "local",
  };
}

async function deleteFromR2(key: string): Promise<DeleteImageResult> {
  const bucket = process.env.R2_BUCKET_NAME;

  if (!bucket) {
    throw new Error("R2_BUCKET_NAME zorunludur.");
  }

  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getR2Client();

  await client.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  }));

  return {
    key,
    provider: "r2",
  };
}

async function collectLocalFiles(rootDir: string, prefix = ""): Promise<string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      return collectLocalFiles(absolute, relative);
    }
    return [relative];
  }));
  return files.flat();
}

async function listLocalImages(input: ListImagesInput): Promise<ListedImage[]> {
  const folder = sanitizeUploadFolder(input.folder);
  const limit = clampLimit(input.limit);
  const baseDir = path.join(process.cwd(), "public", ...folder.split("/"));
  const imageExt = /\.(jpe?g|png|webp|gif)$/i;

  try {
    const files = await collectLocalFiles(baseDir);
    return files
      .filter((file) => imageExt.test(file))
      .map((file) => {
        const key = normalizePathForUrl(`${folder}/${file}`);
        return {
          key,
          url: `/${key}`,
          provider: "local" as const,
          updatedAt: null,
        };
      })
      .slice(0, limit);
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function listR2Images(input: ListImagesInput): Promise<ListedImage[]> {
  const bucket = process.env.R2_BUCKET_NAME;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

  if (!bucket || !publicBaseUrl) {
    throw new Error("R2_BUCKET_NAME ve R2_PUBLIC_BASE_URL zorunludur.");
  }

  const folder = sanitizeUploadFolder(input.folder);
  const limit = clampLimit(input.limit);
  const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
  const client = await getR2Client();
  const base = normalizePublicBaseUrl(publicBaseUrl);
  const imageExt = /\.(jpe?g|png|webp|gif)$/i;

  const response = await client.send(new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: `${folder}/`,
    MaxKeys: Math.max(limit * 2, 40),
  }));

  const objects = (response.Contents ?? [])
    .filter((item) => typeof item.Key === "string")
    .map((item) => ({
      key: item.Key as string,
      updatedAt: item.LastModified ? item.LastModified.toISOString() : null,
    }))
    .filter((item) => imageExt.test(item.key))
    .sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, limit);

  return objects.map((item) => ({
    key: item.key,
    url: `${base}/${item.key}`,
    provider: "r2" as const,
    updatedAt: item.updatedAt,
  }));
}

export async function uploadImage(input: UploadImageInput): Promise<UploadImageResult> {
  const provider = resolveUploadProvider();
  if (provider === "r2") {
    return uploadToR2(input);
  }
  return uploadToLocal(input);
}

export async function deleteImage(input: DeleteImageInput): Promise<DeleteImageResult> {
  const keyFromPayload = sanitizeUploadKey(input.key);
  const keyFromR2Url = input.url ? resolveR2KeyFromUrl(input.url) : "";
  const keyFromLocalUrl = input.url ? resolveLocalKeyFromUrl(input.url) : "";

  const provider: UploadProvider = keyFromR2Url
    ? "r2"
    : keyFromLocalUrl
      ? "local"
      : resolveUploadProvider();

  const key = keyFromPayload || keyFromR2Url || keyFromLocalUrl;
  if (!key) {
    throw new Error("Silinecek görsel anahtarı çözümlenemedi.");
  }

  if (provider === "r2") {
    return deleteFromR2(key);
  }
  return deleteFromLocal(key);
}

export async function listImages(input: ListImagesInput): Promise<ListedImage[]> {
  const provider = resolveUploadProvider();
  if (provider === "r2") {
    return listR2Images(input);
  }
  return listLocalImages(input);
}
