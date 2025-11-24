"use client";

import React from "react";
import type { JSX } from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";

export function Header(): JSX.Element {
  return (
    <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-bold tracking-tight">
            TradingAI
          </Link>
          <nav className="hidden gap-4 text-sm text-[var(--text-secondary)] md:flex">
            <Link href="/" className="hover:text-[var(--text-primary)]">
              Home
            </Link>
            <Link href="/how-it-works" className="hover:text-[var(--text-primary)]">
              How it works?
            </Link>
            <Link href="/learn" className="hover:text-[var(--text-primary)]">
              Learn
            </Link>
            <Link href="/perception" className="hover:text-[var(--text-primary)]">
              Perception Lab
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
