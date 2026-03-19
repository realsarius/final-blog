"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type EditorJS from "@editorjs/editorjs";
import type { BlockToolConstructable, OutputData } from "@editorjs/editorjs";
import EditorRenderer from "@/components/EditorRenderer";
import { parseEditorContent } from "@/lib/content";
import styles from "./post-form.module.css";

interface EditorFieldProps {
  name: string;
  defaultValue?: string;
}

type SlashCommand = {
  id: string;
  label: string;
  description: string;
  type: string;
  data?: Record<string, unknown>;
  keywords?: string[];
};

type EditorListStyle = "unordered" | "ordered";

type BlockMenuContext = {
  index: number;
  blockId: string;
  tool: string;
  data: Record<string, unknown>;
  headerLevel?: number;
  listStyle?: EditorListStyle;
  imageWithBorder?: boolean;
  imageStretched?: boolean;
  imageWithBackground?: boolean;
};

type BlockMenuOption = {
  id: string;
  kind:
    | "headerLevel"
    | "listStyle"
    | "imageWithBorder"
    | "imageStretched"
    | "imageWithBackground"
    | "moveUp"
    | "moveDown"
    | "delete"
    | "separator";
  label?: string;
  icon?: string;
  keywords?: string[];
  value?: number | EditorListStyle;
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

const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "paragraph",
    label: "Paragraf",
    description: "Normal metin bloğu",
    type: "paragraph",
    data: { text: "" },
    keywords: ["text", "yazi"],
  },
  {
    id: "header",
    label: "Başlık",
    description: "H2/H3 başlık bloğu",
    type: "header",
    data: { text: "", level: 2 },
    keywords: ["heading", "title"],
  },
  {
    id: "list",
    label: "Liste",
    description: "Madde listesi",
    type: "list",
    keywords: ["bullet", "madde"],
  },
  {
    id: "quote",
    label: "Alıntı",
    description: "Quote bloğu",
    type: "quote",
    data: { text: "", caption: "" },
    keywords: ["citation", "quote"],
  },
  {
    id: "code",
    label: "Kod",
    description: "Kod bloğu",
    type: "code",
    data: { code: "" },
    keywords: ["code", "snippet"],
  },
  {
    id: "image",
    label: "Görsel",
    description: "Resim yükle veya URL yapıştır",
    type: "image",
    data: {},
    keywords: ["image", "photo", "resim"],
  },
];

const COMMAND_ICONS: Record<string, string> = {
  paragraph: "T",
  header: "H",
  list: "1=",
  quote: '""',
  code: "</>",
  image: "[]",
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

function normalizeToolName(toolName: string | null | undefined, data?: Record<string, unknown>) {
  const value = (toolName ?? "").toLowerCase();
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
      data: { text },
    };
  }

  if (tool === "header") {
    const text = typeof data.text === "string" ? data.text : "";
    const parsedLevel = Number(data.level);
    const level = Number.isFinite(parsedLevel) ? Math.min(6, Math.max(1, parsedLevel)) : 2;
    return {
      type: "header",
      data: { text, level },
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
      },
    };
  }

  if (tool === "quote") {
    return {
      type: "quote",
      data: {
        text: typeof data.text === "string" ? data.text : "",
        caption: typeof data.caption === "string" ? data.caption : "",
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

export default function EditorField({
  name,
  defaultValue = "",
}: EditorFieldProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const holderRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorJS | null>(null);
  const initialData = useMemo(() => buildInitialData(defaultValue), [defaultValue]);
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
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const blockMenuRef = useRef<HTMLDivElement | null>(null);
  const menuInputRef = useRef<HTMLInputElement | null>(null);
  const blockMenuInputRef = useRef<HTMLInputElement | null>(null);
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

  const getEditor = useCallback((): EditorRuntimeApi | null => {
    return editorRef.current as EditorRuntimeApi | null;
  }, []);

  const filteredCommands = useMemo(() => {
    const query = menuQuery.trim().toLowerCase();
    if (!query) {
      return SLASH_COMMANDS;
    }
    return SLASH_COMMANDS.filter((command) => {
      if (command.label.toLowerCase().includes(query)) {
        return true;
      }
      return (command.keywords ?? []).some((keyword) => keyword.includes(query));
    });
  }, [menuQuery]);

  const blockMenuOptions = useMemo(() => {
    const options: BlockMenuOption[] = [];
    const context = blockMenuContext;

    if (context?.tool === "header") {
      [1, 2, 3, 4, 5, 6].forEach((level) => {
        options.push({
          id: `header-${level}`,
          kind: "headerLevel",
          label: `Başlık ${level}`,
          icon: `H${level}`,
          value: level,
          selected: context.headerLevel === level,
          keywords: ["baslik", "heading", `h${level}`],
        });
      });
      options.push({ id: "sep-header", kind: "separator" });
    }

    if (context?.tool === "list") {
      options.push(
        {
          id: "list-unordered",
          kind: "listStyle",
          label: "Sırasız liste",
          icon: "•",
          value: "unordered",
          selected: context.listStyle === "unordered",
          keywords: ["liste", "sirasiz", "madde", "bullet"],
        },
        {
          id: "list-ordered",
          kind: "listStyle",
          label: "Sıralı liste",
          icon: "1.",
          value: "ordered",
          selected: context.listStyle === "ordered",
          keywords: ["liste", "sirali", "numarali", "ordered"],
        },
        { id: "sep-list", kind: "separator" },
      );
    }

    if (context?.tool === "image") {
      options.push(
        {
          id: "image-with-border",
          kind: "imageWithBorder",
          label: "Kenarlık ekle",
          icon: "[]",
          selected: context.imageWithBorder === true,
          keywords: ["border", "kenarlik", "cerceve"],
        },
        {
          id: "image-stretched",
          kind: "imageStretched",
          label: "Görseli genişlet",
          icon: "<>",
          selected: context.imageStretched === true,
          keywords: ["stretch", "genislet", "tam genislik"],
        },
        {
          id: "image-with-background",
          kind: "imageWithBackground",
          label: "Arka plan ekle",
          icon: "##",
          selected: context.imageWithBackground === true,
          keywords: ["background", "arka plan"],
        },
        { id: "sep-image", kind: "separator" },
      );
    }

    options.push(
      {
        id: "move-up",
        kind: "moveUp",
        label: "Yukarı taşı",
        icon: "^",
        keywords: ["yukari", "tas", "ust"],
      },
      {
        id: "delete",
        kind: "delete",
        label: "Sil",
        icon: "x",
        keywords: ["sil", "kaldir", "delete"],
        danger: true,
      },
      {
        id: "move-down",
        kind: "moveDown",
        label: "Aşağı taşı",
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
      if (option.kind === "separator") {
        return;
      }
      const matches = (option.label ?? "").toLowerCase().includes(query)
        || (option.keywords ?? []).some((keyword) => keyword.includes(query));
      if (matches) {
        filtered.push(option);
      }
    });
    return filtered;
  }, [blockMenuContext, blockMenuQuery]);

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
      };

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
    closeMenu();
    void loadBlockMenuContext(resolvedIndex);
  }, [closeMenu, getBlockElementByIndex, getCurrentBlockIndex, loadBlockMenuContext]);

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
      } catch {
        // Ignore update failures.
      }
      closeBlockMenu();
      requestAnimationFrame(() => {
        syncActiveBlock();
      });
    }
  }, [blockMenuContext, closeBlockMenu, getEditor, syncActiveBlock]);

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
      option.kind === "headerLevel"
      || option.kind === "listStyle"
      || option.kind === "imageWithBorder"
      || option.kind === "imageStretched"
      || option.kind === "imageWithBackground"
    ) {
      void applyContextualBlockOption(option);
    }
  }, [applyContextualBlockOption, deleteBlock, moveBlockBy]);

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
    if (!editor?.blocks?.move) {
      requestAnimationFrame(() => {
        syncActiveBlock();
      });
      return;
    }

    try {
      editor.blocks.move(targetIndex, fromIndex);
      setActiveBlockIndex(targetIndex);
    } catch {
      // Ignore move failures.
    }
    requestAnimationFrame(() => {
      syncActiveBlock();
    });
  }, [clearDropTarget, getEditor, handleDragPointerMove, openBlockMenuForIndex, syncActiveBlock]);

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
      ] = await Promise.all([
        import("@editorjs/editorjs"),
        import("@editorjs/header"),
        import("@editorjs/list"),
        import("@editorjs/quote"),
        import("@editorjs/code"),
        import("@editorjs/image"),
      ]);

      if (!active || !holderRef.current) {
        return;
      }

      const headerTool = Header as unknown as BlockToolConstructable;
      const listTool = List as unknown as BlockToolConstructable;
      const quoteTool = Quote as unknown as BlockToolConstructable;
      const codeTool = Code as unknown as BlockToolConstructable;
      const imageTool = ImageTool as unknown as BlockToolConstructable;

      const editor = new EditorJS({
        holder: holderRef.current,
        data: initialData,
        autofocus: true,
        tools: {
          header: {
            class: headerTool,
            inlineToolbar: true,
            config: {
              levels: [1, 2, 3, 4, 5, 6],
              defaultLevel: 2,
            },
          },
          list: {
            class: listTool,
            inlineToolbar: true,
          },
          quote: {
            class: quoteTool,
            inlineToolbar: true,
            config: {
              quotePlaceholder: "Alıntıyı yazın",
              captionPlaceholder: "Alıntı kaynağı (opsiyonel)",
            },
          },
          code: {
            class: codeTool,
            config: {
              placeholder: "Kodunuzu buraya yazın",
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
            syncActiveBlock();
          });
        },
        onChange: async () => {
          const output = await editor.save();
          if (!active) {
            return;
          }
          const normalized = {
            ...output,
            blocks: output.blocks
              .map((block) => normalizeInitialBlock(block))
              .filter((block): block is { type: string; data: Record<string, unknown> } => Boolean(block)),
          };
          setSerialized(JSON.stringify(normalized));
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
  }, [clearDropTarget, handleDragPointerMove, handleDragPointerUp, initialData, syncActiveBlock]);

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
    };

    holder.addEventListener("mousemove", handleMouseMove);
    holder.addEventListener("mouseenter", handleSelectionChange);
    holder.addEventListener("keydown", handleKeyDown);
    holder.addEventListener("keydown", handleShortcuts);
    holder.addEventListener("paste", handlePaste, true);
    document.addEventListener("paste", handlePaste, true);
    holder.addEventListener("keyup", handleSelectionChange);
    holder.addEventListener("click", handleSelectionChange);
    holder.addEventListener("focusin", handleSelectionChange);
    field.addEventListener("mouseleave", handleFieldLeave);

    return () => {
      holder.removeEventListener("mousemove", handleMouseMove);
      holder.removeEventListener("mouseenter", handleSelectionChange);
      holder.removeEventListener("keydown", handleKeyDown);
      holder.removeEventListener("keydown", handleShortcuts);
      holder.removeEventListener("paste", handlePaste, true);
      document.removeEventListener("paste", handlePaste, true);
      holder.removeEventListener("keyup", handleSelectionChange);
      holder.removeEventListener("click", handleSelectionChange);
      holder.removeEventListener("focusin", handleSelectionChange);
      field.removeEventListener("mouseleave", handleFieldLeave);
    };
  }, [
    blockMenuOpen,
    closeBlockMenu,
    closeMenu,
    getBlockIndexFromElement,
    getCurrentBlockIndex,
    getToolFromBlock,
    insertParagraphAfter,
    menuOpen,
    openMenuForBlock,
    syncActiveBlock,
  ]);

  useEffect(() => {
    if (!menuOpen && !blockMenuOpen) {
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
      if (menuOpen) {
        closeMenu();
      }
      if (blockMenuOpen) {
        closeBlockMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [blockMenuOpen, closeBlockMenu, closeMenu, menuOpen]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    requestAnimationFrame(() => {
      menuInputRef.current?.focus();
      menuInputRef.current?.select();
    });
  }, [menuOpen]);

  useEffect(() => {
    if (!blockMenuOpen) {
      return;
    }
    requestAnimationFrame(() => {
      blockMenuInputRef.current?.focus();
      blockMenuInputRef.current?.select();
    });
  }, [blockMenuOpen]);

  return (
    <div className={styles.editorShell}>
      <div className={styles.editorTabs}>
        <button
          type="button"
          className={`${styles.editorTab} ${activeTab === "editor" ? styles.editorTabActive : ""}`}
          onClick={() => setActiveTab("editor")}
        >
          İçerik
        </button>
        <button
          type="button"
          className={`${styles.editorTab} ${activeTab === "preview" ? styles.editorTabActive : ""}`}
          onClick={() => setActiveTab("preview")}
        >
          Önizleme
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
              opacity: floatingVisible ? 1 : 0,
              pointerEvents: floatingVisible ? "auto" : "none",
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
              aria-label="Blok ekle"
            >
              +
            </button>
            <button
              type="button"
              className={styles.editorToolButton}
              aria-label="Blok sürükle"
              onPointerDown={handleDragHandlePointerDown}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              ⋮⋮
            </button>
          </div>
          <div className={styles.editorHolder} ref={holderRef} />
          {(activeBlockTool === "code" || activeBlockTool === "quote") && codeButtonPosition ? (
            <button
              type="button"
              className={styles.editorCodeDone}
              style={{ top: codeButtonPosition.top, left: codeButtonPosition.left }}
              onClick={() => insertParagraphAfter(activeBlockIndex)}
              title="Bloğu bitir"
            >
              Tamamla
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
                  placeholder="Filtre"
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
                  <div className={styles.editorMenuEmpty}>Sonuç bulunamadı.</div>
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
                  placeholder="Filtre"
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
                  <div className={styles.editorMenuEmpty}>Sonuç bulunamadı.</div>
                ) : (
                  blockMenuOptions.map((option) => {
                    if (option.kind === "separator") {
                      return <div key={option.id} className={styles.editorBlockMenuSeparator} />;
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
          {!isReady ? <p className={styles.editorHint}>Editör hazırlanıyor…</p> : null}
        </div>

        <aside className={`${styles.editorPreviewPane} ${activeTab === "preview" ? "" : styles.panelHidden}`}>
          <p className={styles.editorPreviewTitle}>Canlı Önizleme</p>
          <div className={styles.markdownPreview}>
            <EditorRenderer content={serialized} />
          </div>
        </aside>
      </div>

      <input type="hidden" name={name} value={serialized} />
    </div>
  );
}
