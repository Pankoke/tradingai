export default function SetupsPage(): JSX.Element {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            AI-Setups
          </h1>
          <p className="text-lg text-gray-700">
            Hier werden später alle Setups mit Filtern, Sortierung und Details
            gesammelt angezeigt.
          </p>
        </div>
        <ul className="space-y-3">
          <li className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
            Momentum Breakout - Perception/Logic/Execution v1
          </li>
          <li className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
            Mean Reversion Radar - Beta Setup
          </li>
          <li className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
            Liquidity Sweep Tracker - Experimentell
          </li>
        </ul>
      </div>
    </main>
  );
}
