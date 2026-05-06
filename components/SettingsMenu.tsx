/*
 * SettingsMenu — gear icon + dropdown panel.
 *
 * Holds the appearance controls (theme toggle + accent picker) so the top bar
 * doesn't get cluttered with multiple buttons.
 *
 * Implementation notes:
 *   - The panel is absolutely positioned relative to a wrapping <div> so it
 *     anchors under the gear button.
 *   - We close on (a) click outside the panel, (b) Escape key, (c) clicking
 *     the gear again. The click-outside handler uses `mousedown` rather than
 *     `click` so it fires before any inner click handler (avoids re-opening).
 *   - Each accent swatch is a real <button> with an aria-label for screen readers.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Moon, Settings as SettingsIcon, Sun } from "lucide-react";
import {
  ACCENT_PRESETS,
  useAppearance,
  type AccentName,
} from "@/hooks/useAppearance";
import { cn } from "@/lib/cn";

export function SettingsMenu() {
  const { theme, accent, toggleTheme, setAccent } = useAppearance();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const accentEntries = Object.entries(ACCENT_PRESETS) as [
    AccentName,
    (typeof ACCENT_PRESETS)[AccentName],
  ][];

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Settings"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface text-fg hover:bg-surface-2"
      >
        <SettingsIcon size={18} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Appearance settings"
          className="absolute right-0 top-12 z-50 w-72 rounded-lg border border-border bg-surface p-4 shadow-2xl"
        >
          {/* Theme toggle */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Theme
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => theme !== "light" && toggleTheme()}
                className={cn(
                  "flex min-h-[44px] items-center justify-center gap-2 rounded-md border text-sm",
                  theme === "light"
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border bg-bg text-fg hover:bg-surface-2",
                )}
              >
                <Sun size={16} />
                Light
              </button>
              <button
                type="button"
                onClick={() => theme !== "dark" && toggleTheme()}
                className={cn(
                  "flex min-h-[44px] items-center justify-center gap-2 rounded-md border text-sm",
                  theme === "dark"
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border bg-bg text-fg hover:bg-surface-2",
                )}
              >
                <Moon size={16} />
                Dark
              </button>
            </div>
          </div>

          {/* Accent picker */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Accent color
            </p>
            <div className="grid grid-cols-4 gap-2">
              {accentEntries.map(([name, preset]) => {
                // Show the swatch in the color appropriate for the current theme,
                // so the picker reflects what you'll actually see.
                const swatch = preset[theme].accent;
                const active = accent === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setAccent(name)}
                    aria-label={`${preset.label} accent`}
                    title={preset.label}
                    style={{ backgroundColor: swatch }}
                    className={cn(
                      "relative flex h-11 w-full items-center justify-center rounded-md border-2",
                      active ? "border-fg" : "border-transparent",
                    )}
                  >
                    {active && (
                      <Check size={16} className="text-white drop-shadow" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
