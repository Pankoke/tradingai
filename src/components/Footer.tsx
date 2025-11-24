import React from "react";
import type { JSX } from "react";

export function Footer(): JSX.Element {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-[var(--text-secondary)] md:flex-row md:items-center md:justify-between">
        <div>© {year} TradingAI – Perception Lab. All rights reserved.</div>
        <div className="flex flex-wrap gap-3">
          <span className="cursor-default">No financial advice. Trading involves risk.</span>
          <a href="/disclaimer" className="hover:text-[var(--text-primary)]">
            Disclaimer
          </a>
          <a href="/privacy" className="hover:text-[var(--text-primary)]">
            Privacy
          </a>
          <a href="/about" className="hover:text-[var(--text-primary)]">
            About
          </a>
        </div>
      </div>
    </footer>
  );
}
