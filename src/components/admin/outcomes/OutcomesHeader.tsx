import clsx from "clsx";
import type { JSX } from "react";
import Link from "next/link";

export type OutcomesHeaderVariant = "db" | "artifact" | "legacy";

export type OutcomesRelatedLink = {
  key: string;
  label: string;
  href: string;
};

type Props = {
  title: string;
  description: string;
  variant: OutcomesHeaderVariant;
  notice?: string;
  related: OutcomesRelatedLink[];
  currentKey: string;
};

const variantStyles: Record<OutcomesHeaderVariant, { badge: string; color: string }> = {
  db: { badge: "DB-driven", color: "text-emerald-300 bg-emerald-900/40" },
  artifact: { badge: "Artifact-based", color: "text-sky-300 bg-sky-900/40" },
  legacy: { badge: "Legacy", color: "text-amber-200 bg-amber-900/40" },
};

export function OutcomesHeader({ title, description, variant, notice, related, currentKey }: Props): JSX.Element {
  const style = variantStyles[variant];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <div className={clsx("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", style.color)}>
            {style.badge}
          </div>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          <p className="max-w-3xl text-sm text-slate-300">{description}</p>
        </div>
      </div>
      {notice ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
          {notice}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2 text-sm">
        {related.map((link) => {
          const active = link.key === currentKey;
          return (
            <Link
              key={link.key}
              href={link.href}
              className={clsx(
                "rounded-full border px-3 py-1 transition",
                active
                  ? "border-white bg-white text-slate-900"
                  : "border-slate-700 text-slate-200 hover:border-white hover:text-white",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
