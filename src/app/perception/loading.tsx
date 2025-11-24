import type { JSX } from "react";

export default function Loading(): JSX.Element {
  return (
    <div className="px-6 py-12 text-[var(--text-secondary)]">
      Lädt...
    </div>
  );
}
