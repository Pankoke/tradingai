"use client";

import React, { useEffect, useState } from "react";
import type { JSX } from "react";

type Theme = "light" | "dark";

function resolveTheme(): Theme {
  if (typeof document !== "undefined") {
    const fromDom = document.documentElement.dataset.theme;
    if (fromDom === "light" || fromDom === "dark") {
      return fromDom;
    }
  }
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      return stored;
    }
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  }
  // SSR fallback matches default HTML markup
  return "dark";
}

function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  try {
    window.localStorage.setItem("theme", theme);
  } catch {
    // ignore storage issues
  }
}

export function ThemeToggle(): JSX.Element {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = resolveTheme();
    setTheme(initial);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
  }, [theme, mounted]);

  const isDark = theme === "dark";

  const handleToggle = (): void => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
  };

  const baseClasses =
    "inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold shadow-sm transition-colors";
  const activeClasses = "border-[var(--accent)] bg-[var(--accent)] text-white";
  const inactiveClasses =
    "border-[var(--border-subtle)] bg-[var(--bg-main)] text-[var(--text-primary)] hover:border-[var(--text-primary)]/50";

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`${baseClasses} ${isDark ? activeClasses : inactiveClasses}`}
      aria-label={isDark ? "Auf helles Theme wechseln" : "Auf dunkles Theme wechseln"}
      aria-pressed={isDark}
      suppressHydrationWarning
    >
      {isDark ? "Dark" : "Light"}
    </button>
  );
}
