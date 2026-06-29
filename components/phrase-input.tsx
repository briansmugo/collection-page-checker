"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhraseInputProps {
  phrases: string[];
  onChange: (phrases: string[]) => void;
  disabled?: boolean;
  id?: string;
}

/**
 * A tag-style input: type a word or phrase, press Enter or comma to commit it
 * as a removable chip. Backspace on an empty field removes the last chip.
 */
export function PhraseInput({
  phrases,
  onChange,
  disabled,
  id,
}: PhraseInputProps) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    const exists = phrases.some((p) => p.toLowerCase() === value.toLowerCase());
    if (!exists) onChange([...phrases, value]);
    setDraft("");
  };

  const remove = (index: number) => {
    onChange(phrases.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && draft === "" && phrases.length > 0) {
      remove(phrases.length - 1);
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={cn(
        "flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-[calc(var(--radius)-2px)] border bg-card px-2 py-1.5 text-sm transition-all",
        focused
          ? "border-ring/60 ring-2 ring-ring/15"
          : "border-input hover:border-input/80",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <AnimatePresence initial={false}>
        {phrases.map((phrase, i) => (
          <motion.span
            key={phrase}
            layout
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            className="inline-flex items-center gap-1 rounded-full bg-secondary py-1 pl-2.5 pr-1 text-xs font-medium text-secondary-foreground"
          >
            {phrase}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(i);
              }}
              className="flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
              aria-label={`Remove ${phrase}`}
            >
              <X className="size-3" />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>

      <input
        ref={inputRef}
        id={id}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit(draft);
        }}
        placeholder={phrases.length === 0 ? "Type a word, then press Enter" : ""}
        className="h-7 min-w-[8rem] flex-1 bg-transparent px-1.5 outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
