/*
 * ThemeToggle — sun/moon button that flips between light and dark.
 */

"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface text-fg hover:bg-surface-2"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
