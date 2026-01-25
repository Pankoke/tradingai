type ArtifactHealthNoticeProps = {
  source: string;
  generatedAt?: string;
  windowDays?: number;
};

function isStale(generatedAt: string | undefined, windowDays: number | undefined): boolean {
  if (!generatedAt || !windowDays) return false;
  const ts = Date.parse(generatedAt);
  if (Number.isNaN(ts)) return false;
  const ageMs = Date.now() - ts;
  const thresholdMs = windowDays * 1.2 * 24 * 60 * 60 * 1000;
  return ageMs > thresholdMs;
}

export function ArtifactHealthNotice({ source, generatedAt, windowDays }: ArtifactHealthNoticeProps) {
  const stale = isStale(generatedAt, windowDays);
  const fallback = source === "fs";
  if (!stale && !fallback) return null;

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
      <div className="font-semibold text-amber-200">Hinweis: Artefakt-Fallback oder veraltet</div>
      <p className="mt-1 text-amber-100/90">
        Diese Seite nutzt ein lokales Fallback-Artefakt oder ein veraltetes Artefakt. Mögliche Ursachen:
        fehlendes <code>BLOB_READ_WRITE_TOKEN</code>, fehlgeschlagene Phase-1-Pipeline oder noch kein aktueller
        Analyzer-Run.
      </p>
    </div>
  );
}
