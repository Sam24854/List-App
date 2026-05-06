/*
 * Root layout — wraps every page.
 *
 * Two important things happen here:
 *
 * 1. The `<html>` tag gets a tiny inline script that runs BEFORE React hydrates.
 *    It reads the saved theme + accent (or falls back to dark + crimson) and
 *    applies them immediately. Without this, the page would briefly flash in
 *    light mode (or with the wrong accent) before our React provider mounts —
 *    a common SSR pitfall called FOUC (flash of unstyled content).
 *
 * 2. We mount the `<Providers>` component, which sets up React Context for
 *    appearance (theme + accent) and storage. Every component below consumes
 *    data through these providers.
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
  title: "To-Do List",
  description: "A simple, fast multi-list todo app.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

// Inline script run before React hydrates. Mirrors the ACCENT_PRESETS table in
// hooks/useAppearance.tsx — keep them in sync. We can't import from there here
// because this string runs in the browser before the JS bundle loads.
const bootstrapAppearance = `
(function() {
  var ACCENTS = {
    crimson:  { light: {a:'#991b1b',h:'#7f1d1d'}, dark: {a:'#b91c1c',h:'#dc2626'} },
    rose:     { light: {a:'#9f1239',h:'#881337'}, dark: {a:'#e11d48',h:'#f43f5e'} },
    amber:    { light: {a:'#b45309',h:'#92400e'}, dark: {a:'#f59e0b',h:'#fbbf24'} },
    emerald:  { light: {a:'#047857',h:'#065f46'}, dark: {a:'#10b981',h:'#34d399'} },
    cyan:     { light: {a:'#0e7490',h:'#155e75'}, dark: {a:'#06b6d4',h:'#22d3ee'} },
    indigo:   { light: {a:'#4338ca',h:'#3730a3'}, dark: {a:'#6366f1',h:'#818cf8'} },
    violet:   { light: {a:'#6d28d9',h:'#5b21b6'}, dark: {a:'#8b5cf6',h:'#a78bfa'} },
    slate:    { light: {a:'#334155',h:'#1e293b'}, dark: {a:'#94a3b8',h:'#cbd5e1'} }
  };
  try {
    var theme = localStorage.getItem('list-app-theme') === 'light' ? 'light' : 'dark';
    var accent = localStorage.getItem('list-app-accent') || 'crimson';
    if (!ACCENTS[accent]) accent = 'crimson';
    var root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
    var v = ACCENTS[accent][theme];
    root.style.setProperty('--color-accent', v.a);
    root.style.setProperty('--color-accent-hover', v.h);
    root.style.setProperty('--color-ring', v.a);
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning silences a React warning caused by the inline
    // script mutating <html> before hydration.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootstrapAppearance }} />
      </head>
      <body className="min-h-full bg-bg text-fg">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
