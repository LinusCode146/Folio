import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  Literata,
  Bodoni_Moda,
  Fragment_Mono,
} from "next/font/google";
import "./globals.css";
import React from "react";

/*
 * Typography system — Writer's Study
 *
 * UI / chrome    → Bricolage Grotesque (warm neo-grotesk, not overused)
 * Manuscript     → Literata (designed for long-form reading, variable optical sizing)
 * Display        → Bodoni Moda (sharp editorial serif — chapter numerals, hub hero)
 * Mono           → Fragment Mono (word counts, shortcuts)
 *
 * Each font is exposed as a CSS custom property on <html> so all module CSS
 * can reference var(--font-ui) etc. without hard-coding family names.
 */

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-ui",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const literata = Literata({
  subsets: ["latin"],
  variable: "--font-manuscript",
  weight: ["300", "400", "500", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const bodoniModa = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const fragmentMono = Fragment_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Folio",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars = [
    bricolageGrotesque.variable,
    literata.variable,
    bodoniModa.variable,
    fragmentMono.variable,
  ].join(" ");

  return (
    <html lang="en" suppressHydrationWarning className={fontVars}>
      <head suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem('writable-theme');
                var mode = stored ? JSON.parse(stored).state?.mode : 'system';
                var dark = mode === 'dark' || (mode !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
