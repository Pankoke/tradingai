export type UserPlan = "free" | "premium" | "pro";

export const DEFAULT_PLAN: UserPlan = "free";

export function isUserPlan(value: unknown): value is UserPlan {
  return value === "free" || value === "premium" || value === "pro";
}
