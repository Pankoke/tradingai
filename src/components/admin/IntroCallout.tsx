export function IntroCallout() {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-200">
      <div className="font-semibold text-white">Wozu diese Seite?</div>
      <ul className="mt-2 list-disc space-y-1 pl-4">
        <li>Schwellwerte mit historischen Outcomes testen – keine Live-Änderung.</li>
        <li>Strengere Filter = weniger Trades; Utility ist nur ein Vergleichswert.</li>
        <li>Closed-only wertet nur abgeschlossene Trades aus; NO_TRADE zeigt verpasste Chancen.</li>
        <li>Ergebnis ist ein Vorschlag, keine Handelsfreigabe.</li>
      </ul>
    </div>
  );
}
