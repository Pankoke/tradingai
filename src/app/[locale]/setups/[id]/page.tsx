import type { JSX } from "react";
import { getSetupById } from "../../../../lib/mockSetups";

type PageProps = {
  params: { locale: string; id: string };
};

export default function SetupDetailPage({ params }: PageProps): JSX.Element {
  const { id } = params;
  const setup = getSetupById(id);

  if (!setup) {
    return (
      <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Setup nicht gefunden</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] sm:text-base">
            Das angeforderte Setup existiert nicht oder wurde entfernt.
          </p>
        </div>
      </div>
    );
  }

  const isLong = setup.direction === "Long";

  return (
    <div className="bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <header className="space-y-3 pb-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {setup.symbol} · {setup.timeframe}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                isLong ? "border-emerald-500/40 text-emerald-400" : "border-red-500/40 text-red-400"
              }`}
            >
              {setup.direction}
            </span>
            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1 text-xs font-semibold">
              {setup.type}
            </span>
            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1 text-xs">
              Confidence: {setup.confidence}%
            </span>
            <span className="text-xs">Snapshot von heute</span>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-lg">
              <h2 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">Trade Setup</h2>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <Level label="Entry-Zone" value={setup.entryZone} tone="neutral" />
                <Level label="Stop-Loss" value={setup.stopLoss} tone="danger" />
                <Level label="Take-Profit" value={setup.takeProfit} tone="success" />
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-lg">
              <h2 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">Key-Metriken</h2>
              <div className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                <MetricRow label="Event-Score" value={setup.eventScore} />
                <MetricRow label="Bias-Score" value={setup.biasScore} />
                <MetricRow label="Sentiment-Score" value={setup.sentimentScore} />
                <MetricRow label="Balance-Score" value={setup.balanceScore} />
              </div>
              <div className="mt-4">
                <div className="mb-1 text-xs text-[var(--text-secondary)]">Confidence</div>
                <div className="h-2 w-full rounded-full bg-[var(--bg-main)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{ width: `${setup.confidence}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-lg">
              <h2 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">Chart (Placeholder)</h2>
              <div className="mt-3 flex h-64 items-center justify-center rounded-xl bg-[var(--bg-main)] text-[var(--text-secondary)]">
                Chart-Preview (Demo)
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <TabCard title="Setup">
            <p className="text-sm text-[var(--text-secondary)]">
              Dieses Setup fokussiert sich auf klare Entry-Zonen mit definiertem Stop-Loss und Take-Profit. Der Bias
              basiert auf Marktstruktur und Event-Kontext.
            </p>
          </TabCard>
          <TabCard title="Scores">
            <p className="text-sm text-[var(--text-secondary)]">
              Bias: {setup.biasScore}% · Sentiment: {setup.sentimentScore}% · Event: {setup.eventScore}% · Balance:{" "}
              {setup.balanceScore}%.
            </p>
          </TabCard>
          <TabCard title="Analyse / Erklärung">
            <p className="text-sm text-[var(--text-secondary)]">
              Hier wird später eine KI-generierte Erklärung des Setups erscheinen, inklusive Markt-Story und
              Begründung der Scores.
            </p>
          </TabCard>
          <TabCard title="Risiko & R:R">
            <p className="text-sm text-[var(--text-secondary)]">
              Geplante Risk-Module zeigen hier künftige Metriken wie R:R, Positionsgrößen oder Szenario-Analysen.
            </p>
          </TabCard>
        </div>
      </div>
    </div>
  );
}

type LevelProps = {
  label: string;
  value: string;
  tone: "neutral" | "danger" | "success";
};

function Level({ label, value, tone }: LevelProps): JSX.Element {
  const color =
    tone === "danger"
      ? "text-red-400"
      : tone === "success"
        ? "text-emerald-400"
        : "text-[var(--text-primary)]";

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-2">
      <div className="text-[0.6rem] uppercase tracking-[0.2em] text-[var(--text-secondary)]">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}

type MetricRowProps = {
  label: string;
  value: number;
};

function MetricRow({ label, value }: MetricRowProps): JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-lg bg-[var(--bg-main)] px-3 py-2">
      <span>{label}</span>
      <span className="font-semibold text-[var(--text-primary)]">{value}%</span>
    </div>
  );
}

type TabCardProps = {
  title: string;
  children: JSX.Element | JSX.Element[] | string;
};

function TabCard({ title, children }: TabCardProps): JSX.Element {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-md">
      <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
