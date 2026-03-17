const WORDS_PER_MINUTE = 220;

export function getReadingTime(text: string) {
  const words = text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
  return { minutes, words };
}

export function formatReadingTime(text: string) {
  if (!text.trim()) {
    return "";
  }
  const { minutes } = getReadingTime(text);
  return `${minutes} dk okuma`;
}
