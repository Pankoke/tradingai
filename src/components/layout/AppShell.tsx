"use client";

import React from "react";
import type { JSX, ReactNode } from "react";
import { SidebarNav, type AppSection } from "./SidebarNav";

interface AppShellProps {
  section: AppSection;
  children: ReactNode;
}

export function AppShell({ section, children }: AppShellProps): JSX.Element {
  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6 md:py-8 lg:max-w-7xl">
        <SidebarNav activeSection={section} />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
