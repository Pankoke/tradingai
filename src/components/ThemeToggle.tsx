"use client";

import React, { useEffect, useState } from "react";
import type { JSX } from "react";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }
  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function ThemeToggle(): JSX.Element {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const isDark = theme === "dark";

  const handleToggle = (): void => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="inline-flex h-9 items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      aria-label={isDark ? "Auf helles Theme wechseln" : "Auf dunkles Theme wechseln"}
    >
      {isDark ? "Dark" : "Light"}
    </button>
  );
}
