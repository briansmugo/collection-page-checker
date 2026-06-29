"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared max width for all right-side panels. */
export const PANEL_WIDTH =
  "w-full max-w-[min(44rem,calc(100vw-1rem))] sm:max-w-[min(44rem,calc(100vw-2rem))]";

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  zIndex?: number;
  children: React.ReactNode;
  className?: string;
}

export function SidePanel({
  open,
  onClose,
  zIndex = 50,
  children,
  className,
}: SidePanelProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0" style={{ zIndex }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="absolute inset-0 bg-foreground/20 backdrop-blur-[3px]"
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            className={cn(
              "absolute inset-y-0 right-0 flex flex-col bg-card shadow-panel",
              PANEL_WIDTH,
              className,
            )}
          >
            {children}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

export function PanelCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label="Close"
    >
      <X className="size-4" />
    </button>
  );
}

/** Top bar: primary context on the left, close on the right. */
export function PanelTopBar({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3 border-b px-5 py-3.5 sm:px-7">
      <div className="min-w-0 flex-1">{children}</div>
      <PanelCloseButton onClose={onClose} />
    </header>
  );
}
