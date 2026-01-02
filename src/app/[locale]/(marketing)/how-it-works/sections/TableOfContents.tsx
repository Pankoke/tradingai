import type { JSX } from "react";
import type { TocItem } from "../content";

type TableOfContentsProps = {
  items: TocItem[];
  title: string;
  mobileTitle: string;
  showMobile?: boolean;
  showDesktop?: boolean;
};

export function TableOfContents({
  items,
  title,
  mobileTitle,
  showMobile = true,
  showDesktop = true,
}: TableOfContentsProps): JSX.Element {
  return (
    <>
      {showMobile ? (
        <div className="lg:hidden">
        <details className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-sm">
          <summary className="flex cursor-pointer items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500">
            {mobileTitle}
            <span aria-hidden="true" className="text-xs text-[var(--text-secondary)]">
              ▾
            </span>
          </summary>
          <nav className="border-t border-[var(--border-subtle)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[var(--text-primary)] transition hover:bg-[var(--bg-main)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                    <span>{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </details>
      </div>
      ) : null}

      {showDesktop ? (
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-sm">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
            <nav className="mt-3 space-y-1 text-sm text-[var(--text-secondary)]">
              {items.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-[var(--bg-main)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden="true" />
                  <span className="text-[var(--text-primary)]">{item.label}</span>
                </a>
              ))}
            </nav>
          </div>
        </aside>
      ) : null}
    </>
  );
}
