"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { JSX } from "react";

type NavItem = {
  href: string;
  label: string;
};

type Props = {
  items: NavItem[];
};

export function AdminSidebar({ items }: Props): JSX.Element {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-2">
      {items.map((item) => {
        const isActive = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "block rounded-lg px-3 py-2 text-sm transition",
              isActive
                ? "bg-slate-800 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
