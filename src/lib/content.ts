export type EditorBlock = {
  type: string;
  data?: Record<string, unknown>;
};

export type EditorContent = {
  blocks: EditorBlock[];
  version?: string;
};

function normalizePreviewText(value: string) {
  return value
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseEditorContent(raw: string, depth = 0): EditorContent | null {
  const trimmed = raw.trim();
  if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as EditorContent | EditorBlock[] | string;
    if (typeof parsed === "string" && depth < 2) {
      return parseEditorContent(parsed, depth + 1);
    }
    if (Array.isArray(parsed)) {
      return {
        blocks: parsed,
      };
    }
    if (!parsed || !Array.isArray(parsed.blocks)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function collectListText(items: unknown): string[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.flatMap((item) => {
    if (typeof item === "string") {
      const text = stripHtml(item);
      return text ? [text] : [];
    }

    if (!item || typeof item !== "object") {
      return [];
    }

    const typed = item as { content?: unknown; text?: unknown; items?: unknown; children?: unknown };
    const content = typeof typed.content === "string"
      ? stripHtml(typed.content)
      : typeof typed.text === "string"
        ? stripHtml(typed.text)
        : "";

    const nested = collectListText(typed.items ?? typed.children);
    return content ? [content, ...nested] : nested;
  });
}

function getBlockText(block: EditorBlock) {
  const data = block.data ?? {};
  switch (block.type) {
    case "paragraph":
    case "header":
    case "quote": {
      const text = typeof data.text === "string" ? data.text : "";
      return stripHtml(text);
    }
    case "list": {
      return collectListText(data.items).join(" ");
    }
    case "code": {
      return typeof data.code === "string" ? data.code.trim() : "";
    }
    default:
      return "";
  }
}

export function getContentText(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  const parsed = parseEditorContent(trimmed);
  if (!parsed) {
    if (trimmed[0] === "{" || trimmed[0] === "[") {
      return "";
    }
    return normalizePreviewText(trimmed);
  }

  return normalizePreviewText(parsed.blocks.map(getBlockText).filter(Boolean).join(" "));
}
