"use client";

import { useState } from "react";

type IntroSection = {
  heading: string;
  items: string[];
};

type OutcomesIntroProps = {
  title: string;
  sections: IntroSection[];
  defaultOpen?: boolean;
};

export function OutcomesIntro({ title, sections, defaultOpen = false }: OutcomesIntroProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-200 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs text-emerald-300 hover:underline"
        >
          {open ? "Einklappen" : "Ausklappen"}
        </button>
      </div>
      {open ? (
        <div className="mt-3 space-y-3 text-sm">
          {sections.map((section) => (
            <div key={section.heading} className="space-y-1">
              <div className="text-slate-300 font-semibold">{section.heading}</div>
              <ul className="list-disc space-y-1 pl-5 text-slate-200">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
