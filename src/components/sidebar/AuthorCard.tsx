"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";
import styles from "./AuthorCard.module.css";

type AuthorPayload = {
  firstName: string;
  lastName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  avatarFocusX?: number | null;
  avatarFocusY?: number | null;
};

interface AuthorCardProps {
  author: AuthorPayload | null | undefined;
  isEditable?: boolean;
}

type UploadPostResponse = {
  success?: number;
  file?: {
    url: string;
    key: string;
  };
  error?: string;
};

type SaveAuthorResponse = {
  ok?: boolean;
  author?: { avatarUrl: string | null; avatarFocusX: number; avatarFocusY: number };
  error?: string;
};

function clampFocus(value: number | null | undefined) {
  if (!Number.isFinite(value)) {
    return 50;
  }
  return Math.max(0, Math.min(100, Math.round(value as number)));
}

async function readJsonSafely<T>(response: Response): Promise<T | null> {
  const raw = await response.text();
  if (!raw.trim()) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export default function AuthorCard({ author, isEditable = false }: AuthorCardProps) {
  const [avatarUrl, setAvatarUrl] = useState(author?.avatarUrl ?? "");
  const [avatarFocusX, setAvatarFocusX] = useState(clampFocus(author?.avatarFocusX));
  const [avatarFocusY, setAvatarFocusY] = useState(clampFocus(author?.avatarFocusY));
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const idPrefix = useId();

  useEffect(() => {
    setAvatarUrl(author?.avatarUrl ?? "");
    setAvatarFocusX(clampFocus(author?.avatarFocusX));
    setAvatarFocusY(clampFocus(author?.avatarFocusY));
  }, [author?.avatarFocusX, author?.avatarFocusY, author?.avatarUrl]);

  useEffect(() => {
    const onAuthorUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{
        avatarUrl: string;
        avatarFocusX: number;
        avatarFocusY: number;
      }>;
      if (!customEvent.detail) {
        return;
      }
      setAvatarUrl(customEvent.detail.avatarUrl ?? "");
      setAvatarFocusX(clampFocus(customEvent.detail.avatarFocusX));
      setAvatarFocusY(clampFocus(customEvent.detail.avatarFocusY));
    };
    window.addEventListener("author-card-updated", onAuthorUpdated);
    return () => window.removeEventListener("author-card-updated", onAuthorUpdated);
  }, []);

  if (!author) return null;

  async function uploadAvatar(file: File) {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("folder", "authors");

      const response = await fetch("/api/uploads", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const data = await readJsonSafely<UploadPostResponse>(response);
      if (!response.ok || data?.success !== 1 || !data?.file?.url) {
        throw new Error(data?.error ?? "Gorsel yuklenemedi.");
      }
      setAvatarUrl(data.file.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gorsel yuklenemedi.";
      window.alert(message);
    } finally {
      setIsUploading(false);
    }
  }

  async function saveAuthorCard() {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/profile/author", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          avatarUrl: avatarUrl || null,
          avatarFocusX: clampFocus(avatarFocusX),
          avatarFocusY: clampFocus(avatarFocusY),
        }),
      });
      const data = await readJsonSafely<SaveAuthorResponse>(response);

      if (!response.ok || !data?.ok || !data.author) {
        throw new Error(data?.error ?? "Kaydetme basarisiz.");
      }

      setAvatarUrl(data.author.avatarUrl ?? "");
      setAvatarFocusX(clampFocus(data.author.avatarFocusX));
      setAvatarFocusY(clampFocus(data.author.avatarFocusY));
      window.dispatchEvent(new CustomEvent("author-card-updated", {
        detail: {
          avatarUrl: data.author.avatarUrl ?? "",
          avatarFocusX: clampFocus(data.author.avatarFocusX),
          avatarFocusY: clampFocus(data.author.avatarFocusY),
        },
      }));
      setIsEditorOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kaydetme basarisiz.";
      window.alert(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.card}>
      {isEditable ? (
        <button
          type="button"
          className={styles.editButton}
          aria-label="Yazar kartini duzenle"
          onClick={() => setIsEditorOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 20h4l10.5-10.5a1.414 1.414 0 0 0 0-2L16.5 5.5a1.414 1.414 0 0 0-2 0L4 16v4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m13.5 8.5 2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}

      {isEditorOpen ? (
        <div className={styles.editorPanel}>
          <label className={styles.uploadButton}>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }
                void uploadAvatar(file);
                event.currentTarget.value = "";
              }}
            />
            {isUploading ? "Yukleniyor..." : "Resim Yukle"}
          </label>

          <div className={styles.sliderRow}>
            <label htmlFor={`${idPrefix}-author-focus-x`}>Yatay Kirpma</label>
            <input
              id={`${idPrefix}-author-focus-x`}
              type="range"
              min={0}
              max={100}
              step={1}
              value={avatarFocusX}
              onChange={(event) => setAvatarFocusX(clampFocus(Number(event.target.value)))}
            />
          </div>
          <div className={styles.sliderRow}>
            <label htmlFor={`${idPrefix}-author-focus-y`}>Dikey Kirpma</label>
            <input
              id={`${idPrefix}-author-focus-y`}
              type="range"
              min={0}
              max={100}
              step={1}
              value={avatarFocusY}
              onChange={(event) => setAvatarFocusY(clampFocus(Number(event.target.value)))}
            />
          </div>

          <div className={styles.editorActions}>
            <button type="button" onClick={saveAuthorCard} disabled={isSaving}>
              {isSaving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      ) : null}

      <div className={styles.avatarWrap}>
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`${author.firstName} ${author.lastName}`}
            fill
            sizes="(max-width: 900px) 100vw, 300px"
            className={styles.avatar}
            style={{ objectPosition: `${avatarFocusX}% ${avatarFocusY}%` }}
          />
        ) : (
          <div className={styles.avatarPlaceholder} />
        )}
      </div>
      <div className={styles.info}>
        <p className={styles.label}>Yazar</p>
        <h3 className={styles.name}>
          {author.firstName} {author.lastName}
        </h3>
        {author.bio && <p className={styles.bio}>{author.bio}</p>}
      </div>
    </div>
  );
}
