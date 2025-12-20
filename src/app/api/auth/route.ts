import { respondFail, respondOk } from "@/src/server/http/apiResponse";

type AuthStatusPayload = {
  status: "ready";
  version: string;
  timestamp: string;
};

export function GET(): Response {
  const payload: AuthStatusPayload = {
    status: "ready",
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown",
    timestamp: new Date().toISOString(),
  };
  return respondOk(payload);
}
