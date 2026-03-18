export function formatDate(date: Date | null | undefined, withTime = false) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    ...(withTime ? { timeStyle: "short" as const } : {}),
  }).format(date);
}
