import { NextResponse } from "next/server";
import { classifyProducts, matchTitle } from "@/lib/matching";
import { checkRequestSchema } from "@/lib/schema";
import { ScrapeError, scrapeCollection } from "@/lib/scraper";
import type { CheckResult, TermResult } from "@/lib/types";

// Scraping with a headless browser can take a while; allow up to 60s.
export const maxDuration = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const start = Date.now();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = checkRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const { collectionUrl, expectedTerms, threshold } = parsed.data;

  try {
    const { products, source } = await scrapeCollection(collectionUrl);

    const terms: TermResult[] = expectedTerms.map((term) => {
      const { matchedCount, nearMatches, missing } = classifyProducts(
        products,
        term,
        { threshold },
      );
      return { term, matchedCount, nearMatches, missing };
    });

    // A title is "clean" only when every term matches exactly.
    let cleanCount = 0;
    for (const product of products) {
      const allExact = expectedTerms.every(
        (term) => matchTitle(product.title, term, { threshold }).kind === "exact",
      );
      if (allExact) cleanCount++;
    }

    const result: CheckResult = {
      collectionUrl,
      expectedTerms,
      totalProducts: products.length,
      cleanCount,
      issueCount: products.length - cleanCount,
      terms,
      source,
      durationMs: Date.now() - start,
      checkedAt: Date.now(),
    };

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ScrapeError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    return NextResponse.json(
      { error: "Something went wrong while checking the collection." },
      { status: 500 },
    );
  }
}
