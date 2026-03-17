"use client";

import { useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import styles from "./post-form.module.css";

marked.setOptions({
  gfm: true,
  breaks: true,
});

interface MarkdownFieldProps {
  name: string;
  defaultValue?: string;
  required?: boolean;
}

export default function MarkdownField({
  name,
  defaultValue = "",
  required,
}: MarkdownFieldProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [value, setValue] = useState(defaultValue);

  const previewHtml = useMemo(() => {
    if (!value.trim()) {
      return "";
    }
    const raw = marked.parse(value);
    return DOMPurify.sanitize(raw);
  }, [value]);

  return (
    <div className={styles.markdownField}>
      <div className={styles.markdownToolbar}>
        <button
          type="button"
          onClick={() => setMode("edit")}
          className={`${styles.tabButton} ${mode === "edit" ? styles.tabButtonActive : ""}`}
        >
          Yaz
        </button>
        <button
          type="button"
          onClick={() => setMode("preview")}
          className={`${styles.tabButton} ${mode === "preview" ? styles.tabButtonActive : ""}`}
        >
          Önizleme
        </button>
      </div>

      {mode === "edit" ? (
        <textarea
          className={styles.markdownTextarea}
          name={name}
          value={value}
          required={required}
          onChange={(event) => setValue(event.target.value)}
        />
      ) : previewHtml ? (
        <div
          className={styles.markdownPreview}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      ) : (
        <div className={styles.markdownPlaceholder}>Önizleme için içerik yazın.</div>
      )}
    </div>
  );
}
