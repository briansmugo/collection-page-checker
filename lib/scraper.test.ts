import { describe, expect, it } from "vitest";
import { dedupeProducts, parseCollectionUrl, ScrapeError } from "./scraper";
import type { ProductItem } from "./types";

const p = (title: string, url: string | null = null): ProductItem => ({
  title,
  url,
});

describe("parseCollectionUrl", () => {
  it("extracts origin and handle, ignoring query params", () => {
    const r = parseCollectionUrl(
      "https://store.com/collections/new-arrivals?sort=best",
    );
    expect(r.origin).toBe("https://store.com");
    expect(r.handle).toBe("new-arrivals");
  });
  it("handles trailing path segments", () => {
    const r = parseCollectionUrl(
      "https://store.com/collections/my-collection/products",
    );
    expect(r.handle).toBe("my-collection");
  });
  it("throws on a non-collection URL", () => {
    expect(() => parseCollectionUrl("https://store.com/products/x")).toThrow(
      ScrapeError,
    );
  });
  it("throws on an invalid URL", () => {
    expect(() => parseCollectionUrl("not a url")).toThrow(ScrapeError);
  });
  it("throws on a non-http protocol", () => {
    expect(() => parseCollectionUrl("ftp://store.com/collections/x")).toThrow(
      ScrapeError,
    );
  });
});

describe("dedupeProducts", () => {
  it("removes duplicate titles while preserving order and casing", () => {
    const out = dedupeProducts([
      p("Ring", "/a"),
      p("ring", "/b"),
      p("Ring", "/c"),
      p("  Necklace  ", "/d"),
    ]);
    expect(out.map((o) => o.title)).toEqual(["Ring", "ring", "Necklace"]);
  });

  it("fills a missing URL from a later duplicate", () => {
    const out = dedupeProducts([p("Ring", null), p("Ring", "/products/ring")]);
    expect(out).toHaveLength(1);
    expect(out[0].url).toBe("/products/ring");
  });

  it("drops empty/whitespace-only titles", () => {
    expect(dedupeProducts([p(""), p("  "), p("Ring", "/r")])).toEqual([
      { title: "Ring", url: "/r" },
    ]);
  });
});
