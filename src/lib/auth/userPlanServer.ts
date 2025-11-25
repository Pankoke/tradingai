import { currentUser } from "@clerk/nextjs/server";
import { DEFAULT_PLAN, isUserPlan, type UserPlan } from "./userPlan";

export async function getUserPlanServer(): Promise<UserPlan> {
  const user = await currentUser();
  if (!user) return DEFAULT_PLAN;

  const metadataValue = user.publicMetadata?.plan;
  if (isUserPlan(metadataValue)) return metadataValue;

  return DEFAULT_PLAN;
}
