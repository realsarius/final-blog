"use client";

import { useSyncExternalStore } from "react";

type Locale = "tr" | "en";

function getLocaleFromDocument(): Locale {
  if (typeof document === "undefined") {
    return "tr";
  }
  return document.documentElement.lang === "en" ? "en" : "tr";
}

function subscribe(onStoreChange: () => void) {
  if (typeof document === "undefined") {
    return () => {};
  }

  const observer = new MutationObserver(() => onStoreChange());
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"],
  });

  return () => observer.disconnect();
}

export function useDocumentLocale(): Locale {
  return useSyncExternalStore(subscribe, getLocaleFromDocument, () => "tr");
}
