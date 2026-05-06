/*
 * Providers — wraps the entire app in our React contexts.
 *
 * Marked "use client" because the providers use React hooks and read from
 * localStorage, which only exist in the browser.
 *
 * Order matters: AppearanceProvider must wrap DataProvider so visuals are
 * available everywhere, including inside data-dependent components.
 */

"use client";

import { AppearanceProvider } from "@/hooks/useAppearance";
import { DataProvider } from "@/hooks/useLists";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppearanceProvider>
      <DataProvider>{children}</DataProvider>
    </AppearanceProvider>
  );
}
