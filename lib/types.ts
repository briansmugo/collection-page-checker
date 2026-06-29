/** Shared types for the Collection Page Cleaner. */

/** How a single title was classified against the expected term. */
export type MatchKind = "exact" | "near" | "none";

/** A product as scraped from the collection: its title and (when known) link. */
export interface ProductItem {
  /** Original, untouched title text as found on the page. */
  title: string;
  /** Absolute URL to the product page, or null if it couldn't be resolved. */
  url: string | null;
}

/** A title that looks like it contains a misspelling of the expected term. */
export interface NearMatch extends ProductItem {
  /** 0..1 similarity of the closest token-window to the expected term. */
  similarity: number;
  /** The actual substring in the title that triggered the near match. */
  matchedText: string;
}

/** The data source that produced the titles. */
export type ScrapeSource = "shopify-json" | "playwright";

/** Results of checking the collection against a single expected term. */
export interface TermResult {
  term: string;
  /** Titles containing the exact term. */
  matchedCount: number;
  /** Likely misspellings (treated as issues). */
  nearMatches: NearMatch[];
  /** Titles with no recognizable match (treated as issues). */
  missing: ProductItem[];
}

/** The full payload returned by the backend API. */
export interface CheckResult {
  collectionUrl: string;
  expectedTerms: string[];
  totalProducts: number;
  /** Titles where every term matched exactly. */
  cleanCount: number;
  /** Titles missing at least one term. */
  issueCount: number;
  /** Per-term breakdown, in the order the terms were provided. */
  terms: TermResult[];
  /** Which data source actually produced the titles. */
  source: ScrapeSource;
  /** Wall-clock time the check took, in milliseconds. */
  durationMs: number;
  /** Epoch milliseconds when the check completed. */
  checkedAt: number;
}

/** Raw output of the scraper layer before matching is applied. */
export interface ScrapeResult {
  products: ProductItem[];
  source: ScrapeSource;
}
