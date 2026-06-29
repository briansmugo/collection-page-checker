import { z } from "zod";

/** Request body for POST /api/check. */
export const checkRequestSchema = z.object({
  collectionUrl: z
    .string()
    .trim()
    .min(1, "Collection URL is required.")
    .url("Enter a valid URL (including https://).")
    .refine(
      (value) => /\/collections\//i.test(value),
      "URL must point to a Shopify collection (…/collections/<name>).",
    ),
  /** One or more words/phrases every product title should contain. */
  expectedTerms: z
    .array(z.string().trim().min(1).max(120))
    .min(1, "Add at least one word or phrase.")
    .max(12, "That's a lot of phrases — keep it to 12 or fewer.")
    .transform((terms) => {
      // De-duplicate case-insensitively while preserving the first spelling.
      const seen = new Set<string>();
      const out: string[] = [];
      for (const term of terms) {
        const key = term.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          out.push(term);
        }
      }
      return out;
    }),
  /** Optional override for the fuzzy threshold (0..1). */
  threshold: z.number().min(0).max(1).optional(),
});

export type CheckRequest = z.infer<typeof checkRequestSchema>;
