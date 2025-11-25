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

const themeInitScript = `
(() => {
  try {
    const stored = window.localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored === 'light' || stored === 'dark' ? stored : prefersDark ? 'dark' : 'light';
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle('dark', theme === 'dark');
  } catch {
    // ignore
  }
})();
`;

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
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] antialiased">
        {children}
      </body>
    </html>
  );
}
