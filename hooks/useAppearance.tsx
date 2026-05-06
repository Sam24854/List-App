/*
 * Appearance hook + provider.
 *
 * Owns two pieces of visual state:
 *   - theme  : 'light' | 'dark'
 *   - accent : a named preset that controls the secondary brand color
 *
 * On change, we update CSS variables on <html> and persist to localStorage.
 * An inline script in layout.tsx applies both before React hydrates so we
 * never see a "flash" of the wrong colors.
 *
 * Why store CSS color values in JS rather than CSS classes:
 *   - Lets the user pick from many accents without bloating CSS with N classes.
 *   - Each accent has separate light/dark values for proper contrast in both modes.
 *   - One source of truth (this file) — components don't know about color values.
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

export type AccentName =
  | "crimson"
  | "indigo"
  | "emerald"
  | "amber"
  | "rose"
  | "cyan"
  | "violet"
  | "slate";

type AccentValues = { accent: string; hover: string };

/**
 * For each accent, we define separate values for light and dark mode so
 * contrast against the background stays good in both. Tweak these in one place.
 */
export const ACCENT_PRESETS: Record<
  AccentName,
  { label: string; light: AccentValues; dark: AccentValues }
> = {
  crimson: {
    label: "Crimson",
    light: { accent: "#991b1b", hover: "#7f1d1d" },
    dark: { accent: "#b91c1c", hover: "#dc2626" },
  },
  rose: {
    label: "Rose",
    light: { accent: "#9f1239", hover: "#881337" },
    dark: { accent: "#e11d48", hover: "#f43f5e" },
  },
  amber: {
    label: "Amber",
    light: { accent: "#b45309", hover: "#92400e" },
    dark: { accent: "#f59e0b", hover: "#fbbf24" },
  },
  emerald: {
    label: "Emerald",
    light: { accent: "#047857", hover: "#065f46" },
    dark: { accent: "#10b981", hover: "#34d399" },
  },
  cyan: {
    label: "Cyan",
    light: { accent: "#0e7490", hover: "#155e75" },
    dark: { accent: "#06b6d4", hover: "#22d3ee" },
  },
  indigo: {
    label: "Indigo",
    light: { accent: "#4338ca", hover: "#3730a3" },
    dark: { accent: "#6366f1", hover: "#818cf8" },
  },
  violet: {
    label: "Violet",
    light: { accent: "#6d28d9", hover: "#5b21b6" },
    dark: { accent: "#8b5cf6", hover: "#a78bfa" },
  },
  slate: {
    label: "Slate",
    light: { accent: "#334155", hover: "#1e293b" },
    dark: { accent: "#94a3b8", hover: "#cbd5e1" },
  },
};

export const DEFAULT_THEME: Theme = "dark";
export const DEFAULT_ACCENT: AccentName = "crimson";

const THEME_KEY = "list-app-theme";
const ACCENT_KEY = "list-app-accent";

type AppearanceContextValue = {
  theme: Theme;
  accent: AccentName;
  toggleTheme: () => void;
  setAccent: (accent: AccentName) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

/** Apply the chosen theme + accent to <html> via CSS variables. */
function applyAppearance(theme: Theme, accent: AccentName) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  const values = ACCENT_PRESETS[accent][theme];
  root.style.setProperty("--color-accent", values.accent);
  root.style.setProperty("--color-accent-hover", values.hover);
  root.style.setProperty("--color-ring", values.accent);
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  // Defaults match the inline bootstrap script in layout.tsx so SSR + CSR agree.
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [accent, setAccentState] = useState<AccentName>(DEFAULT_ACCENT);

  // Read saved values on mount (the inline script already applied them
  // visually; we just sync React state).
  useEffect(() => {
    try {
      const storedTheme = window.localStorage.getItem(THEME_KEY) as Theme | null;
      const storedAccent = window.localStorage.getItem(ACCENT_KEY) as AccentName | null;
      const initialTheme: Theme = storedTheme === "light" ? "light" : "dark";
      const initialAccent: AccentName =
        storedAccent && storedAccent in ACCENT_PRESETS
          ? storedAccent
          : DEFAULT_ACCENT;
      setTheme(initialTheme);
      setAccentState(initialAccent);
      applyAppearance(initialTheme, initialAccent);
    } catch {
      applyAppearance(DEFAULT_THEME, DEFAULT_ACCENT);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyAppearance(next, accent);
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch {
        /* localStorage blocked */
      }
      return next;
    });
  }, [accent]);

  const setAccent = useCallback(
    (next: AccentName) => {
      setAccentState(next);
      applyAppearance(theme, next);
      try {
        window.localStorage.setItem(ACCENT_KEY, next);
      } catch {
        /* localStorage blocked */
      }
    },
    [theme],
  );

  const value = useMemo<AppearanceContextValue>(
    () => ({ theme, accent, toggleTheme, setAccent }),
    [theme, accent, toggleTheme, setAccent],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

/** Read or change the current theme + accent. */
export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    throw new Error("useAppearance must be used inside <AppearanceProvider>");
  }
  return ctx;
}
