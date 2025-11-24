import type { JSX } from "react";
import Link from "next/link";

export default function HomePage(): JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-16">
      <div className="w-full max-w-3xl space-y-8 rounded-2xl bg-white px-8 py-10 shadow-sm">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            TradingAI - Perception Lab
          </h1>
          <p className="text-lg text-gray-600">
            Dies ist die neue, aufgeräumte Codebasis für TradingAI mit Fokus auf
            klare Strukturen im App Router.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Link
            href="/perception"
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-center text-gray-900 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
          >
            Perception Lab öffnen
          </Link>
          <Link
            href="/setups"
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-center text-gray-900 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
          >
            Alle AI-Setups anzeigen
          </Link>
        </div>
      </div>
    </main>
  );
}
