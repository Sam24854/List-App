/*
 * ConfirmDialog — a reusable "Are you sure?" modal.
 *
 * Used by all three delete actions (single, selected, all). Centralizing the
 * confirmation pattern in one component means every destructive action looks
 * and behaves identically.
 *
 * Implementation notes:
 * - Dismissible via Escape key, clicking the backdrop, or the Cancel button.
 * - The confirm button is auto-focused so keyboard users can hit Enter.
 * - Prevents body scroll while open (avoids the page scrolling behind the modal
 *   on mobile when the user reaches the bottom of a long list).
 */

"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive (red). Defaults to true. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll while dialog is open.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Auto-focus confirm button + handle Escape key.
  useEffect(() => {
    if (!open) return;
    confirmBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    // Fixed full-viewport overlay. The outer div is the backdrop (clickable
    // to dismiss). The inner div stops propagation so clicks inside the card
    // don't dismiss the dialog.
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="mb-2 text-lg font-semibold text-fg">
          {title}
        </h2>
        <p className="mb-6 text-sm text-muted">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] rounded-md border border-border bg-surface-2 px-4 text-sm font-medium text-fg hover:bg-border"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className={cn(
              "min-h-[44px] rounded-md px-4 text-sm font-medium",
              destructive
                ? "bg-danger text-danger-fg hover:opacity-90"
                : "bg-accent text-accent-fg hover:bg-accent-hover",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
