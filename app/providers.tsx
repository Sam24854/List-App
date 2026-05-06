/*
 * Providers — wraps the entire app in our React contexts.
 *
 * Marked "use client" because the providers use React hooks (useState, useEffect)
 * and read from localStorage, which only exist in the browser. Server components
 * cannot use either.
 *
 * Order matters: ThemeProvider must wrap DataProvider so theme is available
 * everywhere, including inside data-dependent components.
 */

"use client";

import { ThemeProvider } from "@/hooks/useTheme";
import { DataProvider } from "@/hooks/useLists";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <DataProvider>{children}</DataProvider>
    </ThemeProvider>
  );
}
