import "./globals.css";
import type { Metadata } from "next";
import { Nunito } from "next/font/google";

/**
 * --------------------------------------------------------------------
 * Google Font: Nunito
 * --------------------------------------------------------------------
 * - Rounded, friendly sans-serif look that fits well with posters.
 * - Using "swap" display ensures text is visible while font loads.
 * - 400 (normal), 700 (bold), 800 (extra-bold) for title hierarchy.
 * --------------------------------------------------------------------
 */
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  display: "swap",
  variable: "--font-sans", // 🔹 Map to our CSS variable for Tailwind @theme inline
});

/**
 * --------------------------------------------------------------------
 * SEO Metadata
 * --------------------------------------------------------------------
 * Shown in <head> when deployed.
 * You can extend this later (icons, og:image, twitter card, etc.)
 * --------------------------------------------------------------------
 */
export const metadata: Metadata = {
  title: "Annual Movie Grid",
  description: "Generate your yearly Top 9 movie poster grid using TMDb data.",
};

/**
 * --------------------------------------------------------------------
 * RootLayout
 * --------------------------------------------------------------------
 * This wraps the entire app (all pages).
 * Responsibilities:
 *  - Inject the Nunito font globally via CSS variable.
 *  - Apply light/dark background colors from globals.css (:root variables).
 *  - Wrap children (the page content) in a clean semantic <body>.
 * --------------------------------------------------------------------
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`
          ${nunito.variable}     /* expose Nunito as --font-sans for Tailwind */
          antialiased            /* smooth text rendering */
          bg-[var(--background)] /* default light/dark background from globals.css */
          text-[var(--foreground)]
        `}
      >
        {children}
      </body>
    </html>
  );
}

