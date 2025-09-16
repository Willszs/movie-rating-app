import "./globals.css";
import type { Metadata } from "next";
import { Nunito } from "next/font/google";

// Load a rounded, friendly font with bold weights
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Annual Movie Grid",
  description: "Generate your yearly Top 9 movie poster grid",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      {/* Apply the Nunito font to the entire app */}
      <body className={nunito.className}>{children}</body>
    </html>
  );
}

