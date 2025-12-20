import { respondOk } from "@/src/server/http/apiResponse";

type AuthStatusPayload = {
  authenticated: boolean;
  user: null;
  role?: null;
  version: string;
  timestamp: string;
};

export function GET(): Response {
  const payload: AuthStatusPayload = {
    authenticated: false,
    user: null,
    role: null,
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown",
    timestamp: new Date().toISOString(),
  };
  return respondOk(payload);
}
