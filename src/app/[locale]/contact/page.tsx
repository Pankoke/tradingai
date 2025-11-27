import type { JSX } from "react";
import type { Locale } from "@/src/lib/i18n/config";

type PageProps = {
  params: { locale: Locale };
};

export default function ContactPage({ params }: PageProps): JSX.Element {
  const isDe = params.locale === "de";

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <main className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {isDe ? "Kontakt" : "Contact"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--text-secondary)] md:text-base">
          {isDe
            ? "Du hast Fragen zu TradingAI, Plänen oder Integrationen? Schreib uns eine Nachricht."
            : "Questions about TradingAI, plans or integrations? Send us a message."}
        </p>

        <div className="mt-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
          <form className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                {isDe ? "E-Mail" : "Email"}
              </label>
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                placeholder={isDe ? "deine@mail.de" : "you@example.com"}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                {isDe ? "Nachricht" : "Message"}
              </label>
              <textarea
                className="mt-1 w-full resize-none rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                rows={5}
                placeholder={
                  isDe
                    ? "Kurze Beschreibung deines Anliegens ..."
                    : "Short description of your request..."
                }
              />
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-black transition hover:opacity-90"
            >
              {isDe ? "Nachricht senden (Demo)" : "Send message (demo)"}
            </button>
          </form>

          <p className="mt-4 text-xs text-[var(--text-secondary)]">
            {isDe
              ? "Hinweis: Dieses Formular ist aktuell nur ein UI-Placeholder und verschickt noch keine echten Nachrichten."
              : "Note: This form is currently a UI placeholder and does not send real emails yet."}
          </p>
        </div>
      </main>
    </div>
  );
}
