"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type EditorJS from "@editorjs/editorjs";
import type { BlockToolConstructable, OutputData } from "@editorjs/editorjs";
import EditorRenderer from "@/components/EditorRenderer";
import { parseEditorContent } from "@/lib/content";
import { interpolate } from "@/lib/interpolate";
import styles from "./post-form.module.css";

interface EditorFieldProps {
  name: string;
  defaultValue?: string;
  messages?: Partial<EditorMessages>;
  locale?: "tr" | "en";
}

type EditorMessages = {
  tabContent: string;
  tabPreview: string;
  addBlock: string;
  dragBlock: string;
  finishBlock: string;
  complete: string;
  filterPlaceholder: string;
  noResults: string;
  preparing: string;
  livePreview: string;
  commandParagraphDescription: string;
  commandHeaderLabel: string;
  commandHeaderDescription: string;
  commandListLabel: string;
  commandListDescription: string;
  commandQuoteLabel: string;
  commandQuoteDescription: string;
  commandCodeLabel: string;
  commandCodeDescription: string;
  commandImageLabel: string;
  commandImageDescription: string;
  commandDividerLabel: string;
  commandDividerDescription: string;
  optionHeading: string;
  optionListUnordered: string;
  optionListOrdered: string;
  optionAlignLeft: string;
  optionAlignCenter: string;
  optionAlignRight: string;
  optionTextSizeSm: string;
  optionTextSizeMd: string;
  optionTextSizeLg: string;
  optionTextToneDefault: string;
  optionTextToneMuted: string;
  optionTextToneAccent: string;
  optionImageBorder: string;
  optionImageStretch: string;
  optionImageBackground: string;
  optionImagePositionLeft: string;
  optionImagePositionCenter: string;
  optionImagePositionRight: string;
  optionMoveUp: string;
  optionDelete: string;
  optionMoveDown: string;
  quotePlaceholder: string;
  quoteCaptionPlaceholder: string;
  codePlaceholder: string;
};

const DEFAULT_EDITOR_MESSAGES: EditorMessages = {
  tabContent: "Content",
  tabPreview: "Preview",
  addBlock: "Add block",
  dragBlock: "Drag block",
  finishBlock: "Finish block",
  complete: "Done",
  filterPlaceholder: "Filter",
  noResults: "No results found.",
  preparing: "Editor is preparing...",
  livePreview: "Live Preview",
  commandParagraphDescription: "Normal text block",
  commandHeaderLabel: "Heading",
  commandHeaderDescription: "H2/H3 heading block",
  commandListLabel: "List",
  commandListDescription: "Bullet list block",
  commandQuoteLabel: "Quote",
  commandQuoteDescription: "Quote block",
  commandCodeLabel: "Code",
  commandCodeDescription: "Code block",
  commandImageLabel: "Image",
  commandImageDescription: "Upload image or paste URL",
  commandDividerLabel: "Divider",
  commandDividerDescription: "Horizontal rule",
  optionHeading: "Heading {level}",
  optionListUnordered: "Unordered list",
  optionListOrdered: "Ordered list",
  optionAlignLeft: "Align left",
  optionAlignCenter: "Align center",
  optionAlignRight: "Align right",
  optionTextSizeSm: "Text small",
  optionTextSizeMd: "Text medium",
  optionTextSizeLg: "Text large",
  optionTextToneDefault: "Default color",
  optionTextToneMuted: "Muted color",
  optionTextToneAccent: "Accent color",
  optionImageBorder: "Add border",
  optionImageStretch: "Stretch image",
  optionImageBackground: "Add background",
  optionImagePositionLeft: "Position left",
  optionImagePositionCenter: "Position center",
  optionImagePositionRight: "Position right",
  optionMoveUp: "Move up",
  optionDelete: "Delete",
  optionMoveDown: "Move down",
  quotePlaceholder: "Write quote",
  quoteCaptionPlaceholder: "Quote source (optional)",
  codePlaceholder: "Write your code here",
};

type SlashCommand = {
  id: string;
  label: string;
  description: string;
  type: string;
  data?: Record<string, unknown>;
  keywords?: string[];
};

type EditorListStyle = "unordered" | "ordered";
type EditorTextAlign = "left" | "center" | "right";
type EditorTextSize = "sm" | "md" | "lg";
type EditorTextTone = "default" | "muted" | "accent";
type EditorImagePosition = "left" | "center" | "right";
type InlineAction = "bold" | "italic" | "underline" | "strike" | "code" | "link";
type BlockFontWeight = 300 | 400 | 500 | 600 | 700 | 800 | 900;

type BlockMenuContext = {
  index: number;
  blockId: string;
  tool: string;
  data: Record<string, unknown>;
  headerLevel?: number;
  listStyle?: EditorListStyle;
  textAlign?: EditorTextAlign;
  textSize?: EditorTextSize;
  textTone?: EditorTextTone;
  fontSize?: number;
  fontWeight?: BlockFontWeight;
  imageWithBorder?: boolean;
  imageStretched?: boolean;
  imageWithBackground?: boolean;
  imagePosition?: EditorImagePosition;
};

type BlockStylePatch = {
  align?: EditorTextAlign;
  size?: EditorTextSize;
  tone?: EditorTextTone;
  textColor?: string | null;
  fontSize?: number;
  fontWeight?: BlockFontWeight;
  position?: EditorImagePosition;
};

type SelectionToolbarState = {
  top: number;
  left: number;
  blockIndex: number;
  blockId: string;
  blockTool: string;
  headerLevel?: number;
  previewText?: string;
  style: BlockStylePatch;
};

type ImageQuickMenuState = {
  top: number;
  left: number;
  blockIndex: number;
  blockId: string;
  data: Record<string, unknown>;
  withBorder: boolean;
  stretched: boolean;
  withBackground: boolean;
  position: EditorImagePosition;
};

type BlockMenuOption = {
  id: string;
  kind:
    | "sectionTitle"
    | "headerLevel"
    | "listStyle"
    | "textAlign"
    | "textSize"
    | "textTone"
    | "imageWithBorder"
    | "imageStretched"
    | "imageWithBackground"
    | "imagePosition"
    | "inlineAction"
    | "moveUp"
    | "moveDown"
    | "delete"
    | "separator";
  label?: string;
  icon?: string;
  keywords?: string[];
  value?:
    | number
    | EditorListStyle
    | EditorTextAlign
    | EditorTextSize
    | EditorTextTone
    | EditorImagePosition
    | InlineAction;
  selected?: boolean;
  danger?: boolean;
};

type EditorBlockEntry = {
  id?: string | number;
  name?: string;
  save?: () => Promise<{ data?: unknown }>;
};

type EditorBlocksApi = {
  getCurrentBlockIndex?: () => number;
  getBlockByIndex?: (index: number) => EditorBlockEntry | null | undefined;
  insert?: (
    type: string,
    data?: Record<string, unknown>,
    config?: unknown,
    index?: number,
    needToFocus?: boolean,
  ) => void;
  composeBlockData?: (type: string) => Promise<Record<string, unknown>>;
  move?: (toIndex: number, fromIndex?: number) => void;
  getBlocksCount?: () => number;
  delete?: (index?: number) => void;
  update?: (id: string, data: Record<string, unknown>) => Promise<void> | void;
};

type EditorCaretApi = {
  setToBlock?: (index: number, position?: "start" | "end" | number) => void;
};

type EditorRuntimeApi = EditorJS & {
  blocks?: EditorBlocksApi;
  caret?: EditorCaretApi;
};

function buildSlashCommands(messages: EditorMessages): SlashCommand[] {
  return [
    {
      id: "paragraph",
      label: "Paragraph",
      description: messages.commandParagraphDescription,
      type: "paragraph",
      data: { text: "" },
      keywords: ["text", "paragraph"],
    },
    {
      id: "header",
      label: messages.commandHeaderLabel,
      description: messages.commandHeaderDescription,
      type: "header",
      data: { text: "", level: 2 },
      keywords: ["heading", "title"],
    },
    {
      id: "list",
      label: messages.commandListLabel,
      description: messages.commandListDescription,
      type: "list",
      keywords: ["bullet", "list"],
    },
    {
      id: "quote",
      label: messages.commandQuoteLabel,
      description: messages.commandQuoteDescription,
      type: "quote",
      data: { text: "", caption: "" },
      keywords: ["citation", "quote"],
    },
    {
      id: "code",
      label: messages.commandCodeLabel,
      description: messages.commandCodeDescription,
      type: "code",
      data: { code: "" },
      keywords: ["code", "snippet"],
    },
    {
      id: "image",
      label: messages.commandImageLabel,
      description: messages.commandImageDescription,
      type: "image",
      data: {},
      keywords: ["image", "photo"],
    },
    {
      id: "delimiter",
      label: messages.commandDividerLabel,
      description: messages.commandDividerDescription,
      type: "delimiter",
      data: {},
      keywords: ["divider", "line", "hr"],
    },
  ];
}

const COMMAND_ICONS: Record<string, string> = {
  paragraph: "T",
  header: "H",
  list: "1=",
  quote: '""',
  code: "</>",
  image: "[]",
  delimiter: "---",
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }
  return value as Record<string, unknown>;
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

function normalizeImagePosition(value: unknown): EditorImagePosition {
  return value === "left" || value === "right" ? value : "center";
}

function normalizeFontSize(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 16;
  }
  return Math.max(8, Math.min(64, Math.round(parsed)));
}

function normalizeHeaderLevel(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 2;
  }
  return Math.max(1, Math.min(6, Math.round(parsed)));
}

function normalizeFontWeight(value: unknown): BlockFontWeight {
  const allowed: BlockFontWeight[] = [300, 400, 500, 600, 700, 800, 900];
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 400;
  }
  let closest = allowed[0];
  for (const weight of allowed) {
    if (Math.abs(weight - parsed) < Math.abs(closest - parsed)) {
      closest = weight;
    }
  }
  return closest;
}

function normalizeTextColor(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getOptionalTextStylePatch(data: Record<string, unknown>): BlockStylePatch {
  const patch: BlockStylePatch = {};
  if (data.align === "left" || data.align === "center" || data.align === "right") {
    patch.align = data.align;
  }
  if (data.size === "sm" || data.size === "md" || data.size === "lg") {
    patch.size = data.size;
  }
  if (data.tone === "default" || data.tone === "muted" || data.tone === "accent") {
    patch.tone = data.tone;
  }
  const textColor = normalizeTextColor(data.textColor);
  if (textColor) {
    patch.textColor = textColor;
  }
  if (Number.isFinite(Number(data.fontSize))) {
    patch.fontSize = normalizeFontSize(data.fontSize);
  }
  if (Number.isFinite(Number(data.fontWeight))) {
    patch.fontWeight = normalizeFontWeight(data.fontWeight);
  }
  return patch;
}

function isTextualTool(tool: string) {
  return tool === "paragraph" || tool === "header" || tool === "list" || tool === "quote";
}

function hasStylePatch(patch: BlockStylePatch | undefined) {
  if (!patch) {
    return false;
  }
  return Object.keys(patch).length > 0;
}

function getStylePatchFromData(tool: string, data: Record<string, unknown>): BlockStylePatch {
  if (isTextualTool(tool)) {
    return getOptionalTextStylePatch(data);
  }
  if (tool === "image") {
    if (data.position === "left" || data.position === "center" || data.position === "right") {
      return { position: data.position };
    }
    return {};
  }
  return {};
}

function applyStylePatchToData(tool: string, data: Record<string, unknown>, patch?: BlockStylePatch) {
  if (!patch) {
    return data;
  }
  const nextData = { ...data };
  if (isTextualTool(tool)) {
    if (patch.align) {
      nextData.align = patch.align;
    }
    if (patch.size) {
      nextData.size = patch.size;
    }
    if (patch.tone) {
      nextData.tone = patch.tone;
    }
    if (patch.textColor === null) {
      delete nextData.textColor;
    } else {
      const textColor = normalizeTextColor(patch.textColor);
      if (textColor) {
        nextData.textColor = textColor;
      }
    }
    if (typeof patch.fontSize === "number") {
      nextData.fontSize = normalizeFontSize(patch.fontSize);
    }
    if (typeof patch.fontWeight === "number") {
      nextData.fontWeight = normalizeFontWeight(patch.fontWeight);
    }
  }
  if (tool === "image" && patch.position) {
    nextData.position = patch.position;
  }
  return nextData;
}

function applyTextVisualStyle(target: HTMLElement, patch?: BlockStylePatch) {
  if (!patch) {
    target.style.removeProperty("text-align");
    target.style.removeProperty("font-size");
    target.style.removeProperty("font-weight");
    target.style.removeProperty("color");
    return;
  }

  if (patch.align) {
    target.style.textAlign = patch.align;
  } else {
    target.style.removeProperty("text-align");
  }
  if (typeof patch.fontSize === "number") {
    target.style.fontSize = `${normalizeFontSize(patch.fontSize)}px`;
  } else {
    target.style.removeProperty("font-size");
  }
  if (typeof patch.fontWeight === "number") {
    target.style.fontWeight = String(normalizeFontWeight(patch.fontWeight));
  } else {
    target.style.removeProperty("font-weight");
  }

  const textColor = normalizeTextColor(patch.textColor);
  if (textColor) {
    target.style.color = textColor;
  } else if (patch.tone === "muted") {
    target.style.color = "var(--muted)";
  } else if (patch.tone === "accent") {
    target.style.color = "var(--accent-dark)";
  } else {
    target.style.removeProperty("color");
  }
}

function normalizeToolName(toolName: string | null | undefined, data?: Record<string, unknown>) {
  const value = (toolName ?? "").toLowerCase();
  if (value.includes("delimiter") || value.includes("hr")) {
    return "delimiter";
  }
  if (value.includes("header")) {
    return "header";
  }
  if (value.includes("list")) {
    return "list";
  }
  if (value.includes("quote")) {
    return "quote";
  }
  if (value.includes("code")) {
    return "code";
  }
  if (value.includes("image")) {
    return "image";
  }
  if (value.includes("paragraph") || value.includes("text")) {
    return "paragraph";
  }
  if (data && findImageUrl(data)) {
    return "image";
  }
  return value;
}

function normalizeListItems(items: unknown): unknown[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }
      if (typeof item === "number") {
        return String(item);
      }
      if (!item || typeof item !== "object") {
        return null;
      }
      const typed = item as Record<string, unknown>;
      const content = typeof typed.content === "string"
        ? typed.content
        : typeof typed.text === "string"
          ? typed.text
          : "";
      const children = normalizeListItems(typed.items ?? typed.children);
      if (!content && children.length === 0) {
        return null;
      }
      return {
        content,
        items: children,
      };
    })
    .filter((item) => item !== null);
}

function normalizeInitialBlock(rawBlock: unknown) {
  if (!rawBlock || typeof rawBlock !== "object") {
    return null;
  }
  const block = rawBlock as { type?: unknown; data?: unknown };
  const data = asRecord(block.data);
  const tool = normalizeToolName(typeof block.type === "string" ? block.type : "", data);

  if (tool === "paragraph") {
    const text = typeof data.text === "string"
      ? data.text
      : typeof data.content === "string"
        ? data.content
        : "";
    return {
      type: "paragraph",
      data: {
        text,
        ...getOptionalTextStylePatch(data),
      },
    };
  }

  if (tool === "header") {
    const text = typeof data.text === "string" ? data.text : "";
    const parsedLevel = Number(data.level);
    const level = Number.isFinite(parsedLevel) ? Math.min(6, Math.max(1, parsedLevel)) : 2;
    return {
      type: "header",
      data: {
        text,
        level,
        ...getOptionalTextStylePatch(data),
      },
    };
  }

  if (tool === "list") {
    const rawStyle = typeof data.style === "string"
      ? data.style
      : typeof data.style === "object" && data.style
        ? String((data.style as { type?: unknown }).type ?? "")
        : "";
    const style: EditorListStyle = rawStyle === "ordered" || rawStyle === "ol" ? "ordered" : "unordered";
    return {
      type: "list",
      data: {
        style,
        items: normalizeListItems(data.items),
        ...getOptionalTextStylePatch(data),
      },
    };
  }

  if (tool === "quote") {
    return {
      type: "quote",
      data: {
        text: typeof data.text === "string" ? data.text : "",
        caption: typeof data.caption === "string" ? data.caption : "",
        ...getOptionalTextStylePatch(data),
      },
    };
  }

  if (tool === "code") {
    return {
      type: "code",
      data: {
        code: typeof data.code === "string"
          ? data.code
          : typeof data.text === "string"
            ? data.text
            : "",
      },
    };
  }

  if (tool === "image") {
    const url = findImageUrl(data);
    const normalizedData: Record<string, unknown> = {
      ...data,
      caption: typeof data.caption === "string" ? data.caption : "",
      withBorder: data.withBorder === true,
      withBackground: data.withBackground === true,
      stretched: data.stretched === true,
      position: normalizeImagePosition(data.position),
    };

    if (url) {
      normalizedData.url = typeof data.url === "string" && data.url.trim() ? data.url : url;
      if (!data.file || typeof data.file !== "object") {
        normalizedData.file = { url };
      }
    }

    return {
      type: "image",
      data: normalizedData,
    };
  }

  if (tool === "delimiter") {
    return {
      type: "delimiter",
      data: {},
    };
  }

  return null;
}

function buildInitialData(defaultValue: string): OutputData {
  const parsed = parseEditorContent(defaultValue);
  if (parsed) {
    const normalizedBlocks = parsed.blocks
      .map((block) => normalizeInitialBlock(block))
      .filter((block): block is { type: string; data: Record<string, unknown> } => Boolean(block));

    return {
      time: Date.now(),
      blocks: normalizedBlocks,
      version: parsed.version ?? "2.0.0",
    };
  }

  const blocks = defaultValue
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((text) => ({
      type: "paragraph",
      data: { text },
    }));

  return {
    time: Date.now(),
    blocks,
    version: "2.0.0",
  };
}

function sanitizeEditorRuntimeData(data: OutputData): OutputData {
  const blocks = Array.isArray(data.blocks) ? data.blocks : [];
  const sanitizedBlocks = blocks.map((rawBlock) => {
    const block = rawBlock as { id?: string; type?: unknown; data?: unknown };
    const rawData = asRecord(block.data);
    const tool = normalizeToolName(typeof block.type === "string" ? block.type : "", rawData);

    if (tool === "paragraph") {
      return {
        ...(block.id ? { id: block.id } : {}),
        type: "paragraph",
        data: {
          text: typeof rawData.text === "string" ? rawData.text : "",
        },
      };
    }

    if (tool === "header") {
      return {
        ...(block.id ? { id: block.id } : {}),
        type: "header",
        data: {
          text: typeof rawData.text === "string" ? rawData.text : "",
          level: normalizeHeaderLevel(rawData.level),
        },
      };
    }

    if (tool === "list") {
      const style = rawData.style === "ordered" ? "ordered" : "unordered";
      return {
        ...(block.id ? { id: block.id } : {}),
        type: "list",
        data: {
          style,
          items: normalizeListItems(rawData.items),
        },
      };
    }

    if (tool === "quote") {
      return {
        ...(block.id ? { id: block.id } : {}),
        type: "quote",
        data: {
          text: typeof rawData.text === "string" ? rawData.text : "",
          caption: typeof rawData.caption === "string" ? rawData.caption : "",
        },
      };
    }

    if (tool === "code") {
      return {
        ...(block.id ? { id: block.id } : {}),
        type: "code",
        data: {
          code: typeof rawData.code === "string"
            ? rawData.code
            : typeof rawData.text === "string"
              ? rawData.text
              : "",
        },
      };
    }

    if (tool === "image") {
      const url = findImageUrl(rawData);
      return {
        ...(block.id ? { id: block.id } : {}),
        type: "image",
        data: {
          ...(rawData.file && typeof rawData.file === "object" ? { file: rawData.file } : {}),
          ...(url ? { url } : {}),
          caption: typeof rawData.caption === "string" ? rawData.caption : "",
          withBorder: rawData.withBorder === true,
          withBackground: rawData.withBackground === true,
          stretched: rawData.stretched === true,
        },
      };
    }

    if (tool === "delimiter") {
      return {
        ...(block.id ? { id: block.id } : {}),
        type: "delimiter",
        data: {},
      };
    }

    return rawBlock;
  });

  return {
    ...data,
    blocks: sanitizedBlocks as OutputData["blocks"],
  };
}

function dedupeImageBlocks(data: OutputData): OutputData {
  const blocks = Array.isArray(data.blocks) ? data.blocks : [];
  const seenImageUrls = new Set<string>();
  const dedupedBlocks = blocks.filter((rawBlock) => {
    const block = rawBlock as { type?: unknown; data?: unknown };
    const dataRecord = asRecord(block.data);
    const tool = normalizeToolName(typeof block.type === "string" ? block.type : "", dataRecord);
    if (tool !== "image") {
      return true;
    }

    const url = findImageUrl(dataRecord).trim().toLowerCase();
    if (!url) {
      return true;
    }
    if (seenImageUrls.has(url)) {
      return false;
    }
    seenImageUrls.add(url);
    return true;
  });

  return {
    ...data,
    blocks: dedupedBlocks as OutputData["blocks"],
  };
}

export default function EditorField({
  name,
  defaultValue = "",
  messages,
  locale = "tr",
}: EditorFieldProps) {
  const m = useMemo<EditorMessages>(
    () => ({ ...DEFAULT_EDITOR_MESSAGES, ...messages }),
    [messages],
  );
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const holderRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorJS | null>(null);
  const initialData = useMemo(() => buildInitialData(defaultValue), [defaultValue]);
  const editorRuntimeData = useMemo(() => sanitizeEditorRuntimeData(initialData), [initialData]);
  const [serialized, setSerialized] = useState(() => JSON.stringify(initialData));
  const [isReady, setIsReady] = useState(false);
  const [floatingTop, setFloatingTop] = useState<number | null>(null);
  const [floatingVisible, setFloatingVisible] = useState(false);
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
  const [activeBlockTool, setActiveBlockTool] = useState<string | null>(null);
  const [codeButtonPosition, setCodeButtonPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuQuery, setMenuQuery] = useState("");
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [blockMenuIndex, setBlockMenuIndex] = useState<number | null>(null);
  const [blockMenuPosition, setBlockMenuPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [blockMenuContext, setBlockMenuContext] = useState<BlockMenuContext | null>(null);
  const [blockMenuQuery, setBlockMenuQuery] = useState("");
  const [imageQuickMenu, setImageQuickMenu] = useState<ImageQuickMenuState | null>(null);
  const [selectionToolbar, setSelectionToolbar] = useState<SelectionToolbarState | null>(null);
  const [selectionToolbarLeft, setSelectionToolbarLeft] = useState<number | null>(null);
  const [selectionTransformOpen, setSelectionTransformOpen] = useState(false);
  const [selectionTransformPosition, setSelectionTransformPosition] = useState<{
    top: number;
    left: number;
    maxHeight: number;
  } | null>(null);
  const [selectionInlineMoreOpen, setSelectionInlineMoreOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const blockMenuRef = useRef<HTMLDivElement | null>(null);
  const imageQuickMenuRef = useRef<HTMLDivElement | null>(null);
  const selectionToolbarRef = useRef<HTMLDivElement | null>(null);
  const selectionTransformRef = useRef<HTMLDivElement | null>(null);
  const selectionTransformTriggerRef = useRef<HTMLButtonElement | null>(null);
  const selectionTransformMenuRef = useRef<HTMLDivElement | null>(null);
  const selectionInlineMoreRef = useRef<HTMLDivElement | null>(null);
  const menuInputRef = useRef<HTMLInputElement | null>(null);
  const blockMenuInputRef = useRef<HTMLInputElement | null>(null);
  const blockStyleByIdRef = useRef<Record<string, BlockStylePatch>>({});
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    startIndex: number | null;
    overIndex: number | null;
    dragging: boolean;
  }>({
    startX: 0,
    startY: 0,
    startIndex: null,
    overIndex: null,
    dragging: false,
  });
  const slashCommands = useMemo(() => buildSlashCommands(m), [m]);
  const initialStylePatchesByIndex = useMemo(() => {
    const blocks = Array.isArray(initialData.blocks) ? initialData.blocks : [];
    return blocks.map((rawBlock) => {
      const normalized = normalizeInitialBlock(rawBlock);
      if (!normalized) {
        return null;
      }
      const patch = getStylePatchFromData(normalized.type, normalized.data);
      return hasStylePatch(patch) ? patch : null;
    });
  }, [initialData]);

  const getEditor = useCallback((): EditorRuntimeApi | null => {
    return editorRef.current as EditorRuntimeApi | null;
  }, []);

  const syncSerializedFromEditor = useCallback(async (editor: EditorRuntimeApi) => {
    const output = await editor.save();
    const runtimeBlockIdsByIndex: string[] = [];
    if (editor.blocks?.getBlocksCount && editor.blocks?.getBlockByIndex) {
      const count = editor.blocks.getBlocksCount();
      for (let index = 0; index < count; index += 1) {
        const block = editor.blocks.getBlockByIndex(index);
        runtimeBlockIdsByIndex.push(block?.id ? String(block.id) : "");
      }
    }
    const normalizedBlocks = output.blocks
      .map((rawBlock, index) => {
        const normalized = normalizeInitialBlock(rawBlock);
        if (!normalized) {
          return null;
        }

        const raw = rawBlock as { id?: unknown };
        const blockId = typeof raw.id === "string" && raw.id
          ? raw.id
          : runtimeBlockIdsByIndex[index] || null;
        if (!blockId) {
          return normalized;
        }

        const persistedPatch = blockStyleByIdRef.current[blockId];
        const extractedPatch = getStylePatchFromData(normalized.type, normalized.data);
        const effectivePatch = hasStylePatch(persistedPatch) ? persistedPatch : extractedPatch;
        normalized.data = applyStylePatchToData(normalized.type, normalized.data, effectivePatch);

        if (hasStylePatch(effectivePatch)) {
          blockStyleByIdRef.current[blockId] = effectivePatch;
        }
        return normalized;
      })
      .filter((block): block is { type: string; data: Record<string, unknown> } => Boolean(block));

    const deduped = dedupeImageBlocks({
      ...output,
      blocks: normalizedBlocks,
    });

    setSerialized(JSON.stringify(deduped));
    requestAnimationFrame(() => {
      const editorRuntime = getEditor();
      if (!editorRuntime?.blocks?.getBlocksCount || !editorRuntime?.blocks?.getBlockByIndex) {
        return;
      }
      const count = editorRuntime.blocks.getBlocksCount();
      for (let index = 0; index < count; index += 1) {
        const block = editorRuntime.blocks.getBlockByIndex(index);
        if (!block) {
          continue;
        }
        const blockId = block.id ? String(block.id) : "";
        const blockEl = holderRef.current?.querySelectorAll(".ce-block").item(index) as HTMLElement | null;
        if (!blockEl || !blockId) {
          continue;
        }
        const tool = normalizeToolName(String(block.name ?? ""));
        const patch = blockStyleByIdRef.current[blockId];
        if (!patch || !isTextualTool(tool)) {
          continue;
        }
        const targets = blockEl.querySelectorAll<HTMLElement>(
          ".ce-paragraph, .ce-header, .ce-quote__text, .ce-quote__caption, .cdx-list, .ce-list",
        );
        if (targets.length === 0) {
          const fallback = blockEl.querySelector<HTMLElement>(".ce-block__content");
          if (fallback) {
            applyTextVisualStyle(fallback, patch);
          }
          continue;
        }
        targets.forEach((target) => {
          applyTextVisualStyle(target, patch);
        });
      }
    });
  }, [getEditor]);

  const hydrateStyleMapFromInitialData = useCallback((editor: EditorRuntimeApi) => {
    if (!editor.blocks?.getBlocksCount || !editor.blocks?.getBlockByIndex) {
      return;
    }

    const count = editor.blocks.getBlocksCount();
    for (let index = 0; index < count; index += 1) {
      const patch = initialStylePatchesByIndex[index];
      if (!patch) {
        continue;
      }
      const block = editor.blocks.getBlockByIndex(index);
      const blockId = block?.id ? String(block.id) : "";
      if (!blockId) {
        continue;
      }
      if (!hasStylePatch(blockStyleByIdRef.current[blockId])) {
        blockStyleByIdRef.current[blockId] = patch;
      }
    }
  }, [initialStylePatchesByIndex]);

  const filteredCommands = useMemo(() => {
    const query = menuQuery.trim().toLowerCase();
    if (!query) {
      return slashCommands;
    }
    return slashCommands.filter((command) => {
      if (command.label.toLowerCase().includes(query)) {
        return true;
      }
      return (command.keywords ?? []).some((keyword) => keyword.includes(query));
    });
  }, [menuQuery, slashCommands]);

  const blockMenuOptions = useMemo(() => {
    const options: BlockMenuOption[] = [];
    const context = blockMenuContext;
    const supportsAlignment = context
      ? ["paragraph", "header", "list", "quote"].includes(context.tool)
      : false;
    const supportsTextStyling = context
      ? ["paragraph", "header", "list", "quote"].includes(context.tool)
      : false;

    if (context?.tool === "header") {
      options.push({
        id: "section-header-settings",
        kind: "sectionTitle",
        label: "Heading settings",
      });
      [1, 2, 3, 4, 5, 6].forEach((level) => {
        options.push({
          id: `header-${level}`,
          kind: "headerLevel",
          label: interpolate(m.optionHeading, { level }),
          icon: `H${level}`,
          value: level,
          selected: context.headerLevel === level,
          keywords: ["baslik", "heading", `h${level}`],
        });
      });
      options.push({ id: "sep-header", kind: "separator" });
    }

    if (supportsAlignment) {
      options.push({
        id: "section-text-alignment",
        kind: "sectionTitle",
        label: "Text alignment",
      });
      options.push(
        {
          id: "align-left",
          kind: "textAlign",
          label: m.optionAlignLeft,
          icon: "L",
          value: "left",
          selected: context?.textAlign === "left",
          keywords: ["left", "sol", "align"],
        },
        {
          id: "align-center",
          kind: "textAlign",
          label: m.optionAlignCenter,
          icon: "C",
          value: "center",
          selected: context?.textAlign === "center",
          keywords: ["center", "orta", "align"],
        },
        {
          id: "align-right",
          kind: "textAlign",
          label: m.optionAlignRight,
          icon: "R",
          value: "right",
          selected: context?.textAlign === "right",
          keywords: ["right", "sag", "align"],
        },
        { id: "sep-align", kind: "separator" },
      );
    }

    if (supportsTextStyling) {
      options.push({
        id: "section-text-style",
        kind: "sectionTitle",
        label: "Text style",
      });
      options.push(
        {
          id: "text-size-sm",
          kind: "textSize",
          label: m.optionTextSizeSm,
          icon: "A-",
          value: "sm",
          selected: context?.textSize === "sm",
          keywords: ["size", "kucuk", "small"],
        },
        {
          id: "text-size-md",
          kind: "textSize",
          label: m.optionTextSizeMd,
          icon: "A",
          value: "md",
          selected: context?.textSize === "md",
          keywords: ["size", "orta", "medium"],
        },
        {
          id: "text-size-lg",
          kind: "textSize",
          label: m.optionTextSizeLg,
          icon: "A+",
          value: "lg",
          selected: context?.textSize === "lg",
          keywords: ["size", "buyuk", "large"],
        },
        { id: "sep-size", kind: "separator" },
        {
          id: "text-tone-default",
          kind: "textTone",
          label: m.optionTextToneDefault,
          icon: "T",
          value: "default",
          selected: context?.textTone === "default",
          keywords: ["color", "renk", "default"],
        },
        {
          id: "text-tone-muted",
          kind: "textTone",
          label: m.optionTextToneMuted,
          icon: "Tm",
          value: "muted",
          selected: context?.textTone === "muted",
          keywords: ["color", "renk", "muted", "soft"],
        },
        {
          id: "text-tone-accent",
          kind: "textTone",
          label: m.optionTextToneAccent,
          icon: "Ta",
          value: "accent",
          selected: context?.textTone === "accent",
          keywords: ["color", "renk", "accent", "vurgu"],
        },
        { id: "sep-tone", kind: "separator" },
      );
    }

    if (context?.tool === "list") {
      options.push({
        id: "section-list-settings",
        kind: "sectionTitle",
        label: "List settings",
      });
      options.push(
        {
          id: "list-unordered",
          kind: "listStyle",
          label: m.optionListUnordered,
          icon: "•",
          value: "unordered",
          selected: context.listStyle === "unordered",
          keywords: ["liste", "sirasiz", "madde", "bullet"],
        },
        {
          id: "list-ordered",
          kind: "listStyle",
          label: m.optionListOrdered,
          icon: "1.",
          value: "ordered",
          selected: context.listStyle === "ordered",
          keywords: ["liste", "sirali", "numarali", "ordered"],
        },
        { id: "sep-list", kind: "separator" },
      );
    }

    if (context?.tool === "image") {
      options.push({
        id: "section-image-settings",
        kind: "sectionTitle",
        label: "Image settings",
      });
      options.push(
        {
          id: "image-with-border",
          kind: "imageWithBorder",
          label: m.optionImageBorder,
          icon: "[]",
          selected: context.imageWithBorder === true,
          keywords: ["border", "kenarlik", "cerceve"],
        },
        {
          id: "image-stretched",
          kind: "imageStretched",
          label: m.optionImageStretch,
          icon: "<>",
          selected: context.imageStretched === true,
          keywords: ["stretch", "genislet", "tam genislik"],
        },
        {
          id: "image-with-background",
          kind: "imageWithBackground",
          label: m.optionImageBackground,
          icon: "##",
          selected: context.imageWithBackground === true,
          keywords: ["background", "arka plan"],
        },
        { id: "sep-image-toggles", kind: "separator" },
        {
          id: "section-image-position",
          kind: "sectionTitle",
          label: "Image position",
        },
        {
          id: "image-position-left",
          kind: "imagePosition",
          label: m.optionImagePositionLeft,
          icon: "L",
          value: "left",
          selected: context.imagePosition === "left",
          keywords: ["position", "left", "sol"],
        },
        {
          id: "image-position-center",
          kind: "imagePosition",
          label: m.optionImagePositionCenter,
          icon: "C",
          value: "center",
          selected: context.imagePosition === "center",
          keywords: ["position", "center", "orta"],
        },
        {
          id: "image-position-right",
          kind: "imagePosition",
          label: m.optionImagePositionRight,
          icon: "R",
          value: "right",
          selected: context.imagePosition === "right",
          keywords: ["position", "right", "sag"],
        },
        { id: "sep-image", kind: "separator" },
      );
    }

    if (context && isTextualTool(context.tool)) {
      options.push(
        {
          id: "inline-bold",
          kind: "inlineAction",
          label: "Bold (B)",
          icon: "B",
          value: "bold",
          keywords: ["bold", "kalin", "b"],
        },
        {
          id: "inline-italic",
          kind: "inlineAction",
          label: "Italic (i)",
          icon: "i",
          value: "italic",
          keywords: ["italic", "italik", "i"],
        },
        {
          id: "inline-underline",
          kind: "inlineAction",
          label: "Underline (U)",
          icon: "U",
          value: "underline",
          keywords: ["underline", "alti cizili", "u"],
        },
        {
          id: "inline-strike",
          kind: "inlineAction",
          label: "Strikethrough (S)",
          icon: "S",
          value: "strike",
          keywords: ["strikethrough", "ustu cizili", "s"],
        },
        {
          id: "inline-code",
          kind: "inlineAction",
          label: "Inline code",
          icon: "</>",
          value: "code",
          keywords: ["inline code", "kod", "code"],
        },
        {
          id: "inline-link",
          kind: "inlineAction",
          label: "Link",
          icon: "lnk",
          value: "link",
          keywords: ["link", "baglanti"],
        },
        { id: "sep-inline", kind: "separator" },
      );
    }

    options.push(
      {
        id: "section-block-actions",
        kind: "sectionTitle",
        label: "Block actions",
      },
      {
        id: "move-up",
        kind: "moveUp",
        label: m.optionMoveUp,
        icon: "^",
        keywords: ["yukari", "tas", "ust"],
      },
      {
        id: "delete",
        kind: "delete",
        label: m.optionDelete,
        icon: "x",
        keywords: ["sil", "kaldir", "delete"],
        danger: true,
      },
      {
        id: "move-down",
        kind: "moveDown",
        label: m.optionMoveDown,
        icon: "v",
        keywords: ["asagi", "tas", "alt"],
      },
    );

    const query = blockMenuQuery.trim().toLowerCase();
    if (!query) {
      return options;
    }

    const filtered: BlockMenuOption[] = [];
    options.forEach((option) => {
      if (option.kind === "separator" || option.kind === "sectionTitle") {
        return;
      }
      const matches = (option.label ?? "").toLowerCase().includes(query)
        || (option.keywords ?? []).some((keyword) => keyword.includes(query));
      if (matches) {
        filtered.push(option);
      }
    });
    return filtered;
  }, [blockMenuContext, blockMenuQuery, m]);

  const getBlockIndexFromElement = useCallback((blockEl: Element | null) => {
    if (!holderRef.current || !blockEl) {
      return null;
    }
    const blocks = Array.from(holderRef.current.querySelectorAll(".ce-block"));
    const index = blocks.indexOf(blockEl);
    return index >= 0 ? index : null;
  }, []);

  const getBlockElementByIndex = useCallback((index: number | null) => {
    if (!holderRef.current || index === null || index < 0) {
      return null;
    }
    const blocks = holderRef.current.querySelectorAll(".ce-block");
    return blocks.item(index);
  }, []);

  const getCurrentBlockIndex = useCallback(() => {
    const editor = getEditor();
    if (!editor?.blocks?.getCurrentBlockIndex) {
      return null;
    }
    const index = editor.blocks.getCurrentBlockIndex();
    return typeof index === "number" ? index : null;
  }, [getEditor]);

  const applyVisualStylesToEditor = useCallback(() => {
    const editor = getEditor();
    if (!editor?.blocks?.getBlocksCount || !editor?.blocks?.getBlockByIndex) {
      return;
    }

    const count = editor.blocks.getBlocksCount();
    for (let index = 0; index < count; index += 1) {
      const block = editor.blocks.getBlockByIndex(index);
      if (!block) {
        continue;
      }
      const blockId = block.id ? String(block.id) : "";
      const blockEl = getBlockElementByIndex(index) as HTMLElement | null;
      if (!blockEl || !blockId) {
        continue;
      }

      const tool = normalizeToolName(String(block.name ?? ""));
      const patch = blockStyleByIdRef.current[blockId];
      if (!patch || !isTextualTool(tool)) {
        continue;
      }

      const targets = blockEl.querySelectorAll<HTMLElement>(
        ".ce-paragraph, .ce-header, .ce-quote__text, .ce-quote__caption, .cdx-list, .ce-list",
      );
      if (targets.length === 0) {
        const fallback = blockEl.querySelector<HTMLElement>(".ce-block__content");
        if (fallback) {
          applyTextVisualStyle(fallback, patch);
        }
        continue;
      }
      targets.forEach((target) => {
        applyTextVisualStyle(target, patch);
      });
    }
  }, [getBlockElementByIndex, getEditor]);

  const getToolFromBlock = useCallback((blockEl: Element | null) => {
    if (!blockEl) {
      return null;
    }
    if (blockEl.querySelector(".ce-code")) {
      return "code";
    }
    if (blockEl.querySelector(".ce-quote")) {
      return "quote";
    }
    if (blockEl.querySelector(".image-tool, .image-tool__image, .cdx-simple-image")) {
      return "image";
    }
    if (blockEl.querySelector(".ce-delimiter")) {
      return "delimiter";
    }
    if (blockEl.querySelector(".cdx-list, .ce-list")) {
      return "list";
    }
    if (blockEl.querySelector(".ce-header")) {
      return "header";
    }
    if (blockEl.querySelector(".ce-paragraph")) {
      return "paragraph";
    }
    return normalizeToolName(blockEl.getAttribute("data-tool"));
  }, []);

  const resolveSelectionToolbar = useCallback(async () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      const activeEl = document.activeElement;
      const isToolbarInteraction = Boolean(
        activeEl
        && selectionToolbarRef.current
        && selectionToolbarRef.current.contains(activeEl)
        && selectionToolbar,
      );
      if (isToolbarInteraction) {
        return;
      }
      setSelectionToolbar(null);
      return;
    }
    let range: Range;
    try {
      range = selection.getRangeAt(0);
    } catch {
      setSelectionToolbar(null);
      return;
    }

    let common: Node;
    try {
      common = range.commonAncestorContainer;
    } catch {
      setSelectionToolbar(null);
      return;
    }

    let anchorEl: Element | null;
    try {
      anchorEl = common.nodeType === Node.ELEMENT_NODE
        ? (common as Element)
        : common.parentElement;
    } catch {
      setSelectionToolbar(null);
      return;
    }
    if (!anchorEl || !holderRef.current?.contains(anchorEl)) {
      setSelectionToolbar(null);
      return;
    }
    const blockEl = anchorEl?.closest(".ce-block") ?? null;
    const blockIndex = getBlockIndexFromElement(blockEl);
    if (blockIndex === null || !blockEl || !fieldRef.current) {
      setSelectionToolbar(null);
      return;
    }

    const tool = getToolFromBlock(blockEl);
    if (!tool || !isTextualTool(tool)) {
      setSelectionToolbar(null);
      return;
    }

    const editor = getEditor();
    if (!editor?.blocks?.getBlockByIndex) {
      setSelectionToolbar(null);
      return;
    }

    const block = editor.blocks.getBlockByIndex(blockIndex);
    if (!block) {
      setSelectionToolbar(null);
      return;
    }

    let data: Record<string, unknown> = {};
    try {
      const saved = await block.save();
      if (saved && typeof saved === "object" && "data" in saved && saved.data) {
        data = saved.data as Record<string, unknown>;
      }
    } catch {
      // Fallback to persisted style map when block save is unavailable.
    }

    const blockId = String(block.id ?? "");
    const persistedStyle = blockStyleByIdRef.current[blockId];
    const mergedStyle = hasStylePatch(persistedStyle)
      ? { ...getStylePatchFromData(tool, data), ...persistedStyle }
      : getStylePatchFromData(tool, data);

    let rangeRect: DOMRect;
    try {
      rangeRect = range.getBoundingClientRect();
    } catch {
      setSelectionToolbar(null);
      return;
    }
    const blockRect = blockEl.getBoundingClientRect();
    const fieldRect = fieldRef.current.getBoundingClientRect();
    const isCollapsed = selection.isCollapsed;
    const shouldShowCollapsedToolbar = isCollapsed && (tool === "header" || tool === "paragraph");

    if (isCollapsed && !shouldShowCollapsedToolbar) {
      setSelectionToolbar(null);
      return;
    }

    setSelectionToolbar({
      top: blockRect.top - fieldRect.top - 62,
      left: shouldShowCollapsedToolbar
        ? blockRect.left - fieldRect.left + 40
        : rangeRect.left - fieldRect.left,
      blockIndex,
      blockId,
      blockTool: tool,
      headerLevel: tool === "header" ? normalizeHeaderLevel(data.level) : undefined,
      previewText: typeof data.text === "string" ? data.text : "",
      style: mergedStyle,
    });
  }, [getBlockIndexFromElement, getEditor, getToolFromBlock, selectionToolbar]);

  const syncActiveBlock = useCallback(() => {
    const index = getCurrentBlockIndex();
    const blockEl = getBlockElementByIndex(index);
    const tool = getToolFromBlock(blockEl);

    setActiveBlockIndex(index);
    setActiveBlockTool(tool);

    if (blockEl && fieldRef.current) {
      const blockRect = blockEl.getBoundingClientRect();
      const fieldRect = fieldRef.current.getBoundingClientRect();
      setFloatingTop(blockRect.top - fieldRect.top + blockRect.height / 2);
      setFloatingVisible(true);

      if (tool !== "code" && tool !== "quote") {
        setCodeButtonPosition(null);
        return;
      }

      setCodeButtonPosition({
        top: blockRect.top - fieldRect.top + 8,
        left: blockRect.right - fieldRect.left - 92,
      });
      return;
    }

    setFloatingVisible(false);
    setCodeButtonPosition(null);
  }, [getBlockElementByIndex, getCurrentBlockIndex, getToolFromBlock]);

  const openMenuForBlock = useCallback((index: number | null) => {
    const blockEl = getBlockElementByIndex(index ?? getCurrentBlockIndex());
    if (!fieldRef.current) {
      return;
    }
    const fieldRect = fieldRef.current.getBoundingClientRect();
    if (!blockEl) {
      setMenuPosition({
        top: 56,
        left: 28,
      });
      setActiveBlockIndex(index ?? getCurrentBlockIndex() ?? 0);
      setMenuQuery("");
      setMenuOpen(true);
      return;
    }
    const blockRect = blockEl.getBoundingClientRect();
    setMenuPosition({
      top: blockRect.top - fieldRect.top + blockRect.height + 6,
      left: blockRect.left - fieldRect.left + 28,
    });
    setActiveBlockIndex(index ?? getCurrentBlockIndex());
    setMenuQuery("");
    setMenuOpen(true);
  }, [getBlockElementByIndex, getCurrentBlockIndex]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setMenuQuery("");
  }, []);

  const closeBlockMenu = useCallback(() => {
    setBlockMenuOpen(false);
    setBlockMenuIndex(null);
    setBlockMenuContext(null);
    setBlockMenuQuery("");
  }, []);

  const closeImageQuickMenu = useCallback(() => {
    setImageQuickMenu(null);
  }, []);

  const loadBlockMenuContext = useCallback(async (index: number | null) => {
    const editor = getEditor();
    if (!editor?.blocks?.getBlockByIndex || typeof index !== "number") {
      setBlockMenuContext(null);
      return;
    }
    const block = editor.blocks.getBlockByIndex(index);
    if (!block) {
      setBlockMenuContext(null);
      return;
    }

    const fallbackContext: BlockMenuContext = {
      index,
      blockId: String(block.id),
      tool: normalizeToolName(String(block.name)),
      data: {},
    };

    try {
      const saved = await block.save();
      const rawData = saved && typeof saved === "object" && "data" in saved && saved.data
        ? (saved.data as Record<string, unknown>)
        : {};

      const nextContext: BlockMenuContext = {
        index,
        blockId: String(block.id),
        tool: normalizeToolName(String(block.name), rawData),
        data: rawData,
        textAlign: rawData.align === "left" || rawData.align === "center" || rawData.align === "right"
          ? rawData.align
          : undefined,
        textSize: rawData.size === "sm" || rawData.size === "md" || rawData.size === "lg"
          ? rawData.size
          : undefined,
        textTone: rawData.tone === "default" || rawData.tone === "muted" || rawData.tone === "accent"
          ? rawData.tone
          : undefined,
        fontSize: Number.isFinite(Number(rawData.fontSize)) ? normalizeFontSize(rawData.fontSize) : undefined,
        fontWeight: Number.isFinite(Number(rawData.fontWeight)) ? normalizeFontWeight(rawData.fontWeight) : undefined,
      };
      const persistedPatch = blockStyleByIdRef.current[nextContext.blockId];
      if (persistedPatch) {
        nextContext.data = applyStylePatchToData(nextContext.tool, nextContext.data, persistedPatch);
        if (persistedPatch.align) {
          nextContext.textAlign = persistedPatch.align;
        }
        if (persistedPatch.size) {
          nextContext.textSize = persistedPatch.size;
        }
        if (persistedPatch.tone) {
          nextContext.textTone = persistedPatch.tone;
        }
        if (typeof persistedPatch.fontSize === "number") {
          nextContext.fontSize = persistedPatch.fontSize;
        }
        if (typeof persistedPatch.fontWeight === "number") {
          nextContext.fontWeight = persistedPatch.fontWeight;
        }
      }

      if (nextContext.tool === "header") {
        const level = Number(rawData.level);
        nextContext.headerLevel = Number.isFinite(level) ? level : 2;
      }

      if (nextContext.tool === "list") {
        const style = rawData.style === "ordered" ? "ordered" : "unordered";
        nextContext.listStyle = style;
      }

      if (nextContext.tool === "image") {
        nextContext.imageWithBorder = rawData.withBorder === true;
        nextContext.imageStretched = rawData.stretched === true;
        nextContext.imageWithBackground = rawData.withBackground === true;
        nextContext.imagePosition = rawData.position === "left" || rawData.position === "center" || rawData.position === "right"
          ? rawData.position
          : undefined;
        if (persistedPatch?.position) {
          nextContext.imagePosition = persistedPatch.position;
        }
      }

      setBlockMenuContext(nextContext);
    } catch {
      setBlockMenuContext(fallbackContext);
    }
  }, [getEditor]);

  const markDropTarget = useCallback((index: number | null) => {
    if (!holderRef.current) {
      return;
    }
    const blocks = holderRef.current.querySelectorAll(".ce-block");
    blocks.forEach((blockEl, blockIndex) => {
      blockEl.classList.toggle("ce-block--drop-target", index === blockIndex);
    });
  }, []);

  const clearDropTarget = useCallback(() => {
    markDropTarget(null);
  }, [markDropTarget]);

  const insertParagraphAfter = useCallback((baseIndex?: number | null) => {
    const editor = getEditor();
    if (!editor?.blocks?.insert) {
      return;
    }
    const index = typeof baseIndex === "number" ? baseIndex : getCurrentBlockIndex();
    const insertIndex = typeof index === "number" ? index + 1 : undefined;
    try {
      editor.blocks.insert("paragraph", { text: "" }, undefined, insertIndex, true);
      const nextIndex = typeof insertIndex === "number" ? insertIndex : null;
      if (nextIndex !== null) {
        try {
          editor.caret?.setToBlock?.(nextIndex, "start");
        } catch {
          // Ignore caret focus failures.
        }
        setActiveBlockIndex(nextIndex);
      }
      setActiveBlockTool("paragraph");
      setCodeButtonPosition(null);
    } catch {
      // Ignore insert failures.
    }
  }, [getCurrentBlockIndex, getEditor]);

  const handleCommandSelect = useCallback(async (command: SlashCommand) => {
    const editor = getEditor();
    if (!editor?.blocks) {
      closeMenu();
      return;
    }

    const index = activeBlockIndex ?? getCurrentBlockIndex();
    const insertIndex = typeof index === "number" ? index + 1 : undefined;

    let payload = command.data ?? {};
    if (editor.blocks?.composeBlockData) {
      try {
        const baseData = await editor.blocks.composeBlockData(command.type);
        payload = command.data ? { ...baseData, ...command.data } : baseData;
      } catch {
        payload = command.data ?? {};
      }
    }

    try {
      editor.blocks.insert(command.type, payload, undefined, insertIndex, true);
    } catch {
      try {
        editor.blocks.insert(command.type, {}, undefined, insertIndex, true);
      } catch {
        closeMenu();
        return;
      }
    }

    closeMenu();
  }, [activeBlockIndex, closeMenu, getCurrentBlockIndex, getEditor]);

  const openBlockMenuForIndex = useCallback((index: number | null) => {
    const resolvedIndex = index ?? getCurrentBlockIndex();
    const blockEl = getBlockElementByIndex(resolvedIndex);
    if (!fieldRef.current || !blockEl) {
      return;
    }
    const blockRect = blockEl.getBoundingClientRect();
    const fieldRect = fieldRef.current.getBoundingClientRect();
    setBlockMenuPosition({
      top: blockRect.top - fieldRect.top + 6,
      left: blockRect.left - fieldRect.left + 28,
    });
    setBlockMenuIndex(resolvedIndex);
    setBlockMenuQuery("");
    setBlockMenuOpen(true);
    closeImageQuickMenu();
    closeMenu();
    void loadBlockMenuContext(resolvedIndex);
  }, [closeImageQuickMenu, closeMenu, getBlockElementByIndex, getCurrentBlockIndex, loadBlockMenuContext]);

  const openImageQuickMenuForIndex = useCallback(async (index: number | null) => {
    const resolvedIndex = index ?? getCurrentBlockIndex();
    const blockEl = getBlockElementByIndex(resolvedIndex);
    const editor = getEditor();
    if (!fieldRef.current || !blockEl || !editor?.blocks?.getBlockByIndex) {
      return;
    }

    const block = editor.blocks.getBlockByIndex(resolvedIndex ?? -1);
    if (!block) {
      return;
    }

    let rawData: Record<string, unknown> = {};
    try {
      const saved = await block.save();
      if (saved && typeof saved === "object" && "data" in saved && saved.data) {
        rawData = saved.data as Record<string, unknown>;
      }
    } catch {
      // Ignore save failures and continue with empty data.
    }

    const blockRect = blockEl.getBoundingClientRect();
    const fieldRect = fieldRef.current.getBoundingClientRect();
    const imageEl = blockEl.querySelector<HTMLElement>(".image-tool__image img, .cdx-simple-image img, .image-tool img");
    const anchorRect = imageEl?.getBoundingClientRect() ?? blockRect;
    const left = anchorRect.left - fieldRect.left + (anchorRect.width / 2);
    const top = anchorRect.top - fieldRect.top + 14;

    const persistedPatch = blockStyleByIdRef.current[String(block.id)];
    const positionFromData = rawData.position === "left" || rawData.position === "right" ? rawData.position : "center";
    const position = persistedPatch?.position ?? positionFromData;

    setImageQuickMenu({
      top,
      left,
      blockIndex: resolvedIndex ?? 0,
      blockId: String(block.id),
      data: rawData,
      withBorder: rawData.withBorder === true,
      stretched: rawData.stretched === true,
      withBackground: rawData.withBackground === true,
      position,
    });
    closeBlockMenu();
    closeMenu();
  }, [closeBlockMenu, closeMenu, getBlockElementByIndex, getCurrentBlockIndex, getEditor]);

  const applyImageQuickAction = useCallback(async (
    action: "withBorder" | "stretched" | "withBackground" | "positionLeft" | "positionCenter" | "positionRight" | "delete",
  ) => {
    if (!imageQuickMenu) {
      return;
    }

    const editor = getEditor();
    if (!editor?.blocks) {
      return;
    }

    if (action === "delete") {
      if (editor.blocks.delete) {
        try {
          editor.blocks.delete(imageQuickMenu.blockIndex);
          setImageQuickMenu(null);
          await syncSerializedFromEditor(editor);
          requestAnimationFrame(() => {
            syncActiveBlock();
          });
        } catch {
          // Ignore delete failures.
        }
      }
      return;
    }

    if (!editor.blocks.update) {
      return;
    }

    let nextData = { ...imageQuickMenu.data };
    let nextStatePatch: Partial<ImageQuickMenuState> = {};

    if (action === "withBorder") {
      const nextValue = !imageQuickMenu.withBorder;
      nextData = { ...nextData, withBorder: nextValue };
      nextStatePatch = { withBorder: nextValue };
    } else if (action === "stretched") {
      const nextValue = !imageQuickMenu.stretched;
      nextData = { ...nextData, stretched: nextValue };
      nextStatePatch = { stretched: nextValue };
    } else if (action === "withBackground") {
      const nextValue = !imageQuickMenu.withBackground;
      nextData = { ...nextData, withBackground: nextValue };
      nextStatePatch = { withBackground: nextValue };
    } else {
      const nextPosition: EditorImagePosition = action === "positionLeft"
        ? "left"
        : action === "positionRight"
          ? "right"
          : "center";
      nextData = { ...nextData, position: nextPosition };
      nextStatePatch = { position: nextPosition };
      blockStyleByIdRef.current[imageQuickMenu.blockId] = {
        ...blockStyleByIdRef.current[imageQuickMenu.blockId],
        position: nextPosition,
      };
    }

    try {
      await editor.blocks.update(imageQuickMenu.blockId, nextData);
      await syncSerializedFromEditor(editor);
      setImageQuickMenu((prev) => (
        prev
          ? {
            ...prev,
            data: nextData,
            ...nextStatePatch,
          }
          : prev
      ));
      requestAnimationFrame(() => {
        syncActiveBlock();
      });
    } catch {
      // Ignore update failures.
    }
  }, [getEditor, imageQuickMenu, syncActiveBlock, syncSerializedFromEditor]);

  const moveBlockBy = useCallback((delta: -1 | 1) => {
    const editor = getEditor();
    if (!editor?.blocks?.move || !editor?.blocks?.getBlocksCount) {
      closeBlockMenu();
      return;
    }
    const currentIndex = blockMenuIndex ?? getCurrentBlockIndex();
    if (typeof currentIndex !== "number") {
      closeBlockMenu();
      return;
    }
    const targetIndex = currentIndex + delta;
    const count = editor.blocks.getBlocksCount();
    if (targetIndex < 0 || targetIndex >= count) {
      closeBlockMenu();
      return;
    }
    try {
      editor.blocks.move(targetIndex, currentIndex);
      setActiveBlockIndex(targetIndex);
    } catch {
      // Ignore move failures.
    }
    closeBlockMenu();
    requestAnimationFrame(() => {
      syncActiveBlock();
    });
  }, [blockMenuIndex, closeBlockMenu, getCurrentBlockIndex, getEditor, syncActiveBlock]);

  const deleteBlock = useCallback(() => {
    const editor = getEditor();
    if (!editor?.blocks?.delete) {
      closeBlockMenu();
      return;
    }
    const currentIndex = blockMenuIndex ?? getCurrentBlockIndex();
    if (typeof currentIndex !== "number") {
      closeBlockMenu();
      return;
    }
    try {
      editor.blocks.delete(currentIndex);
    } catch {
      // Ignore delete failures.
    }
    closeBlockMenu();
    requestAnimationFrame(() => {
      syncActiveBlock();
    });
  }, [blockMenuIndex, closeBlockMenu, getCurrentBlockIndex, getEditor, syncActiveBlock]);

  const applyContextualBlockOption = useCallback(async (option: BlockMenuOption) => {
    const context = blockMenuContext;
    const editor = getEditor();
    if (!context || !editor?.blocks?.update) {
      closeBlockMenu();
      return;
    }

    if (option.kind === "headerLevel" && typeof option.value === "number") {
      try {
        await editor.blocks.update(context.blockId, {
          ...context.data,
          level: option.value,
        });
        await syncSerializedFromEditor(editor);
      } catch {
        // Ignore update failures.
      }
      closeBlockMenu();
      requestAnimationFrame(() => {
        syncActiveBlock();
      });
      return;
    }

    if (option.kind === "listStyle" && (option.value === "ordered" || option.value === "unordered")) {
      try {
        await editor.blocks.update(context.blockId, {
          ...context.data,
          style: option.value,
        });
        await syncSerializedFromEditor(editor);
      } catch {
        // Ignore update failures.
      }
      closeBlockMenu();
      requestAnimationFrame(() => {
        syncActiveBlock();
      });
      return;
    }

    if (option.kind === "textAlign" && (option.value === "left" || option.value === "center" || option.value === "right")) {
      try {
        blockStyleByIdRef.current[context.blockId] = {
          ...blockStyleByIdRef.current[context.blockId],
          align: option.value,
        };
        await editor.blocks.update(context.blockId, {
          ...context.data,
          align: option.value,
        });
        await syncSerializedFromEditor(editor);
      } catch {
        // Ignore update failures.
      }
      closeBlockMenu();
      requestAnimationFrame(() => {
        syncActiveBlock();
      });
      return;
    }

    if (option.kind === "textSize" && (option.value === "sm" || option.value === "md" || option.value === "lg")) {
      try {
        blockStyleByIdRef.current[context.blockId] = {
          ...blockStyleByIdRef.current[context.blockId],
          size: option.value,
        };
        await editor.blocks.update(context.blockId, {
          ...context.data,
          size: option.value,
        });
        await syncSerializedFromEditor(editor);
      } catch {
        // Ignore update failures.
      }
      closeBlockMenu();
      requestAnimationFrame(() => {
        syncActiveBlock();
      });
      return;
    }

    if (
      option.kind === "textTone"
      && (option.value === "default" || option.value === "muted" || option.value === "accent")
    ) {
      try {
        blockStyleByIdRef.current[context.blockId] = {
          ...blockStyleByIdRef.current[context.blockId],
          tone: option.value,
        };
        await editor.blocks.update(context.blockId, {
          ...context.data,
          tone: option.value,
        });
        await syncSerializedFromEditor(editor);
      } catch {
        // Ignore update failures.
      }
      closeBlockMenu();
      requestAnimationFrame(() => {
        syncActiveBlock();
      });
      return;
    }

    if (
      option.kind === "imagePosition"
      && (option.value === "left" || option.value === "center" || option.value === "right")
    ) {
      try {
        blockStyleByIdRef.current[context.blockId] = {
          ...blockStyleByIdRef.current[context.blockId],
          position: option.value,
        };
        await editor.blocks.update(context.blockId, {
          ...context.data,
          position: option.value,
        });
        await syncSerializedFromEditor(editor);
      } catch {
        // Ignore update failures.
      }
      closeBlockMenu();
      requestAnimationFrame(() => {
        syncActiveBlock();
      });
      return;
    }

    if (
      option.kind === "imageWithBorder"
      || option.kind === "imageStretched"
      || option.kind === "imageWithBackground"
    ) {
      const keyMap = {
        imageWithBorder: "withBorder",
        imageStretched: "stretched",
        imageWithBackground: "withBackground",
      } as const;
      const key = keyMap[option.kind];
      const currentValue = context.data[key] === true;
      try {
        await editor.blocks.update(context.blockId, {
          ...context.data,
          [key]: !currentValue,
        });
        await syncSerializedFromEditor(editor);
      } catch {
        // Ignore update failures.
      }
      closeBlockMenu();
      requestAnimationFrame(() => {
        syncActiveBlock();
      });
    }
  }, [blockMenuContext, closeBlockMenu, getEditor, syncActiveBlock, syncSerializedFromEditor]);

  const applyInlineAction = useCallback((action: InlineAction) => {
    if (!holderRef.current) {
      closeBlockMenu();
      return;
    }

    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode;
    const isInsideEditor = Boolean(
      anchorNode
      && (holderRef.current.contains(anchorNode) || holderRef.current.contains(anchorNode.parentNode)),
    );

    if (!isInsideEditor) {
      closeBlockMenu();
      return;
    }

    if (action === "link") {
      const url = window.prompt("Link URL", "https://");
      if (!url) {
        closeBlockMenu();
        return;
      }
      document.execCommand("createLink", false, url.trim());
      closeBlockMenu();
      return;
    }

    if (action === "bold") {
      document.execCommand("bold");
      closeBlockMenu();
      return;
    }

    if (action === "italic") {
      document.execCommand("italic");
      closeBlockMenu();
      return;
    }

    if (action === "underline") {
      document.execCommand("underline");
      closeBlockMenu();
      return;
    }

    if (action === "strike") {
      document.execCommand("strikeThrough");
      closeBlockMenu();
      return;
    }

    const selectedText = selection?.toString()?.trim() ?? "";
    if (!selectedText) {
      document.execCommand("insertHTML", false, "<code>code</code>");
      closeBlockMenu();
      return;
    }
    document.execCommand("insertHTML", false, `<code>${escapeHtml(selectedText)}</code>`);
    closeBlockMenu();
  }, [closeBlockMenu]);

  const applySelectionStyle = useCallback(async (patch: BlockStylePatch) => {
    if (!selectionToolbar?.blockId) {
      return;
    }

    const editor = getEditor();
    if (!editor) {
      return;
    }

    const mergedPatch = {
      ...blockStyleByIdRef.current[selectionToolbar.blockId],
      ...patch,
    };
    blockStyleByIdRef.current[selectionToolbar.blockId] = mergedPatch;

    try {
      // Keep editor selection stable: do not call block update here because it can
      // rebuild block DOM and collapse the current text selection.
      setSelectionToolbar((prev) => (
        prev
          ? {
            ...prev,
            style: {
              ...prev.style,
              ...patch,
            },
          }
          : prev
      ));
      applyVisualStylesToEditor();
      await syncSerializedFromEditor(editor as EditorRuntimeApi);
    } catch {
      // Ignore update failures.
    }
  }, [applyVisualStylesToEditor, getEditor, selectionToolbar, syncSerializedFromEditor]);

  const applySelectionTransform = useCallback(async (
    target: "paragraph" | "list" | "quote" | "header",
    headerLevel?: number,
  ) => {
    if (!selectionToolbar) {
      return;
    }

    const editor = getEditor();
    if (!editor?.blocks?.insert || !editor.blocks.delete || !editor.blocks.getBlockByIndex) {
      return;
    }

    const currentIndex = selectionToolbar.blockIndex;
    const currentBlock = editor.blocks.getBlockByIndex(currentIndex);
    if (!currentBlock || String(currentBlock.id) !== selectionToolbar.blockId) {
      return;
    }

    let rawData: Record<string, unknown> = {};
    try {
      const saved = await currentBlock.save();
      if (saved && typeof saved === "object" && "data" in saved && saved.data) {
        rawData = saved.data as Record<string, unknown>;
      }
    } catch {
      // Ignore save failures and continue with empty data.
    }

    const text = typeof rawData.text === "string"
      ? rawData.text
      : typeof selectionToolbar.previewText === "string"
        ? selectionToolbar.previewText
        : "";

    if (target === "header" && selectionToolbar.blockTool === "header" && editor.blocks.update) {
      try {
        await editor.blocks.update(selectionToolbar.blockId, {
          ...rawData,
          level: normalizeHeaderLevel(headerLevel ?? selectionToolbar.headerLevel ?? 2),
        });
        await syncSerializedFromEditor(editor as EditorRuntimeApi);
        setSelectionToolbar((prev) => (
          prev
            ? {
              ...prev,
              headerLevel: normalizeHeaderLevel(headerLevel ?? prev.headerLevel ?? 2),
            }
            : prev
        ));
      } catch {
        // Ignore update failures.
      }
      setSelectionTransformOpen(false);
      return;
    }

    let payload: Record<string, unknown> = {};
    if (target === "paragraph") {
      payload = { text };
    } else if (target === "header") {
      payload = { text, level: normalizeHeaderLevel(headerLevel ?? 2) };
    } else if (target === "list") {
      payload = { style: "unordered", items: text ? [text] : [""] };
    } else if (target === "quote") {
      payload = { text, caption: "" };
    }

    try {
      editor.blocks.insert(target, payload, undefined, currentIndex, true);
      editor.blocks.delete(currentIndex + 1);
      await syncSerializedFromEditor(editor as EditorRuntimeApi);
      setSelectionTransformOpen(false);
      requestAnimationFrame(() => {
        syncActiveBlock();
      });
    } catch {
      // Ignore transform failures.
    }
  }, [getEditor, selectionToolbar, syncActiveBlock, syncSerializedFromEditor]);

  const applySelectionInlineAction = useCallback((action: InlineAction) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }

    if (action === "link") {
      const url = window.prompt("Link URL", "https://");
      if (!url) {
        return;
      }
      document.execCommand("createLink", false, url.trim());
      return;
    }

    if (action === "bold") {
      document.execCommand("bold");
      return;
    }

    if (action === "italic") {
      document.execCommand("italic");
      return;
    }

    if (action === "underline") {
      document.execCommand("underline");
      return;
    }

    if (action === "strike") {
      document.execCommand("strikeThrough");
      return;
    }

    const selectedText = selection?.toString()?.trim() ?? "";
    if (!selectedText) {
      document.execCommand("insertHTML", false, "<code>code</code>");
      return;
    }
    document.execCommand("insertHTML", false, `<code>${escapeHtml(selectedText)}</code>`);
  }, []);

  const handleBlockMenuOptionSelect = useCallback((option: BlockMenuOption) => {
    if (option.kind === "moveUp") {
      moveBlockBy(-1);
      return;
    }
    if (option.kind === "moveDown") {
      moveBlockBy(1);
      return;
    }
    if (option.kind === "delete") {
      deleteBlock();
      return;
    }
    if (
      option.kind === "inlineAction"
      && (
        option.value === "bold"
        || option.value === "italic"
        || option.value === "underline"
        || option.value === "strike"
        || option.value === "code"
        || option.value === "link"
      )
    ) {
      applyInlineAction(option.value);
      return;
    }
    if (
      option.kind === "headerLevel"
      || option.kind === "listStyle"
      || option.kind === "textAlign"
      || option.kind === "textSize"
      || option.kind === "textTone"
      || option.kind === "imagePosition"
      || option.kind === "imageWithBorder"
      || option.kind === "imageStretched"
      || option.kind === "imageWithBackground"
    ) {
      void applyContextualBlockOption(option);
    }
  }, [applyContextualBlockOption, applyInlineAction, deleteBlock, moveBlockBy]);

  const handleDragPointerMove = useCallback((event: PointerEvent) => {
    const dragState = dragStateRef.current;
    if (typeof dragState.startIndex !== "number") {
      return;
    }
    const diffX = event.clientX - dragState.startX;
    const diffY = event.clientY - dragState.startY;
    if (!dragState.dragging && Math.hypot(diffX, diffY) < 6) {
      return;
    }
    if (!dragState.dragging) {
      dragState.dragging = true;
      closeBlockMenu();
      document.body.classList.add("editor-dragging");
    }
    const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
    const blockEl = target?.closest(".ce-block") ?? null;
    const overIndex = getBlockIndexFromElement(blockEl);
    if (overIndex === null) {
      return;
    }
    dragState.overIndex = overIndex;
    markDropTarget(overIndex);
  }, [closeBlockMenu, getBlockIndexFromElement, markDropTarget]);

  const handleDragPointerUp = useCallback(() => {
    const dragState = dragStateRef.current;
    window.removeEventListener("pointermove", handleDragPointerMove);
    window.removeEventListener("pointerup", handleDragPointerUp);
    window.removeEventListener("pointercancel", handleDragPointerUp);
    clearDropTarget();
    document.body.classList.remove("editor-dragging");
    if (typeof dragState.startIndex !== "number") {
      return;
    }

    if (!dragState.dragging) {
      openBlockMenuForIndex(dragState.startIndex);
      dragState.startIndex = null;
      dragState.overIndex = null;
      return;
    }

    const targetIndex = dragState.overIndex;
    const fromIndex = dragState.startIndex;
    dragState.startIndex = null;
    dragState.overIndex = null;
    dragState.dragging = false;

    if (typeof targetIndex !== "number" || targetIndex === fromIndex) {
      requestAnimationFrame(() => {
        syncActiveBlock();
      });
      return;
    }

    const editor = getEditor();
    if (!editor?.save || !editor?.blocks?.render) {
      requestAnimationFrame(() => {
        syncActiveBlock();
      });
      return;
    }

    void (async () => {
      try {
        const output = await editor.save();
        const blocks = Array.isArray(output.blocks) ? [...output.blocks] : [];
        if (
          fromIndex < 0
          || targetIndex < 0
          || fromIndex >= blocks.length
          || targetIndex >= blocks.length
        ) {
          requestAnimationFrame(() => {
            syncActiveBlock();
          });
          return;
        }

        const [moved] = blocks.splice(fromIndex, 1);
        if (!moved) {
          requestAnimationFrame(() => {
            syncActiveBlock();
          });
          return;
        }
        blocks.splice(targetIndex, 0, moved);

        const reordered = dedupeImageBlocks(sanitizeEditorRuntimeData({
          ...output,
          blocks,
        }));

        await editor.blocks.render(reordered);
        setActiveBlockIndex(targetIndex);
        await syncSerializedFromEditor(editor);
      } catch {
        // Ignore reorder failures.
      }
      requestAnimationFrame(() => {
        syncActiveBlock();
      });
    })();
  }, [clearDropTarget, getEditor, handleDragPointerMove, openBlockMenuForIndex, syncActiveBlock, syncSerializedFromEditor]);

  const handleDragHandlePointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const startIndex = activeBlockIndex ?? getCurrentBlockIndex();
    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startIndex: typeof startIndex === "number" ? startIndex : null,
      overIndex: typeof startIndex === "number" ? startIndex : null,
      dragging: false,
    };
    window.addEventListener("pointermove", handleDragPointerMove);
    window.addEventListener("pointerup", handleDragPointerUp);
    window.addEventListener("pointercancel", handleDragPointerUp);
  }, [activeBlockIndex, getCurrentBlockIndex, handleDragPointerMove, handleDragPointerUp]);

  useEffect(() => {
    let active = true;

    const init = async () => {
      if (!holderRef.current) {
        return;
      }

      const [
        { default: EditorJS },
        { default: Header },
        { default: List },
        { default: Quote },
        { default: Code },
        { default: ImageTool },
        { default: Delimiter },
      ] = await Promise.all([
        import("@editorjs/editorjs"),
        import("@editorjs/header"),
        import("@editorjs/list"),
        import("@editorjs/quote"),
        import("@editorjs/code"),
        import("@editorjs/image"),
        import("@editorjs/delimiter"),
      ]);

      if (!active || !holderRef.current) {
        return;
      }

      const headerTool = Header as unknown as BlockToolConstructable;
      const listTool = List as unknown as BlockToolConstructable;
      const quoteTool = Quote as unknown as BlockToolConstructable;
      const codeTool = Code as unknown as BlockToolConstructable;
      const imageTool = ImageTool as unknown as BlockToolConstructable;
      const delimiterTool = Delimiter as unknown as BlockToolConstructable;

      const editor = new EditorJS({
        holder: holderRef.current,
        data: editorRuntimeData,
        autofocus: true,
        tools: {
          header: {
            class: headerTool,
            inlineToolbar: false,
            config: {
              levels: [1, 2, 3, 4, 5, 6],
              defaultLevel: 2,
            },
          },
          list: {
            class: listTool,
            inlineToolbar: false,
          },
          quote: {
            class: quoteTool,
            inlineToolbar: false,
            config: {
              quotePlaceholder: m.quotePlaceholder,
              captionPlaceholder: m.quoteCaptionPlaceholder,
            },
          },
          code: {
            class: codeTool,
            config: {
              placeholder: m.codePlaceholder,
            },
          },
          image: {
            class: imageTool,
            config: {
              uploader: {
                async uploadByFile(file: File) {
                  const formData = new FormData();
                  formData.append("file", file);
                  formData.append("folder", "content");
                  const response = await fetch("/api/v1/uploads", {
                    method: "POST",
                    body: formData,
                  });
                  if (!response.ok) {
                    return { success: 0 };
                  }
                  return response.json();
                },
                async uploadByUrl(url: string) {
                  return { success: 1, file: { url } };
                },
              },
            },
          },
          delimiter: {
            class: delimiterTool,
          },
        },
        onReady: () => {
          if (!active) {
            return;
          }
          setIsReady(true);
          requestAnimationFrame(() => {
            if (!active) {
              return;
            }
            hydrateStyleMapFromInitialData(editor as EditorRuntimeApi);
            syncActiveBlock();
            applyVisualStylesToEditor();
          });
        },
        onChange: async () => {
          if (!active) {
            return;
          }
          await syncSerializedFromEditor(editor as EditorRuntimeApi);
        },
      });

      editorRef.current = editor;
    };

    void init();

    return () => {
      active = false;
      window.removeEventListener("pointermove", handleDragPointerMove);
      window.removeEventListener("pointerup", handleDragPointerUp);
      window.removeEventListener("pointercancel", handleDragPointerUp);
      clearDropTarget();
      document.body.classList.remove("editor-dragging");
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [
    clearDropTarget,
    handleDragPointerMove,
    handleDragPointerUp,
    editorRuntimeData,
    m.codePlaceholder,
    m.quoteCaptionPlaceholder,
    m.quotePlaceholder,
    applyVisualStylesToEditor,
    hydrateStyleMapFromInitialData,
    syncSerializedFromEditor,
    syncActiveBlock,
  ]);

  useEffect(() => {
    const holder = holderRef.current;
    const field = fieldRef.current;
    if (!holder || !field) {
      return;
    }

    const getEditablePasteTarget = (target: EventTarget | null) => {
      const node = target as HTMLElement | null;
      if (!node || !holderRef.current) {
        return null;
      }
      if (!holderRef.current.contains(node)) {
        return null;
      }
      return node.closest('[contenteditable="true"], textarea, input');
    };

    const handleMouseMove = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const blockEl = target?.closest(".ce-block") ?? null;
      if (!blockEl || !fieldRef.current) {
        setFloatingVisible(false);
        return;
      }

      const index = getBlockIndexFromElement(blockEl);
      if (index === null) {
        setFloatingVisible(false);
        return;
      }

      const blockRect = blockEl.getBoundingClientRect();
      const fieldRect = fieldRef.current.getBoundingClientRect();
      const top = blockRect.top - fieldRect.top + blockRect.height / 2;
      const tool = getToolFromBlock(blockEl);

      setFloatingTop(top);
      setActiveBlockIndex(index);
      setActiveBlockTool(tool);
      setFloatingVisible(true);

      if (tool === "code" || tool === "quote") {
        setCodeButtonPosition({
          top: blockRect.top - fieldRect.top + 8,
          left: blockRect.right - fieldRect.left - 92,
        });
      } else {
        setCodeButtonPosition(null);
      }
    };

    const handleFieldLeave = () => {
      setFloatingVisible(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        event.stopPropagation();
        closeBlockMenu();
        openMenuForBlock(getCurrentBlockIndex());
        return;
      }

      if (blockMenuOpen && event.key === "Escape") {
        event.preventDefault();
        closeBlockMenu();
        return;
      }
      if (imageQuickMenu && event.key === "Escape") {
        event.preventDefault();
        closeImageQuickMenu();
        return;
      }

      if (!menuOpen) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      }
    };

    const handleShortcuts = (event: KeyboardEvent) => {
      if (event.key !== "Enter") {
        return;
      }
      const target = event.target as HTMLElement | null;
      const finishableBlock = target?.closest(".ce-code, .ce-quote");
      if (!finishableBlock) {
        return;
      }
      if (event.shiftKey) {
        return;
      }
      if (!event.altKey || event.metaKey || event.ctrlKey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const blockEl = target ? target.closest(".ce-block") : null;
      insertParagraphAfter(getBlockIndexFromElement(blockEl));
    };

    const handlePaste = (event: ClipboardEvent) => {
      const editableTarget = getEditablePasteTarget(event.target);
      if (!editableTarget) {
        return;
      }
      const plain = event.clipboardData?.getData("text/plain") ?? "";
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (editableTarget instanceof HTMLInputElement || editableTarget instanceof HTMLTextAreaElement) {
        const start = editableTarget.selectionStart ?? editableTarget.value.length;
        const end = editableTarget.selectionEnd ?? start;
        editableTarget.setRangeText(plain, start, end, "end");
        editableTarget.dispatchEvent(new Event("input", { bubbles: true }));
        return;
      }

      const insertedByCommand = document.execCommand("insertText", false, plain);
      if (insertedByCommand) {
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return;
      }

      const range = selection.getRangeAt(0);
      range.deleteContents();
      const lines = plain.split(/\r?\n/);
      lines.forEach((line, lineIndex) => {
        if (lineIndex > 0) {
          range.insertNode(document.createElement("br"));
          range.collapse(false);
        }
        range.insertNode(document.createTextNode(line));
        range.collapse(false);
      });
      selection.removeAllRanges();
      selection.addRange(range);
    };

    const handleSelectionChange = () => {
      syncActiveBlock();
      void resolveSelectionToolbar();
    };

    const handleContextMenuByBlockClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      if (
        blockMenuRef.current?.contains(target)
        || menuRef.current?.contains(target)
        || imageQuickMenuRef.current?.contains(target)
      ) {
        return;
      }

      const blockEl = target.closest(".ce-block");
      const blockIndex = getBlockIndexFromElement(blockEl);
      if (blockIndex === null) {
        return;
      }

      const tool = getToolFromBlock(blockEl);
      if (!tool || tool === "paragraph") {
        return;
      }

      if (tool === "image") {
        event.preventDefault();
        event.stopPropagation();
        void openImageQuickMenuForIndex(blockIndex);
        return;
      }

      openBlockMenuForIndex(blockIndex);
    };

    holder.addEventListener("mousemove", handleMouseMove);
    holder.addEventListener("mouseenter", handleSelectionChange);
    holder.addEventListener("keydown", handleKeyDown);
    holder.addEventListener("keydown", handleShortcuts);
    holder.addEventListener("paste", handlePaste, true);
    document.addEventListener("paste", handlePaste, true);
    holder.addEventListener("keyup", handleSelectionChange);
    holder.addEventListener("click", handleSelectionChange);
    holder.addEventListener("click", handleContextMenuByBlockClick);
    holder.addEventListener("focusin", handleSelectionChange);
    field.addEventListener("mouseleave", handleFieldLeave);
    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      holder.removeEventListener("mousemove", handleMouseMove);
      holder.removeEventListener("mouseenter", handleSelectionChange);
      holder.removeEventListener("keydown", handleKeyDown);
      holder.removeEventListener("keydown", handleShortcuts);
      holder.removeEventListener("paste", handlePaste, true);
      document.removeEventListener("paste", handlePaste, true);
      holder.removeEventListener("keyup", handleSelectionChange);
      holder.removeEventListener("click", handleSelectionChange);
      holder.removeEventListener("click", handleContextMenuByBlockClick);
      holder.removeEventListener("focusin", handleSelectionChange);
      field.removeEventListener("mouseleave", handleFieldLeave);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [
    blockMenuOpen,
    closeImageQuickMenu,
    closeBlockMenu,
    closeMenu,
    getBlockIndexFromElement,
    getCurrentBlockIndex,
    getToolFromBlock,
    imageQuickMenu,
    insertParagraphAfter,
    menuOpen,
    openBlockMenuForIndex,
    openImageQuickMenuForIndex,
    openMenuForBlock,
    resolveSelectionToolbar,
    syncActiveBlock,
  ]);

  useEffect(() => {
    if (!menuOpen && !blockMenuOpen && !imageQuickMenu) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (menuOpen && menuRef.current?.contains(target ?? null)) {
        return;
      }
      if (blockMenuOpen && blockMenuRef.current?.contains(target ?? null)) {
        return;
      }
      if (imageQuickMenu && imageQuickMenuRef.current?.contains(target ?? null)) {
        return;
      }
      if (menuOpen) {
        closeMenu();
      }
      if (blockMenuOpen) {
        closeBlockMenu();
      }
      if (imageQuickMenu) {
        closeImageQuickMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [blockMenuOpen, closeBlockMenu, closeImageQuickMenu, closeMenu, imageQuickMenu, menuOpen]);

  useEffect(() => {
    if (activeTab !== "editor") {
      setSelectionToolbar(null);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!selectionToolbar || selectionToolbar.blockTool !== "header") {
      setSelectionTransformOpen(false);
      setSelectionTransformPosition(null);
    }
  }, [selectionToolbar]);

  useEffect(() => {
    if (!selectionTransformOpen) {
      return;
    }
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (selectionTransformRef.current?.contains(target ?? null)) {
        return;
      }
      setSelectionTransformOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [selectionTransformOpen]);

  useEffect(() => {
    if (!selectionInlineMoreOpen) {
      return;
    }
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (selectionInlineMoreRef.current?.contains(target ?? null)) {
        return;
      }
      setSelectionInlineMoreOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [selectionInlineMoreOpen]);

  useEffect(() => {
    if (!selectionTransformOpen) {
      setSelectionTransformPosition(null);
      return;
    }

    const reposition = () => {
      const triggerEl = selectionTransformTriggerRef.current;
      const menuEl = selectionTransformMenuRef.current;
      if (!triggerEl || !menuEl) {
        return;
      }

      const triggerRect = triggerEl.getBoundingClientRect();
      const menuWidth = menuEl.offsetWidth || 320;
      const menuHeight = menuEl.offsetHeight || 420;
      const viewportPadding = 8;
      const left = Math.min(
        Math.max(viewportPadding, triggerRect.left),
        window.innerWidth - menuWidth - viewportPadding,
      );

      const spaceBelow = window.innerHeight - triggerRect.bottom - viewportPadding;
      const spaceAbove = triggerRect.top - viewportPadding;
      const placeAbove = spaceBelow < 280 && spaceAbove > spaceBelow;
      const availableSpace = Math.max(180, (placeAbove ? spaceAbove : spaceBelow) - 8);
      const menuVisibleHeight = Math.min(menuHeight, availableSpace);
      const top = placeAbove
        ? Math.max(viewportPadding, triggerRect.top - menuVisibleHeight - 8)
        : Math.min(window.innerHeight - menuVisibleHeight - viewportPadding, triggerRect.bottom + 8);

      setSelectionTransformPosition({
        top,
        left,
        maxHeight: Math.max(180, availableSpace),
      });
    };

    const frame = requestAnimationFrame(reposition);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [selectionTransformOpen]);

  useEffect(() => {
    if (!selectionToolbar) {
      setSelectionToolbarLeft(null);
      return;
    }

    const clampSelectionToolbar = () => {
      if (!selectionToolbar || !fieldRef.current) {
        return;
      }

      const preferredLeft = Math.max(48, selectionToolbar.left);
      const toolbarEl = selectionToolbarRef.current;
      if (!toolbarEl) {
        setSelectionToolbarLeft(preferredLeft);
        return;
      }

      const fieldRect = fieldRef.current.getBoundingClientRect();
      const toolbarWidth = toolbarEl.offsetWidth;
      const viewportPadding = 12;
      const maxLeft = window.innerWidth - fieldRect.left - toolbarWidth - viewportPadding;
      const clampedLeft = Math.min(preferredLeft, Math.max(8, maxLeft));
      setSelectionToolbarLeft(clampedLeft);
    };

    const frame = requestAnimationFrame(clampSelectionToolbar);
    window.addEventListener("resize", clampSelectionToolbar);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", clampSelectionToolbar);
    };
  }, [selectionToolbar]);

  return (
    <div className={styles.editorShell}>
      <div className={styles.editorTabs}>
        <button
          type="button"
          className={`${styles.editorTab} ${activeTab === "editor" ? styles.editorTabActive : ""}`}
          onClick={() => setActiveTab("editor")}
        >
          {m.tabContent}
        </button>
        <button
          type="button"
          className={`${styles.editorTab} ${activeTab === "preview" ? styles.editorTabActive : ""}`}
          onClick={() => setActiveTab("preview")}
        >
          {m.tabPreview}
        </button>
      </div>

      <div className={styles.editorBody}>
        <div
          className={`${styles.editorField} ${activeTab === "editor" ? "" : styles.panelHidden}`}
          data-ready={isReady ? "true" : "false"}
          ref={fieldRef}
        >
          <div
            className={styles.editorFloatingTools}
            style={{
              top: floatingTop ?? 0,
              opacity: floatingVisible && !selectionToolbar ? 1 : 0,
              pointerEvents: floatingVisible && !selectionToolbar ? "auto" : "none",
            }}
          >
            <button
              type="button"
              className={styles.editorToolButton}
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                closeBlockMenu();
                openMenuForBlock(activeBlockIndex);
              }}
              aria-label={m.addBlock}
            >
              +
            </button>
            <button
              type="button"
              className={styles.editorToolButton}
              aria-label={m.dragBlock}
              onPointerDown={handleDragHandlePointerDown}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                openBlockMenuForIndex(activeBlockIndex);
              }}
            >
              ⋮⋮
            </button>
          </div>
          <div className={styles.editorHolder} ref={holderRef} />
          {selectionToolbar ? (
            <div
              ref={selectionToolbarRef}
              className={styles.editorSelectionToolbar}
              style={{
                top: Math.max(-64, selectionToolbar.top),
                left: selectionToolbarLeft ?? Math.max(48, selectionToolbar.left),
              }}
            >
              {selectionToolbar.blockTool === "header" ? (
                <div className={styles.editorSelectionTransform} ref={selectionTransformRef}>
                  <button
                    ref={selectionTransformTriggerRef}
                    type="button"
                    className={styles.editorSelectionTransformTrigger}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setSelectionTransformOpen((prev) => !prev)}
                    title="Transform to"
                  >
                    H{selectionToolbar.headerLevel ?? 2}
                  </button>
                  {selectionTransformOpen ? (
                    <div
                      ref={selectionTransformMenuRef}
                      className={styles.editorSelectionTransformMenu}
                      style={{
                        top: selectionTransformPosition?.top ?? 0,
                        left: selectionTransformPosition?.left ?? 0,
                        maxHeight: selectionTransformPosition?.maxHeight ?? 420,
                      }}
                    >
                      <div className={styles.editorSelectionTransformTitle}>TRANSFORM TO</div>
                      <button
                        type="button"
                        className={styles.editorSelectionTransformItem}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          void applySelectionTransform("header", 1);
                        }}
                      >
                        <span>H1 Heading 1</span>
                        <strong className={styles.editorSelectionTransformPreview}>
                          {selectionToolbar.previewText?.trim() || "Preview"}
                        </strong>
                      </button>
                      <button
                        type="button"
                        className={styles.editorSelectionTransformItem}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          void applySelectionTransform("header", 2);
                        }}
                      >
                        <span>H2 Heading 2</span>
                        <strong className={styles.editorSelectionTransformPreview}>
                          {selectionToolbar.previewText?.trim() || "Preview"}
                        </strong>
                      </button>
                      <button
                        type="button"
                        className={styles.editorSelectionTransformItem}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          void applySelectionTransform("header", 3);
                        }}
                      >
                        <span>H3 Heading 3</span>
                        <strong className={styles.editorSelectionTransformPreview}>
                          {selectionToolbar.previewText?.trim() || "Preview"}
                        </strong>
                      </button>
                      <button
                        type="button"
                        className={styles.editorSelectionTransformItem}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          void applySelectionTransform("header", 4);
                        }}
                      >
                        <span>H4 Heading 4</span>
                        <strong className={styles.editorSelectionTransformPreview}>
                          {selectionToolbar.previewText?.trim() || "Preview"}
                        </strong>
                      </button>
                      <button
                        type="button"
                        className={styles.editorSelectionTransformItem}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          void applySelectionTransform("header", 5);
                        }}
                      >
                        <span>H5 Heading 5</span>
                        <strong className={styles.editorSelectionTransformPreview}>
                          {selectionToolbar.previewText?.trim() || "Preview"}
                        </strong>
                      </button>
                      <button
                        type="button"
                        className={styles.editorSelectionTransformItem}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          void applySelectionTransform("header", 6);
                        }}
                      >
                        <span>H6 Heading 6</span>
                        <strong className={styles.editorSelectionTransformPreview}>
                          {selectionToolbar.previewText?.trim() || "Preview"}
                        </strong>
                      </button>
                      <button
                        type="button"
                        className={styles.editorSelectionTransformItem}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          void applySelectionTransform("paragraph");
                        }}
                      >
                        <span>Paragraph</span>
                        <span className={styles.editorSelectionTransformPreviewSub}>text</span>
                      </button>
                      <button
                        type="button"
                        className={styles.editorSelectionTransformItem}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          void applySelectionTransform("list");
                        }}
                      >
                        <span>List</span>
                        <span className={styles.editorSelectionTransformPreviewSub}>• item</span>
                      </button>
                      <button
                        type="button"
                        className={styles.editorSelectionTransformItem}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          void applySelectionTransform("quote");
                        }}
                      >
                        <span>Quote</span>
                        <span className={styles.editorSelectionTransformPreviewSub}>&quot;text&quot;</span>
                      </button>
                      <button
                        type="button"
                        className={`${styles.editorSelectionTransformItem} ${styles.editorSelectionTransformItemDisabled}`}
                        onMouseDown={(event) => event.preventDefault()}
                        disabled
                      >
                        <span>Columns</span>
                        <span className={styles.editorSelectionTransformPreviewSub}>2 col</span>
                      </button>
                      <button
                        type="button"
                        className={`${styles.editorSelectionTransformItem} ${styles.editorSelectionTransformItemDisabled}`}
                        onMouseDown={(event) => event.preventDefault()}
                        disabled
                      >
                        <span>Grid</span>
                        <span className={styles.editorSelectionTransformPreviewSub}>grid</span>
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <button
                type="button"
                className={styles.editorSelectionAction}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applySelectionInlineAction("bold")}
                title="Bold"
              >
                B
              </button>
              <button
                type="button"
                className={styles.editorSelectionAction}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applySelectionInlineAction("italic")}
                title="Italic"
              >
                i
              </button>
              <button
                type="button"
                className={styles.editorSelectionAction}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => applySelectionInlineAction("link")}
                title="Link"
              >
                Link
              </button>
              <div className={styles.editorSelectionMore} ref={selectionInlineMoreRef}>
                <button
                  type="button"
                  className={styles.editorSelectionAction}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setSelectionInlineMoreOpen((prev) => !prev)}
                  title="More inline options"
                >
                  ▼
                </button>
                {selectionInlineMoreOpen ? (
                  <div className={styles.editorSelectionMoreMenu}>
                    <button
                      type="button"
                      className={styles.editorSelectionMoreItem}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        applySelectionInlineAction("underline");
                        setSelectionInlineMoreOpen(false);
                      }}
                    >
                      U Altı Çizili
                    </button>
                    <button
                      type="button"
                      className={styles.editorSelectionMoreItem}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        applySelectionInlineAction("strike");
                        setSelectionInlineMoreOpen(false);
                      }}
                    >
                      S Üstü Çizili
                    </button>
                    <button
                      type="button"
                      className={styles.editorSelectionMoreItem}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        applySelectionInlineAction("code");
                        setSelectionInlineMoreOpen(false);
                      }}
                    >
                      {"</>"} Inline code
                    </button>
                  </div>
                ) : null}
              </div>
              <select
                className={styles.editorSelectionSelect}
                value={selectionToolbar.style.align ?? "left"}
                onChange={(event) => {
                  const value = event.target.value as EditorTextAlign;
                  void applySelectionStyle({ align: value });
                }}
              >
                <option value="left">Sol</option>
                <option value="center">Orta</option>
                <option value="right">Sag</option>
              </select>
              <select
                className={styles.editorSelectionSelect}
                value={String(selectionToolbar.style.fontWeight ?? 400)}
                onChange={(event) => {
                  const value = normalizeFontWeight(Number(event.target.value));
                  void applySelectionStyle({ fontWeight: value });
                }}
              >
                <option value="300">300</option>
                <option value="400">400</option>
                <option value="500">500</option>
                <option value="600">600</option>
                <option value="700">700</option>
                <option value="800">800</option>
                <option value="900">900</option>
              </select>
              <label className={styles.editorSelectionSize}>
                <button
                  type="button"
                  className={styles.editorSelectionStep}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={() => {
                    const current = selectionToolbar.style.fontSize ?? 16;
                    const next = Math.max(8, current - 1);
                    void applySelectionStyle({ fontSize: next });
                  }}
                  title="Yaziyi 1px kucult"
                >
                  A-
                </button>
                <select
                  className={styles.editorSelectionSizeSelect}
                  value={String(selectionToolbar.style.fontSize ?? 16)}
                  onChange={(event) => {
                    void applySelectionStyle({ fontSize: Number(event.target.value) });
                  }}
                >
                  {Array.from({ length: 57 }, (_, idx) => {
                    const size = idx + 8;
                    return (
                      <option key={size} value={size}>{size}px</option>
                    );
                  })}
                </select>
                <button
                  type="button"
                  className={styles.editorSelectionStep}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={() => {
                    const current = selectionToolbar.style.fontSize ?? 16;
                    const next = Math.min(64, current + 1);
                    void applySelectionStyle({ fontSize: next });
                  }}
                  title="Yaziyi 1px buyut"
                >
                  A+
                </button>
              </label>
              <label className={styles.editorSelectionColorWrap}>
                <input
                  type="color"
                  className={styles.editorSelectionColorInput}
                  value={normalizeTextColor(selectionToolbar.style.textColor) ?? "#222222"}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onChange={(event) => {
                    void applySelectionStyle({ textColor: event.target.value });
                  }}
                  title="Yazi rengi"
                />
                <button
                  type="button"
                  className={styles.editorSelectionStep}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={() => {
                    void applySelectionStyle({ textColor: null });
                  }}
                  title="Rengi sifirla"
                >
                  X
                </button>
              </label>
            </div>
          ) : null}
          {(activeBlockTool === "code" || activeBlockTool === "quote") && codeButtonPosition ? (
            <button
              type="button"
              className={styles.editorCodeDone}
              style={{ top: codeButtonPosition.top, left: codeButtonPosition.left }}
              onClick={() => insertParagraphAfter(activeBlockIndex)}
              title={m.finishBlock}
            >
              {m.complete}
            </button>
          ) : null}
          {menuOpen && menuPosition ? (
            <div
              className={styles.editorMenu}
              ref={menuRef}
              style={{ top: menuPosition.top, left: menuPosition.left }}
            >
              <div className={styles.editorMenuHeader}>
                <span className={styles.editorMenuSearchIcon} aria-hidden>
                  /
                </span>
                <input
                  ref={menuInputRef}
                  className={styles.editorMenuSearchInput}
                  placeholder={m.filterPlaceholder}
                  value={menuQuery}
                  onChange={(event) => setMenuQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      closeMenu();
                    }
                  }}
                />
              </div>
              <div className={styles.editorMenuList}>
                {filteredCommands.length === 0 ? (
                  <div className={styles.editorMenuEmpty}>{m.noResults}</div>
                ) : (
                  filteredCommands.map((command) => (
                    <button
                      key={command.id}
                      type="button"
                      className={styles.editorMenuItem}
                      onClick={() => handleCommandSelect(command)}
                    >
                      <span className={styles.editorMenuIcon} aria-hidden>
                        {COMMAND_ICONS[command.id] ?? "+"}
                      </span>
                      <div>
                        <div className={styles.editorMenuTitle}>{command.label}</div>
                        <div className={styles.editorMenuDesc}>{command.description}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
          {blockMenuOpen && blockMenuPosition ? (
            <div
              className={styles.editorBlockMenu}
              ref={blockMenuRef}
              style={{ top: blockMenuPosition.top, left: blockMenuPosition.left }}
            >
              <div className={styles.editorMenuHeader}>
                <span className={styles.editorMenuSearchIcon} aria-hidden>
                  /
                </span>
                <input
                  ref={blockMenuInputRef}
                  className={styles.editorMenuSearchInput}
                  placeholder={m.filterPlaceholder}
                  value={blockMenuQuery}
                  onChange={(event) => setBlockMenuQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      closeBlockMenu();
                    }
                  }}
                />
              </div>
              <div className={styles.editorBlockMenuList}>
                {blockMenuOptions.length === 0 ? (
                  <div className={styles.editorMenuEmpty}>{m.noResults}</div>
                ) : (
                  blockMenuOptions.map((option) => {
                    if (option.kind === "separator") {
                      return <div key={option.id} className={styles.editorBlockMenuSeparator} />;
                    }
                    if (option.kind === "sectionTitle") {
                      return <div key={option.id} className={styles.editorBlockMenuSectionTitle}>{option.label}</div>;
                    }
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={`${styles.editorBlockMenuItem} ${option.selected ? styles.editorBlockMenuItemActive : ""} ${option.danger ? styles.editorBlockMenuItemDanger : ""}`}
                        onClick={() => handleBlockMenuOptionSelect(option)}
                      >
                        <span className={styles.editorBlockMenuIcon} aria-hidden>
                          {option.icon}
                        </span>
                        <span>{option.label}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}
          {imageQuickMenu ? (
            <div
              className={`${styles.editorSelectionToolbar} ${styles.editorImageQuickMenu}`}
              ref={imageQuickMenuRef}
              style={{ top: imageQuickMenu.top, left: imageQuickMenu.left }}
            >
              <button
                type="button"
                className={`${styles.editorImageQuickButton} ${imageQuickMenu.withBorder ? styles.editorImageQuickButtonActive : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  void applyImageQuickAction("withBorder");
                }}
                title={m.optionImageBorder}
                aria-label={m.optionImageBorder}
              >
                <span aria-hidden>▣</span>
                <span>Kenar</span>
              </button>
              <button
                type="button"
                className={`${styles.editorImageQuickButton} ${imageQuickMenu.stretched ? styles.editorImageQuickButtonActive : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  void applyImageQuickAction("stretched");
                }}
                title={m.optionImageStretch}
                aria-label={m.optionImageStretch}
              >
                <span aria-hidden>↔</span>
                <span>Genislet</span>
              </button>
              <button
                type="button"
                className={`${styles.editorImageQuickButton} ${imageQuickMenu.withBackground ? styles.editorImageQuickButtonActive : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  void applyImageQuickAction("withBackground");
                }}
                title={m.optionImageBackground}
                aria-label={m.optionImageBackground}
              >
                <span aria-hidden>◧</span>
                <span>Arka Plan</span>
              </button>
              <span className={styles.editorImageQuickDivider} aria-hidden />
              <select
                className={styles.editorSelectionSelect}
                value={imageQuickMenu.position}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "left") {
                    void applyImageQuickAction("positionLeft");
                    return;
                  }
                  if (value === "right") {
                    void applyImageQuickAction("positionRight");
                    return;
                  }
                  void applyImageQuickAction("positionCenter");
                }}
                title="Imaj konumu"
                aria-label="Imaj konumu"
              >
                <option value="left">Sol</option>
                <option value="center">Orta</option>
                <option value="right">Sag</option>
              </select>
              <span className={styles.editorImageQuickDivider} aria-hidden />
              <button
                type="button"
                className={`${styles.editorImageQuickButton} ${styles.editorImageQuickButtonDanger}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  void applyImageQuickAction("delete");
                }}
                title={m.optionDelete}
                aria-label={m.optionDelete}
              >
                <span aria-hidden>×</span>
                <span>Sil</span>
              </button>
            </div>
          ) : null}
          {!isReady ? <p className={styles.editorHint}>{m.preparing}</p> : null}
        </div>

        <aside className={`${styles.editorPreviewPane} ${activeTab === "preview" ? "" : styles.panelHidden}`}>
          <p className={styles.editorPreviewTitle}>{m.livePreview}</p>
          <div className={styles.markdownPreview}>
            <EditorRenderer content={serialized} locale={locale} />
          </div>
        </aside>
      </div>

      <input type="hidden" name={name} value={serialized} />
    </div>
  );
}
