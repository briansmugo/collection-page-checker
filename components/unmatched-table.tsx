"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProductLink } from "@/components/product-link";
import type { ProductItem } from "@/lib/types";

function toCsv(rows: ProductItem[]): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = "Title,URL";
  const lines = rows.map((r) => `${escape(r.title)},${escape(r.url ?? "")}`);
  return [header, ...lines].join("\n");
}

export function UnmatchedList({
  term,
  items,
}: {
  term: string;
  items: ProductItem[];
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = items
      .map((i) => (i.url ? `${i.title} — ${i.url}` : i.title))
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`Copied ${items.length} titles`);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't access the clipboard");
    }
  };

  const handleExport = () => {
    const blob = new Blob([toCsv(items)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `missing-${term.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-10 text-center">
        <div className="flex size-9 items-center justify-center rounded-full bg-success/10">
          <Check className="size-4 text-success" />
        </div>
        <p className="text-sm text-muted-foreground">
          Every title includes &ldquo;{term}&rdquo;.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-destructive" />
          <h3 className="text-sm font-medium">Missing the word</h3>
          <span className="text-xs text-muted-foreground tabular-nums">
            {items.length}
          </span>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={handleCopy}>
            {copied ? <Check className="text-success" /> : <Copy />}
            Copy
          </Button>
          <Button size="sm" variant="ghost" onClick={handleExport}>
            <Download />
            CSV
          </Button>
        </div>
      </div>

      <ul className="overflow-hidden rounded-xl border">
        {items.map((item, i) => (
          <motion.li
            key={`${item.title}-${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.3 }}
            className="flex items-baseline gap-3 border-b px-3.5 py-2.5 last:border-b-0 hover:bg-muted/50"
          >
            <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">
              {i + 1}
            </span>
            <ProductLink title={item.title} url={item.url} />
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
