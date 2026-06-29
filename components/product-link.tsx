"use client";

import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Renders a product title. When a URL is available it becomes a subtle link
 * that opens the product page in a new tab; otherwise it renders as plain text.
 */
export function ProductLink({
  title,
  url,
  className,
}: {
  title: string;
  url: string | null;
  className?: string;
}) {
  if (!url) {
    return <span className={cn("text-sm", className)}>{title}</span>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "group/link inline-flex items-baseline gap-1 text-sm decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-primary hover:underline",
        className,
      )}
    >
      <span>{title}</span>
      <ArrowUpRight className="size-3 shrink-0 translate-y-0.5 text-muted-foreground/50 transition-all group-hover/link:text-primary" />
    </a>
  );
}
