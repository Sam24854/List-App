/*
 * Root layout — wraps every page.
 *
 * Two important things happen here:
 *
 * 1. The `<html>` tag gets a tiny inline script that runs BEFORE React hydrates.
 *    It reads the saved theme preference (or falls back to dark, our default)
 *    and adds the `.dark` class to <html> immediately. Without this, the page
 *    would briefly flash in light mode before our React theme provider mounts —
 *    a common SSR pitfall called FOUC (flash of unstyled content).
 *
 * 2. We mount the `<Providers>` component, which sets up React Context for the
 *    storage adapter (Phase 1: localStorage) and the theme. Every component below
 *    consumes data through these providers.
 */

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "List-App",
  description: "A simple, fast multi-list todo app.",
};

// Tells the browser how to render on mobile.
// `width=device-width, initial-scale=1` is the universal modern default.
// `viewportFit=cover` ensures color extends behind iOS safe areas.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

// This script string is injected raw into the page <head> before React hydrates.
// It runs synchronously, sets the theme class, and prevents the light-mode flash.
// Keep it small — it ships in every page.
const setThemeBeforeHydration = `
(function() {
  try {
    var stored = localStorage.getItem('list-app-theme');
    var theme = stored || 'dark';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {
    // localStorage might be blocked (private mode, etc.) — default to dark.
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning silences a React warning caused by the inline
    // script mutating <html> before hydration. The mutation is intentional
    // and safe — this attribute is the standard fix.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: setThemeBeforeHydration }} />
      </head>
      <body className="min-h-full bg-bg text-fg">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
