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
    document.documentElement.classList.toggle("dark", theme === "dark");
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
      className={`inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold shadow-sm ${
        isDark
          ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
          : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
      }`}
      aria-label={isDark ? "Auf helles Theme wechseln" : "Auf dunkles Theme wechseln"}
      aria-pressed={isDark}
    >
      {isDark ? "Dark" : "Light"}
    </button>
  );
}
