import DOMPurify from "isomorphic-dompurify";
import type { ElementType } from "react";
import Image from "next/image";
import { parseEditorContent } from "@/lib/content";

type EditorRendererProps = {
  content: string;
  locale?: "tr" | "en";
};

type ListNode = string | {
  content?: unknown;
  text?: unknown;
  items?: unknown;
  children?: unknown;
};

function sanitizeInline(value: string) {
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "a", "code", "mark", "br"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}

function renderInline(value: string) {
  const sanitized = sanitizeInline(value);
  return sanitized.trim() ? (
    <span dangerouslySetInnerHTML={{ __html: sanitized }} />
  ) : null;
}

function normalizeListItems(rawItems: unknown): Array<{ content: string; children: ListNode[] }> {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map((item) => {
      if (typeof item === "string") {
        return {
          content: item,
          children: [],
        };
      }
      if (typeof item === "number") {
        return {
          content: String(item),
          children: [],
        };
      }
      if (typeof item === "object" && item) {
        const typed = item as { content?: unknown; text?: unknown; items?: unknown; children?: unknown };
        const text = typeof typed.content === "string"
          ? typed.content
          : typeof typed.text === "string"
            ? typed.text
            : "";
        return {
          content: text,
          children: Array.isArray(typed.items)
            ? (typed.items as ListNode[])
            : Array.isArray(typed.children)
              ? (typed.children as ListNode[])
              : [],
        };
      }
      return null;
    })
    .filter(
      (item): item is { content: string; children: ListNode[] } => Boolean(item && (item.content || item.children.length)),
    );
}

function renderListTree(items: ListNode[], style: "ordered" | "unordered") {
  const normalized = normalizeListItems(items);
  if (normalized.length === 0) {
    return null;
  }

  const ListTag = style === "ordered" ? "ol" : "ul";

  return (
    <ListTag>
      {normalized.map((item, index) => (
        <li key={index}>
          {renderInline(item.content)}
          {item.children.length > 0 ? renderListTree(item.children, style) : null}
        </li>
      ))}
    </ListTag>
  );
}

function findImageUrl(value: unknown, depth = 0): string {
  if (depth > 4 || !value) {
    return "";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
      return trimmed;
    }
    return "";
  }

  if (typeof value !== "object") {
    return "";
  }

  const typed = value as Record<string, unknown>;
  const directKeys = ["url", "src", "path"] as const;
  for (const key of directKeys) {
    const direct = findImageUrl(typed[key], depth + 1);
    if (direct) {
      return direct;
    }
  }

  const nestedKeys = ["file", "image", "data"] as const;
  for (const key of nestedKeys) {
    const nested = findImageUrl(typed[key], depth + 1);
    if (nested) {
      return nested;
    }
  }

  return "";
}

function getImageUrl(data: Record<string, unknown>) {
  return findImageUrl(data);
}

export default function EditorRenderer({ content, locale = "tr" }: EditorRendererProps) {
  const t = locale === "en"
    ? { upcoming: "Content will be added soon.", imageAlt: "Image" }
    : { upcoming: "İçerik yakında eklenecek.", imageAlt: "Görsel" };
  const parsed = parseEditorContent(content);

  if (!parsed) {
    const paragraphs = content
      ? content.split(/\n\n+/).map((block) => block.trim()).filter(Boolean)
      : [];

    return (
      <>
        {paragraphs.length === 0 ? (
          <p>{t.upcoming}</p>
        ) : (
          paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
        )}
      </>
    );
  }

  if (parsed.blocks.length === 0) {
    return <p>{t.upcoming}</p>;
  }

  return (
    <>
      {parsed.blocks.map((block, index) => {
        const data = block.data ?? {};

        switch (block.type) {
          case "paragraph": {
            const text = typeof data.text === "string" ? data.text : "";
            return <p key={index}>{renderInline(text)}</p>;
          }
          case "header": {
            const level = typeof data.level === "number" ? data.level : 2;
            const safeLevel = Math.min(6, Math.max(1, level));
            const text = typeof data.text === "string" ? data.text : "";
            const Tag = `h${safeLevel}` as ElementType;
            return <Tag key={index}>{renderInline(text)}</Tag>;
          }
          case "list": {
            const items = Array.isArray(data.items) ? data.items : [];
            const rawStyle = typeof data.style === "string"
              ? data.style
              : typeof data.style === "object" && data.style
                ? String((data.style as { type?: unknown }).type ?? "")
                : "";
            const style = rawStyle === "ordered" || rawStyle === "ol" ? "ordered" : "unordered";
            return <div key={index}>{renderListTree(items as ListNode[], style)}</div>;
          }
          case "quote": {
            const text = typeof data.text === "string" ? data.text : "";
            const caption = typeof data.caption === "string" ? data.caption : "";
            return (
              <blockquote key={index}>
                <p>{renderInline(text)}</p>
                {caption ? <cite>{renderInline(caption)}</cite> : null}
              </blockquote>
            );
          }
          case "code": {
            const code = typeof data.code === "string" ? data.code : "";
            return (
              <pre key={index}>
                <code>{code}</code>
              </pre>
            );
          }
          case "image": {
            const url = getImageUrl(data as Record<string, unknown>);
            if (!url) {
              return null;
            }
            const caption = typeof data.caption === "string" ? data.caption : "";
            const withBorder = data.withBorder === true;
            const withBackground = data.withBackground === true;
            const stretched = data.stretched === true;
            return (
              <figure
                key={index}
                style={{
                  margin: "12px 0",
                  padding: withBackground ? "12px" : 0,
                  background: withBackground ? "#f4eee3" : "transparent",
                  borderRadius: withBackground ? "10px" : 0,
                  border: withBorder ? "1px solid #d8cfbf" : "none",
                  width: stretched ? "100%" : "auto",
                  overflow: "hidden",
                }}
              >
                <Image
                  src={url}
                  alt={caption || t.imageAlt}
                  width={1200}
                  height={800}
                  unoptimized
                  sizes="(max-width: 900px) 100vw, 760px"
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    width: stretched ? "100%" : "auto",
                    height: "auto",
                  }}
                />
                {caption ? <figcaption>{renderInline(caption)}</figcaption> : null}
              </figure>
            );
          }
          default:
            return null;
        }
      })}
    </>
  );
}
