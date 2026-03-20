export function formatDate(date: Date | null | undefined, withTime = false, locale: "tr" | "en" = "tr") {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", {
    dateStyle: "long",
    ...(withTime ? { timeStyle: "short" as const } : {}),
  }).format(date);
}
