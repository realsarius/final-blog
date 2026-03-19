"use client";

import Image from "next/image";
import { useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import styles from "./post-form.module.css";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function normalizeCoverUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const isLocalHost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (isLocalHost) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

function resolvePreviewUrl(rawUrl: string) {
  const trimmed = normalizeCoverUrl(rawUrl);
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("/") || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return "";
}

interface CoverImageFieldProps {
  name: string;
  label: string;
  defaultValue?: string;
}

export default function CoverImageField({
  name,
  label,
  defaultValue = "",
}: CoverImageFieldProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [url, setUrl] = useState(() => normalizeCoverUrl(defaultValue));
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPicker = () => {
    fileInputRef.current?.click();
  };

  const uploadFile = async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Desteklenmeyen dosya türü. Lütfen JPG, PNG, WebP veya GIF yükleyin.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "covers");

      const response = await fetch("/api/v1/uploads", {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success !== 1 || typeof result?.file?.url !== "string") {
        throw new Error(typeof result?.error === "string" ? result.error : "Kapak görseli yüklenemedi.");
      }

      const uploadedUrl = normalizeCoverUrl(result.file.url);
      setUrl(uploadedUrl);
      setUploadedKey(typeof result.file.key === "string" ? result.file.key : null);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Kapak görseli yüklenemedi.";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    event.target.value = "";
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const handleRemove = async () => {
    const currentUrl = url.trim();
    if (!currentUrl) {
      return;
    }

    setIsRemoving(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/uploads", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: uploadedKey ?? undefined,
          url: currentUrl,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success !== 1) {
        throw new Error(typeof result?.error === "string" ? result.error : "Görsel silinemedi.");
      }

      setUrl("");
      setUploadedKey(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (removeError) {
      const message = removeError instanceof Error ? removeError.message : "Görsel silinemedi.";
      setError(message);
    } finally {
      setIsRemoving(false);
    }
  };

  const previewUrl = resolvePreviewUrl(url);

  return (
    <div className={styles.field}>
      <label htmlFor={inputId}>{label}</label>
      <div
        className={`${styles.coverDropZone} ${isDragOver ? styles.coverDropZoneActive : ""}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={styles.coverUploadRow}>
          <input
            id={inputId}
            name={name}
            value={url}
            onChange={(event) => {
              setUrl(normalizeCoverUrl(event.target.value));
              setUploadedKey(null);
            }}
            placeholder="https://..."
          />
          <button
            className={styles.coverUploadAction}
            type="button"
            onClick={openPicker}
            disabled={isUploading || isRemoving}
          >
            {isUploading ? "Yükleniyor..." : "Dosya Seç"}
          </button>
          <button
            className={styles.coverRemoveAction}
            type="button"
            onClick={handleRemove}
            disabled={!url.trim() || isUploading || isRemoving}
          >
            {isRemoving ? "Siliniyor..." : "Kaldır"}
          </button>
        </div>
        <p className={styles.coverUploadHint}>Sürükle-bırak sonrası görsel otomatik yüklenir.</p>
        {isDragOver && (
          <div className={styles.coverDropOverlay}>
            <span>Şimdi bırakabilirsiniz</span>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        className={styles.coverFileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
      />
      {previewUrl ? (
        <div className={styles.coverPreview}>
          <Image
            src={previewUrl}
            alt="Kapak görseli önizleme"
            className={styles.coverPreviewImage}
            width={1200}
            height={675}
            sizes="(max-width: 900px) 100vw, 840px"
          />
        </div>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
