"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ProductLink } from "@/components/product-link";
import type { NearMatch } from "@/lib/types";

export function NearMatches({
  term,
  matches,
}: {
  term: string;
  matches: NearMatch[];
}) {
  if (matches.length === 0) return null;

  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-warning" />
        <h3 className="text-sm font-medium">Likely misspellings</h3>
        <span className="text-xs text-muted-foreground">
          close to &ldquo;{term}&rdquo;
        </span>
      </div>

      <div className="space-y-1.5">
        {matches.map((match, i) => (
          <motion.div
            key={`${match.title}-${i}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: Math.min(i * 0.03, 0.3),
              type: "spring",
              stiffness: 320,
              damping: 30,
            }}
            className="flex items-center justify-between gap-3 rounded-xl border border-warning/25 bg-warning/[0.05] px-3.5 py-2.5"
          >
            <div className="min-w-0">
              <ProductLink title={match.title} url={match.url} />
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                found{" "}
                <span className="font-medium text-warning">
                  {match.matchedText}
                </span>
              </p>
            </div>
            <Badge variant="warning" className="shrink-0 tabular-nums">
              {Math.round(match.similarity * 100)}%
            </Badge>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
