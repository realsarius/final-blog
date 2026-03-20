"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { interpolate } from "@/lib/interpolate";
import styles from "./page.module.css";

type MediaFile = {
  key: string;
  url: string;
  provider: "local" | "r2";
  updatedAt: string | null;
};

type MediaMessages = {
  title: string;
  subtitle: string;
  addMedia: string;
  importMedia: string;
  uploading: string;
  allMediaItems: string;
  allDates: string;
  bulkSelect: string;
  clearSelection: string;
  delete: string;
  deleting: string;
  refresh: string;
  refreshing: string;
  searchMedia: string;
  searchPlaceholder: string;
  noItems: string;
  file: string;
  storage: string;
  date: string;
  selectAtLeastOne: string;
  confirmDelete: string;
  uploaded: string;
  deleted: string;
  dateUnknown: string;
  monthUnknown: string;
};

type MediaLibraryClientProps = {
  locale: "tr" | "en";
  messages: Readonly<MediaMessages>;
};

type ApiSuccess<T> = {
  success: 1;
} & T;

type ApiFailure = {
  success: 0;
  error?: string;
};

type UploadListResponse = ApiSuccess<{ files: MediaFile[] }> | ApiFailure;
type UploadPostResponse = ApiSuccess<{ file: { key: string; url: string; provider: "local" | "r2" } }> | ApiFailure;
type UploadDeleteResponse = ApiSuccess<{ file: { key: string; provider: "local" | "r2" } }> | ApiFailure;

type ViewMode = "grid" | "list";
const MEDIA_FOLDERS = ["uploads", "covers", "content", "hero"] as const;

function getDateLabel(updatedAt: string | null, messages: MediaMessages, locale: "tr" | "en") {
  if (!updatedAt) {
    return messages.dateUnknown;
  }
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) {
    return messages.dateUnknown;
  }
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getMonthKey(updatedAt: string | null) {
  if (!updatedAt) {
    return "unknown";
  }
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(key: string, messages: MediaMessages, locale: "tr" | "en") {
  if (key === "unknown") {
    return messages.monthUnknown;
  }
  const [yearRaw, monthRaw] = key.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return messages.monthUnknown;
  }
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", { month: "long", year: "numeric" }).format(date);
}

function toNameFromKey(key: string) {
  const lastSegment = key.split("/").pop() ?? key;
  return decodeURIComponent(lastSegment);
}

export default function MediaLibraryClient({ locale, messages }: MediaLibraryClientProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const addInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const responses = await Promise.all(
        MEDIA_FOLDERS.map(async (folder) => {
          const response = await fetch(`/api/uploads?folder=${encodeURIComponent(folder)}&limit=200`, {
            method: "GET",
            cache: "no-store",
          });
          const data: UploadListResponse = await response.json();
          if (!response.ok || data.success !== 1) {
            throw new Error(data.success === 0 ? (data.error ?? "Media list fetch failed.") : "Media list fetch failed.");
          }
          return data.files;
        }),
      );

      const merged = new Map<string, MediaFile>();
      responses.flat().forEach((file) => {
        merged.set(file.key, file);
      });

      const nextFiles = Array.from(merged.values()).sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime;
      });

      setFiles(nextFiles);
      setSelectedKeys((current) => current.filter((key) => nextFiles.some((file) => file.key === key)));
    } catch (refreshError) {
      const text = refreshError instanceof Error ? refreshError.message : "Media list fetch failed.";
      setError(text);
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadFiles = async (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) {
      return;
    }

    setUploading(true);
    setError(null);
    setMessage(null);
    let successCount = 0;

    for (const file of Array.from(incoming)) {
      const payload = new FormData();
      payload.set("file", file);
      payload.set("folder", "uploads");

      try {
        const response = await fetch("/api/uploads", {
          method: "POST",
          body: payload,
        });
        const data: UploadPostResponse = await response.json();
        if (!response.ok || data.success !== 1) {
          throw new Error(data.success === 0 ? (data.error ?? "Upload failed.") : "Upload failed.");
        }
        successCount += 1;
      } catch (uploadError) {
        const text = uploadError instanceof Error ? uploadError.message : "Upload failed.";
        setError(text);
      }
    }

    if (successCount > 0) {
      setMessage(interpolate(messages.uploaded, { count: successCount }));
    }

    setUploading(false);
    await refresh();
  };

  const deleteSelected = async () => {
    if (selectedKeys.length === 0) {
      setError(messages.selectAtLeastOne);
      return;
    }

    const confirmed = window.confirm(interpolate(messages.confirmDelete, { count: selectedKeys.length }));
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError(null);
    setMessage(null);
    let deleted = 0;

    for (const key of selectedKeys) {
      const target = files.find((file) => file.key === key);
      if (!target) {
        continue;
      }

      try {
        const response = await fetch("/api/uploads", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: target.key, url: target.url }),
        });
        const data: UploadDeleteResponse = await response.json();
        if (!response.ok || data.success !== 1) {
          throw new Error(data.success === 0 ? (data.error ?? "Delete failed.") : "Delete failed.");
        }
        deleted += 1;
      } catch (deleteError) {
        const text = deleteError instanceof Error ? deleteError.message : "Delete failed.";
        setError(text);
      }
    }

    if (deleted > 0) {
      setMessage(interpolate(messages.deleted, { count: deleted }));
    }

    setDeleting(false);
    await refresh();
  };

  const dateOptions = useMemo(() => {
    const keys = new Set<string>();
    files.forEach((file) => keys.add(getMonthKey(file.updatedAt)));
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [files]);

  const filteredFiles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return files.filter((file) => {
      const searchMatch = normalizedSearch.length === 0
        || file.key.toLowerCase().includes(normalizedSearch)
        || toNameFromKey(file.key).toLowerCase().includes(normalizedSearch);
      const dateMatch = dateFilter === "all" || getMonthKey(file.updatedAt) === dateFilter;
      return searchMatch && dateMatch;
    });
  }, [dateFilter, files, search]);

  const allVisibleSelected = filteredFiles.length > 0 && filteredFiles.every((file) => selectedKeys.includes(file.key));

  const toggleSelect = (key: string) => {
    setSelectedKeys((current) => (
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    ));
  };

  const toggleBulkSelect = () => {
    if (allVisibleSelected) {
      setSelectedKeys((current) => current.filter((key) => !filteredFiles.some((file) => file.key === key)));
      return;
    }
    const merged = new Set(selectedKeys);
    filteredFiles.forEach((file) => merged.add(file.key));
    setSelectedKeys(Array.from(merged));
  };

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section className={styles.mediaPage}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1>{messages.title}</h1>
          <button
            type="button"
            className={styles.primaryAction}
            onClick={() => addInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? messages.uploading : messages.addMedia}
          </button>
          <button
            type="button"
            className={styles.secondaryAction}
            onClick={() => importInputRef.current?.click()}
            disabled={uploading}
          >
            {messages.importMedia}
          </button>
        </div>
        <p className={styles.infoText}>{messages.subtitle}</p>
        <input
          ref={addInputRef}
          type="file"
          className={styles.hiddenInput}
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={(event) => {
            void uploadFiles(event.target.files);
            event.currentTarget.value = "";
          }}
        />
        <input
          ref={importInputRef}
          type="file"
          className={styles.hiddenInput}
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={(event) => {
            void uploadFiles(event.target.files);
            event.currentTarget.value = "";
          }}
        />
      </header>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <button
            type="button"
            className={`${styles.viewToggle} ${viewMode === "list" ? styles.viewToggleActive : ""}`}
            onClick={() => setViewMode("list")}
            aria-label="List view"
          >
            ≣
          </button>
          <button
            type="button"
            className={`${styles.viewToggle} ${viewMode === "grid" ? styles.viewToggleActive : ""}`}
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
          >
            ⊞
          </button>
          <select className={styles.control}>
            <option value="all">{messages.allMediaItems}</option>
          </select>
          <select className={styles.control} value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
            <option value="all">{messages.allDates}</option>
            {dateOptions.map((option) => (
              <option key={option} value={option}>
                {getMonthLabel(option, messages, locale)}
              </option>
            ))}
          </select>
          <button type="button" className={styles.secondaryAction} onClick={toggleBulkSelect}>
            {allVisibleSelected ? messages.clearSelection : messages.bulkSelect}
          </button>
          <button
            type="button"
            className={styles.deleteAction}
            onClick={() => void deleteSelected()}
            disabled={selectedKeys.length === 0 || deleting}
          >
            {deleting ? messages.deleting : messages.delete}
          </button>
          <button type="button" className={styles.secondaryAction} onClick={() => void refresh()} disabled={loading}>
            {loading ? messages.refreshing : messages.refresh}
          </button>
        </div>
        <label className={styles.searchField}>
          <span>{messages.searchMedia}</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={messages.searchPlaceholder}
          />
        </label>
      </div>

      {message ? <p className={styles.success}>{message}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {filteredFiles.length === 0 ? (
        <div className={styles.emptyState}>
          <p>{messages.noItems}</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className={styles.grid}>
          {filteredFiles.map((file) => {
            const checked = selectedKeys.includes(file.key);
            return (
              <article key={file.key} className={`${styles.card} ${checked ? styles.cardSelected : ""}`}>
                <label className={styles.cardCheckbox}>
                  <input type="checkbox" checked={checked} onChange={() => toggleSelect(file.key)} />
                </label>
                <img src={file.url} alt={toNameFromKey(file.key)} className={styles.cardImage} loading="lazy" />
                <div className={styles.cardMeta}>
                  <p className={styles.cardName}>{toNameFromKey(file.key)}</p>
                  <p className={styles.cardSub}>
                    {file.provider.toUpperCase()} · {getDateLabel(file.updatedAt, messages, locale)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.listWrap}>
          <table className={styles.list}>
            <thead>
              <tr>
                <th className={styles.checkboxCol} aria-label="Select" />
                <th>{messages.file}</th>
                <th>{messages.storage}</th>
                <th>{messages.date}</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file) => {
                const checked = selectedKeys.includes(file.key);
                return (
                  <tr key={file.key}>
                    <td>
                      <input type="checkbox" checked={checked} onChange={() => toggleSelect(file.key)} />
                    </td>
                    <td>
                      <div className={styles.listFile}>
                        <img src={file.url} alt={toNameFromKey(file.key)} loading="lazy" />
                        <div>
                          <p>{toNameFromKey(file.key)}</p>
                          <small>{file.key}</small>
                        </div>
                      </div>
                    </td>
                    <td>{file.provider.toUpperCase()}</td>
                    <td>{getDateLabel(file.updatedAt, messages, locale)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
