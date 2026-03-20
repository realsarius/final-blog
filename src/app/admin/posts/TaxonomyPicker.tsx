"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { interpolate } from "@/lib/interpolate";
import styles from "./post-form.module.css";

interface TaxonomyPickerProps {
  label: string;
  name: string;
  options: string[];
  defaultSelected?: string[];
  placeholder?: string;
  removeSuffix?: string;
  createTemplate?: string;
  noMatchesLabel?: string;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export default function TaxonomyPicker({
  label,
  name,
  options,
  defaultSelected = [],
  placeholder = "Search or add...",
  removeSuffix = "remove",
  createTemplate = "Create “{value}”",
  noMatchesLabel = "No matching item.",
}: TaxonomyPickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [selected, setSelected] = useState<string[]>(() =>
    Array.from(
      new Map(
        defaultSelected
          .map((item) => item.trim())
          .filter(Boolean)
          .map((item) => [normalize(item), item])
      ).values()
    )
  );
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const updateMenuDirection = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const menuHeight = menuRef.current?.offsetHeight ?? 220;
    const preferredGap = 6;
    const neededSpace = Math.min(menuHeight, 220) + preferredGap;
    const shouldOpenUpward = spaceBelow < neededSpace && spaceAbove > spaceBelow;

    setOpenUpward(shouldOpenUpward);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const initialFrame = requestAnimationFrame(() => updateMenuDirection());
    const handleViewportChange = () => updateMenuDirection();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      cancelAnimationFrame(initialFrame);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isOpen, selected, query, options, updateMenuDirection]);

  const normalizedSelected = useMemo(
    () => new Set(selected.map((item) => normalize(item))),
    [selected]
  );

  const filteredOptions = useMemo(() => {
    const needle = normalize(query);
    return options
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => !normalizedSelected.has(normalize(item)))
      .filter((item) => (needle ? normalize(item).includes(needle) : true));
  }, [options, query, normalizedSelected]);

  const canCreate =
    query.trim().length > 0 &&
    !normalizedSelected.has(normalize(query)) &&
    !options.some((item) => normalize(item) === normalize(query));

  const addItem = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const key = normalize(trimmed);
    if (normalizedSelected.has(key)) return;
    setSelected((prev) => [...prev, trimmed]);
    setQuery("");
    setIsOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const removeItem = (value: string) => {
    const key = normalize(value);
    setSelected((prev) => prev.filter((item) => normalize(item) !== key));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && query.length === 0 && selected.length > 0) {
      removeItem(selected[selected.length - 1]);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (canCreate) {
        addItem(query);
      } else if (filteredOptions.length > 0) {
        addItem(filteredOptions[0]);
      }
    }
  };

  return (
    <div className={styles.taxonomy} ref={wrapperRef}>
      <label className={styles.taxonomyLabel}>{label}</label>
      <div className={styles.taxonomyControl}>
        {selected.map((item) => (
          <button
            key={item}
            type="button"
            className={styles.taxonomyChip}
            onClick={() => removeItem(item)}
            aria-label={`${item} ${removeSuffix}`}
          >
            <span>{item}</span>
            <span className={styles.taxonomyChipIcon}>×</span>
          </button>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={styles.taxonomyInput}
        />
      </div>
      {isOpen ? (
        <div
          ref={menuRef}
          className={`${styles.taxonomyMenu} ${openUpward ? styles.taxonomyMenuUp : ""}`}
          role="listbox"
        >
          {filteredOptions.map((item) => (
            <button
              key={item}
              type="button"
              className={styles.taxonomyOption}
              onMouseDown={(event) => {
                event.preventDefault();
                addItem(item);
              }}
            >
              {item}
            </button>
          ))}
          {canCreate ? (
            <button
              type="button"
              className={`${styles.taxonomyOption} ${styles.taxonomyCreate}`}
              onMouseDown={(event) => {
                event.preventDefault();
                addItem(query);
              }}
            >
              {interpolate(createTemplate, { value: query.trim() })}
            </button>
          ) : null}
          {filteredOptions.length === 0 && !canCreate ? (
            <div className={styles.taxonomyEmpty}>{noMatchesLabel}</div>
          ) : null}
        </div>
      ) : null}
      <input type="hidden" name={name} value={selected.join(", ")} />
    </div>
  );
}
