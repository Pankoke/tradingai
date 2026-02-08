import clsx from "clsx";
import Link from "next/link";
import type { JSX } from "react";

export type AdminSectionHeaderVariant = "info" | "warning" | "actions" | "neutral";

export type AdminSectionRelatedLink<K extends string = string> = {
  key: K;
  label: string;
  href: string;
  labelKey?: string;
  isLegacy?: boolean;
};

type Props<K extends string> = {
  title: string;
  description: string;
  links?: Array<AdminSectionRelatedLink<K>>;
  currentKey?: K;
  relatedLabel?: string;
  notice?: string;
  variant?: AdminSectionHeaderVariant;
  subdued?: boolean;
};

const noticeTone: Record<AdminSectionHeaderVariant, string> = {
  info: "border-sky-900/70 bg-sky-950/30 text-sky-100",
  warning: "border-amber-900/70 bg-amber-950/30 text-amber-100",
  actions: "border-rose-900/70 bg-rose-950/30 text-rose-100",
  neutral: "border-slate-800 bg-slate-900/70 text-slate-200",
};

export function AdminSectionHeader<K extends string>({
  title,
  description,
  links = [],
  currentKey,
  relatedLabel,
  notice,
  variant = "neutral",
  subdued = false,
}: Props<K>): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className={clsx("text-3xl font-semibold text-white", subdued ? "opacity-95" : "")}>{title}</h1>
        <p className="max-w-3xl text-sm text-slate-300">{description}</p>
      </div>
      {notice ? <div className={clsx("rounded-lg border px-4 py-3 text-sm", noticeTone[variant])}>{notice}</div> : null}
      {links.length > 0 ? (
        <div className="space-y-2">
          {relatedLabel ? <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{relatedLabel}</p> : null}
          <div className="flex flex-wrap gap-2 text-sm">
            {links.map((link) => {
              const active = currentKey != null && link.key === currentKey;
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
      ) : null}
    </div>
  );
}
