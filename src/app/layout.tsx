import type { Metadata } from "next";
import type { JSX, ReactNode } from "react";
import "./globals.css";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";
import { defaultLocale } from "@/i18n";

type Messages = typeof deMessages;

const messagesByLocale: Record<string, Messages> = {
  de: deMessages,
  en: enMessages,
};

const fallbackMessages = messagesByLocale[defaultLocale] ?? deMessages;

export const metadata: Metadata = {
  title: fallbackMessages["meta.title"],
  description: fallbackMessages["meta.description"],
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] antialiased">
        {children}
      </body>
    </html>
  );
}
