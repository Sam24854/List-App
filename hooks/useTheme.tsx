/*
 * Theme hook + provider.
 *
 * Exposes the current theme ('light' | 'dark') and a toggle function to every
 * component below the provider.
 *
 * The actual class on <html> is set by an inline script in layout.tsx BEFORE
 * React hydrates (to avoid a light-mode flash). On mount, this provider syncs
 * its React state with whatever class the script set.
 *
 * When the user toggles, we:
 *   1. Flip the React state
 *   2. Add/remove the `.dark` class on <html>
 *   3. Persist the choice to localStorage so it sticks across reloads
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "list-app-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Default to dark — same as the inline script in layout.tsx.
  // We re-read on mount in a useEffect so SSR and CSR agree.
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Sync React state with whatever the inline script picked.
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial: Theme = stored === "light" ? "light" : "dark";
    setTheme(initial);
    // Make sure the <html> class matches state, in case localStorage was
    // cleared between renders.
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // localStorage may be blocked — toggle still works, just not persistent.
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Use this in any component to read or change the theme. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}
