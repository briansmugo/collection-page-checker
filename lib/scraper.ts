import type { ProductItem, ScrapeResult } from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** Thrown when we cannot retrieve any titles from the collection. */
export class ScrapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScrapeError";
  }
}

export interface ParsedCollectionUrl {
  origin: string;
  handle: string;
}

/**
 * Extract the store origin and collection handle from a Shopify collection URL.
 */
export function parseCollectionUrl(rawUrl: string): ParsedCollectionUrl {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ScrapeError("That doesn't look like a valid URL.");
  }
  if (!/^https?:$/.test(url.protocol)) {
    throw new ScrapeError("URL must start with http:// or https://");
  }

  const match = url.pathname.match(/\/collections\/([^/]+)/i);
  if (!match) {
    throw new ScrapeError(
      "URL must point to a Shopify collection (…/collections/<name>).",
    );
  }
  return { origin: url.origin, handle: decodeURIComponent(match[1]) };
}

interface ShopifyProductsResponse {
  products?: Array<{ title?: string; handle?: string }>;
}

/**
 * Fastest path: Shopify exposes a public JSON endpoint for every collection at
 * /collections/<handle>/products.json. We paginate (250/page) until exhausted.
 * Returns null when the endpoint is unavailable so the caller can fall back.
 */
export async function fetchViaShopifyJson(
  origin: string,
  handle: string,
  signal?: AbortSignal,
): Promise<ProductItem[] | null> {
  const products: ProductItem[] = [];
  const maxPages = 20; // 250 * 20 = 5000 products, plenty for one collection.

  for (let page = 1; page <= maxPages; page++) {
    const endpoint = `${origin}/collections/${encodeURIComponent(
      handle,
    )}/products.json?limit=250&page=${page}`;

    let res: Response;
    try {
      res = await fetch(endpoint, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal,
      });
    } catch {
      return page === 1 ? null : products;
    }

    if (!res.ok) return page === 1 ? null : products;

    let data: ShopifyProductsResponse;
    try {
      data = (await res.json()) as ShopifyProductsResponse;
    } catch {
      return page === 1 ? null : products;
    }

    const batch = data.products ?? [];
    if (batch.length === 0) break;

    for (const product of batch) {
      if (!product.title) continue;
      products.push({
        title: product.title.trim(),
        url: product.handle ? `${origin}/products/${product.handle}` : null,
      });
    }

    if (batch.length < 250) break; // last page reached
  }

  return products.length > 0 ? products : null;
}

/**
 * Fallback path: render the collection with a headless browser, scroll to
 * trigger lazy-loaded product cards, then read titles + links from the DOM and
 * any embedded JSON-LD. Used only when the JSON endpoint fails.
 */
export async function fetchViaPlaywright(
  rawUrl: string,
): Promise<ProductItem[]> {
  const { chromium } = await import("playwright");

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ userAgent: USER_AGENT });
    const page = await context.newPage();

    await page.goto(rawUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });

    // Trigger lazy loading by scrolling until the page height stops growing.
    await page.evaluate(async () => {
      const sleep = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));
      let lastHeight = 0;
      for (let i = 0; i < 30; i++) {
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(400);
        const height = document.body.scrollHeight;
        if (height === lastHeight) break;
        lastHeight = height;
      }
      window.scrollTo(0, 0);
    });

    const items = await page.evaluate(() => {
      const clean = (value: string | null | undefined) =>
        value?.replace(/\s+/g, " ").trim() || "";

      const results: Array<{ title: string; url: string | null }> = [];
      const seen = new Set<string>();
      const push = (title: string, url: string | null) => {
        if (!title) return;
        const key = url || title;
        if (seen.has(key)) return;
        seen.add(key);
        results.push({ title, url });
      };

      const titleSelectors = [
        ".product-card__title",
        ".card__heading",
        ".card-information__text",
        ".product-item__title",
        ".grid-product__title",
        ".product-title",
        "[data-product-title]",
        "a.full-unstyled-link",
      ];

      for (const selector of titleSelectors) {
        document.querySelectorAll(selector).forEach((el) => {
          const title = clean(el.textContent);
          if (!title) return;
          const anchor =
            (el.closest('a[href*="/products/"]') as HTMLAnchorElement | null) ??
            (el
              .closest("li, .card, .grid__item, .product-card, .product-item")
              ?.querySelector('a[href*="/products/"]') as
              | HTMLAnchorElement
              | null) ??
            null;
          push(title, anchor ? anchor.href : null);
        });
      }

      // Any remaining product links not already captured.
      document
        .querySelectorAll('a[href*="/products/"]')
        .forEach((node) => {
          const anchor = node as HTMLAnchorElement;
          const title =
            clean(anchor.textContent) ||
            clean(anchor.getAttribute("aria-label")) ||
            clean(anchor.querySelector("img")?.getAttribute("alt"));
          if (title) push(title, anchor.href);
        });

      // JSON-LD structured data (ItemList / Product).
      document
        .querySelectorAll('script[type="application/ld+json"]')
        .forEach((script) => {
          try {
            const json = JSON.parse(script.textContent || "");
            const nodes = Array.isArray(json) ? json : [json];
            for (const entry of nodes) {
              if (entry?.["@type"] === "Product" && entry.name) {
                push(clean(entry.name), entry.url ?? null);
              }
              const list = entry?.itemListElement;
              if (Array.isArray(list)) {
                for (const item of list) {
                  const name = clean(item?.item?.name ?? item?.name);
                  const url = item?.item?.url ?? item?.url ?? null;
                  if (name) push(name, url);
                }
              }
            }
          } catch {
            /* ignore malformed JSON-LD */
          }
        });

      return results;
    });

    return items;
  } finally {
    await browser.close();
  }
}

/**
 * Scrape all products from a Shopify collection.
 * Tries the JSON endpoint first, then falls back to a headless browser.
 */
export async function scrapeCollection(rawUrl: string): Promise<ScrapeResult> {
  const { origin, handle } = parseCollectionUrl(rawUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  let jsonProducts: ProductItem[] | null = null;
  try {
    jsonProducts = await fetchViaShopifyJson(origin, handle, controller.signal);
  } catch {
    jsonProducts = null;
  } finally {
    clearTimeout(timeout);
  }

  if (jsonProducts && jsonProducts.length > 0) {
    return { products: dedupeProducts(jsonProducts), source: "shopify-json" };
  }

  let browserProducts: ProductItem[] = [];
  try {
    browserProducts = await fetchViaPlaywright(rawUrl);
  } catch (error) {
    throw new ScrapeError(
      "Couldn't read this collection. The store may be blocking automated " +
        "requests or the page failed to load. " +
        (error instanceof Error ? error.message : ""),
    );
  }

  if (browserProducts.length === 0) {
    throw new ScrapeError(
      "No product titles were found. The collection may be empty or use an " +
        "unsupported theme layout.",
    );
  }

  return { products: dedupeProducts(browserProducts), source: "playwright" };
}

/**
 * De-duplicate products by their trimmed title, preserving original casing and
 * keeping the first URL we find for each title.
 */
export function dedupeProducts(products: ProductItem[]): ProductItem[] {
  const map = new Map<string, ProductItem>();
  for (const product of products) {
    const title = product.title.trim();
    if (!title) continue;
    const existing = map.get(title);
    if (!existing) {
      map.set(title, { title, url: product.url ?? null });
    } else if (!existing.url && product.url) {
      existing.url = product.url;
    }
  }
  return Array.from(map.values());
}
