"use client";

import React from "react";
import type { JSX, ReactNode } from "react";
import { AppSubNav, type AppSection } from "./AppSubNav";

export type { AppSection };

interface AppShellProps {
  section: AppSection;
  children: ReactNode;
}

export function AppShell({ section, children }: AppShellProps): JSX.Element {
  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <AppSubNav activeSection={section} />
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-8 lg:max-w-7xl">
        {children}
      </div>
    </div>
  );
}
