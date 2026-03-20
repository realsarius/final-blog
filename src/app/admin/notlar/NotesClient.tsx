"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

type Note = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
};

type NotesMessages = {
  title: string;
  subtitle: string;
  newNote: string;
  emptyList: string;
  createFirst: string;
  untitled: string;
  delete: string;
  emptyNote: string;
  emptyEditor: string;
  titlePlaceholder: string;
  edit: string;
  preview: string;
  previewEmpty: string;
  contentPlaceholder: string;
  lastUpdated: string;
  defaultNewTitle: string;
};

type NotesClientProps = {
  locale: "tr" | "en";
  messages: Readonly<NotesMessages>;
};

const STORAGE_KEY = "finalblog-admin-notes-v1";

function formatDate(iso: string, locale: "tr" | "en") {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function createEmptyNote(defaultTitle: string): Note {
  const now = new Date().toISOString();
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: defaultTitle,
    content: "",
    updatedAt: now,
  };
}

export default function NotesClient({ locale, messages }: NotesClientProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Note[]) : [];
      const normalized = Array.isArray(parsed) ? parsed : [];
      setNotes(normalized);
      setSelectedId(normalized[0]?.id ?? null);
    } catch {
      setNotes([]);
      setSelectedId(null);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [isHydrated, notes]);

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const addNote = () => {
    const nextNote = createEmptyNote(messages.defaultNewTitle);
    setNotes((prev) => [nextNote, ...prev]);
    setSelectedId(nextNote.id);
    setShowPreview(false);
  };

  const removeNote = (id: string) => {
    setNotes((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? null);
      }
      return next;
    });
  };

  const updateSelectedNote = (patch: Partial<Pick<Note, "title" | "content">>) => {
    if (!selectedId) {
      return;
    }
    setNotes((prev) =>
      prev.map((note) =>
        note.id === selectedId
          ? { ...note, ...patch, updatedAt: new Date().toISOString() }
          : note,
      ),
    );
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>{messages.title}</h1>
          <p>{messages.subtitle}</p>
        </div>
        <button type="button" className={styles.primary} onClick={addNote}>
          {messages.newNote}
        </button>
      </header>

      <section className={styles.shell}>
        <aside className={styles.listPane}>
          {notes.length === 0 ? (
            <div className={styles.emptyList}>
              <p>{messages.emptyList}</p>
              <button type="button" className={styles.secondary} onClick={addNote}>
                {messages.createFirst}
              </button>
            </div>
          ) : (
            notes.map((note) => (
              <button
                key={note.id}
                type="button"
                className={`${styles.noteItem} ${note.id === selectedId ? styles.noteItemActive : ""}`}
                onClick={() => {
                  setSelectedId(note.id);
                  setShowPreview(false);
                }}
              >
                <div className={styles.noteItemHeader}>
                  <strong>{note.title || messages.untitled}</strong>
                  <span
                    className={styles.delete}
                    onClick={(event) => {
                      event.stopPropagation();
                      event.preventDefault();
                      removeNote(note.id);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        removeNote(note.id);
                      }
                    }}
                  >
                    {messages.delete}
                  </span>
                </div>
                <p className={styles.notePreview}>{note.content || messages.emptyNote}</p>
                <span className={styles.noteDate}>{formatDate(note.updatedAt, locale)}</span>
              </button>
            ))
          )}
        </aside>

        <div className={styles.editorPane}>
          {!selectedNote ? (
            <div className={styles.emptyEditor}>
              <p>{messages.emptyEditor}</p>
            </div>
          ) : (
            <>
              <div className={styles.editorTop}>
                <input
                  value={selectedNote.title}
                  onChange={(event) => updateSelectedNote({ title: event.target.value })}
                  className={styles.titleInput}
                  placeholder={messages.titlePlaceholder}
                />
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => setShowPreview((prev) => !prev)}
                >
                  {showPreview ? messages.edit : messages.preview}
                </button>
              </div>

              {showPreview ? (
                <article className={styles.preview}>
                  {selectedNote.content ? selectedNote.content : messages.previewEmpty}
                </article>
              ) : (
                <textarea
                  value={selectedNote.content}
                  onChange={(event) => updateSelectedNote({ content: event.target.value })}
                  className={styles.textarea}
                  placeholder={messages.contentPlaceholder}
                />
              )}

              <p className={styles.footerMeta}>{messages.lastUpdated}: {formatDate(selectedNote.updatedAt, locale)}</p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
