export function formatDate(date: Date | null | undefined) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
  }).format(date);
}
