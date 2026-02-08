"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { JSX } from "react";

export type NavItem = {
  href: string;
  label: string;
  badge?: string;
  subdued?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

type Props = {
  groups: NavGroup[];
};

export function AdminSidebar({ groups }: Props): JSX.Element {
  const pathname = usePathname();

  const isActive = (href: string): boolean => {
    if (!pathname) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className="flex-1 space-y-6">
      {groups.map((group) => (
        <div key={group.label} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition",
                    active
                      ? "bg-slate-800 text-white"
                      : item.subdued
                        ? "text-slate-500 hover:bg-slate-800 hover:text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  )}
                >
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-200">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
