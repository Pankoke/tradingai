import type { JSX } from "react";

type HeroSectionProps = {
  title: string;
  subtitle: string;
  highlights: string[];
};

export function HeroSection({
  title,
  subtitle,
  highlights,
}: HeroSectionProps): JSX.Element {
  return (
    <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-[1.5px] shadow-sm dark:border-transparent dark:from-sky-500/15 dark:via-transparent dark:to-emerald-500/10 dark:shadow-[0_0_25px_rgba(56,189,248,0.15)]">
      <div className="rounded-3xl border border-slate-800 bg-[#0b1325] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)] md:p-8">
        <div className="space-y-4">
          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
              {title}
            </h1>
            <p className="max-w-3xl text-sm text-slate-200 sm:text-base">
              {subtitle}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {highlights.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 rounded-full border border-sky-500/60 bg-sky-500/10 px-3 py-1 text-[0.78rem] font-medium text-sky-100 shadow-[0_10px_30px_rgba(56,189,248,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
