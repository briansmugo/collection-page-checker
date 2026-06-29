import type { CheckResult } from "./types";

/**
 * UTF-8 safe base64url encode/decode. Works in the browser (btoa/atob) and in
 * Node 16+. Used to pack a full result into a shareable, self-contained URL so
 * reports can be opened or printed on any device without a backend.
 */
function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Encode any JSON-serializable value into a URL-safe token. */
export function encodeJson(value: unknown): string {
  return toBase64Url(JSON.stringify(value));
}

/** Decode a URL-safe token back into a value, or null if malformed. */
export function decodeJson<T>(token: string): T | null {
  try {
    return JSON.parse(fromBase64Url(token)) as T;
  } catch {
    return null;
  }
}

/** Encode a check result into a compact URL-safe token. */
export function encodeResult(result: CheckResult): string {
  return encodeJson(result);
}

/** Decode a token back into a check result, or null if it's malformed. */
export function decodeResult(token: string): CheckResult | null {
  const parsed = decodeJson<CheckResult>(token);
  if (!parsed || !Array.isArray(parsed.terms)) return null;
  return parsed;
}

/** Build an absolute /report URL for a result. `print` auto-opens the dialog. */
export function buildReportUrl(result: CheckResult, print = false): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const token = encodeResult(result);
  return `${origin}/report?d=${token}${print ? "&print=1" : ""}`;
}
