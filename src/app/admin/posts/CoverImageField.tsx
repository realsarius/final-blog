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
  messages?: {
    invalidType: string;
    uploadFailed: string;
    removeFailed: string;
    urlPlaceholder: string;
    uploadButton: string;
    uploading: string;
    removeButton: string;
    removing: string;
    dropHint: string;
    dropNow: string;
    previewAlt: string;
  };
}

export default function CoverImageField({
  name,
  label,
  defaultValue = "",
  messages,
}: CoverImageFieldProps) {
  const m = messages ?? {
    invalidType: "Unsupported file type. Please upload JPG, PNG, WebP, or GIF.",
    uploadFailed: "Cover image upload failed.",
    removeFailed: "Image could not be deleted.",
    urlPlaceholder: "https://...",
    uploadButton: "Choose File",
    uploading: "Uploading...",
    removeButton: "Remove",
    removing: "Removing...",
    dropHint: "Image uploads automatically after drag and drop.",
    dropNow: "Drop now",
    previewAlt: "Cover image preview",
  };
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
      setError(m.invalidType);
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
        throw new Error(typeof result?.error === "string" ? result.error : m.uploadFailed);
      }

      const uploadedUrl = normalizeCoverUrl(result.file.url);
      setUrl(uploadedUrl);
      setUploadedKey(typeof result.file.key === "string" ? result.file.key : null);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : m.uploadFailed;
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
        throw new Error(typeof result?.error === "string" ? result.error : m.removeFailed);
      }

      setUrl("");
      setUploadedKey(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (removeError) {
      const message = removeError instanceof Error ? removeError.message : m.removeFailed;
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
            placeholder={m.urlPlaceholder}
          />
          <button
            className={styles.coverUploadAction}
            type="button"
            onClick={openPicker}
            disabled={isUploading || isRemoving}
          >
            {isUploading ? m.uploading : m.uploadButton}
          </button>
          <button
            className={styles.coverRemoveAction}
            type="button"
            onClick={handleRemove}
            disabled={!url.trim() || isUploading || isRemoving}
          >
            {isRemoving ? m.removing : m.removeButton}
          </button>
        </div>
        <p className={styles.coverUploadHint}>{m.dropHint}</p>
        {isDragOver && (
          <div className={styles.coverDropOverlay}>
            <span>{m.dropNow}</span>
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
            alt={m.previewAlt}
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
