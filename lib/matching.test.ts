import { describe, expect, it } from "vitest";
import {
  classifyProducts,
  levenshtein,
  matchTitle,
  normalize,
  similarity,
  tokenize,
} from "./matching";
import type { ProductItem } from "./types";

const p = (title: string, url: string | null = null): ProductItem => ({
  title,
  url,
});

describe("normalize", () => {
  it("lowercases, trims and collapses whitespace", () => {
    expect(normalize("  Hello   World  ")).toBe("hello world");
  });
  it("removes punctuation and turns it into a separator", () => {
    expect(normalize("Rose-Gold Ring!")).toBe("rose gold ring");
  });
  it("handles empty and symbol-only strings", () => {
    expect(normalize("")).toBe("");
    expect(normalize("---")).toBe("");
  });
});

describe("tokenize", () => {
  it("splits into word tokens", () => {
    expect(tokenize("Organic Cotton")).toEqual(["organic", "cotton"]);
  });
  it("returns [] for empty input", () => {
    expect(tokenize("  ")).toEqual([]);
  });
});

describe("levenshtein", () => {
  it("is 0 for identical strings", () => {
    expect(levenshtein("abc", "abc")).toBe(0);
  });
  it("counts single edits", () => {
    expect(levenshtein("organic", "ogranic")).toBe(2);
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
  it("handles empty strings", () => {
    expect(levenshtein("", "abc")).toBe(3);
  });
});

describe("similarity", () => {
  it("is 1 for identical strings", () => {
    expect(similarity("cotton", "cotton")).toBe(1);
  });
  it("is high for a single typo", () => {
    expect(similarity("organicc", "organic")).toBeGreaterThan(0.85);
  });
  it("is low for unrelated words", () => {
    expect(similarity("leather", "organic")).toBeLessThan(0.5);
  });
});

describe("matchTitle", () => {
  it("flags an exact single-word match", () => {
    const r = matchTitle("Organic Cotton Tee", "Organic");
    expect(r.kind).toBe("exact");
  });
  it("is case and punctuation insensitive", () => {
    expect(matchTitle("ORGANIC cotton!", "organic").kind).toBe("exact");
  });
  it("treats a plural/singular difference as a near match (no special-casing)", () => {
    // Plural/singular handling was removed; "wallets" vs "wallet" is now just a
    // close fuzzy match, not an accepted exact match.
    const plural = matchTitle("Leather Wallets Brown", "Wallet");
    expect(plural.kind).not.toBe("exact");
  });
  it("detects a likely typo as a near match", () => {
    const r = matchTitle("Ogranic Cotton Tee", "Organic");
    expect(r.kind).toBe("near");
    expect(r.similarity).toBeGreaterThan(0.8);
  });
  it("reports none for an unrelated title", () => {
    expect(matchTitle("Silk Scarf", "Organic").kind).toBe("none");
  });
  it("does not exact-match a substring of a longer word", () => {
    expect(matchTitle("Gold Earrings", "ring").kind).not.toBe("exact");
  });
  it("supports multi-word phrases", () => {
    expect(matchTitle("Organic Cotton Tee", "Organic Cotton").kind).toBe(
      "exact",
    );
    expect(matchTitle("Organic Linen Tee", "Organic Cotton").kind).toBe("none");
  });
  it("returns none when expected term is empty", () => {
    expect(matchTitle("Anything", "").kind).toBe("none");
  });
});

describe("classifyProducts", () => {
  const products = [
    p("Organic Cotton Tee", "/products/a"),
    p("organic linen shirt", "/products/b"),
    p("Ogranic Cotton Tee", "/products/c"), // typo
    p("Silk Scarf", "/products/e"), // none
  ];

  it("buckets products into exact / near / missing", () => {
    const r = classifyProducts(products, "Organic");
    expect(r.matchedCount).toBe(2);
    expect(r.nearMatches.map((n) => n.title)).toEqual(["Ogranic Cotton Tee"]);
    expect(r.missing.map((m) => m.title)).toEqual(["Silk Scarf"]);
  });

  it("preserves product URLs through classification", () => {
    const r = classifyProducts(products, "Organic");
    expect(r.missing[0].url).toBe("/products/e");
    expect(r.nearMatches[0].url).toBe("/products/c");
  });

  it("sorts near matches by descending similarity", () => {
    const r = classifyProducts(
      [p("Ogranic"), p("Orgnc"), p("Organic")],
      "Organic",
    );
    const sims = r.nearMatches.map((m) => m.similarity);
    expect([...sims]).toEqual([...sims].sort((a, b) => b - a));
  });

  it("handles an empty product list", () => {
    const r = classifyProducts([], "Organic");
    expect(r.matchedCount).toBe(0);
    expect(r.missing).toEqual([]);
  });
});
