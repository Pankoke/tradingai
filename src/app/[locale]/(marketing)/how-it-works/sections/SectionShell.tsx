import type { JSX, ReactNode } from "react";

type SectionShellProps = {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function SectionShell({
  id,
  title,
  description,
  children,
}: SectionShellProps): JSX.Element {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)] md:text-2xl">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-[var(--text-secondary)] md:text-base">
            {description}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-[1.5px] shadow-sm dark:border-transparent dark:from-sky-500/15 dark:via-transparent dark:to-emerald-500/10 dark:shadow-[0_0_25px_rgba(56,189,248,0.15)]">
        <div className="rounded-3xl border border-slate-800 bg-[#0b1325] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] md:p-6">
          {children}
        </div>
      </div>
    </section>
  );
}
