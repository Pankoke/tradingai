export const ENV_OUTCOMES_VALID_FROM = process.env.OUTCOMES_VALID_FROM;
export const DEFAULT_VALID_FROM_ISO = "2026-01-01T00:00:00Z";
export const FIX_DATE_ISO =
  ENV_OUTCOMES_VALID_FROM && !Number.isNaN(Date.parse(ENV_OUTCOMES_VALID_FROM))
    ? ENV_OUTCOMES_VALID_FROM
    : DEFAULT_VALID_FROM_ISO;
export const FIX_DATE = new Date(FIX_DATE_ISO);

export function isOutcomeInCohort(params: {
  evaluatedAt?: Date | null;
  snapshotTime?: Date | null;
  outcomeStatus?: string | null;
}): boolean {
  if (params.outcomeStatus === "invalid") return false;
  const anchor = params.evaluatedAt ?? params.snapshotTime;
  if (!anchor) return false;
  return anchor >= FIX_DATE;
}
