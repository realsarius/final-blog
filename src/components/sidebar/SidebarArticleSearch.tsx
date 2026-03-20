"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useHomeSearch } from "@/components/blog/HomeSearchProvider";
import styles from "./SidebarArticleSearch.module.css";

export default function SidebarArticleSearch({ locale = "tr" }: { locale?: "tr" | "en" }) {
  const t = locale === "en"
    ? {
      heading: "Search Posts",
      placeholder: "Title or category...",
      clear: "Clear",
      suggestionsAria: "Search suggestions",
      noSuggestions: "No suggestions found.",
    }
    : {
      heading: "Yazı Ara",
      placeholder: "Başlık veya kategori...",
      clear: "Temizle",
      suggestionsAria: "Arama önerileri",
      noSuggestions: "Öneri bulunamadı.",
    };
  const rootRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { query, setQuery, suggestions, clearQuery, hasQuery } = useHomeSearch();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (!isDropdownOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current) {
        return;
      }
      if (rootRef.current.contains(event.target as Node)) {
        return;
      }
      setIsDropdownOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [isDropdownOpen]);

  const showDropdown = isDropdownOpen && hasQuery;
  const navigateToPost = (slug: string) => {
    setIsDropdownOpen(false);
    router.push(`/blog/${slug}`);
  };

  return (
    <div ref={rootRef} className={styles.section}>
      <h4 className={styles.heading}>{t.heading}</h4>

      <div className={styles.searchFieldWrap}>
        <input
          id="sidebar-search"
          value={query}
          onFocus={() => setIsDropdownOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsDropdownOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsDropdownOpen(false);
            }
            if (event.key === "Enter" && suggestions[0]) {
              event.preventDefault();
              navigateToPost(suggestions[0].slug);
            }
          }}
          placeholder={t.placeholder}
          className={styles.searchInput}
        />
        {hasQuery ? (
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => {
              clearQuery();
              setIsDropdownOpen(false);
            }}
          >
            {t.clear}
          </button>
        ) : null}
      </div>

      {showDropdown ? (
        <div className={styles.dropdown} role="listbox" aria-label={t.suggestionsAria}>
          {suggestions.length > 0 ? (
            suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.suggestion}
                onClick={() => {
                  navigateToPost(item.slug);
                }}
              >
                <span className={styles.suggestionTitle}>{item.title}</span>
                <span className={styles.suggestionMeta}>{item.categoryName}</span>
              </button>
            ))
          ) : (
            <p className={styles.dropdownEmpty}>{t.noSuggestions}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
