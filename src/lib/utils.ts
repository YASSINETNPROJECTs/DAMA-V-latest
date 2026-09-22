/** Format a number with thousands separators, e.g. 1480 -> "1,480". */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/** Truncate text with an ellipsis. */
export function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

/** Simple deterministic class-name joiner. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Generate a random 32-byte hex token (session tokens, etc.). */
export function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
