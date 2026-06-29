"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Download,
  FileWarning,
} from "lucide-react";
import { decodeResult } from "@/lib/share";
import { cn } from "@/lib/utils";
import type { CheckResult } from "@/lib/types";

export default function ReportPage() {
  return (
    <Suspense fallback={<ReportFallback message="Loading report…" />}>
      <ReportContent />
    </Suspense>
  );
}

function ReportContent() {
  const params = useSearchParams();
  const token = params.get("d");
  const shouldPrint = params.get("print") === "1";
  const [copied, setCopied] = useState(false);

  const result = useMemo(
    () => (token ? decodeResult(token) : null),
    [token],
  );

  useEffect(() => {
    if (result && shouldPrint) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [result, shouldPrint]);

  if (!result) {
    return (
      <ReportFallback message="This report link is invalid or has expired." />
    );
  }

  const host = safeHost(result.collectionUrl);
  const cleanPct =
    result.totalProducts === 0
      ? 0
      : Math.round((result.cleanCount / result.totalProducts) * 100);
  const checkedDate = new Date(result.checkedAt || Date.now());

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="print-page min-h-screen bg-muted/40">
      {/* Toolbar — hidden when printing */}
      <div className="no-print sticky top-0 z-10 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
            >
              {copied ? (
                <Check className="size-4 text-success" />
              ) : (
                <Copy className="size-4" />
              )}
              Copy link
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              <Download className="size-4" />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Report document */}
      <article className="mx-auto max-w-3xl px-6 py-10 print:px-0 print:py-0">
        <header className="flex items-start justify-between gap-6 border-b pb-6">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <span className="flex size-5 items-center justify-center rounded bg-foreground text-[0.6rem] font-semibold text-background">
                T
              </span>
              Title report
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{host}</h1>
            <a
              href={result.collectionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex max-w-md items-center gap-1 truncate text-sm text-muted-foreground hover:text-primary"
            >
              <span className="truncate">{result.collectionUrl}</span>
              <ArrowUpRight className="size-3 shrink-0" />
            </a>
          </div>
          <div className="shrink-0 text-right text-xs text-muted-foreground">
            <p>
              {checkedDate.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
            <p>
              {checkedDate.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="mt-1">
              via{" "}
              {result.source === "shopify-json" ? "Shopify data" : "rendered page"}
            </p>
          </div>
        </header>

        {/* Executive summary */}
        <section className="py-6">
          <p className="text-[0.95rem] leading-relaxed">
            <span className="font-semibold tabular-nums">
              {result.cleanCount}
            </span>{" "}
            of{" "}
            <span className="font-semibold tabular-nums">
              {result.totalProducts}
            </span>{" "}
            product titles match every required word.{" "}
            {result.issueCount > 0 ? (
              <span className="text-foreground">
                <span className="font-semibold tabular-nums">
                  {result.issueCount}
                </span>{" "}
                need attention.
              </span>
            ) : (
              <span className="text-success">Everything is on-brand.</span>
            )}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <Stat label="Products" value={result.totalProducts} />
            <Stat label="Clean" value={result.cleanCount} tone="success" />
            <Stat label="Issues" value={result.issueCount} tone="destructive" />
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>Collection health</span>
              <span className="tabular-nums">{cleanPct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-success"
                style={{ width: `${cleanPct}%` }}
              />
            </div>
          </div>
        </section>

        {/* Per-word breakdown table */}
        <section className="print-break-inside-avoid border-t py-6">
          <h2 className="mb-3 text-sm font-semibold">Required words</h2>
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Word</th>
                  <th className="px-4 py-2 text-right font-medium">Matched</th>
                  <th className="px-4 py-2 text-right font-medium">Typos</th>
                  <th className="px-4 py-2 text-right font-medium">Missing</th>
                </tr>
              </thead>
              <tbody>
                {result.terms.map((t) => (
                  <tr key={t.term} className="border-t">
                    <td className="px-4 py-2.5 font-medium">{t.term}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {t.matchedCount}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2.5 text-right tabular-nums",
                        t.nearMatches.length > 0 && "text-warning",
                      )}
                    >
                      {t.nearMatches.length}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2.5 text-right tabular-nums",
                        t.missing.length > 0 && "text-destructive",
                      )}
                    >
                      {t.missing.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Detailed issues per word */}
        {result.terms.map((t) => {
          const hasIssues = t.missing.length > 0 || t.nearMatches.length > 0;
          if (!hasIssues) return null;
          return (
            <section
              key={t.term}
              className="print-break-inside-avoid border-t py-6"
            >
              <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <FileWarning className="size-4 text-destructive" />
                &ldquo;{t.term}&rdquo;
              </h2>
              <p className="mb-4 text-xs text-muted-foreground">
                {t.missing.length} missing
                {t.nearMatches.length > 0 &&
                  ` · ${t.nearMatches.length} likely ${
                    t.nearMatches.length === 1 ? "typo" : "typos"
                  }`}
              </p>

              {t.nearMatches.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-warning">
                    Likely misspellings
                  </p>
                  <ol className="space-y-1.5">
                    {t.nearMatches.map((m, i) => (
                      <li
                        key={`${m.title}-${i}`}
                        className="flex items-baseline justify-between gap-3 text-sm"
                      >
                        <span className="flex items-baseline gap-2">
                          <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">
                            {i + 1}.
                          </span>
                          <ReportTitle title={m.title} url={m.url} />
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          found &ldquo;{m.matchedText}&rdquo; ·{" "}
                          {Math.round(m.similarity * 100)}%
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {t.missing.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-destructive">
                    Missing the word
                  </p>
                  <ol className="space-y-1.5">
                    {t.missing.map((m, i) => (
                      <li
                        key={`${m.title}-${i}`}
                        className="flex items-baseline gap-2 text-sm"
                      >
                        <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">
                          {i + 1}.
                        </span>
                        <ReportTitle title={m.title} url={m.url} />
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </section>
          );
        })}

        <footer className="mt-4 border-t pt-5 text-xs text-muted-foreground">
          Generated by Collection Page Checker · {result.totalProducts} titles scanned in{" "}
          {(result.durationMs / 1000).toFixed(1)}s
        </footer>
      </article>
    </div>
  );
}

function ReportTitle({ title, url }: { title: string; url: string | null }) {
  if (!url) return <span>{title}</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-baseline gap-1 hover:text-primary hover:underline"
    >
      <span>{title}</span>
      <ArrowUpRight className="size-3 shrink-0 translate-y-0.5 text-muted-foreground/60" />
    </a>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "destructive";
}) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <div
        className={cn(
          "text-2xl font-semibold tabular-nums tracking-tight",
          tone === "success" && "text-success",
          tone === "destructive" && "text-destructive",
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ReportFallback({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/40 px-6 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Link
        href="/"
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
      >
        <ArrowLeft className="size-4" />
        Back to Collection Page Checker
      </Link>
    </div>
  );
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Collection report";
  }
}
