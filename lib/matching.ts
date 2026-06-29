import type { MatchKind, NearMatch, ProductItem } from "./types";

/**
 * Default similarity (0..1) at which a non-exact title is treated as a likely
 * typo rather than a genuine miss. 0.8 catches single/double character slips
 * (e.g. "Constallation" vs "Constellation" ~ 0.92) without flagging unrelated
 * words. Tune via the `threshold` option on the matching functions.
 */
export const DEFAULT_FUZZY_THRESHOLD = 0.8;

export interface MatchOptions {
  /** Similarity in [0,1] above which a near-match is reported. */
  threshold?: number;
}

/**
 * Normalize text for comparison:
 * - lowercase
 * - replace any punctuation/symbols with spaces (so "rose-gold" -> "rose gold")
 * - collapse repeated whitespace
 * - trim
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split normalized text into word tokens. Empty string -> []. */
export function tokenize(text: string): string[] {
  const n = normalize(text);
  return n.length === 0 ? [] : n.split(" ");
}

/**
 * Classic Levenshtein edit distance between two strings, using a single
 * rolling row for O(min(a,b)) memory.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  if (a.length > b.length) [a, b] = [b, a];

  const row = new Array<number>(a.length + 1);
  for (let i = 0; i <= a.length; i++) row[i] = i;

  for (let j = 1; j <= b.length; j++) {
    let prev = row[0];
    row[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const temp = row[i];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[i] = Math.min(row[i] + 1, row[i - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return row[a.length];
}

/**
 * Optimal String Alignment distance: like Levenshtein but counts a swap of two
 * adjacent characters as a single edit. This better reflects real typos such as
 * "ogranic" -> "organic", which plain Levenshtein would penalize as two edits.
 */
export function damerauLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const d: number[][] = Array.from({ length: al + 1 }, () =>
    new Array<number>(bl + 1).fill(0),
  );
  for (let i = 0; i <= al; i++) d[i][0] = i;
  for (let j = 0; j <= bl; j++) d[0][j] = j;

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[al][bl];
}

/** Similarity in [0,1]: 1 means identical, 0 means completely different. */
export function similarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  const distance = damerauLevenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

export interface WindowMatch {
  kind: MatchKind;
  similarity: number;
  matchedText: string;
}

/**
 * Compare a single title against the expected term.
 *
 * Order of precedence: exact > near (typo) > none.
 */
export function matchTitle(
  title: string,
  expectedTerm: string,
  options: MatchOptions = {},
): WindowMatch {
  const threshold = options.threshold ?? DEFAULT_FUZZY_THRESHOLD;
  const expected = normalize(expectedTerm);
  const expectedTokens = expected.length ? expected.split(" ") : [];
  const titleTokens = tokenize(title);

  if (expectedTokens.length === 0) {
    return { kind: "none", similarity: 0, matchedText: "" };
  }

  const n = expectedTokens.length;

  // Pass 1: exact match over same-length windows.
  if (titleTokens.length >= n) {
    for (let i = 0; i + n <= titleTokens.length; i++) {
      const windowTokens = titleTokens.slice(i, i + n);
      if (windowTokens.join(" ") === expected) {
        return { kind: "exact", similarity: 1, matchedText: windowTokens.join(" ") };
      }
    }
  }

  // Pass 2: fuzzy near-match over windows of size n-1, n, n+1.
  const sizes = Array.from(new Set([Math.max(1, n - 1), n, n + 1]));
  let best = 0;
  let bestText = "";
  for (const size of sizes) {
    if (titleTokens.length < size) {
      const candidate = titleTokens.join(" ");
      const sim = similarity(candidate, expected);
      if (sim > best) {
        best = sim;
        bestText = candidate;
      }
      continue;
    }
    for (let i = 0; i + size <= titleTokens.length; i++) {
      const candidate = titleTokens.slice(i, i + size).join(" ");
      const sim = similarity(candidate, expected);
      if (sim > best) {
        best = sim;
        bestText = candidate;
      }
    }
  }

  if (best >= threshold) {
    return { kind: "near", similarity: Number(best.toFixed(4)), matchedText: bestText };
  }
  return { kind: "none", similarity: Number(best.toFixed(4)), matchedText: bestText };
}

export interface ClassifyResult {
  matchedCount: number;
  nearMatches: NearMatch[];
  missing: ProductItem[];
}

/**
 * Classify a list of products against a single expected term, bucketing them
 * into exact / near (typo) / missing.
 */
export function classifyProducts(
  products: ProductItem[],
  expectedTerm: string,
  options: MatchOptions = {},
): ClassifyResult {
  let matchedCount = 0;
  const nearMatches: NearMatch[] = [];
  const missing: ProductItem[] = [];

  for (const product of products) {
    const m = matchTitle(product.title, expectedTerm, options);
    switch (m.kind) {
      case "exact":
        matchedCount++;
        break;
      case "near":
        nearMatches.push({
          ...product,
          similarity: m.similarity,
          matchedText: m.matchedText,
        });
        break;
      default:
        missing.push(product);
    }
  }

  nearMatches.sort((a, b) => b.similarity - a.similarity);

  return { matchedCount, nearMatches, missing };
}
