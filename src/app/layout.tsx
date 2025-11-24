import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradingAI – Perception Lab",
  description:
    "TradingAI ist eine KI-gestützte Trading-Plattform mit täglichen, regelbasierten und KI-basierten Setups.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] antialiased">
        {children}
      </body>
    </html>
  );
}
