# Collection Page Checker

A small, fast internal tool that audits a **Shopify collection page** for product
title consistency. Give it a collection URL and one or more words every product
should contain (e.g. `Organic`, `Cotton`), and it will:

- fetch every product title in the collection
- for each word/phrase, count how many titles contain it vs how many don't
- list the titles that are missing it
- flag **likely spelling mistakes** (e.g. `Ogranic` → `Organic`)
- present everything in a calm, closeable side panel
- export a polished **PDF report** and a **shareable link** for the issues

## How it works

1. **Fast path — Shopify JSON.** Shopify exposes a public
   `/collections/<handle>/products.json` endpoint. We paginate it (250/page) and
   read the canonical product titles. This is the default and usually takes well
   under a second.
2. **Fallback — Playwright.** If the JSON endpoint is unavailable (disabled,
   blocked, or non-standard storefront), a headless Chromium renders the page,
   scrolls to trigger lazy-loaded product cards, and reads titles from the DOM
   and any embedded JSON-LD.

All fetching happens **server-side** (the `/api/check` route), so collection
pages that block client-side requests still work.

### Matching logic

Titles and the expected term are normalized (lowercase, punctuation stripped,
whitespace collapsed). Each title is then classified, in order of precedence:

- **exact** — a token window equals the expected word/phrase
- **near** — best fuzzy similarity ≥ threshold (likely a typo)
- **none** — no meaningful match

Fuzzy similarity uses a transposition-aware edit distance (Damerau /
optimal-string-alignment), so common slips like `Ogranic` → `Organic` are caught.
The threshold defaults to `0.8` and lives in `lib/matching.ts`
(`DEFAULT_FUZZY_THRESHOLD`); it can also be overridden per request via the
optional `threshold` field on the API.

Each scraped product keeps its **product-page URL**, so issue lists link
straight to the offending product, and copy/CSV exports include the links.

### Reports & sharing

Every result can be turned into a standalone report at `/report?d=<token>`. The
full result is encoded (UTF-8 → base64url) into the link itself, so a report is
**self-contained** — no database, openable on any device. From the results panel:

- **Download PDF** opens the report with the browser's print dialog (the page has
  a dedicated print stylesheet for clean, vector PDFs).
- **Copy link** copies the shareable report URL.

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Playwright ·
Zod · Framer Motion · Vitest

## Getting started

> Requires **Node.js 18.18+** (Node 20+ recommended).

```bash
# 1. Install dependencies (also downloads the Chromium browser for the fallback)
npm install

# If the browser wasn't installed automatically, run:
npx playwright install chromium

# 2. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), paste a collection URL, add
the words each title should include (press Enter after each), then hit
**Run check**.

### Example

- **Collection URL:** `https://store.com/collections/new-arrivals`
- **Expected words:** `Organic`, `Cotton`

Each word is checked independently, and a title is counted as "clean" only when
it contains every word you entered.

## Scripts

| Script           | Description                          |
| ---------------- | ------------------------------------ |
| `npm run dev`    | Start the dev server                 |
| `npm run build`  | Production build                     |
| `npm run start`  | Run the production build             |
| `npm run lint`   | Lint                                 |
| `npm test`       | Run unit tests (Vitest, once)        |
| `npm run test:watch` | Run unit tests in watch mode     |

## Project structure

```
app/
  api/check/route.ts     # POST endpoint: validate → scrape → classify
  page.tsx               # Single-page UI (check form + results panel)
  report/page.tsx        # Standalone, printable, shareable report
  layout.tsx, globals.css
lib/
  scraper.ts             # Shopify JSON + Playwright scraping (+ tests)
  matching.ts            # Normalization, edit-distance, classification (+ tests)
  schema.ts              # Zod request validation
  types.ts               # Shared TypeScript types
  share.ts               # base64url encode/decode + report URL builder
  csv.ts                 # CSV / TSV builders + file download helpers
components/
  check-form.tsx         # URL field + multi-phrase tag input
  phrase-input.tsx       # tag-style input for multiple words/phrases
  results-panel.tsx      # sliding side panel: overview, per-term, editor, report actions
  product-link.tsx       # subtle title → product-page link
  near-matches.tsx       # likely-typo list for a term
  unmatched-table.tsx    # missing-title list + copy / CSV export
  animated-number.tsx    # spring count-up
  ui/                    # shadcn/ui primitives
```

## API

`POST /api/check`

```jsonc
// request
{
  "collectionUrl": "https://…/collections/…",
  "expectedTerms": ["Organic", "Cotton"],
  "threshold": 0.8 // optional
}

// response
{
  "collectionUrl": "string",
  "expectedTerms": ["string"],
  "totalProducts": 0,
  "cleanCount": 0,  // titles where every term matched exactly
  "issueCount": 0,  // titles missing at least one term
  "terms": [
    {
      "term": "string",
      "matchedCount": 0,
      "nearMatches": [
        { "title": "string", "url": "string|null", "similarity": 0.92, "matchedText": "string" }
      ],
      "missing": [{ "title": "string", "url": "string|null" }]
    }
  ],
  "source": "shopify-json | playwright",
  "durationMs": 0,
  "checkedAt": 0    // epoch ms
}
```

## Notes & limitations

- Copy-to-clipboard and CSV export work per term, covering that term's
  **missing-title** list.
- The Playwright fallback supports common Shopify themes; very custom
  storefronts may need extra selectors in `lib/scraper.ts`.
- Reports encode their data into the URL, so very large collections produce long links.
- Designed for **single-collection** checks — simple, fast, and maintainable.
