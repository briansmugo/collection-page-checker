"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Check,
  FileDown,
  Gauge,
  Link2,
  Loader2,
  Pencil,
  Search,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AnimatedNumber } from "@/components/animated-number";
import { NearMatches } from "@/components/near-matches";
import { UnmatchedList } from "@/components/unmatched-table";
import { PhraseInput } from "@/components/phrase-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { buildReportUrl } from "@/lib/share";
import { PanelTopBar, SidePanel } from "@/components/side-panel";
import type { CheckResult } from "@/lib/types";

type Status = "loading" | "error" | "done";

export interface PanelQuery {
  collectionUrl: string;
  phrases: string[];
}

interface ResultsPanelProps {
  open: boolean;
  status: Status;
  result: CheckResult | null;
  error: string | null;
  query: PanelQuery;
  onClose: () => void;
  onRerun: (query: PanelQuery) => void;
}

export function ResultsPanel({
  open,
  status,
  result,
  error,
  query,
  onClose,
  onRerun,
}: ResultsPanelProps) {
  const [activeTerm, setActiveTerm] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draftUrl, setDraftUrl] = useState(query.collectionUrl);
  const [draftPhrases, setDraftPhrases] = useState<string[]>(query.phrases);

  // Fresh result -> reset the active term and close the editor.
  useEffect(() => {
    setActiveTerm(0);
    setEditing(false);
  }, [result]);

  const openEditor = () => {
    setDraftUrl(query.collectionUrl);
    setDraftPhrases(query.phrases);
    setEditing(true);
  };

  const runDraft = () => {
    if (!draftUrl.trim() || draftPhrases.length === 0) return;
    onRerun({ collectionUrl: draftUrl, phrases: draftPhrases });
  };

  const term = result?.terms[activeTerm];

  return (
    <SidePanel open={open} onClose={onClose}>
      <PanelTopBar onClose={onClose}>
        <PanelHeader result={result} status={status} />
      </PanelTopBar>

      {/* Subtle, intuitive query bar that opens the editor */}
      {status !== "error" && !editing && (
        <QueryBar query={query} onEdit={openEditor} />
      )}

      <EditorDrawer
        open={editing}
        url={draftUrl}
        phrases={draftPhrases}
        loading={status === "loading"}
        onUrl={setDraftUrl}
        onPhrases={setDraftPhrases}
        onCancel={() => setEditing(false)}
        onRun={runDraft}
      />

      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
        {status === "loading" && <PanelSkeleton />}

        {status === "error" && (
          <div className="mt-2 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">
                Couldn&apos;t read this collection
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{error}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={openEditor}
              >
                <Pencil />
                Edit and retry
              </Button>
            </div>
          </div>
        )}

        {status === "done" && result && term && (
          <div className="space-y-7">
            <Overview result={result} />

            {result.terms.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {result.terms.map((t, i) => {
                  const issues = t.missing.length + t.nearMatches.length;
                  return (
                    <button
                      key={t.term}
                      onClick={() => setActiveTerm(i)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        i === activeTerm
                          ? "border-transparent bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t.term}
                      {issues > 0 && (
                        <span
                          className={cn(
                            "tabular-nums",
                            i === activeTerm
                              ? "text-primary-foreground/70"
                              : "text-destructive",
                          )}
                        >
                          {issues}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <TermProgress
              term={term.term}
              matched={term.matchedCount}
              total={result.totalProducts}
            />

            <NearMatches term={term.term} matches={term.nearMatches} />
            <UnmatchedList term={term.term} items={term.missing} />
          </div>
        )}
      </div>

      {status === "done" && result && <PanelFooter result={result} />}
    </SidePanel>
  );
}

function PanelHeader({
  result,
  status,
}: {
  result: CheckResult | null;
  status: Status;
}) {
  let host = "Collection check";
  if (result) {
    try {
      host = new URL(result.collectionUrl).hostname.replace(/^www\./, "");
    } catch {
      /* keep default */
    }
  }

  return (
    <div>
      <p className="truncate text-sm font-medium">{host}</p>
        {status === "done" && result ? (
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Zap className="size-3" />
              {result.source === "shopify-json" ? "Shopify data" : "Rendered"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Gauge className="size-3" />
              {(result.durationMs / 1000).toFixed(1)}s
            </span>
          </div>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            {status === "loading" ? "Reading product titles…" : "Results"}
          </p>
        )}
    </div>
  );
}

function QueryBar({
  query,
  onEdit,
}: {
  query: PanelQuery;
  onEdit: () => void;
}) {
  const summary = query.phrases.join(", ");
  return (
    <button
      onClick={onEdit}
      className="group flex w-full items-center gap-2 border-b px-5 py-2.5 text-left transition-colors hover:bg-muted/40 sm:px-6"
    >
      <Search className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate text-xs text-muted-foreground">
        Checking{" "}
        <span className="font-medium text-foreground">
          {query.phrases.length}{" "}
          {query.phrases.length === 1 ? "word" : "words"}
        </span>
        {summary && <span className="text-muted-foreground"> · {summary}</span>}
      </span>
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        <Pencil className="size-3" />
        Edit
      </span>
    </button>
  );
}

function EditorDrawer({
  open,
  url,
  phrases,
  loading,
  onUrl,
  onPhrases,
  onCancel,
  onRun,
}: {
  open: boolean;
  url: string;
  phrases: string[];
  loading: boolean;
  onUrl: (v: string) => void;
  onPhrases: (v: string[]) => void;
  onCancel: () => void;
  onRun: () => void;
}) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 32 }}
          className="overflow-hidden border-b bg-muted/30"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onRun();
            }}
            className="space-y-3 px-5 py-4 sm:px-6"
          >
            <div className="space-y-1.5">
              <Label htmlFor="edit-url" className="text-xs text-foreground/70">
                Collection link
              </Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="edit-url"
                  type="url"
                  value={url}
                  onChange={(e) => onUrl(e.target.value)}
                  disabled={loading}
                  className="h-10 pl-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="edit-phrases"
                className="text-xs text-foreground/70"
              >
                Words every title must contain
              </Label>
              <PhraseInput
                id="edit-phrases"
                phrases={phrases}
                onChange={onPhrases}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-0.5">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading || !url.trim() || phrases.length === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Checking…
                  </>
                ) : (
                  <>
                    Run again
                    <ArrowRight />
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PanelFooter({ result }: { result: CheckResult }) {
  const [copied, setCopied] = useState(false);

  const downloadPdf = () => {
    window.open(buildReportUrl(result, true), "_blank", "noopener,noreferrer");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(buildReportUrl(result, false));
      setCopied(true);
      toast.success("Report link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't access the clipboard");
    }
  };

  return (
    <div className="flex items-center gap-2 border-t bg-card/80 px-5 py-3.5 backdrop-blur sm:px-7">
      <Button className="flex-1" onClick={downloadPdf}>
        <FileDown />
        Download PDF
      </Button>
      <Button variant="outline" onClick={copyLink}>
        {copied ? <Check className="text-success" /> : <Link2 />}
        Copy link
      </Button>
    </div>
  );
}

function Overview({ result }: { result: CheckResult }) {
  const stats = [
    { label: "Products", value: result.totalProducts, tone: "text-foreground" },
    { label: "Clean", value: result.cleanCount, tone: "text-success" },
    { label: "Issues", value: result.issueCount, tone: "text-destructive" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: i * 0.06,
            type: "spring",
            stiffness: 300,
            damping: 28,
          }}
          className="rounded-xl border bg-background/60 px-3.5 py-3"
        >
          <div
            className={cn(
              "text-2xl font-semibold tabular-nums tracking-tight",
              s.tone,
            )}
          >
            <AnimatedNumber value={s.value} />
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

function TermProgress({
  term,
  matched,
  total,
}: {
  term: string;
  matched: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((matched / total) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm">
          <span className="font-medium tabular-nums">{matched}</span>
          <span className="text-muted-foreground"> of {total} contain </span>
          <span className="font-medium">&ldquo;{term}&rdquo;</span>
        </p>
        <span className="text-xs text-muted-foreground tabular-nums">
          {pct}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-success"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 24 }}
        />
      </div>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-7">
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-background/60 px-3.5 py-3">
            <div className="h-7 w-10 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="h-1.5 w-full animate-pulse rounded-full bg-muted" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 w-full animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
