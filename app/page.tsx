/*
 * Home page — the only page in the app right now.
 *
 * Layout:
 *   Desktop (>= 768px): sidebar (fixed-width) | list view (fills remaining space)
 *   Mobile (< 768px):   top bar with hamburger | list view full-width
 *                       hamburger opens the sidebar in a slide-in drawer
 *
 * Tailwind's `md:` prefix (≥768px) handles the responsive breakpoint.
 * A two-pane layout below ~768px is too cramped, so we use the drawer pattern.
 */

"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ListSidebar } from "@/components/lists/ListSidebar";
import { ListView } from "@/components/lists/ListView";
import { SettingsMenu } from "@/components/SettingsMenu";
import { cn } from "@/lib/cn";

export default function Home() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <main className="flex h-screen flex-col bg-bg text-fg">
      {/* Top bar — visible on mobile (hamburger) and desktop (just title + theme). */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-3 py-2">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open lists menu"
          className="flex h-11 w-11 items-center justify-center rounded-md text-fg hover:bg-surface-2 md:hidden"
        >
          <Menu size={22} />
        </button>
        <h1 className="text-lg font-semibold text-accent">To-Do List</h1>
        <div className="ml-auto">
          <SettingsMenu />
        </div>
      </header>

      {/* Two-pane body. On mobile, sidebar lives in the drawer; on desktop, inline. */}
      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar (md+). Width lives on this wrapper rather than the
            aside so the inner content always has a definite container —
            otherwise flex layout falls back to intrinsic content size and
            the "+" button can overflow into the main pane. */}
        <div className="hidden md:flex md:w-72 md:shrink-0 border-r border-border">
          <ListSidebar />
        </div>

        {/* List view — always fills the rest. */}
        <div className="min-w-0 flex-1">
          <ListView />
        </div>
      </div>

      {/* Mobile drawer — hidden on md+. Backdrop + slide-in panel.
          Rendered conditionally so it doesn't trap focus when closed. */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            className={cn(
              "relative z-10 flex h-full w-[85vw] max-w-[20rem] flex-col bg-surface shadow-xl",
            )}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
              <span className="text-sm font-semibold uppercase tracking-wide text-muted">
                Lists
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close lists menu"
                className="flex h-11 w-11 items-center justify-center rounded-md text-fg hover:bg-surface-2"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ListSidebar onSelect={() => setDrawerOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
