"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckForm, type CheckFormValues } from "@/components/check-form";
import { ResultsPanel, type PanelQuery } from "@/components/results-panel";
import type { CheckResult } from "@/lib/types";

type Status = "loading" | "error" | "done";

export default function Home() {
  const [values, setValues] = useState<CheckFormValues>({
    collectionUrl: "",
    phrases: [],
  });
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("done");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [query, setQuery] = useState<PanelQuery>({
    collectionUrl: "",
    phrases: [],
  });

  async function runCheck(next: PanelQuery) {
    if (!next.collectionUrl.trim()) {
      toast.error("Add a collection link first.");
      return;
    }
    if (next.phrases.length === 0) {
      toast.error("Add at least one word or phrase.");
      return;
    }

    setQuery(next);
    setValues({ collectionUrl: next.collectionUrl, phrases: next.phrases });
    setOpen(true);
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionUrl: next.collectionUrl,
          expectedTerms: next.phrases,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setStatus("error");
        return;
      }

      setResult(data as CheckResult);
      setStatus("done");
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-grain">
      <header className="flex items-center px-5 py-4 sm:px-8">
        <div className="inline-flex items-center gap-2 text-sm font-medium">
          <span className="flex size-6 items-center justify-center rounded-md bg-foreground text-[0.7rem] font-semibold text-background">
            C
          </span>
          Collection Page Checker
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-5 pb-20">
        <div className="w-full max-w-xl">
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-pretty text-[2rem] font-semibold leading-[1.1] tracking-tight sm:text-[2.6rem]">
              Audit your collection product titles in seconds.
            </h1>
            <p className="mt-3 max-w-md text-pretty text-[0.95rem] leading-relaxed text-muted-foreground">
              Paste a Shopify collection and the words each title should carry.
              Collection Page Checker flags what&apos;s missing and quietly catches the typos.
            </p>
          </motion.div>

          <CheckForm
            values={values}
            onChange={setValues}
            onSubmit={() => runCheck(values)}
            loading={status === "loading" && open}
          />

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Reads the fast Shopify data first, falls back to a real browser only
            when needed.
          </p>
        </div>
      </div>

      <ResultsPanel
        open={open}
        status={status}
        result={result}
        error={error}
        query={query}
        onClose={() => setOpen(false)}
        onRerun={runCheck}
      />
    </main>
  );
}
