import type { Metadata } from "next";
import {
  Alegreya_Sans,
  EB_Garamond,
  IM_Fell_English_SC,
  Cutive_Mono,
} from "next/font/google";
import "./globals.css";
import React from "react";

/*
 * Typography system — Vellum & Gold Leaf
 *
 * UI / chrome    → Alegreya Sans (warm humanist, pairs with Alegreya/EB Garamond family)
 * Manuscript     → EB Garamond (classical Garamond revival, long-form readable)
 * Display        → IM Fell English SC (17th-c. English book face — Tolkien-library feel)
 * Mono           → Cutive Mono (typewriter warmth)
 *
 * Variable names are preserved (--font-ui, --font-manuscript, --font-display,
 * --font-mono) so every component stylesheet continues working unchanged.
 */

const alegreyaSans = Alegreya_Sans({
  subsets: ["latin"],
  variable: "--font-ui",
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-manuscript",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const imFellEnglishSC = IM_Fell_English_SC({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400"],
  display: "swap",
});

const cutiveMono = Cutive_Mono({
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
    alegreyaSans.variable,
    ebGaramond.variable,
    imFellEnglishSC.variable,
    cutiveMono.variable,
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
