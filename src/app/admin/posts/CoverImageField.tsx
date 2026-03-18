"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import styles from "./post-form.module.css";

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
  const [url, setUrl] = useState(defaultValue);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
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

      const result = await response.json();
      if (!response.ok || result?.success !== 1 || typeof result?.file?.url !== "string") {
        throw new Error(typeof result?.error === "string" ? result.error : "Kapak görseli yüklenemedi.");
      }

      const uploadedUrl = result.file.url as string;
      const normalizedUrl = uploadedUrl.startsWith("/")
        ? `${window.location.origin}${uploadedUrl}`
        : uploadedUrl;
      setUrl(normalizedUrl);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Kapak görseli yüklenemedi.";
      setError(message);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className={styles.field}>
      <label htmlFor={inputId}>{label}</label>
      <div className={styles.coverUploadRow}>
        <input
          id={inputId}
          name={name}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://..."
        />
        <button
          className={styles.coverUploadAction}
          type="button"
          onClick={openPicker}
          disabled={isUploading}
        >
          {isUploading ? "Yükleniyor..." : "Görsel Yükle"}
        </button>
      </div>
      <input
        ref={fileInputRef}
        className={styles.coverFileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
      />
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
