import { useUser } from "@clerk/nextjs";
import { DEFAULT_PLAN, isUserPlan, type UserPlan } from "./userPlan";

export function useUserPlanClient(): UserPlan {
  const { user } = useUser();
  if (!user) return DEFAULT_PLAN;

  const metadataValue = user.publicMetadata?.plan;
  if (isUserPlan(metadataValue)) return metadataValue;

  return DEFAULT_PLAN;
}
