import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

function getR2Client() {
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

  const client = getR2Client();
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

export async function uploadImage(input: UploadImageInput): Promise<UploadImageResult> {
  const provider = resolveUploadProvider();
  if (provider === "r2") {
    return uploadToR2(input);
  }
  return uploadToLocal(input);
}
