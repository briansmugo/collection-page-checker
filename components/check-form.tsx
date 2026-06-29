"use client";

import { motion } from "framer-motion";
import { ArrowRight, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhraseInput } from "@/components/phrase-input";

export interface CheckFormValues {
  collectionUrl: string;
  phrases: string[];
}

interface CheckFormProps {
  values: CheckFormValues;
  onChange: (values: CheckFormValues) => void;
  onSubmit: () => void;
  loading: boolean;
}

const SUGGESTIONS = ["Organic", "Cotton", "Handmade"];

export function CheckForm({
  values,
  onChange,
  onSubmit,
  loading,
}: CheckFormProps) {
  const addSuggestion = (term: string) => {
    if (values.phrases.some((p) => p.toLowerCase() === term.toLowerCase())) {
      return;
    }
    onChange({ ...values, phrases: [...values.phrases, term] });
  };

  return (
    <motion.form
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="rounded-[var(--radius)] border bg-card p-5 shadow-soft sm:p-7"
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="collectionUrl" className="text-foreground/80">
            Collection link
          </Label>
          <div className="relative">
            <Link2 className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="collectionUrl"
              type="url"
              inputMode="url"
              placeholder="https://store.com/collections/new-arrivals"
              className="h-11 pl-10"
              value={values.collectionUrl}
              onChange={(e) =>
                onChange({ ...values, collectionUrl: e.target.value })
              }
              disabled={loading}
              autoFocus
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phrases" className="text-foreground/80">
            Words every title must contain
          </Label>
          <PhraseInput
            id="phrases"
            phrases={values.phrases}
            onChange={(phrases) => onChange({ ...values, phrases })}
            disabled={loading}
          />
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-xs text-muted-foreground">Try:</span>
            {SUGGESTIONS.map((term) => (
              <button
                key={term}
                type="button"
                disabled={loading}
                onClick={() => addSuggestion(term)}
                className="rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-50"
              >
                + {term}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          className="group w-full"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" />
              Reading collection…
            </>
          ) : (
            <>
              Run check
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
      </div>
    </motion.form>
  );
}
